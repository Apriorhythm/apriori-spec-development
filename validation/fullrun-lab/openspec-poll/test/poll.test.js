import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPoll, castVote, closePoll, isOpen, resultsView } from '../lib/poll.js';

const mk = (over = {}) => buildPoll({ title: 't', options: ['a', 'b', 'c'], ...over });

test('创建校验：合法输入成功', () => {
  const r = mk();
  assert.ok(r.ok);
  assert.equal(r.poll.multi, false);
  assert.equal(r.poll.closed, false);
});

test('创建校验：选项不足 2 个被拒绝（含空白选项过滤）', () => {
  assert.equal(mk({ options: ['a'] }).ok, false);
  assert.equal(mk({ options: ['a', '  ', ''] }).ok, false);
  assert.match(mk({ options: ['a'] }).error, /至少需要 2 个选项/);
});

test('创建校验：标题为空/超长被拒绝', () => {
  assert.equal(mk({ title: '  ' }).ok, false);
  assert.equal(mk({ title: 'x'.repeat(201) }).ok, false);
});

test('创建校验：截止时间不晚于当前时间被拒绝', () => {
  const now = new Date('2026-07-08T12:00:00Z');
  assert.equal(buildPoll({ title: 't', options: ['a', 'b'], deadline: '2026-07-08T11:00:00Z' }, now).ok, false);
  assert.equal(buildPoll({ title: 't', options: ['a', 'b'], deadline: '2026-07-08T12:00:00Z' }, now).ok, false);
  assert.equal(buildPoll({ title: 't', options: ['a', 'b'], deadline: 'not-a-date' }, now).ok, false);
  assert.ok(buildPoll({ title: 't', options: ['a', 'b'], deadline: '2026-07-08T13:00:00Z' }, now).ok);
});

test('创建校验：多选上限范围 2~选项数', () => {
  assert.equal(mk({ multi: true, maxChoices: 1 }).ok, false);
  assert.equal(mk({ multi: true, maxChoices: 4 }).ok, false);
  assert.equal(mk({ multi: true, maxChoices: 1.5 }).ok, false);
  assert.ok(mk({ multi: true, maxChoices: 2 }).ok);
  assert.ok(mk({ multi: true }).ok); // 不限
});

test('投票：单选恰好一项', () => {
  const { poll } = mk();
  assert.ok(castVote(poll, [1]).ok);
  assert.equal(castVote(poll, []).ok, false);
  assert.equal(castVote(poll, [0, 1]).ok, false);
});

test('投票：多选 1~上限，超上限拒绝', () => {
  const { poll } = mk({ multi: true, maxChoices: 2 });
  assert.ok(castVote(poll, [0]).ok);
  assert.ok(castVote(poll, [0, 2]).ok);
  const r = castVote(poll, [0, 1, 2]);
  assert.equal(r.ok, false);
  assert.match(r.error, /最多可选 2 项/);
});

test('投票：非法/重复索引被拒绝', () => {
  const { poll } = mk({ multi: true });
  assert.equal(castVote(poll, [3]).ok, false);
  assert.equal(castVote(poll, [-1]).ok, false);
  assert.equal(castVote(poll, ['1']).ok, false);
  assert.equal(castVote(poll, [1, 1]).ok, false);
});

test('投票：计票准确', () => {
  let { poll } = mk({ multi: true });
  poll = castVote(poll, [0, 2]).poll;
  poll = castVote(poll, [0]).poll;
  assert.deepEqual(poll.counts, [2, 0, 1]);
  assert.equal(poll.totalVoters, 2);
});

test('生命周期：手动关闭后拒绝投票，关闭幂等', () => {
  let { poll } = mk();
  poll = closePoll(poll);
  assert.equal(isOpen(poll), false);
  const r = castVote(poll, [0]);
  assert.equal(r.ok, false);
  assert.match(r.error, /已结束/);
  assert.equal(closePoll(poll).closed, true); // 幂等
});

test('生命周期：截止时间被动判定', () => {
  const now = new Date('2026-07-08T12:00:00Z');
  const { poll } = buildPoll({ title: 't', options: ['a', 'b'], deadline: '2026-07-08T13:00:00Z' }, now);
  assert.equal(isOpen(poll, new Date('2026-07-08T12:59:59Z')), true);
  assert.equal(isOpen(poll, new Date('2026-07-08T13:00:00Z')), false);
  assert.equal(castVote(poll, [0], new Date('2026-07-08T14:00:00Z')).ok, false);
});

test('结果视图：占比以总提交人数为分母，0 票为 0%', () => {
  let { poll } = mk({ multi: true });
  const empty = resultsView(poll);
  assert.deepEqual(empty.rows.map((r) => r.pct), [0, 0, 0]);
  assert.equal(empty.total, 0);

  poll = castVote(poll, [0, 1]).poll;
  poll = castVote(poll, [0]).poll;
  const v = resultsView(poll);
  assert.equal(v.total, 2);
  assert.deepEqual(v.rows.map((r) => r.pct), [100, 50, 0]); // 多选下总和可超 100%
});
