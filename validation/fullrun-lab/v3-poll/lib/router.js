// 路由层（design §3）：参数先校验后访问、64KB body 上限、统一错误形状、日志脱敏、静态页白名单。
import fsp from 'node:fs/promises';
import path from 'node:path';
import { ADMIN_KEY_RE, POLL_ID_RE } from './ids.js';
import { BadKeyError, ClosedError, CorruptError, NotFoundError, ValidationError } from './errors.js';

const BODY_LIMIT = 64 * 1024;
const STATIC_FILES = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/poll-core.js', ['poll-core.js', 'text/javascript; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/poll.js', ['poll.js', 'text/javascript; charset=utf-8']],
  ['/admin.js', ['admin.js', 'text/javascript; charset=utf-8']],
]);

function send(res, status, type, body) {
  res.writeHead(status, { 'content-type': type, 'content-length': Buffer.byteLength(body) });
  res.end(body);
}
const sendJson = (res, status, obj) => send(res, status, 'application/json; charset=utf-8', JSON.stringify(obj));
const sendHtml = (res, status, html) => send(res, status, 'text/html; charset=utf-8', html);

// 请求体读取：超过 64KB 先回 413 JSON 再排空（design §6：不粗暴 destroy）。
async function readBody(req, res) {
  const chunks = [];
  let size = 0;
  let tooLarge = false;
  for await (const chunk of req) {
    if (tooLarge) continue; // 已应答，静默排空
    size += chunk.length;
    if (size > BODY_LIMIT) {
      tooLarge = true;
      sendJson(res, 413, { error: '请求体过大（上限 64KB）' });
      continue;
    }
    chunks.push(chunk);
  }
  if (tooLarge) return { handled: true };
  try {
    return { body: JSON.parse(Buffer.concat(chunks).toString('utf8')) };
  } catch {
    throw new ValidationError('请求体必须是合法 JSON');
  }
}

function redact(pathname) {
  return pathname.replace(/^(\/admin\/[A-Za-z0-9_-]+\/).+$/, '$1<redacted>'); // SPEC-1：密钥不进日志
}

function errorStatus(e) {
  if (e instanceof ValidationError) return 400;
  if (e instanceof NotFoundError) return 404;
  if (e instanceof BadKeyError) return 403;
  if (e instanceof ClosedError) return 409;
  if (e instanceof CorruptError) return 500;
  return 500;
}

export function createRouter({ polls, publicDir, logger = console.log, listenHost = '0.0.0.0', port = 3000 }) {
  const page = (name) => fsp.readFile(path.join(publicDir, name), 'utf8');

  function origin(req) {
    // SPEC-4：链接以请求 Host 为准；缺失时回退监听地址
    const host = req.headers.host || `${listenHost === '0.0.0.0' ? 'localhost' : listenHost}:${port}`;
    return `http://${host}`;
  }

  async function route(req, res) {
    const { method } = req;
    const pathname = new URL(req.url, 'http://internal').pathname;
    const seg = pathname.split('/').slice(1); // ['api','polls',...]

    // 静态页与创建页
    if (method === 'GET' && STATIC_FILES.has(pathname)) {
      const [file, type] = STATIC_FILES.get(pathname);
      return send(res, 200, type, await page(file));
    }

    // POST /api/polls —— 创建
    if (method === 'POST' && pathname === '/api/polls') {
      const r = await readBody(req, res);
      if (r.handled) return;
      const poll = await polls.create(r.body);
      return sendJson(res, 201, {
        pollId: poll.id,
        voteUrl: `${origin(req)}/p/${poll.id}`,
        adminUrl: `${origin(req)}/admin/${poll.id}/${poll.adminKey}`,
      });
    }

    // 含 pollId 的 API：参数先校验（PS-05）
    if (seg[0] === 'api' && seg[1] === 'polls' && seg.length >= 3) {
      const id = seg[2];
      if (!POLL_ID_RE.test(id)) throw new NotFoundError('投票不存在');
      if (method === 'GET' && seg.length === 3) return sendJson(res, 200, await polls.getResults(id));
      if (method === 'POST' && seg.length === 4 && seg[3] === 'vote') {
        const r = await readBody(req, res);
        if (r.handled) return;
        return sendJson(res, 200, await polls.vote(id, r.body));
      }
      if (method === 'POST' && seg.length === 4 && seg[3] === 'close') {
        const r = await readBody(req, res);
        if (r.handled) return;
        return sendJson(res, 200, await polls.close(id, r.body));
      }
      throw new NotFoundError('页面不存在');
    }

    // GET /p/<pollId> —— 投票页
    if (method === 'GET' && seg[0] === 'p' && seg.length === 2) {
      const id = seg[1];
      if (!POLL_ID_RE.test(id)) throw new NotFoundError('投票不存在');
      await polls.getResults(id); // 不存在 -> 404；损坏 -> 500
      return sendHtml(res, 200, (await page('poll.html')).replaceAll('{{POLL_ID}}', id));
    }

    // GET /admin/<pollId>/<key> —— 管理页
    if (method === 'GET' && seg[0] === 'admin' && seg.length === 3) {
      const [, id, key] = seg;
      if (!POLL_ID_RE.test(id) || !ADMIN_KEY_RE.test(key)) throw new NotFoundError('页面不存在');
      await polls.readAuthorized(id, key); // key 错与不存在统一 404（PG-03）
      const html = (await page('admin.html')).replaceAll('{{POLL_ID}}', id).replaceAll('{{ADMIN_KEY}}', key);
      return sendHtml(res, 200, html);
    }

    throw new NotFoundError('页面不存在');
  }

  return async function handler(req, res) {
    const started = Date.now();
    const pathname = new URL(req.url, 'http://internal').pathname;
    try {
      await route(req, res);
    } catch (e) {
      const status = errorStatus(e);
      const message = status === 500 && !(e instanceof CorruptError) ? '服务器内部错误' : e.message;
      if (!res.headersSent) sendJson(res, status, { error: message });
      if (status === 500) logger(`error ${status}: ${e.constructor.name}`); // 不含 URL/key/body（SPEC-1）
    } finally {
      logger(`${req.method} ${redact(pathname)} ${res.statusCode} ${Date.now() - started}ms`);
    }
  };
}
