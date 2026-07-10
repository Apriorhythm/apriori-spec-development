// 快速投票小工具 — 单文件 HTTP 服务（零运行时依赖）。
// 路由表见 openspec/changes/add-quick-poll/design.md D8。
import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore, isValidId } from './lib/store.js';
import { buildPoll, castVote, closePoll, isOpen, resultsView } from './lib/poll.js';
import * as pages from './lib/pages.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.POLL_DATA_DIR || path.join(__dirname, 'data');
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY = 16 * 1024; // 16KB 请求体上限

const store = await openStore(DATA_DIR);

// ---------- 工具 ----------

function html(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', ...headers });
  res.end(body);
}
const notFound = (res) => html(res, 404, pages.notFoundPage());
const redirect = (res, status, location, headers = {}) => {
  res.writeHead(status, { location, ...headers });
  res.end();
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('body too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function readForm(req) {
  return new URLSearchParams(await readBody(req));
}

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

const hasVoted = (req, pollId) => parseCookies(req)[`voted_${pollId}`] === '1';
const votedCookie = (pollId) =>
  `voted_${pollId}=1; Max-Age=31536000; Path=/p/${pollId}; SameSite=Lax; HttpOnly`;

function keyMatches(expected, given) {
  const a = Buffer.from(String(expected));
  const b = Buffer.from(String(given));
  return a.length === b.length && timingSafeEqual(a, b);
}

function requestOrigin(req) {
  const host = req.headers.host ?? `localhost:${PORT}`;
  const proto = req.headers['x-forwarded-proto'] ?? 'http';
  return `${proto}://${host}`;
}

// datetime-local 提交的是无时区本地时间（YYYY-MM-DDTHH:mm）；按服务器本地时区解释。
function normalizeDeadline(raw) {
  return raw && raw.trim() !== '' ? raw : null;
}

// ---------- 处理器 ----------

async function handleCreate(req, res) {
  const form = await readForm(req);
  const input = {
    title: form.get('title'),
    options: form.getAll('option'),
    multi: form.get('multi') === '1',
    maxChoices: form.get('maxChoices'),
    deadline: normalizeDeadline(form.get('deadline')),
  };
  const r = buildPoll(input);
  if (!r.ok) {
    return html(res, 400, pages.createFormPage({
      error: r.error,
      values: { title: input.title, options: input.options, multi: input.multi, maxChoices: input.maxChoices ?? '', deadline: input.deadline ?? '' },
    }));
  }
  await store.createPoll(r.poll);
  return redirect(res, 303, `/p/${r.poll.id}/created?key=${r.poll.adminKey}`);
}

async function handleCreated(req, res, id, url) {
  const poll = await store.readPoll(id);
  if (!poll) return notFound(res);
  const key = url.searchParams.get('key') ?? '';
  if (!keyMatches(poll.adminKey, key)) return notFound(res);
  return html(res, 200, pages.createdPage(poll, poll.adminKey, requestOrigin(req)));
}

async function handleVoteForm(req, res, id) {
  const poll = await store.readPoll(id);
  if (!poll) return notFound(res);
  if (hasVoted(req, id) || !isOpen(poll)) return redirect(res, 302, `/p/${id}/results`);
  return html(res, 200, pages.votePage(poll));
}

async function handleVoteSubmit(req, res, id) {
  const form = await readForm(req);
  if (!(await store.readPoll(id))) return notFound(res);
  if (hasVoted(req, id)) return redirect(res, 303, `/p/${id}/results`); // 软防重：拒绝重复提交

  const choices = form.getAll('choice').map((v) => Number(v));
  const outcome = await store.updatePoll(id, (poll) => {
    if (!poll) return { poll: null, result: { notFound: true } };
    const r = castVote(poll, choices);
    return r.ok ? { poll: r.poll, result: { ok: true } } : { poll: null, result: r };
  });

  if (outcome.result.notFound) return notFound(res);
  if (outcome.result.ok) {
    return redirect(res, 303, `/p/${id}/results`, { 'set-cookie': votedCookie(id) });
  }
  const poll = await store.readPoll(id);
  if (!isOpen(poll)) return html(res, 403, pages.closedPage(id));
  return html(res, 400, pages.votePage(poll, { error: outcome.result.error }));
}

async function handleResults(req, res, id) {
  const poll = await store.readPoll(id);
  if (!poll) return notFound(res);
  return html(res, 200, pages.resultsPage(resultsView(poll), id));
}

async function handleAdmin(req, res, id, key) {
  const poll = await store.readPoll(id);
  if (!poll || !keyMatches(poll.adminKey, key)) return notFound(res); // 错误密钥一律 404
  return html(res, 200, pages.adminPage(poll, key, isOpen(poll)));
}

async function handleClose(req, res, id, key) {
  const poll = await store.readPoll(id);
  if (!poll || !keyMatches(poll.adminKey, key)) return notFound(res);
  await store.updatePoll(id, (cur) => (cur ? { poll: closePoll(cur) } : null)); // 幂等
  return redirect(res, 303, `/p/${id}/admin/${key}`);
}

// ---------- 路由 ----------

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, requestOrigin(req));
    const seg = url.pathname.split('/').filter(Boolean); // e.g. ['p', id, 'results']
    const m = req.method;

    if (seg.length === 0 && m === 'GET') return html(res, 200, pages.createFormPage());
    if (seg.length === 1 && seg[0] === 'create' && m === 'POST') return handleCreate(req, res);

    if (seg[0] === 'p' && seg.length >= 2) {
      const id = seg[1];
      if (!isValidId(id)) return notFound(res); // 路径白名单：杜绝 . / 等
      const rest = seg.slice(2);

      if (rest.length === 0 && m === 'GET') return handleVoteForm(req, res, id);
      if (rest.length === 1 && rest[0] === 'created' && m === 'GET') return handleCreated(req, res, id, url);
      if (rest.length === 1 && rest[0] === 'vote' && m === 'POST') return handleVoteSubmit(req, res, id);
      if (rest.length === 1 && rest[0] === 'results' && m === 'GET') return handleResults(req, res, id);
      if (rest.length === 2 && rest[0] === 'admin' && m === 'GET') return handleAdmin(req, res, id, rest[1]);
      if (rest.length === 3 && rest[0] === 'admin' && rest[2] === 'close' && m === 'POST') {
        return handleClose(req, res, id, rest[1]);
      }
    }

    return notFound(res);
  } catch (err) {
    const status = err.statusCode ?? 500;
    console.error(`[error] ${req.method} ${req.url}:`, err.message);
    return html(res, status, pages.layout('出错了', '<h1>出错了</h1><div class="card"><p>请稍后重试。</p></div>'));
  }
});

server.listen(PORT, () => {
  console.log(`⚡ 快速投票已启动: http://localhost:${PORT} (数据目录: ${DATA_DIR})`);
});
