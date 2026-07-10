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
  polls.vote(poll.id, [0]);
  polls.vote(poll.id, [0, 2]);
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
  assert.throws(() => polls.vote(poll.id, [0, 1]), (e) => e.status === 400 && e.message === '该投票为单选，只能选择一个选项');
  assert.throws(() => polls.vote(poll.id, []), (e) => e.status === 400 && e.message === '请至少选择一个选项');
  assert.throws(() => polls.vote(poll.id, undefined), (e) => e.status === 400 && e.message === '请至少选择一个选项');
  assert.throws(() => polls.vote(poll.id, [5]), (e) => e.status === 400 && e.message === '选项不合法');
  assert.throws(() => polls.vote(poll.id, [0.5]), (e) => e.status === 400 && e.message === '选项不合法');
  const view = polls.vote(poll.id, [1]);
  assert.deepEqual(view.counts, [0, 1]);
});

test('vote：多选可含多个不重复下标，重复被拒', () => {
  const polls = make();
  const poll = polls.create({ question: 'q', options: ['a', 'b'], multiple: true });
  assert.throws(() => polls.vote(poll.id, [0, 0]), (e) => e.status === 400 && e.message === '选项不合法');
  const view = polls.vote(poll.id, [0, 1]);
  assert.deepEqual(view.counts, [1, 1]);
  assert.equal(view.total, 1);
});

test('vote：已关闭 409；过截止时间 409 且 open=false', () => {
  let t = new Date('2026-07-08T12:00:00Z');
  const polls = make(() => t);
  const p1 = polls.create({ question: 'q', options: ['a', 'b'] });
  const closed = polls.create({ question: 'q3', options: ['a', 'b'] });
  polls.close(closed.adminToken);
  assert.throws(() => polls.vote(closed.id, [0]), (e) => e.status === 409 && e.message === '投票已关闭');

  const dated = polls.create({ question: 'q4', options: ['a', 'b'], deadline: '2026-07-08T13:00:00Z' });
  t = new Date('2026-07-08T13:00:01Z');
  assert.throws(() => polls.vote(dated.id, [0]), (e) => e.status === 409 && e.message === '投票已过截止时间');
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
