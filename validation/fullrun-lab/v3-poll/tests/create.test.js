import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, createPoll, adminKeyOf } from './helpers.js';

test('CR-01 合法创建返回双链接（origin 取自 Host 头）且文件符合 schema', async () => {
  const app = await startApp();
  try {
    const r = await createPoll(app, undefined, undefined);
    assert.equal(r.status, 201);
    const { pollId, voteUrl, adminUrl } = r.json;
    assert.match(pollId, /^[A-Za-z0-9_-]{16}$/);
    // Host 头决定 origin
    const r2 = await app.req('POST', '/api/polls', {
      body: { title: '谁请客', options: ['小明', '小红'] },
      headers: { host: '10.0.0.5:3000' },
    });
    assert.equal(r2.status, 201);
    assert.equal(r2.json.voteUrl, `http://10.0.0.5:3000/p/${r2.json.pollId}`);
    assert.ok(r2.json.adminUrl.startsWith(`http://10.0.0.5:3000/admin/${r2.json.pollId}/`));
    assert.ok(voteUrl.includes(`/p/${pollId}`) && adminUrl.includes(`/admin/${pollId}/`));
    // 落盘 schema
    const file = await app.readPollFile(pollId);
    assert.equal(file.schemaVersion, 1);
    assert.equal(file.status, 'open');
    assert.deepEqual(file.options.map((o) => o.votes), [0, 0, 0]);
    assert.equal(file.multiChoice, false);
    assert.equal(file.deadline, null);
    assert.ok(!Number.isNaN(Date.parse(file.createdAt)));
  } finally {
    await app.close();
  }
});

test('CR-02 管理密钥强度达标且不泄漏到公开面', async () => {
  const app = await startApp();
  try {
    const r = await createPoll(app);
    const key = adminKeyOf(r.json);
    assert.match(key, /^[A-Za-z0-9_-]{22,}$/);
    const results = await app.req('GET', `/api/polls/${r.json.pollId}`);
    assert.ok(!results.text.includes(key), '结果 API 不得含管理密钥');
    const page = await app.req('GET', `/p/${r.json.pollId}`);
    assert.ok(!page.text.includes(key), '投票页不得含管理密钥');
  } finally {
    await app.close();
  }
});

test('CR-03 非法创建输入被拒（400+error）且不产生文件', async () => {
  const app = await startApp();
  try {
    const bads = [
      { title: '   ', options: ['A', 'B'] },
      { title: 'x', options: ['A', '  '] },
      { title: 'x', options: Array.from({ length: 21 }, (_, i) => `o${i}`) },
      { title: 'x'.repeat(121), options: ['A', 'B'] },
      { title: 'x', options: ['A', 'y'.repeat(81)] },
      { title: 'x', options: [' A', 'A '] },
    ];
    for (const body of bads) {
      const r = await app.req('POST', '/api/polls', { body });
      assert.equal(r.status, 400, JSON.stringify(body));
      assert.ok(r.json && typeof r.json.error === 'string');
    }
    const { readdir } = await import('node:fs/promises');
    const files = (await readdir(app.dataDir)).filter((f) => f.endsWith('.json'));
    assert.equal(files.length, 0, '非法创建不得留下投票文件');
  } finally {
    await app.close();
  }
});

test('CR-04 trim、空项过滤与顺序保持', async () => {
  const app = await startApp();
  try {
    const r = await app.req('POST', '/api/polls', { body: { title: '  投票  ', options: ['  A  ', '', 'B', '   '] } });
    assert.equal(r.status, 201);
    const file = await app.readPollFile(r.json.pollId);
    assert.equal(file.title, '投票');
    assert.deepEqual(file.options.map((o) => o.text), ['A', 'B']);
  } finally {
    await app.close();
  }
});

test('CR-05 pollId 冲突时重新生成、绝不覆盖已有投票', async () => {
  const { makeIds } = await import('../lib/ids.js');
  const real = makeIds();
  const idQueue = [];
  const ids = { pollId: () => (idQueue.length ? idQueue.shift() : real.pollId()), adminKey: () => real.adminKey() };
  const app = await startApp({ ids });
  try {
    const first = await createPoll(app);
    const existingId = first.json.pollId;
    const before = JSON.stringify(await app.readPollFile(existingId));
    const freshId = 'Zz9_' + 'a'.repeat(12);
    idQueue.push(existingId, freshId); // 生成器先撞已有 id，再给新 id
    const r = await app.req('POST', '/api/polls', { body: { title: '第二个', options: ['甲', '乙'] } });
    assert.equal(r.status, 201);
    assert.equal(r.json.pollId, freshId);
    assert.match(r.json.pollId, /^[A-Za-z0-9_-]{16}$/);
    assert.equal(JSON.stringify(await app.readPollFile(existingId)), before, '已有投票文件必须原样保留');
    assert.equal((await app.readPollFile(freshId)).title, '第二个');
  } finally {
    await app.close();
  }
});
