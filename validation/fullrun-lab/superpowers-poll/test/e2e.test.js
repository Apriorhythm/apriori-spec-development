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
