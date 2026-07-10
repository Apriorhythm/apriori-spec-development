import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, createPoll, adminKeyOf } from './helpers.js';

test('CL-01 有效关闭：持久化 closed、其后投票 409、结果可读', async () => {
  const app = await startApp();
  try {
    const c = await createPoll(app);
    const r = await app.req('POST', `/api/polls/${c.json.pollId}/close`, { body: { key: adminKeyOf(c.json) } });
    assert.equal(r.status, 200);
    assert.equal((await app.readPollFile(c.json.pollId)).status, 'closed');
    const v = await app.req('POST', `/api/polls/${c.json.pollId}/vote`, { body: { optionIndex: 0 } });
    assert.equal(v.status, 409);
    const res = await app.req('GET', `/api/polls/${c.json.pollId}`);
    assert.equal(res.status, 200);
    assert.equal(res.json.status, 'closed');
  } finally {
    await app.close();
  }
});

test('CL-02 错误密钥被拒（403）且状态不变', async () => {
  const app = await startApp();
  try {
    const c = await createPoll(app);
    const r = await app.req('POST', `/api/polls/${c.json.pollId}/close`, { body: { key: 'x'.repeat(22) } });
    assert.equal(r.status, 403);
    assert.ok(typeof r.json.error === 'string');
    assert.equal((await app.readPollFile(c.json.pollId)).status, 'open');
  } finally {
    await app.close();
  }
});

test('CL-03 重复关闭幂等（200）', async () => {
  const app = await startApp();
  try {
    const c = await createPoll(app);
    const key = adminKeyOf(c.json);
    const r1 = await app.req('POST', `/api/polls/${c.json.pollId}/close`, { body: { key } });
    const r2 = await app.req('POST', `/api/polls/${c.json.pollId}/close`, { body: { key } });
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    assert.equal((await app.readPollFile(c.json.pollId)).status, 'closed');
  } finally {
    await app.close();
  }
});

test('CL-04 关闭不存在的投票返回 404', async () => {
  const app = await startApp();
  try {
    const r = await app.req('POST', `/api/polls/${'A'.repeat(16)}/close`, { body: { key: 'x'.repeat(22) } });
    assert.equal(r.status, 404);
    assert.ok(typeof r.json.error === 'string');
  } finally {
    await app.close();
  }
});
