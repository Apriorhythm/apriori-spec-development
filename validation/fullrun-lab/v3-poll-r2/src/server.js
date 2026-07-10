'use strict';
// HTTP 服务 + 路由（单进程）。vote/close 走 per-poll 队列；durable 成功后才 2xx。
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ids = require('./ids');
const store = require('./store');
const { runExclusive } = require('./queue');
const { validateCreate, validateVote } = require('./validate');
const views = require('./views');

function send(res, code, body, type = 'application/json') {
  const payload = type === 'application/json' ? JSON.stringify(body) : body;
  res.writeHead(code, { 'content-type': type + '; charset=utf-8' });
  res.end(payload);
}
function sendJson(res, code, obj) { send(res, code, obj, 'application/json'); }
function sendHtml(res, code, html) { send(res, code, html, 'text/html'); }

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { return Symbol.for('bad-json'); }
}

// 关闭时的截止/状态判定（进入临界区时求值）
function effectiveClosed(poll) {
  return poll.status === 'closed' || (poll.deadlineMs != null && Date.now() >= poll.deadlineMs);
}

function resultsView(poll) {
  return {
    title: poll.title,
    options: poll.options.map((o) => ({ id: o.id, text: o.text, count: poll.counts[o.id] })),
    total: Object.values(poll.counts).reduce((a, b) => a + b, 0),
    status: effectiveClosed(poll) ? 'closed' : 'open',
    deadline: poll.deadlineMs,
  };
}

function safeKeyEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function createServer(opts = {}) {
  const dataDir = opts.dataDir || path.join(process.cwd(), 'data', 'polls');
  const hooks = opts._hooks || {};
  fs.mkdirSync(dataDir, { recursive: true });

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const origin = 'http://' + (req.headers.host || 'localhost');
      const parts = url.pathname.split('/').filter(Boolean);
      const method = req.method;

      // 静态前端
      if (method === 'GET' && parts[0] === 'public') {
        const f = path.join(__dirname, '..', 'public', path.basename(url.pathname));
        if (fs.existsSync(f)) return send(res, 200, fs.readFileSync(f, 'utf8'), 'application/javascript');
        return send(res, 404, 'not found', 'text/plain');
      }

      // 创建页
      if (method === 'GET' && parts.length === 0) return sendHtml(res, 200, views.createPage());

      // 页面：投票 / 结果 / 管理（未知 pollId → 404）
      if (method === 'GET' && parts[0] === 'p' && parts[1]) {
        const poll = store.read(dataDir, parts[1]);
        if (!poll) return sendHtml(res, 404, views.layout('未找到', '<h1>投票不存在</h1>'));
        return sendHtml(res, 200, views.votePage(poll));
      }
      if (method === 'GET' && parts[0] === 'r' && parts[1]) {
        const poll = store.read(dataDir, parts[1]);
        if (!poll) return sendHtml(res, 404, views.layout('未找到', '<h1>投票不存在</h1>'));
        return sendHtml(res, 200, views.resultPage({ ...poll, ...resultsView(poll) }));
      }
      if (method === 'GET' && parts[0] === 'admin' && parts[1]) {
        const poll = store.read(dataDir, parts[1]);
        if (!poll) return sendHtml(res, 404, views.layout('未找到', '<h1>投票不存在</h1>'));
        const key = url.searchParams.get('key') || '';
        if (!safeKeyEqual(key, poll.adminKey)) return sendHtml(res, 403, views.layout('无权限', '<h1>管理密钥无效</h1>'));
        return sendHtml(res, 200, views.adminPage(poll, key));
      }

      // API: 创建
      if (method === 'POST' && parts[0] === 'api' && parts[1] === 'polls' && parts.length === 2) {
        const body = await readBody(req);
        if (body === Symbol.for('bad-json')) return sendJson(res, 400, { error: 'invalid json' });
        const v = validateCreate(body);
        if (!v.ok) return sendJson(res, v.code, { error: v.error });
        const pollId = ids.newPollId();
        const adminKey = ids.newAdminKey();
        const options = v.value.options.map((text, i) => ({ id: 'opt-' + i, text }));
        const counts = {};
        options.forEach((o) => { counts[o.id] = 0; });
        const poll = { pollId, title: v.value.title, options, mode: v.value.mode, deadlineMs: v.value.deadlineMs, status: 'open', counts, adminKey };
        try {
          store.save(dataDir, poll, hooks); // durable 成功后才继续
        } catch (e) {
          return sendJson(res, 500, { error: 'persist failed' }); // 不留半个记录（原子写已保证）
        }
        return sendJson(res, 201, {
          pollId, adminKey,
          voteUrl: `${origin}/p/${pollId}`,
          adminUrl: `${origin}/admin/${pollId}?key=${adminKey}`,
          resultUrl: `${origin}/r/${pollId}`,
        });
      }

      // API: 投票
      if (method === 'POST' && parts[0] === 'api' && parts[1] === 'polls' && parts[3] === 'vote') {
        const id = parts[2];
        const body = await readBody(req);
        if (body === Symbol.for('bad-json')) return sendJson(res, 400, { error: 'invalid json' });
        if (!store.exists(dataDir, id)) return sendJson(res, 404, { error: 'poll not found' });
        const outcome = await runExclusive(id, async () => {
          const poll = store.read(dataDir, id);           // 临界区内读最新
          if (!poll) return { code: 404, error: 'poll not found' };
          if (effectiveClosed(poll)) return { code: 409, error: 'poll is closed' };
          const v = validateVote(poll, body);
          if (!v.ok) return { code: v.code, error: v.error };
          for (const oid of v.value.optionIds) poll.counts[oid] += 1;
          store.save(dataDir, poll, hooks);               // 失败则抛错 → 计数不落盘
          return { code: 200, results: resultsView(poll) };
        }).catch((e) => ({ code: 500, error: 'persist failed' }));
        if (outcome.code === 200) return sendJson(res, 200, { ok: true, resultUrl: `${origin}/r/${id}`, results: outcome.results });
        return sendJson(res, outcome.code, { error: outcome.error });
      }

      // API: 结果
      if (method === 'GET' && parts[0] === 'api' && parts[1] === 'polls' && parts[3] === 'results') {
        const poll = store.read(dataDir, parts[2]);
        if (!poll) return sendJson(res, 404, { error: 'poll not found' });
        return sendJson(res, 200, resultsView(poll));
      }

      // API: 关闭
      if (method === 'POST' && parts[0] === 'api' && parts[1] === 'polls' && parts[3] === 'close') {
        const id = parts[2];
        const body = await readBody(req);
        if (body === Symbol.for('bad-json')) return sendJson(res, 400, { error: 'invalid json' });
        if (!store.exists(dataDir, id)) return sendJson(res, 404, { error: 'poll not found' });
        const outcome = await runExclusive(id, async () => {
          const poll = store.read(dataDir, id);
          if (!poll) return { code: 404, error: 'poll not found' };
          if (!safeKeyEqual(body && body.adminKey, poll.adminKey)) return { code: 403, error: 'invalid admin key' };
          if (poll.status === 'closed') return { code: 200, ok: true };
          poll.status = 'closed';
          store.save(dataDir, poll, hooks);
          return { code: 200, ok: true };
        }).catch(() => ({ code: 500, error: 'persist failed' }));
        return sendJson(res, outcome.code, outcome.ok ? { ok: true } : { error: outcome.error });
      }

      return send(res, 404, 'not found', 'text/plain');
    } catch (e) {
      try { sendJson(res, 500, { error: 'internal error' }); } catch { /* headers 已发 */ }
    }
  });
}

module.exports = { createServer, resultsView, effectiveClosed };
