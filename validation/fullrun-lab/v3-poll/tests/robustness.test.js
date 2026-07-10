import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { startApp, createPoll, adminKeyOf, recordingFs, failingFs } from './helpers.js';

test('PS-01 持久化走临时文件：创建 link 不覆盖、更新 rename、无残留 tmp', async () => {
  const { ops, fs } = recordingFs();
  const app = await startApp({ fs });
  try {
    const c = await createPoll(app);
    await app.req('POST', `/api/polls/${c.json.pollId}/vote`, { body: { optionIndex: 0 } });
    const inData = (p) => p.startsWith(app.dataDir);
    const writes = ops.filter(([op]) => op === 'writeFile');
    assert.ok(writes.length >= 2 && writes.every(([, p]) => inData(p) && path.basename(p).startsWith('.tmp-')), '每次持久化都先写 data/ 内临时文件');
    const link = ops.find(([op]) => op === 'link');
    assert.ok(link && path.basename(link[1]).startsWith('.tmp-') && link[2] === path.join(app.dataDir, c.json.pollId + '.json'), '创建走 link（不覆盖）');
    const rename = ops.find(([op]) => op === 'rename');
    assert.ok(rename && path.basename(rename[1]).startsWith('.tmp-') && rename[2] === path.join(app.dataDir, c.json.pollId + '.json'), '更新走 rename');
    assert.ok(ops.findIndex(([op]) => op === 'writeFile') < ops.findIndex(([op]) => op === 'link'), 'tmp 先于原子落盘');
    const fsp = await import('node:fs/promises');
    const leftovers = (await fsp.readdir(app.dataDir)).filter((f) => f.startsWith('.tmp-'));
    assert.deepEqual(leftovers, [], '操作完成后无残留临时文件');
  } finally {
    await app.close();
  }
});

test('PS-02 写入失败返回 500 且状态不变', async () => {
  const app0 = await startApp();
  let dataDir, pollId;
  try {
    const c = await createPoll(app0);
    pollId = c.json.pollId;
    dataDir = app0.dataDir;
  } finally {
    await app0.close();
  }
  const app = await startApp({ dataDir, fs: failingFs(new Set(['rename'])) });
  try {
    const r = await app.req('POST', `/api/polls/${pollId}/vote`, { body: { optionIndex: 0 } });
    assert.equal(r.status, 500);
    assert.ok(typeof r.json.error === 'string');
    assert.deepEqual((await app.readPollFile(pollId)).options.map((o) => o.votes), [0, 0, 0], '失败的写不得改变已持久化状态');
  } finally {
    await app.close();
  }
});

test('PS-03 非法请求体统一 400 且状态不变', async () => {
  const app = await startApp();
  try {
    const c = await createPoll(app);
    const id = c.json.pollId;
    const cases = [
      ['POST', '/api/polls', 'not json'],
      ['POST', '/api/polls', ''],
      ['POST', '/api/polls', { title: 5, options: ['A', 'B'] }],
      ['POST', '/api/polls', { title: 'x', options: 'nope' }],
      ['POST', `/api/polls/${id}/vote`, 'garbage{'],
      ['POST', `/api/polls/${id}/close`, { key: 12345 }],
    ];
    for (const [method, p, body] of cases) {
      const r = await app.req(method, p, { body });
      assert.equal(r.status, 400, JSON.stringify(body));
      assert.ok(r.json && typeof r.json.error === 'string');
    }
    const file = await app.readPollFile(id);
    assert.equal(file.status, 'open');
    assert.deepEqual(file.options.map((o) => o.votes), [0, 0, 0]);
  } finally {
    await app.close();
  }
});

test('PS-04 超过 64KB 的请求体返回 413', async () => {
  const app = await startApp();
  try {
    const r = await app.req('POST', '/api/polls', { body: 'x'.repeat(65 * 1024) });
    assert.equal(r.status, 413);
    assert.ok(typeof r.json.error === 'string');
  } finally {
    await app.close();
  }
});

test('PS-05 路由参数先校验后访问：非法/穿越参数 404 且不触达 data/ 外路径', async () => {
  const { ops, fs } = recordingFs();
  const app = await startApp({ fs });
  try {
    ops.length = 0; // 只审计请求期的 store fs 访问
    const attempts = [
      ['GET', '/p/../etc/passwd'],
      ['GET', '/p/..%2F..%2Fetc%2Fpasswd'],
      ['GET', '/api/polls/..%2Fx'],
      ['GET', '/api/polls/short'],
      ['POST', '/api/polls/%2e%2e%2fserver.js/vote', { body: { optionIndex: 0 } }],
      ['GET', '/admin/../../x/abcdefghijklmnopqrstuv'],
      ['GET', `/admin/${'A'.repeat(16)}/bad*key!!chars000000`],
    ];
    for (const [method, p, o] of attempts) {
      const r = await app.req(method, p, o);
      assert.equal(r.status, 404, `${method} ${p}`);
    }
    for (const [, ...paths] of ops)
      for (const p of paths) assert.ok(p.startsWith(app.dataDir), `store 不得访问 data/ 外路径: ${p}`);
  } finally {
    await app.close();
  }
});

test('PS-06 请求日志对管理密钥脱敏', async () => {
  const lines = [];
  const app = await startApp({ logger: (l) => lines.push(String(l)) });
  try {
    const c = await createPoll(app);
    const key = adminKeyOf(c.json);
    const r = await app.req('GET', `/admin/${c.json.pollId}/${key}`);
    assert.equal(r.status, 200);
    const all = lines.join('\n');
    assert.ok(all.includes(`/admin/${c.json.pollId}/<redacted>`), '管理路径必须记为 <redacted>');
    assert.ok(!all.includes(key), '完整密钥不得出现在任何日志输出中');
  } finally {
    await app.close();
  }
});
