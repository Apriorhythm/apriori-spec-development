import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, api, createPoll, idsFrom } from '../_helper.js';

let S;
before(async () => { S = await startServer(); });
after(async () => { await S.stop(); });

test('PC-01 创建合法投票返回两条链接', async () => {
  const r = await createPoll(S.base);
  assert.equal(r.status, 201);
  assert.ok(r.json.shareUrl, 'has shareUrl');
  assert.ok(r.json.adminUrl, 'has adminUrl');
  const { id, token } = idsFrom(r);
  assert.ok(id && token);
  assert.ok(!r.json.shareUrl.includes(token), 'shareUrl must not leak admin token');
  const pub = await api(S.base, 'GET', `/api/polls/${id}`);
  assert.equal(pub.json.status, 'open');
  assert.equal(pub.json.mode, 'single');
  assert.equal(pub.json.totalVoters, 0);
  assert.ok(pub.json.options.every((o) => o.votes === 0));
});

test('PC-02 选项少于 2 个被拒', async () => {
  const r = await createPoll(S.base, { options: ['只有一个'] });
  assert.equal(r.status, 400);
  assert.equal(r.json.error, 'OPTION_COUNT_OUT_OF_RANGE');
});

test('PC-03 恰好 10 个选项创建成功', async () => {
  const opts = Array.from({ length: 10 }, (_, i) => 'opt' + i);
  const r = await createPoll(S.base, { options: opts });
  assert.equal(r.status, 201);
  const { id } = idsFrom(r);
  const pub = await api(S.base, 'GET', `/api/polls/${id}`);
  assert.equal(pub.json.options.length, 10);
});

test('PC-04 选项多于 10 个被拒', async () => {
  const opts = Array.from({ length: 11 }, (_, i) => 'opt' + i);
  const r = await createPoll(S.base, { options: opts });
  assert.equal(r.status, 400);
  assert.equal(r.json.error, 'OPTION_COUNT_OUT_OF_RANGE');
});

test('PC-05 空白标题被拒', async () => {
  const r = await createPoll(S.base, { title: '   ' });
  assert.equal(r.status, 400);
  assert.equal(r.json.error, 'TITLE_REQUIRED');
});

test('PC-06 标题超长被拒', async () => {
  const r = await createPoll(S.base, { title: 'x'.repeat(101) });
  assert.equal(r.status, 400);
  assert.equal(r.json.error, 'TITLE_TOO_LONG');
});

test('PC-07 空白选项被拒', async () => {
  const r = await createPoll(S.base, { options: ['ok', '   '] });
  assert.equal(r.status, 400);
  assert.equal(r.json.error, 'OPTION_REQUIRED');
});

test('PC-08 选项超长被拒', async () => {
  const r = await createPoll(S.base, { options: ['ok', 'y'.repeat(51)] });
  assert.equal(r.status, 400);
  assert.equal(r.json.error, 'OPTION_TOO_LONG');
});

test('PC-09 mode 缺省为 single', async () => {
  const r = await createPoll(S.base);
  const { id } = idsFrom(r);
  const pub = await api(S.base, 'GET', `/api/polls/${id}`);
  assert.equal(pub.json.mode, 'single');
});

test('PC-10 非法 mode 被拒', async () => {
  const r = await createPoll(S.base, { mode: 'ranked' });
  assert.equal(r.status, 400);
  assert.equal(r.json.error, 'INVALID_MODE');
});

test('PC-11 过去/等于当前的 deadline 被拒', async () => {
  const past = new Date(Date.now() - 1000).toISOString();
  const r = await createPoll(S.base, { deadline: past });
  assert.equal(r.status, 400);
  assert.equal(r.json.error, 'DEADLINE_IN_PAST');
});

test('PC-12 不可解析的 deadline 被拒', async () => {
  const r = await createPoll(S.base, { deadline: 'not-a-date' });
  assert.equal(r.status, 400);
  assert.equal(r.json.error, 'INVALID_DEADLINE');
});

test('PC-12 非 ISO 但可被 Date.parse 解析的串也被拒 (GAP-1)', async () => {
  const r = await createPoll(S.base, { deadline: '01/02/2999' }); // parseable by V8 but not ISO 8601
  assert.equal(r.status, 400);
  assert.equal(r.json.error, 'INVALID_DEADLINE');
});

test('PC-13 malformed JSON 被拒', async () => {
  const r = await api(S.base, 'POST', '/api/polls', '{ this is not json ', { 'Content-Type': 'application/json' });
  assert.equal(r.status, 400);
  assert.equal(r.json.error, 'INVALID_JSON');
});

test('PC-14 字段缺失/类型错误被拒', async () => {
  const r = await api(S.base, 'POST', '/api/polls', { title: 123, options: 'nope' });
  assert.equal(r.status, 400);
  assert.equal(r.json.error, 'INVALID_PAYLOAD');
});

test('PC-15 请求体超过 16 KiB 被拒', async () => {
  const big = { title: 'x', options: ['a', 'b'], pad: 'y'.repeat(17000) };
  const r = await api(S.base, 'POST', '/api/polls', big);
  assert.equal(r.status, 413);
  assert.equal(r.json.error, 'PAYLOAD_TOO_LARGE');
});

test('PC-16 缺失/错误 Content-Type 被拒', async () => {
  const r = await api(S.base, 'POST', '/api/polls', JSON.stringify({ title: 'x', options: ['a', 'b'] }), { 'Content-Type': 'text/plain' });
  assert.equal(r.status, 415);
  assert.equal(r.json.error, 'UNSUPPORTED_MEDIA_TYPE');
});
