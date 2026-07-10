import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, api, createPoll, idsFrom } from '../_helper.js';

let S;
before(async () => { S = await startServer(); });
after(async () => { await S.stop(); });

test('SEC-01 admin token 不泄露给投票人', async () => {
  const r = await createPoll(S.base);
  const { id, token } = idsFrom(r);
  // public result API must not contain the token
  const pub = await api(S.base, 'GET', `/api/polls/${id}`);
  assert.ok(!pub.text.includes(token), 'public API leaks token');
  // share page HTML must not contain the token
  const share = await api(S.base, 'GET', `/poll/${id}`);
  assert.ok(!share.text.includes(token), 'share page leaks token');
});

test('SEC-02 标题/选项 HTML 被转义(SSR)', async () => {
  const payload = '<script>alert(1)</script>';
  const r = await createPoll(S.base, { title: payload, options: ['<img src=x onerror=1>', 'ok'] });
  assert.equal(r.status, 201);
  const { id } = idsFrom(r);
  const share = (await api(S.base, 'GET', `/poll/${id}`)).text;
  assert.ok(!share.includes('<script>alert(1)</script>'), 'raw script must be escaped in SSR');
  assert.ok(share.includes('&lt;script&gt;') || share.includes('&lt;script&gt;alert'), 'title escaped');
  assert.ok(!share.includes('<img src=x onerror=1>'), 'raw option html must be escaped');
});

test('SEC-02b path traversal 的 poll id 被拒(不越出数据目录)', async () => {
  const r = await api(S.base, 'GET', `/api/polls/${encodeURIComponent('../../etc/passwd')}`);
  assert.ok(r.status === 404 || r.status === 400, 'traversal id rejected');
});
