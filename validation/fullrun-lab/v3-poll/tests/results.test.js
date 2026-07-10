import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fsp from 'node:fs/promises';
import { startApp, createPoll } from './helpers.js';

test('RE-01 结果数据完整、顺序保持、不含管理密钥', async () => {
  const app = await startApp();
  try {
    const c = await createPoll(app);
    await app.req('POST', `/api/polls/${c.json.pollId}/vote`, { body: { optionIndex: 0 } });
    await app.req('POST', `/api/polls/${c.json.pollId}/vote`, { body: { optionIndex: 2 } });
    const r = await app.req('GET', `/api/polls/${c.json.pollId}`);
    assert.equal(r.status, 200);
    assert.equal(r.json.title, '午饭吃什么');
    assert.deepEqual(r.json.options.map((o) => o.text), ['火锅', '麻辣烫', '沙拉']);
    assert.deepEqual(r.json.options.map((o) => o.votes), [1, 0, 1]);
    assert.equal(r.json.status, 'open');
    assert.equal(r.json.total, 2);
    assert.ok(!('adminKey' in r.json));
  } finally {
    await app.close();
  }
});

test('RE-02 不存在的投票返回 404', async () => {
  const app = await startApp();
  try {
    const r = await app.req('GET', `/api/polls/${'A'.repeat(16)}`);
    assert.equal(r.status, 404);
    assert.ok(typeof r.json.error === 'string');
  } finally {
    await app.close();
  }
});

test('RE-03 损坏数据文件返回 500、服务不崩溃、文件不被改写', async () => {
  const app = await startApp();
  try {
    const c = await createPoll(app);
    const file = path.join(app.dataDir, c.json.pollId + '.json');
    await fsp.writeFile(file, '{broken json');
    const r = await app.req('GET', `/api/polls/${c.json.pollId}`);
    assert.equal(r.status, 500);
    assert.ok(typeof r.json.error === 'string');
    const alive = await app.req('GET', '/');
    assert.equal(alive.status, 200, '服务必须仍然存活');
    assert.equal(await fsp.readFile(file, 'utf8'), '{broken json', '损坏文件不得被改写或重置');
  } finally {
    await app.close();
  }
});
