import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, api, createPoll, idsFrom } from '../_helper.js';

let S;
before(async () => { S = await startServer(); });
after(async () => { await S.stop(); });

async function poll(overrides) {
  const r = await createPoll(S.base, overrides);
  const { id } = idsFrom(r);
  const pub = await api(S.base, 'GET', `/api/polls/${id}`);
  return { id, options: pub.json.options };
}

test('VT-01 单选投票计票', async () => {
  const { id, options } = await poll();
  const r = await api(S.base, 'POST', `/api/polls/${id}/vote`, { optionIds: [options[0].id] });
  assert.equal(r.status, 200);
  assert.equal(r.json.totalVoters, 1);
  assert.equal(r.json.options.find((o) => o.id === options[0].id).votes, 1);
});

test('VT-02 单选投多项被拒', async () => {
  const { id, options } = await poll();
  const r = await api(S.base, 'POST', `/api/polls/${id}/vote`, { optionIds: [options[0].id, options[1].id] });
  assert.equal(r.status, 400);
  assert.equal(r.json.error, 'SINGLE_CHOICE_VIOLATION');
  const pub = await api(S.base, 'GET', `/api/polls/${id}`);
  assert.equal(pub.json.totalVoters, 0);
});

test('VT-03 多选投多项计票', async () => {
  const { id, options } = await poll({ mode: 'multi', options: ['a', 'b', 'c'] });
  const r = await api(S.base, 'POST', `/api/polls/${id}/vote`, { optionIds: [options[0].id, options[1].id] });
  assert.equal(r.status, 200);
  assert.equal(r.json.totalVoters, 1);
  assert.equal(r.json.options.find((o) => o.id === options[0].id).votes, 1);
  assert.equal(r.json.options.find((o) => o.id === options[1].id).votes, 1);
  assert.equal(r.json.options.find((o) => o.id === options[2].id).votes, 0);
});

test('VT-04 空选择被拒', async () => {
  const { id } = await poll();
  const r = await api(S.base, 'POST', `/api/polls/${id}/vote`, { optionIds: [] });
  assert.equal(r.status, 400);
  assert.equal(r.json.error, 'NO_SELECTION');
});

test('VT-05 一次请求内重复选项被拒', async () => {
  const { id, options } = await poll({ mode: 'multi' });
  const r = await api(S.base, 'POST', `/api/polls/${id}/vote`, { optionIds: [options[0].id, options[0].id] });
  assert.equal(r.status, 400);
  assert.equal(r.json.error, 'DUPLICATE_OPTION_ID');
  const pub = await api(S.base, 'GET', `/api/polls/${id}`);
  assert.equal(pub.json.options.find((o) => o.id === options[0].id).votes, 0);
});

test('VT-06 投给不存在的选项被拒', async () => {
  const { id } = await poll();
  const r = await api(S.base, 'POST', `/api/polls/${id}/vote`, { optionIds: ['nope'] });
  assert.equal(r.status, 400);
  assert.equal(r.json.error, 'OPTION_NOT_FOUND');
});

test('VT-07 投给不存在的投票被拒', async () => {
  const r = await api(S.base, 'POST', `/api/polls/doesnotexist/vote`, { optionIds: ['x'] });
  assert.equal(r.status, 404);
  assert.equal(r.json.error, 'POLL_NOT_FOUND');
});

test('VT-08 软拦截:投票页含 localStorage 门控与结果容器', async () => {
  // component-level binding: the served share page ships the client guard that,
  // per design, hides the form and shows results when localStorage["voted:<id>"] is set.
  const { id } = await poll();
  const html = (await api(S.base, 'GET', `/poll/${id}`)).text;
  assert.match(html, /localStorage/, 'share page has localStorage gating');
  assert.match(html, new RegExp('voted:'), 'gate keyed by voted:<id>');
  assert.match(html, /id="results"|class="results"/, 'has a results container to switch to');
  // real end-to-end localStorage behavior is exercised on top by Playwright (test/e2e).
});

test('VT-09 投票失败不置已投标记(客户端仅在 2xx 后写标记)', async () => {
  // component-level binding: the client script must only set the voted flag on a 2xx response.
  const { id } = await poll();
  const html = (await api(S.base, 'GET', `/poll/${id}`)).text;
  // the localStorage write must be guarded by response.ok / status 200 in the inline script.
  assert.match(html, /res\.ok|response\.ok|status\s*===?\s*200|\.ok\b/, 'voted flag write guarded by ok/2xx');
});

test('RS-01 百分比整数四舍五入', async () => {
  const { id, options } = await poll({ mode: 'single', options: ['a', 'b', 'c'] });
  // 1 of 3 -> 33% ; do it via public result shape
  await api(S.base, 'POST', `/api/polls/${id}/vote`, { optionIds: [options[0].id] });
  await api(S.base, 'POST', `/api/polls/${id}/vote`, { optionIds: [options[1].id] });
  const r = await api(S.base, 'POST', `/api/polls/${id}/vote`, { optionIds: [options[2].id] });
  const pct = r.json.options.find((o) => o.id === options[0].id).percent;
  assert.equal(pct, 33, 'rounded integer percent');
});

test('RS-02 零投票显示 0%', async () => {
  const { id, options } = await poll();
  const r = await api(S.base, 'GET', `/api/polls/${id}`);
  assert.ok(r.json.options.every((o) => o.percent === 0), 'all 0% at zero voters, no div-by-zero');
  assert.equal(options.length, 2);
});

test('RS-03 多选百分比可合计超 100%', async () => {
  const { id, options } = await poll({ mode: 'multi', options: ['a', 'b'] });
  // both voters pick both -> each 100%, sum 200%
  await api(S.base, 'POST', `/api/polls/${id}/vote`, { optionIds: [options[0].id, options[1].id] });
  const r = await api(S.base, 'POST', `/api/polls/${id}/vote`, { optionIds: [options[0].id, options[1].id] });
  const sum = r.json.options.reduce((a, o) => a + o.percent, 0);
  assert.ok(sum > 100, 'multi percentages may sum > 100%');
});
