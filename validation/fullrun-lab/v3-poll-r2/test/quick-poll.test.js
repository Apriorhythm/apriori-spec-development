'use strict';
// quick-poll scenario tests — each top-level test名以场景 ID 开头，喂 apriori verify 的 TAP 绑定门。
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const { newPollId, newAdminKey } = require('../src/ids');
const escape = require('../src/escape');
const { validateCreate, validateVote } = require('../src/validate');
const store = require('../src/store');
const { runExclusive } = require('../src/queue');
const views = require('../src/views');
const { createServer } = require('../src/server');

function tmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'qp-')); }

// spin up server on ephemeral port with an isolated data dir; return {base, close, dataDir, srv}
async function startServer(extra = {}) {
  const dataDir = tmpDir();
  const srv = createServer({ dataDir, ...extra });
  await new Promise((r) => srv.listen(0, r));
  const port = srv.address().port;
  return { base: `http://127.0.0.1:${port}`, dataDir, srv, close: () => new Promise((r) => srv.close(r)) };
}
async function createPoll(base, body) {
  const res = await fetch(base + '/api/polls', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return { res, json: res.ok ? await res.json() : null };
}
const validBody = (over = {}) => ({ title: '午饭吃什么', options: ['火锅', '沙县'], mode: 'single', ...over });

// ---------------- PC-01 ----------------
test('PC-01 创建投票成功返回两条链接', async () => {
  const s = await startServer();
  try {
    const { res, json } = await createPoll(s.base, validBody({ options: ['A', 'B', 'C'] }));
    assert.strictEqual(res.status, 201);
    assert.ok(json.voteUrl && json.adminUrl, 'both links present');
    assert.notStrictEqual(json.voteUrl, json.adminUrl, 'links differ');
    assert.ok(json.adminUrl.includes(json.adminKey), 'admin url carries the actual adminKey');
    // 128-bit url-safe, not derivable
    assert.match(json.pollId, /^[A-Za-z0-9_-]{20,}$/);
    assert.match(json.adminKey, /^[A-Za-z0-9_-]{20,}$/);
    // stored file: options get ids, counts 0, status open
    const poll = store.read(s.dataDir, json.pollId);
    assert.deepStrictEqual(poll.options.map((o) => o.id), ['opt-0', 'opt-1', 'opt-2']);
    assert.deepStrictEqual(poll.counts, { 'opt-0': 0, 'opt-1': 0, 'opt-2': 0 });
    assert.strictEqual(poll.status, 'open');
  } finally { await s.close(); }
});

// ---------------- PC-02 ----------------
test('PC-02 创建输入非法则拒绝且不建记录', async () => {
  const s = await startServer();
  try {
    const bad = [
      {}, { title: 123, options: ['A', 'B'], mode: 'single' },
      { title: '   ', options: ['A', 'B'], mode: 'single' },
      { title: 't', options: ['A'], mode: 'single' },
      { title: 't', options: ['A', '  '], mode: 'single' },
      { title: 't', options: 'A,B', mode: 'single' },
      { title: 't', options: ['A', 'B'], mode: 'ranked' },
      { title: 't', options: ['A', 'B'], mode: 'single', deadline: 'not-a-date' },
      { title: 't', options: ['A', 'B'], mode: 'single', deadline: Date.now() - 1000 },
      { title: 'x'.repeat(201), options: ['A', 'B'], mode: 'single' },
      { title: 't', options: Array.from({ length: 21 }, (_, i) => 'o' + i), mode: 'single' },
    ];
    const before = fs.readdirSync(s.dataDir).length;
    for (const b of bad) {
      const { res } = await createPoll(s.base, b);
      assert.ok(res.status >= 400 && res.status < 500, 'non-2xx for ' + JSON.stringify(b).slice(0, 40));
    }
    assert.strictEqual(fs.readdirSync(s.dataDir).length, before, 'no record created');
  } finally { await s.close(); }
});

// ---------------- PC-03 ----------------
test('PC-03 单选投票计数加一并进入结果视图', async () => {
  const s = await startServer();
  try {
    const { json } = await createPoll(s.base, validBody());
    const res = await fetch(`${s.base}/api/polls/${json.pollId}/vote`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ optionIds: ['opt-0'] }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.resultUrl || body.results, '导向结果视图');
    const poll = store.read(s.dataDir, json.pollId);
    assert.strictEqual(poll.counts['opt-0'], 1);
    assert.strictEqual(poll.counts['opt-1'], 0);
  } finally { await s.close(); }
});

// ---------------- PC-14 ----------------
test('PC-14 单选提交多个选项被拒绝', async () => {
  const s = await startServer();
  try {
    const { json } = await createPoll(s.base, validBody());
    const res = await fetch(`${s.base}/api/polls/${json.pollId}/vote`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ optionIds: ['opt-0', 'opt-1'] }),
    });
    assert.ok(res.status >= 400 && res.status < 500);
    const poll = store.read(s.dataDir, json.pollId);
    assert.deepStrictEqual(poll.counts, { 'opt-0': 0, 'opt-1': 0 });
  } finally { await s.close(); }
});

// ---------------- PC-04 ----------------
test('PC-04 多选投票各选项计数加一', async () => {
  const s = await startServer();
  try {
    const { json } = await createPoll(s.base, validBody({ options: ['A', 'B', 'C'], mode: 'multiple' }));
    const ok = await fetch(`${s.base}/api/polls/${json.pollId}/vote`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ optionIds: ['opt-0', 'opt-2'] }),
    });
    assert.strictEqual(ok.status, 200);
    let poll = store.read(s.dataDir, json.pollId);
    assert.strictEqual(poll.counts['opt-0'], 1);
    assert.strictEqual(poll.counts['opt-1'], 0);
    assert.strictEqual(poll.counts['opt-2'], 1);
    // k=0 rejected
    const zero = await fetch(`${s.base}/api/polls/${json.pollId}/vote`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ optionIds: [] }),
    });
    assert.ok(zero.status >= 400 && zero.status < 500, 'k=0 rejected');
  } finally { await s.close(); }
});

// ---------------- PC-12 ----------------
test('PC-12 非法投票请求被拒绝且计数不变', async () => {
  const s = await startServer();
  try {
    const { json } = await createPoll(s.base, validBody({ options: ['A', 'B'], mode: 'multiple' }));
    const url = `${s.base}/api/polls/${json.pollId}/vote`;
    const send = (b) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
    // unknown poll -> 404
    const unknown = await fetch(`${s.base}/api/polls/does-not-exist/vote`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ optionIds: ['opt-0'] }),
    });
    assert.strictEqual(unknown.status, 404);
    for (const b of [{ optionIds: ['opt-9'] }, { optionIds: ['opt-0', 'opt-0'] }, { optionIds: 'opt-0' }, {}, { optionIds: [123] }]) {
      const res = await send(b);
      assert.strictEqual(res.status, 400, 'bad payload -> 400: ' + JSON.stringify(b));
    }
    const poll = store.read(s.dataDir, json.pollId);
    assert.deepStrictEqual(poll.counts, { 'opt-0': 0, 'opt-1': 0 });
    assert.strictEqual(poll.status, 'open');
  } finally { await s.close(); }
});

// ---------------- PC-05 ----------------
test('PC-05 同浏览器重复访问直接进入结果视图', async () => {
  // 软限是客户端 localStorage 逻辑；单元层断言投票页注入了 origin+pollId 作用域的守卫与跳转
  const html = views.votePage({ pollId: 'PID123', title: 't', options: [{ id: 'opt-0', text: 'A' }], mode: 'single', status: 'open', deadlineMs: null });
  assert.match(html, /localStorage/);
  assert.match(html, /voted:/);
  assert.match(html, /PID123/);
  assert.ok(/location|href|replace/.test(html), '含跳转到结果视图的逻辑');
  // 服务端不下发投票 cookie（保持无状态匿名）
  const s = await startServer();
  try {
    const { json } = await createPoll(s.base, validBody());
    const res = await fetch(`${s.base}/p/${json.pollId}`);
    assert.strictEqual(res.headers.get('set-cookie'), null, '不下发 cookie');
  } finally { await s.close(); }
});

// ---------------- PC-06 ----------------
test('PC-06 结果视图展示票数并按固定间隔轮询', async () => {
  const s = await startServer();
  try {
    const { json } = await createPoll(s.base, validBody({ options: ['A', 'B'] }));
    await fetch(`${s.base}/api/polls/${json.pollId}/vote`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ optionIds: ['opt-0'] }),
    });
    const res = await fetch(`${s.base}/api/polls/${json.pollId}/results`);
    assert.strictEqual(res.status, 200);
    const r = await res.json();
    assert.deepStrictEqual(Object.keys(r).sort(), ['deadline', 'options', 'status', 'title', 'total'].sort());
    assert.strictEqual(r.total, 1);
    assert.deepStrictEqual(r.options.map((o) => ({ id: o.id, count: o.count })), [{ id: 'opt-0', count: 1 }, { id: 'opt-1', count: 0 }]);
    // interval constant = 3000ms, 结果页加载即拉一次
    assert.strictEqual(views.POLL_INTERVAL_MS, 3000);
    const page = views.resultPage({ pollId: json.pollId, title: 't', options: r.options, total: r.total, status: 'open', deadlineMs: null });
    assert.match(page, /3000/);
    assert.match(page, /setInterval/);
    assert.match(page, /results/);
  } finally { await s.close(); }
});

// ---------------- PC-07 ----------------
test('PC-07 到达截止时间自动关闭', async () => {
  const s = await startServer();
  try {
    const future = Date.now() + 120;
    const { json } = await createPoll(s.base, validBody({ deadline: future }));
    await new Promise((r) => setTimeout(r, 200)); // 越过截止
    const res = await fetch(`${s.base}/api/polls/${json.pollId}/vote`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ optionIds: ['opt-0'] }),
    });
    assert.ok(res.status >= 400 && res.status < 500, '过期投票被拒');
    const results = await fetch(`${s.base}/api/polls/${json.pollId}/results`);
    assert.strictEqual(results.status, 200, '结果仍可读');
    const r = await results.json();
    assert.strictEqual(r.status, 'closed');
  } finally { await s.close(); }
});

// ---------------- PC-08 ----------------
test('PC-08 发起人凭管理密钥手动关闭', async () => {
  const s = await startServer();
  try {
    const { json } = await createPoll(s.base, validBody());
    // 无效 key -> 拒绝，状态不变
    const bad = await fetch(`${s.base}/api/polls/${json.pollId}/close`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ adminKey: 'wrong-key-xxxxxxxxxxxx' }),
    });
    assert.ok(bad.status >= 400 && bad.status < 500);
    assert.strictEqual(store.read(s.dataDir, json.pollId).status, 'open');
    // 有效 key -> 关闭
    const ok = await fetch(`${s.base}/api/polls/${json.pollId}/close`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ adminKey: json.adminKey }),
    });
    assert.strictEqual(ok.status, 200);
    assert.strictEqual(store.read(s.dataDir, json.pollId).status, 'closed');
    // 关闭后不能再投，结果仍可读
    const vote = await fetch(`${s.base}/api/polls/${json.pollId}/vote`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ optionIds: ['opt-0'] }),
    });
    assert.ok(vote.status >= 400 && vote.status < 500);
    assert.strictEqual((await fetch(`${s.base}/api/polls/${json.pollId}/results`)).status, 200);
  } finally { await s.close(); }
});

// ---------------- PC-09 ----------------
test('PC-09 已关闭态在视图中显式呈现', async () => {
  const open = views.votePage({ pollId: 'x', title: 't', options: [{ id: 'opt-0', text: 'A' }], mode: 'single', status: 'open', deadlineMs: null });
  assert.match(open, /投票|submit|vote/i);
  const closed = views.votePage({ pollId: 'x', title: 't', options: [{ id: 'opt-0', text: 'A' }], mode: 'single', status: 'closed', deadlineMs: null });
  assert.match(closed, /已关闭|已结束|closed/i, '显式呈现关闭');
  assert.doesNotMatch(closed, /type=["']submit["']/, '不渲染投票提交控件');
});

// ---------------- PC-10 ----------------
test('PC-10 并发投票不丢票', async () => {
  const s = await startServer();
  try {
    const { json } = await createPoll(s.base, validBody({ options: ['A', 'B'] }));
    const N = 50;
    const reqs = Array.from({ length: N }, (_, i) => fetch(`${s.base}/api/polls/${json.pollId}/vote`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ optionIds: [i % 2 === 0 ? 'opt-0' : 'opt-1'] }),
    }));
    const ress = await Promise.all(reqs);
    assert.ok(ress.every((r) => r.status === 200), '所有合法票 200');
    const poll = store.read(s.dataDir, json.pollId);
    assert.strictEqual(poll.counts['opt-0'] + poll.counts['opt-1'], N, '无丢票');
    assert.strictEqual(poll.counts['opt-0'], 25);
    assert.strictEqual(poll.counts['opt-1'], 25);
  } finally { await s.close(); }
});

// ---------------- PC-11 ----------------
test('PC-11 崩溃不产生半写文件', async () => {
  const dir = tmpDir();
  const file = path.join(dir, 'poll.json');
  const oldData = JSON.stringify({ v: 'old', n: 1 });
  store.writeAtomic(file, oldData);
  // 注入：tmp 写完、rename 前中断
  assert.throws(() => {
    store.writeAtomic(file, JSON.stringify({ v: 'new', n: 2 }), { afterTmpWrite: () => { throw new Error('crash before rename'); } });
  });
  const after = fs.readFileSync(file, 'utf8');
  assert.doesNotThrow(() => JSON.parse(after), '目标文件仍可完整解析');
  assert.strictEqual(after, oldData, '目标仍为旧完整内容，绝不半写');
  // 目录里不残留会被误读为投票的 .json（tmp 用别的后缀）
  assert.ok(!fs.readdirSync(dir).some((f) => f.endsWith('.json') && f !== 'poll.json'));
});

// ---------------- PC-13 ----------------
test('PC-13 失败不产生假成功', async () => {
  const hooks = {}; // 可切换：先建投票，再注入写失败
  const s = await startServer({ _hooks: hooks });
  try {
    const { json } = await createPoll(s.base, validBody());
    hooks.failRename = true; // 从这里起所有写盘都失败
    const res = await fetch(`${s.base}/api/polls/${json.pollId}/vote`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ optionIds: ['opt-0'] }),
    });
    assert.ok(res.status >= 500 || (res.status >= 400 && res.status < 600), '写失败 -> 非 2xx');
    assert.ok(!res.ok, '非 2xx');
    const poll = store.read(s.dataDir, json.pollId);
    assert.strictEqual(poll.counts['opt-0'], 0, '计数不变');
    assert.strictEqual(poll.status, 'open', '状态不变');
    // close 写失败同样不产生假成功：非 2xx 且状态仍为 open（P8 advisory 采纳）
    const closeRes = await fetch(`${s.base}/api/polls/${json.pollId}/close`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ adminKey: json.adminKey }),
    });
    assert.ok(!closeRes.ok, 'close 写失败 -> 非 2xx');
    assert.strictEqual(store.read(s.dataDir, json.pollId).status, 'open', 'close 写失败后状态不变');
  } finally { await s.close(); }
});
// create 的失败在 hooks 下也不能建记录（durable 后才算成功）
test('PC-13b create 写失败不留半个投票', async () => {
  const s = await startServer({ _hooks: { failRename: true } });
  try {
    const { res } = await createPoll(s.base, validBody());
    assert.ok(!res.ok, 'create 写失败 -> 非 2xx');
    assert.strictEqual(fs.readdirSync(s.dataDir).filter((f) => f.endsWith('.json')).length, 0, '无记录');
  } finally { await s.close(); }
});

// ---------------- PC-15 ----------------
test('PC-15 用户输入在所有输出出口被安全编码', async () => {
  // escape 单元
  assert.strictEqual(escape.htmlEscape('<script>&"\''), '&lt;script&gt;&amp;&quot;&#39;');
  const js = escape.jsonForScript({ t: '</script><script>x</script>' + String.fromCharCode(0x2028, 0x2029) + ' &<>' });
  assert.ok(!js.includes('</script'), '内联 JSON 不含裸 </script');
  assert.ok(!js.includes('<script'), '不含裸 <script');
  assert.ok(!/[\u2028\u2029]/.test(js), '不含裸行分隔符');
  assert.match(js, /\\u003c/); assert.match(js, /\\u2028/);
  // SSR：注入选项/标题被转义
  const evil = '<img src=x onerror=alert(1)>';
  const s = await startServer();
  try {
    const { json } = await createPoll(s.base, { title: evil, options: [evil, 'B'], mode: 'single' });
    const votePageHtml = await (await fetch(`${s.base}/p/${json.pollId}`)).text();
    assert.ok(!votePageHtml.includes('<img src=x onerror'), 'SSR 转义了注入');
    assert.match(votePageHtml, /&lt;img/);
    const resultPageHtml = await (await fetch(`${s.base}/r/${json.pollId}`)).text();
    assert.ok(!resultPageHtml.includes('<img src=x onerror'), '结果页转义了注入');
  } finally { await s.close(); }
});
