import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, createPoll, adminKeyOf } from './helpers.js';

test('PG-01 首页提供创建表单', async () => {
  const app = await startApp();
  try {
    const r = await app.req('GET', '/');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<form') || r.text.includes('<input'), '含表单输入');
    assert.ok(r.text.includes('标题'));
    assert.ok(r.text.includes('选项'));
  } finally {
    await app.close();
  }
});

test('PG-02 投票页：存在 200（注入 pollId）、不存在 404', async () => {
  const app = await startApp();
  try {
    const c = await createPoll(app);
    const ok = await app.req('GET', `/p/${c.json.pollId}`);
    assert.equal(ok.status, 200);
    assert.ok(ok.text.includes(c.json.pollId), '模板占位符已替换为真实 pollId');
    assert.ok(!ok.text.includes('{{POLL_ID}}'));
    const missing = await app.req('GET', `/p/${'A'.repeat(16)}`);
    assert.equal(missing.status, 404);
  } finally {
    await app.close();
  }
});

test('PG-03 管理页需要正确密钥：正确 200 含关闭入口、错误 404', async () => {
  const app = await startApp();
  try {
    const c = await createPoll(app);
    const good = await app.req('GET', `/admin/${c.json.pollId}/${adminKeyOf(c.json)}`);
    assert.equal(good.status, 200);
    assert.ok(good.text.includes('关闭'), '管理页含关闭入口');
    const bad = await app.req('GET', `/admin/${c.json.pollId}/${'x'.repeat(22)}`);
    assert.equal(bad.status, 404, '错误密钥与不存在同样呈现为 404');
  } finally {
    await app.close();
  }
});
