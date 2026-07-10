import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, createPoll, adminKeyOf } from './helpers.js';

test('VO-01 合法投票计数加一、返回并持久化最新结果', async () => {
  const app = await startApp();
  try {
    const c = await createPoll(app);
    const r = await app.req('POST', `/api/polls/${c.json.pollId}/vote`, { body: { optionIndex: 1 } });
    assert.equal(r.status, 200);
    assert.equal(r.json.options[1].votes, 1);
    assert.equal(r.json.total, 1);
    const file = await app.readPollFile(c.json.pollId);
    assert.equal(file.options[1].votes, 1);
  } finally {
    await app.close();
  }
});

test('VO-02 非法 optionIndex 一律 400 且票数不变', async () => {
  const app = await startApp();
  try {
    const c = await createPoll(app);
    for (const optionIndex of [-1, 99, 1.5, '1', undefined]) {
      const r = await app.req('POST', `/api/polls/${c.json.pollId}/vote`, { body: { optionIndex } });
      assert.equal(r.status, 400, String(optionIndex));
      assert.ok(typeof r.json.error === 'string');
    }
    const file = await app.readPollFile(c.json.pollId);
    assert.deepEqual(file.options.map((o) => o.votes), [0, 0, 0]);
  } finally {
    await app.close();
  }
});

test('VO-03 已关闭投票拒绝投票（409）且票数不变', async () => {
  const app = await startApp();
  try {
    const c = await createPoll(app);
    await app.req('POST', `/api/polls/${c.json.pollId}/close`, { body: { key: adminKeyOf(c.json) } });
    const r = await app.req('POST', `/api/polls/${c.json.pollId}/vote`, { body: { optionIndex: 0 } });
    assert.equal(r.status, 409);
    assert.ok(typeof r.json.error === 'string');
    const file = await app.readPollFile(c.json.pollId);
    assert.deepEqual(file.options.map((o) => o.votes), [0, 0, 0]);
  } finally {
    await app.close();
  }
});

test('VO-04 五十个并发投票不丢票不多计', async () => {
  const app = await startApp();
  try {
    const c = await createPoll(app);
    const results = await Promise.all(
      Array.from({ length: 50 }, () => app.req('POST', `/api/polls/${c.json.pollId}/vote`, { body: { optionIndex: 0 } }))
    );
    const ok = results.filter((r) => r.status === 200).length;
    assert.equal(ok, 50, '几十人规模下全部投票应成功');
    const file = await app.readPollFile(c.json.pollId);
    assert.equal(file.options[0].votes, ok, '持久化总票数必须等于成功响应数');
  } finally {
    await app.close();
  }
});

test('VO-05 对不存在的投票投票返回 404', async () => {
  const app = await startApp();
  try {
    const r = await app.req('POST', `/api/polls/${'A'.repeat(16)}/vote`, { body: { optionIndex: 0 } });
    assert.equal(r.status, 404);
    assert.ok(typeof r.json.error === 'string');
  } finally {
    await app.close();
  }
});
