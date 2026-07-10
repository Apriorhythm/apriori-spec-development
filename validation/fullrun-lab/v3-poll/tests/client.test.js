import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPoller, votedState, markVoted } from '../public/poll-core.js';

const tick = () => new Promise((r) => setTimeout(r, 0));

test('PG-04 结果以 3000ms 间隔轮询；单次失败保留上次结果', async () => {
  const intervals = [];
  const updates = [];
  let fail = false;
  let n = 0;
  const poller = createPoller({
    fetchResults: async () => {
      if (fail) throw new Error('network down');
      return { total: ++n };
    },
    onUpdate: (r) => updates.push(r),
    setIntervalFn: (fn, ms) => (intervals.push({ fn, ms }), 0),
    intervalMs: 3000,
  });
  poller.start();
  await tick();
  assert.equal(intervals.length, 1);
  assert.equal(intervals[0].ms, 3000, '轮询间隔必须是 3000ms');
  assert.deepEqual(updates, [{ total: 1 }], '启动即拉取一次');
  await intervals[0].fn();
  assert.deepEqual(updates.at(-1), { total: 2 });
  fail = true;
  await intervals[0].fn();
  await tick();
  assert.equal(updates.length, 2, '拉取失败时不更新（保留上次结果）');
  fail = false;
  await intervals[0].fn();
  assert.equal(updates.length, 3, '失败后下一轮继续');
});

test('PG-05 已投标记锁定投票；storage 不可用时退化为允许投票', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  assert.equal(votedState({ storage, pollId: 'p1' }), 'can-vote');
  markVoted({ storage, pollId: 'p1' });
  assert.equal(votedState({ storage, pollId: 'p1' }), 'voted', '投过之后锁定');
  assert.equal(votedState({ storage, pollId: 'p2' }), 'can-vote', '标记按投票隔离');
  const broken = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('SecurityError'); },
  };
  assert.equal(votedState({ storage: broken, pollId: 'p1' }), 'can-vote', 'storage 异常退化为允许投票');
  assert.doesNotThrow(() => markVoted({ storage: broken, pollId: 'p1' }));
});
