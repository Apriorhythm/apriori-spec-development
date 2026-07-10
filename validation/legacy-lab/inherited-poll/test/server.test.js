'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../server');

async function startServer(t, opts) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poll-srv-'));
  const server = createServer(dir, opts);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, dir, server };
}

async function post(base, p, body, cookie) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(base + p, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json(), headers: res.headers };
}

// 领取投票者 cookie：对 poll 视图发一次 GET，取回 Set-Cookie 的 pv=... 部分
async function getCookie(base, id) {
  const res = await fetch(`${base}/api/polls/${id}`);
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return null;
  return setCookie.split(';')[0]; // "pv=<value>"
}

test('全流程：建投票→领 cookie→投票→查结果→关闭→再投被拒', async (t) => {
  const { base } = await startServer(t);

  const created = await post(base, '/api/polls', {
    question: '周五团建去哪',
    options: ['烤肉', '火锅', '轰趴馆'],
    multiple: false,
  });
  assert.equal(created.status, 201);
  const { id, adminToken } = created.body;
  assert.match(id, /^[a-z2-9]{6}$/);
  assert.match(adminToken, /^[a-z2-9]{16}$/);

  const cookie = await getCookie(base, id);
  const voted = await post(base, `/api/polls/${id}/vote`, { choices: [1] }, cookie);
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

  const rejected = await post(base, `/api/polls/${id}/vote`, { choices: [0] }, cookie);
  assert.equal(rejected.status, 409);
  assert.equal(rejected.body.error, '投票已关闭');
});

test('VD-01 无 cookie 的 GET 下发 HttpOnly 的 pv cookie；带 cookie 投票 → 200、票数 +1、voted:true', async (t) => {
  const { base } = await startServer(t);
  const { body: { id } } = await post(base, '/api/polls', { question: 'q', options: ['a', 'b'] });

  const res = await fetch(`${base}/api/polls/${id}`);
  const setCookie = res.headers.get('set-cookie');
  assert.ok(setCookie, 'GET 应下发 Set-Cookie');
  assert.match(setCookie, /^pv=/);
  assert.match(setCookie, /HttpOnly/i);
  assert.equal((await res.json()).voted, false);
  const cookie = setCookie.split(';')[0];

  // 已带有效 cookie 的 GET 不重复下发
  const res2 = await fetch(`${base}/api/polls/${id}`, { headers: { Cookie: cookie } });
  assert.equal(res2.headers.get('set-cookie'), null);

  const voted = await post(base, `/api/polls/${id}/vote`, { choices: [0] }, cookie);
  assert.equal(voted.status, 200);
  assert.equal(voted.body.total, 1);
  assert.equal(voted.body.voted, true);
});

test('VD-04 无 cookie / 伪造 cookie 的投票 → 403 固定文案，不计票，不下发 cookie', async (t) => {
  const { base } = await startServer(t);
  const { body: { id } } = await post(base, '/api/polls', { question: 'q', options: ['a', 'b'] });

  const noCookie = await post(base, `/api/polls/${id}/vote`, { choices: [0] });
  assert.equal(noCookie.status, 403);
  assert.equal(noCookie.body.error, '未获得投票标识');
  assert.equal(noCookie.headers.get('set-cookie'), null);

  const forged = await post(base, `/api/polls/${id}/vote`, { choices: [0] }, 'pv=Zm9yZ2Vk.Zm9yZ2Vkc2ln');
  assert.equal(forged.status, 403);
  assert.equal(forged.body.error, '未获得投票标识');
  assert.equal(forged.headers.get('set-cookie'), null);

  // 篡改真 cookie 的签名部分
  const real = await getCookie(base, id);
  const tampered = real.slice(0, -2) + 'xx';
  const bad = await post(base, `/api/polls/${id}/vote`, { choices: [0] }, tampered);
  assert.equal(bad.status, 403);
  assert.equal(bad.headers.get('set-cookie'), null);

  const view = await fetch(`${base}/api/polls/${id}`).then((r) => r.json());
  assert.equal(view.total, 0);
  assert.deepEqual(view.counts, [0, 0]);
});

test('VD-06 重启后（新 server/store 实例，同数据目录）同一 cookie 再投仍 409，票数经应用加载路径读回一致', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poll-srv-restart-'));
  const server1 = createServer(dir);
  await new Promise((resolve) => server1.listen(0, '127.0.0.1', resolve));
  const base1 = `http://127.0.0.1:${server1.address().port}`;

  const created = await post(base1, '/api/polls', { question: 'q', options: ['a', 'b'] });
  const id = created.body.id;
  const cookie = await getCookie(base1, id);
  const voted = await post(base1, `/api/polls/${id}/vote`, { choices: [0] }, cookie);
  assert.equal(voted.status, 200);
  const before = await fetch(`${base1}/api/polls/${id}`, { headers: { Cookie: cookie } }).then((r) => r.json());
  await new Promise((resolve) => server1.close(resolve));

  // “重启”：全新实例走自身加载路径读回，同一数据目录
  const server2 = createServer(dir);
  await new Promise((resolve) => server2.listen(0, '127.0.0.1', resolve));
  t.after(() => server2.close());
  const base2 = `http://127.0.0.1:${server2.address().port}`;

  const again = await post(base2, `/api/polls/${id}/vote`, { choices: [1] }, cookie);
  assert.equal(again.status, 409);
  assert.equal(again.body.error, '你已经投过这个投票了');
  const after = await fetch(`${base2}/api/polls/${id}`, { headers: { Cookie: cookie } }).then((r) => r.json());
  assert.equal(after.total, before.total);
  assert.deepEqual(after.counts, before.counts);
  assert.equal(after.voted, true);
});

test('VD-08 同一 cookie 并发两个投票请求：恰一个 200、一个 409，total 只 +1', async (t) => {
  const { base } = await startServer(t);
  const { body: { id } } = await post(base, '/api/polls', { question: 'q', options: ['a', 'b'] });
  const cookie = await getCookie(base, id);

  const [r1, r2] = await Promise.all([
    post(base, `/api/polls/${id}/vote`, { choices: [0] }, cookie),
    post(base, `/api/polls/${id}/vote`, { choices: [1] }, cookie),
  ]);
  const statuses = [r1.status, r2.status].sort();
  assert.deepEqual(statuses, [200, 409]);
  const view = await fetch(`${base}/api/polls/${id}`).then((r) => r.json());
  assert.equal(view.total, 1);
});

test('VD-09 注入写盘失败：投票 → 500，随后同进程 GET 读到的状态与失败前完全一致', async (t) => {
  let fail = false;
  const { base } = await startServer(t, {
    storeIo: {
      writeFileSync: (...args) => {
        if (fail) throw new Error('injected write failure');
        return fs.writeFileSync(...args);
      },
    },
  });
  // fixture 先建好（此时注入未武装，落盘正常）
  const { body: { id } } = await post(base, '/api/polls', { question: 'q', options: ['a', 'b'] });
  const cookie = await getCookie(base, id);
  const before = await fetch(`${base}/api/polls/${id}`, { headers: { Cookie: cookie } }).then((r) => r.json());

  fail = true; // 武装：下一次写盘失败，命中投票的持久化
  const r = await post(base, `/api/polls/${id}/vote`, { choices: [0] }, cookie);
  assert.equal(r.status, 500);

  fail = false;
  const after = await fetch(`${base}/api/polls/${id}`, { headers: { Cookie: cookie } }).then((r) => r.json());
  assert.equal(after.total, before.total);
  assert.deepEqual(after.counts, before.counts);
  assert.equal(after.voted, false, '失败的投票不得留下去重标记');
});

test('VD-11 admin 视图与公开视图的隐私边界：均不含 adminToken/votes/voters；admin 无 voted 字段', async (t) => {
  const { base } = await startServer(t);
  const created = await post(base, '/api/polls', { question: 'q', options: ['a', 'b'] });
  const { id, adminToken } = created.body;
  const cookie = await getCookie(base, id);
  await post(base, `/api/polls/${id}/vote`, { choices: [0] }, cookie);

  const pub = await fetch(`${base}/api/polls/${id}`, { headers: { Cookie: cookie } }).then((r) => r.json());
  for (const k of ['adminToken', 'votes', 'voters']) assert.ok(!(k in pub), `公开视图不应含 ${k}`);
  assert.equal(pub.voted, true);

  const admin = await fetch(`${base}/api/admin/${adminToken}`).then((r) => r.json());
  for (const k of ['adminToken', 'votes', 'voters', 'voted']) assert.ok(!(k in admin), `admin 视图不应含 ${k}`);

  const closedView = await post(base, `/api/admin/${adminToken}/close`, {});
  for (const k of ['adminToken', 'votes', 'voters', 'voted']) assert.ok(!(k in closedView.body), `close 响应不应含 ${k}`);
});

test('VD-10 密钥文件损坏 → createServer 构造抛错（启动失败，非静默重建）', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poll-srv-badkey-'));
  fs.writeFileSync(path.join(dir, 'cookie-secret'), 'corrupt');
  assert.throws(() => createServer(dir), /cookie-secret/);
});

test('错误路径：404 / 校验 400 / 非法 JSON 400', async (t) => {
  const { base } = await startServer(t);

  const missing = await fetch(`${base}/api/polls/nope42`);
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error, '投票不存在');
  // EXEC-001 回归：失败响应不得下发新 cookie（无 cookie 的 404 GET 也不签发标识）
  assert.equal(missing.headers.get('set-cookie'), null);

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

test('RB-01 合法 JSON 但非对象的 body（null/数组/裸标量）→ 400 固定文案，绝不 500；空 body 保持原语义', async (t) => {
  const { base } = await startServer(t);

  for (const body of ['null', '[1,2]', '"abc"', '42']) {
    const r = await fetch(`${base}/api/polls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    assert.equal(r.status, 400, `create body=${body}`);
    assert.equal((await r.json()).error, '请求格式不正确', `create body=${body}`);
  }

  const created = await post(base, '/api/polls', { question: 'q', options: ['a', 'b'] });
  const cookie = await getCookie(base, created.body.id);
  for (const body of ['null', '[0]', '"x"']) {
    const r = await fetch(`${base}/api/polls/${created.body.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body,
    });
    assert.equal(r.status, 400, `vote body=${body}`);
    assert.equal((await r.json()).error, '请求格式不正确', `vote body=${body}`);
  }

  // 空 body：仍按 {} 处理，由字段校验给出具体 400 文案（不改变既有语义）
  const emptyCreate = await fetch(`${base}/api/polls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  assert.equal(emptyCreate.status, 400);
  assert.equal((await emptyCreate.json()).error, '问题不能为空');
  const emptyVote = await fetch(`${base}/api/polls/${created.body.id}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
  });
  assert.equal(emptyVote.status, 400);
  assert.equal((await emptyVote.json()).error, '请至少选择一个选项');
});

test('页面路由：/、/poll/:id、/admin/:token 返回 HTML', async (t) => {
  const { base } = await startServer(t);
  for (const p of ['/', '/poll/abc123', '/admin/abcdefgh23456789']) {
    const res = await fetch(base + p);
    assert.equal(res.status, 200, p);
    assert.match(res.headers.get('content-type'), /text\/html/);
  }
});

test('前端资产：style.css 可达；页面含真实应用标记', async (t) => {
  const { base } = await startServer(t);
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
