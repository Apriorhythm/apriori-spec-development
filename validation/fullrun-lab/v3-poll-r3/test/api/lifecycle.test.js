import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, api, createPoll, idsFrom } from '../_helper.js';

let S;
before(async () => { S = await startServer(); });
after(async () => { await S.stop(); });

async function poll(overrides) {
  const r = await createPoll(S.base, overrides);
  const meta = idsFrom(r);
  const pub = await api(S.base, 'GET', `/api/polls/${meta.id}`);
  return { ...meta, options: pub.json.options };
}

test('CL-01 手动关闭后拒新票', async () => {
  const { id, token, options } = await poll();
  const c = await api(S.base, 'POST', `/api/polls/${id}/close`, { adminToken: token });
  assert.ok(c.status >= 200 && c.status < 300, 'close 2xx');
  const pub = await api(S.base, 'GET', `/api/polls/${id}`);
  assert.equal(pub.json.status, 'closed');
  const v = await api(S.base, 'POST', `/api/polls/${id}/vote`, { optionIds: [options[0].id] });
  assert.equal(v.status, 409);
  assert.equal(v.json.error, 'POLL_CLOSED');
  const still = await api(S.base, 'GET', `/api/polls/${id}`);
  assert.equal(still.status, 200, 'results still viewable');
});

test('CL-02 到点自动关闭拒新票', async () => {
  const soon = new Date(Date.now() + 400).toISOString();
  const { id, options } = await poll({ deadline: soon });
  await new Promise((r) => setTimeout(r, 700));
  const v = await api(S.base, 'POST', `/api/polls/${id}/vote`, { optionIds: [options[0].id] });
  assert.equal(v.status, 409);
  assert.equal(v.json.error, 'POLL_CLOSED');
});

test('CL-03 无 token 关闭被拒', async () => {
  const { id } = await poll();
  const c = await api(S.base, 'POST', `/api/polls/${id}/close`, {});
  assert.equal(c.status, 403);
  assert.equal(c.json.error, 'INVALID_ADMIN_TOKEN');
  const pub = await api(S.base, 'GET', `/api/polls/${id}`);
  assert.equal(pub.json.status, 'open');
});

test('CL-04 错误 token 关闭被拒', async () => {
  const { id } = await poll();
  const c = await api(S.base, 'POST', `/api/polls/${id}/close`, { adminToken: 'deadbeef'.repeat(4) });
  assert.equal(c.status, 403);
  assert.equal(c.json.error, 'INVALID_ADMIN_TOKEN');
});

test('CL-04b 关闭 token 可经 X-Admin-Token header 提供', async () => {
  const { id, token } = await poll();
  const c = await api(S.base, 'POST', `/api/polls/${id}/close`, undefined, { 'X-Admin-Token': token, 'Content-Type': 'application/json' });
  assert.ok(c.status >= 200 && c.status < 300);
});

test('CL-03 body 提供空 token 时不回退 header,body 优先 (GAP-2)', async () => {
  const { id, token } = await poll();
  // body has adminToken:"" (present but empty) AND a valid header token.
  // body wins by presence -> empty token must be rejected, not silently accepted via header.
  const c = await api(S.base, 'POST', `/api/polls/${id}/close`, { adminToken: '' }, { 'X-Admin-Token': token, 'Content-Type': 'application/json' });
  assert.equal(c.status, 403);
  assert.equal(c.json.error, 'INVALID_ADMIN_TOKEN');
  const pub = await api(S.base, 'GET', `/api/polls/${id}`);
  assert.equal(pub.json.status, 'open', 'poll not closed by header fallback');
});

test('CL-04 长度不同的错误 token 也被拒 (GAP-3 constant-time path)', async () => {
  const { id } = await poll();
  const c = await api(S.base, 'POST', `/api/polls/${id}/close`, { adminToken: 'short' });
  assert.equal(c.status, 403);
  assert.equal(c.json.error, 'INVALID_ADMIN_TOKEN');
});

test('CL-05 重复关闭幂等', async () => {
  const { id, token } = await poll();
  await api(S.base, 'POST', `/api/polls/${id}/close`, { adminToken: token });
  const c2 = await api(S.base, 'POST', `/api/polls/${id}/close`, { adminToken: token });
  assert.ok(c2.status >= 200 && c2.status < 300, 'repeat close idempotent 2xx');
  const pub = await api(S.base, 'GET', `/api/polls/${id}`);
  assert.equal(pub.json.status, 'closed');
});

test('CL-06 deadline 过期持久化 closed', async () => {
  const soon = new Date(Date.now() + 300).toISOString();
  const { id } = await poll({ deadline: soon });
  await new Promise((r) => setTimeout(r, 600));
  // a read triggers lazy-close persistence
  await api(S.base, 'GET', `/api/polls/${id}`);
  const raw = await S.store.load(id);
  assert.equal(raw.status, 'closed', 'status persisted to disk as closed');
});

test('CL-09 过期后首次请求是投票也持久化 closed (GAP-4)', async () => {
  const soon = new Date(Date.now() + 300).toISOString();
  const { id, options } = await poll({ deadline: soon });
  await new Promise((r) => setTimeout(r, 600));
  // first access after expiry is a VOTE (not a read)
  const v = await api(S.base, 'POST', `/api/polls/${id}/vote`, { optionIds: [options[0].id] });
  assert.equal(v.status, 409);
  assert.equal(v.json.error, 'POLL_CLOSED');
  const raw = await S.store.load(id);
  assert.equal(raw.status, 'closed', 'lazy-close persisted even though the vote was rejected');
  assert.equal(raw.totalVoters, 0, 'rejected vote not counted');
});

test('CL-07 已关闭投票的分享页只读', async () => {
  const { id, token } = await poll();
  await api(S.base, 'POST', `/api/polls/${id}/close`, { adminToken: token });
  const html = (await api(S.base, 'GET', `/poll/${id}`)).text;
  assert.doesNotMatch(html, /<form[^>]*data-vote|id="vote-form"/, 'no vote form on closed share page');
  assert.match(html, /已关闭|closed/i, 'shows closed state');
});

test('CL-08 已过期投票的分享页只读', async () => {
  const soon = new Date(Date.now() + 300).toISOString();
  const { id } = await poll({ deadline: soon });
  await new Promise((r) => setTimeout(r, 600));
  const html = (await api(S.base, 'GET', `/poll/${id}`)).text;
  assert.doesNotMatch(html, /id="vote-form"/, 'no vote form on expired share page');
});
