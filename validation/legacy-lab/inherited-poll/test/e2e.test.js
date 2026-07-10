'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../server');
const { chromium } = require('playwright');

test('浏览器冒烟：建投票→投票→看结果→刷新后不能再投', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poll-e2e-'));
  const server = createServer(dir);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  t.after(async () => {
    await browser.close();
    server.close();
  });
  const page = await browser.newPage();

  await page.goto(base + '/');
  await page.fill('#question', '周五团建去哪');
  const optionInputs = page.locator('#options input');
  await optionInputs.nth(0).fill('烤肉');
  await optionInputs.nth(1).fill('火锅');
  await page.click('#create');
  await page.waitForSelector('#links:not([hidden])');
  const voteUrl = await page.textContent('#vote-url');
  assert.match(voteUrl, /\/poll\/[a-z2-9]{6}$/);

  await page.goto(voteUrl);
  await page.waitForSelector('#form:not([hidden])');
  await page.check('#c1');
  await page.click('#submit');
  await page.waitForSelector('#notice:not([hidden])');
  const results = await page.textContent('#results');
  assert.ok(results.includes('1 票'), '结果里应显示 1 票');

  await page.reload();
  await page.waitForSelector('#notice:not([hidden])');
  assert.ok((await page.textContent('#notice')).includes('已经投过'), '刷新后应提示已投过');
  assert.ok(await page.locator('#form').isHidden(), '已投过时投票表单应隐藏');
});

async function createPollViaApi(base) {
  const res = await fetch(base + '/api/polls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'e2e 场景投票', options: ['甲', '乙'] }),
  });
  return (await res.json()).id;
}

test('VD-07a 投票后清掉 localStorage 再刷新：仍显示已投过（判定来自服务端 voted 字段）', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poll-e2e-07a-'));
  const server = createServer(dir);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  t.after(async () => {
    await browser.close();
    server.close();
  });
  const page = await browser.newPage();
  const id = await createPollViaApi(base);

  await page.goto(`${base}/poll/${id}`);
  await page.waitForSelector('#form:not([hidden])');
  await page.check('#c0');
  await page.click('#submit');
  await page.waitForSelector('#notice:not([hidden])');

  // 清掉 localStorage —— 唯一的客户端“已投过”痕迹
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#notice:not([hidden])');
  assert.ok((await page.textContent('#notice')).includes('已经投过'), '清 localStorage 后仍应显示已投过');
  assert.ok(await page.locator('#form').isHidden(), '已投过时表单应隐藏');
  await page.screenshot({ path: 'apriori/tmp/vd-07a-after-localstorage-clear.png' });
});

test('VD-07b 页面加载后删除投票者 cookie 再点投票：#error 可见显示拒绝文案，表单不消失', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poll-e2e-07b-'));
  const server = createServer(dir);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  t.after(async () => {
    await browser.close();
    server.close();
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  const id = await createPollViaApi(base);

  await page.goto(`${base}/poll/${id}`);
  await page.waitForSelector('#form:not([hidden])');
  await page.check('#c1');
  // 删除 cookie 后立即点击（须赶在 3s 轮询重新领 cookie 之前）
  await context.clearCookies();
  await page.click('#submit');
  await page.waitForSelector('#error:not([hidden])');
  assert.ok((await page.textContent('#error')).includes('未获得投票标识'), '#error 应显示服务端拒绝文案');
  assert.ok(await page.locator('#form').isVisible(), '被拒后表单不应被静默隐藏');
  await page.screenshot({ path: 'apriori/tmp/vd-07b-error-visible.png' });
});
