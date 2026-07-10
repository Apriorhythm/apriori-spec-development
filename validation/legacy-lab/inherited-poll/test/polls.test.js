'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createPolls, PollError } = require('../lib/polls');

function memStore() {
  const data = {};
  return {
    get: (id) => data[id],
    all: () => data,
    put: (p) => {
      data[p.id] = p;
    },
  };
}

function make(now) {
  return createPolls(memStore(), now);
}

test('create：合法输入生成完整 poll 并存入 store', () => {
  const store = memStore();
  const polls = createPolls(store);
  const poll = polls.create({
    question: ' 周五团建去哪 ',
    options: ['烤肉', ' 火锅 ', '', '轰趴馆'],
    multiple: true,
    deadline: null,
  });
  assert.match(poll.id, /^[a-z2-9]{6}$/);
  assert.match(poll.adminToken, /^[a-z2-9]{16}$/);
  assert.equal(poll.question, '周五团建去哪');
  assert.deepEqual(poll.options, ['烤肉', '火锅', '轰趴馆']);
  assert.equal(poll.multiple, true);
  assert.equal(poll.deadline, null);
  assert.equal(poll.closed, false);
  assert.deepEqual(poll.votes, []);
  assert.equal(store.get(poll.id), poll);
});

test('create：问题为空 / 超 200 字被拒', () => {
  const polls = make();
  assert.throws(() => polls.create({ question: '  ', options: ['a', 'b'] }), (e) => e instanceof PollError && e.status === 400 && e.message === '问题不能为空');
  assert.throws(() => polls.create({ question: 'x'.repeat(201), options: ['a', 'b'] }), (e) => e.status === 400 && e.message === '问题不能超过 200 字');
});

test('create：选项数量与长度校验', () => {
  const polls = make();
  assert.throws(() => polls.create({ question: 'q', options: ['只有一个', ' '] }), (e) => e.status === 400 && e.message === '至少需要 2 个选项');
  assert.throws(() => polls.create({ question: 'q', options: Array.from({ length: 21 }, (_, i) => `选项${i}`) }), (e) => e.status === 400 && e.message === '选项不能超过 20 个');
  assert.throws(() => polls.create({ question: 'q', options: ['a', 'b'.repeat(101)] }), (e) => e.status === 400 && e.message === '单个选项不能超过 100 字');
});

test('create：deadline 非法或不在未来被拒；合法则存 ISO 串', () => {
  const now = () => new Date('2026-07-08T12:00:00Z');
  const polls = make(now);
  assert.throws(() => polls.create({ question: 'q', options: ['a', 'b'], deadline: '不是时间' }), (e) => e.status === 400 && e.message === '截止时间格式不正确');
  assert.throws(() => polls.create({ question: 'q', options: ['a', 'b'], deadline: '2026-07-08T11:00:00Z' }), (e) => e.status === 400 && e.message === '截止时间必须晚于当前时间');
  const poll = polls.create({ question: 'q', options: ['a', 'b'], deadline: '2026-07-09T12:00:00Z' });
  assert.equal(poll.deadline, new Date('2026-07-09T12:00:00Z').toISOString());
});

test('getView：公开视图字段齐全、计票正确、不含 adminToken', () => {
  const polls = make();
  const poll = polls.create({ question: 'q', options: ['a', 'b', 'c'], multiple: true });
  polls.vote(poll.id, [0], 'voter-a');
  polls.vote(poll.id, [0, 2], 'voter-b');
  const view = polls.getView(poll.id);
  assert.deepEqual(view.counts, [2, 0, 1]);
  assert.equal(view.total, 2);
  assert.equal(view.open, true);
  assert.equal(view.closed, false);
  assert.ok(!('adminToken' in view));
  assert.ok(!('votes' in view));
});

test('getView：不存在的 id 抛 404', () => {
  const polls = make();
  assert.throws(() => polls.getView('nope42'), (e) => e.status === 404 && e.message === '投票不存在');
});

test('vote：单选只允许一个选项；choices 校验', () => {
  const polls = make();
  const poll = polls.create({ question: 'q', options: ['a', 'b'] });
  assert.throws(() => polls.vote(poll.id, [0, 1], 'voter-a'), (e) => e.status === 400 && e.message === '该投票为单选，只能选择一个选项');
  assert.throws(() => polls.vote(poll.id, [], 'voter-a'), (e) => e.status === 400 && e.message === '请至少选择一个选项');
  assert.throws(() => polls.vote(poll.id, undefined, 'voter-a'), (e) => e.status === 400 && e.message === '请至少选择一个选项');
  assert.throws(() => polls.vote(poll.id, [5], 'voter-a'), (e) => e.status === 400 && e.message === '选项不合法');
  assert.throws(() => polls.vote(poll.id, [0.5], 'voter-a'), (e) => e.status === 400 && e.message === '选项不合法');
  const view = polls.vote(poll.id, [1], 'voter-a');
  assert.deepEqual(view.counts, [0, 1]);
});

test('vote：多选可含多个不重复下标，重复被拒', () => {
  const polls = make();
  const poll = polls.create({ question: 'q', options: ['a', 'b'], multiple: true });
  assert.throws(() => polls.vote(poll.id, [0, 0], 'voter-a'), (e) => e.status === 400 && e.message === '选项不合法');
  const view = polls.vote(poll.id, [0, 1], 'voter-a');
  assert.deepEqual(view.counts, [1, 1]);
  assert.equal(view.total, 1);
});

test('vote：已关闭 409；过截止时间 409 且 open=false', () => {
  let t = new Date('2026-07-08T12:00:00Z');
  const polls = make(() => t);
  const p1 = polls.create({ question: 'q', options: ['a', 'b'] });
  const closed = polls.create({ question: 'q3', options: ['a', 'b'] });
  polls.close(closed.adminToken);
  assert.throws(() => polls.vote(closed.id, [0], 'voter-a'), (e) => e.status === 409 && e.message === '投票已关闭');

  const dated = polls.create({ question: 'q4', options: ['a', 'b'], deadline: '2026-07-08T13:00:00Z' });
  t = new Date('2026-07-08T13:00:01Z');
  assert.throws(() => polls.vote(dated.id, [0], 'voter-a'), (e) => e.status === 409 && e.message === '投票已过截止时间');
  assert.equal(polls.getView(dated.id).open, false);
  assert.equal(polls.getView(p1.id).open, true);
});

test('adminView / close：按 token 取视图、关闭投票；未知 token 404', () => {
  const polls = make();
  const poll = polls.create({ question: 'q', options: ['a', 'b'] });
  const view = polls.adminView(poll.adminToken);
  assert.equal(view.id, poll.id);
  assert.ok(!('adminToken' in view));
  const closedView = polls.close(poll.adminToken);
  assert.equal(closedView.closed, true);
  assert.equal(closedView.open, false);
  assert.throws(() => polls.adminView('0'.repeat(16)), (e) => e.status === 404 && e.message === '管理链接不存在');
  assert.throws(() => polls.close('0'.repeat(16)), (e) => e.status === 404 && e.message === '管理链接不存在');
});

test('create：新 poll 记录带 voters: []', () => {
  const polls = make();
  const poll = polls.create({ question: 'q', options: ['a', 'b'] });
  assert.deepEqual(poll.voters, []);
});

test('VD-02 同一标识对同一 poll 重复投票 → 409 固定文案，total 不变', () => {
  const polls = make();
  const poll = polls.create({ question: 'q', options: ['a', 'b'] });
  polls.vote(poll.id, [0], 'voter-a');
  assert.throws(
    () => polls.vote(poll.id, [1], 'voter-a'),
    (e) => e instanceof PollError && e.status === 409 && e.message === '你已经投过这个投票了'
  );
  assert.equal(polls.getView(poll.id).total, 1);
});

test('VD-03 同一标识重放 3 次：仅第一次成功，其余 409，票数只 +1', () => {
  const polls = make();
  const poll = polls.create({ question: 'q', options: ['a', 'b'] });
  const results = [];
  for (let i = 0; i < 3; i++) {
    try {
      polls.vote(poll.id, [0], 'voter-a');
      results.push(200);
    } catch (e) {
      results.push(e.status);
    }
  }
  assert.deepEqual(results, [200, 409, 409]);
  assert.equal(polls.getView(poll.id).total, 1);
  assert.deepEqual(polls.getView(poll.id).counts, [1, 0]);
});

test('VD-05 同一标识可对不同 poll 各投一票，互不影响', () => {
  const polls = make();
  const p1 = polls.create({ question: 'q1', options: ['a', 'b'] });
  const p2 = polls.create({ question: 'q2', options: ['x', 'y'] });
  polls.vote(p1.id, [0], 'voter-a');
  const v2 = polls.vote(p2.id, [1], 'voter-a');
  assert.equal(v2.total, 1);
  assert.equal(polls.getView(p1.id, 'voter-a').voted, true);
  assert.equal(polls.getView(p2.id, 'voter-a').voted, true);
  assert.equal(polls.getView(p2.id, 'voter-b').voted, false);
});

test('getView：voted 契约 —— 已投 true / 未投 false / 不带标识 false', () => {
  const polls = make();
  const poll = polls.create({ question: 'q', options: ['a', 'b'] });
  assert.equal(polls.getView(poll.id, 'voter-a').voted, false);
  const afterVote = polls.vote(poll.id, [0], 'voter-a');
  assert.equal(afterVote.voted, true);
  assert.equal(polls.getView(poll.id, 'voter-a').voted, true);
  assert.equal(polls.getView(poll.id, 'voter-b').voted, false);
  assert.equal(polls.getView(poll.id).voted, false);
});

test('旧数据兼容（DES-001 回归）：无 voters 字段的存量 poll 不抛错，可正常查看与投票', () => {
  const store = memStore();
  const polls = createPolls(store);
  // 直接注入一条本次改动之前形态的存量记录：有 votes、无 voters
  store.put({
    id: 'legacy',
    adminToken: 't'.repeat(16),
    question: '旧投票',
    options: ['a', 'b'],
    multiple: false,
    deadline: null,
    closed: false,
    votes: [[0], [1]],
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  const view = polls.getView('legacy', 'voter-a');
  assert.equal(view.total, 2);
  assert.equal(view.voted, false);
  const after = polls.vote('legacy', [1], 'voter-a');
  assert.equal(after.total, 3);
  assert.equal(after.voted, true);
  assert.deepEqual(store.get('legacy').voters, ['voter-a']);
});

test('隐私边界：公开视图不含 voters / votes / adminToken；voted 为派生布尔', () => {
  const polls = make();
  const poll = polls.create({ question: 'q', options: ['a', 'b'] });
  polls.vote(poll.id, [0], 'voter-a');
  const view = polls.getView(poll.id, 'voter-a');
  assert.ok(!('voters' in view));
  assert.ok(!('votes' in view));
  assert.ok(!('adminToken' in view));
  assert.equal(typeof view.voted, 'boolean');
});

test('adminView：不含 voted 字段（管理视图无请求方语境）', () => {
  const polls = make();
  const poll = polls.create({ question: 'q', options: ['a', 'b'] });
  polls.vote(poll.id, [0], 'voter-a');
  const admin = polls.adminView(poll.adminToken);
  assert.ok(!('voted' in admin));
  assert.ok(!('voters' in admin));
});
