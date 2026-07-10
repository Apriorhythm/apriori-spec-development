'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../server');

async function startServer(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poll-srv-'));
  const server = createServer(dir);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  return `http://127.0.0.1:${server.address().port}`;
}

async function post(base, p, body) {
  const res = await fetch(base + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

test('全流程：建投票→投票→查结果→关闭→再投被拒', async (t) => {
  const base = await startServer(t);

  const created = await post(base, '/api/polls', {
    question: '周五团建去哪',
    options: ['烤肉', '火锅', '轰趴馆'],
    multiple: false,
  });
  assert.equal(created.status, 201);
  const { id, adminToken } = created.body;
  assert.match(id, /^[a-z2-9]{6}$/);
  assert.match(adminToken, /^[a-z2-9]{16}$/);

  const voted = await post(base, `/api/polls/${id}/vote`, { choices: [1] });
  assert.equal(voted.status, 200);
  assert.deepEqual(voted.body.counts, [0, 1, 0]);

  const view = await fetch(`${base}/api/polls/${id}`).then((r) => r.json());
  assert.equal(view.total, 1);
  assert.equal(view.open, true);
  assert.ok(!('adminToken' in view));

  const admin = await fetch(`${base}/api/admin/${adminToken}`).then((r) => r.json());
  assert.equal(admin.id, id);

  const closed = await post(base, `/api/admin/${adminToken}/close`, {});
  assert.equal(closed.status, 200);
  assert.equal(closed.body.closed, true);

  const rejected = await post(base, `/api/polls/${id}/vote`, { choices: [0] });
  assert.equal(rejected.status, 409);
  assert.equal(rejected.body.error, '投票已关闭');
});

test('错误路径：404 / 校验 400 / 非法 JSON 400', async (t) => {
  const base = await startServer(t);

  const missing = await fetch(`${base}/api/polls/nope42`);
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error, '投票不存在');

  const invalid = await post(base, '/api/polls', { question: '', options: ['a', 'b'] });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error, '问题不能为空');

  const badJson = await fetch(`${base}/api/polls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{broken',
  });
  assert.equal(badJson.status, 400);
  assert.equal((await badJson.json()).error, '请求格式不正确');

  const unknown = await fetch(`${base}/api/what`);
  assert.equal(unknown.status, 404);
  assert.equal((await unknown.json()).error, '页面不存在');
});

test('页面路由：/、/poll/:id、/admin/:token 返回 HTML', async (t) => {
  const base = await startServer(t);
  for (const p of ['/', '/poll/abc123', '/admin/abcdefgh23456789']) {
    const res = await fetch(base + p);
    assert.equal(res.status, 200, p);
    assert.match(res.headers.get('content-type'), /text\/html/);
  }
});

test('前端资产：style.css 可达；页面含真实应用标记', async (t) => {
  const base = await startServer(t);
  const css = await fetch(`${base}/style.css`);
  assert.equal(css.status, 200);
  assert.match(css.headers.get('content-type'), /text\/css/);

  const index = await fetch(`${base}/`).then((r) => r.text());
  assert.match(index, /id="create"/);
  const poll = await fetch(`${base}/poll/abc123`).then((r) => r.text());
  assert.match(poll, /id="results"/);
  const admin = await fetch(`${base}/admin/abcdefgh23456789`).then((r) => r.text());
  assert.match(admin, /id="close"/);
});
