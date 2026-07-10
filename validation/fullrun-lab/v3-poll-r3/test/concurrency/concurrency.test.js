import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, api, createPoll, idsFrom } from '../_helper.js';

test('CC-01 并发投票不丢票', async () => {
  const S = await startServer();
  try {
    const r = await createPoll(S.base, { mode: 'single', options: ['a', 'b', 'c', 'd'] });
    const { id } = idsFrom(r);
    const pub = await api(S.base, 'GET', `/api/polls/${id}`);
    const optIds = pub.json.options.map((o) => o.id);
    const N = 50;
    const reqs = Array.from({ length: N }, (_, i) =>
      api(S.base, 'POST', `/api/polls/${id}/vote`, { optionIds: [optIds[i % optIds.length]] })
    );
    const results = await Promise.all(reqs);
    const ok = results.filter((x) => x.status === 200).length;
    assert.equal(ok, N, 'all concurrent votes succeed');
    const final = await api(S.base, 'GET', `/api/polls/${id}`);
    assert.equal(final.json.totalVoters, N, 'no lost votes');
    const sum = final.json.options.reduce((a, o) => a + o.votes, 0);
    assert.equal(sum, N, 'vote counts sum equals successful requests');
  } finally { await S.stop(); }
});

test('CC-03 close 与 vote 并发被串行化', async () => {
  const S = await startServer();
  try {
    const r = await createPoll(S.base, { mode: 'single', options: ['a', 'b'] });
    const { id, token } = idsFrom(r);
    const pub = await api(S.base, 'GET', `/api/polls/${id}`);
    const opt = pub.json.options[0].id;
    // fire many votes and a close concurrently
    const votes = Array.from({ length: 30 }, () =>
      api(S.base, 'POST', `/api/polls/${id}/vote`, { optionIds: [opt] })
    );
    const close = api(S.base, 'POST', `/api/polls/${id}/close`, { adminToken: token });
    const [closeRes, ...voteRes] = await Promise.all([close, ...votes]);
    assert.ok(closeRes.status >= 200 && closeRes.status < 300);
    const accepted = voteRes.filter((x) => x.status === 200).length;
    const rejected = voteRes.filter((x) => x.status === 409).length;
    assert.equal(accepted + rejected, voteRes.length, 'every vote is either counted or 409, none lost/errored');
    const final = await api(S.base, 'GET', `/api/polls/${id}`);
    assert.equal(final.json.status, 'closed');
    assert.equal(final.json.totalVoters, accepted, 'final count equals accepted votes (no race loss/over-count)');
  } finally { await S.stop(); }
});

test('CC-04 持久化失败不谎报成功,且不毒化队列', async () => {
  let failNext = false;
  const S = await startServer({
    storeOpts: {
      // wrap the real atomic write; when armed, throw to simulate a disk failure
      injectFailure: () => failNext,
    },
  });
  try {
    const r = await createPoll(S.base, { mode: 'single', options: ['a', 'b'] });
    const { id } = idsFrom(r);
    const pub = await api(S.base, 'GET', `/api/polls/${id}`);
    const opt = pub.json.options[0].id;
    failNext = true;
    const bad = await api(S.base, 'POST', `/api/polls/${id}/vote`, { optionIds: [opt] });
    assert.equal(bad.status, 500);
    assert.equal(bad.json.error, 'PERSIST_FAILED');
    // count must be unchanged and file still parseable
    const raw = await S.store.load(id);
    assert.equal(raw.totalVoters, 0, 'failed persist did not change count');
    // queue not poisoned: a subsequent good vote must succeed
    failNext = false;
    const good = await api(S.base, 'POST', `/api/polls/${id}/vote`, { optionIds: [opt] });
    assert.equal(good.status, 200, 'queue not poisoned after a persist failure');
    assert.equal(good.json.totalVoters, 1);
  } finally { await S.stop(); }
});

test('CC-05 提交(rename)后目录 fsync 失败不谎报失败', async () => {
  let failDirSync = false;
  const S = await startServer({
    storeOpts: { injectDirSyncFailure: () => failDirSync },
  });
  try {
    const r = await createPoll(S.base, { mode: 'single', options: ['a', 'b'] });
    const { id } = idsFrom(r);
    const pub = await api(S.base, 'GET', `/api/polls/${id}`);
    const opt = pub.json.options[0].id;
    failDirSync = true; // rename will succeed; the post-commit dir fsync will fail
    const res = await api(S.base, 'POST', `/api/polls/${id}/vote`, { optionIds: [opt] });
    // commit point already passed -> must NOT report 500; the vote is persisted & visible
    assert.equal(res.status, 200, 'committed write must not be reported as PERSIST_FAILED');
    assert.equal(res.json.totalVoters, 1);
    const raw = await S.store.load(id);
    assert.equal(raw.totalVoters, 1, 'vote is on disk (committed via rename)');
  } finally { await S.stop(); }
});
