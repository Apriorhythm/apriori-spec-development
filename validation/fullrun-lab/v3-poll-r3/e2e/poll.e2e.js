// Playwright E2E — the on-top UI layer (runbook §4 verification matrix).
// Run explicitly: `node --test e2e/poll.e2e.js` (NOT discovered by plain `node --test`,
// so it never enters the `apriori verify` TAP gate). Screenshots are instruments -> apriori/tmp/.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/server.js';
import { createStore } from '../src/store.js';

const require = createRequire(import.meta.url);
const groot = execSync('npm root -g').toString().trim();
const { chromium } = require(join(groot, 'playwright'));
const shotDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'apriori', 'tmp');

let server, base, browser, dir;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'qp-e2e-'));
  const store = createStore(join(dir, 'polls'));
  server = createApp(store);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ args: ['--no-sandbox'] });
});
after(async () => {
  await browser?.close();
  await new Promise((r) => server.close(r));
  await rm(dir, { recursive: true, force: true });
});

async function apiCreate(body) {
  const r = await fetch(base + '/api/polls', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const j = await r.json();
  return { id: j.shareUrl.split('/').pop(), shareUrl: j.shareUrl, adminUrl: j.adminUrl };
}

test('E2E soft-block (VT-08/VT-09): vote via UI, reload shows results not form', async () => {
  const { id } = await apiCreate({ title: '午饭吃啥', options: ['火锅', '麻辣烫'], mode: 'single' });
  const page = await browser.newPage();
  await page.goto(`${base}/poll/${id}`);
  assert.ok(await page.locator('#vote-form').isVisible(), 'form visible before voting');
  await page.locator('input[name=optionIds]').first().check();
  await page.locator('#vote-form button[type=submit]').click();
  await page.waitForSelector('#results:not([hidden])');
  await page.screenshot({ path: join(shotDir, 'e2e-after-vote.png') });
  // OBSERVATION: after voting, the results panel is shown and the vote form is hidden.
  assert.equal(await page.locator('#vote-form').isVisible(), false, 'form hidden after vote');
  // reload -> soft block via localStorage keeps showing results, not the form
  await page.reload();
  await page.waitForSelector('#results:not([hidden])');
  assert.equal(await page.locator('#vote-form').isVisible(), false, 'reload still shows results (soft block)');
  await page.close();
});

test('E2E dynamic XSS (SEC-02): scripted title/option never executes in the post-vote view', async () => {
  const { id } = await apiCreate({ title: '<script>window.__x=1</script>', options: ['<img src=x onerror=window.__y=1>', 'ok'], mode: 'single' });
  const page = await browser.newPage();
  let dialog = false;
  page.on('dialog', (d) => { dialog = true; d.dismiss(); });
  await page.goto(`${base}/poll/${id}`);
  await page.locator('input[name=optionIds]').nth(1).check();
  await page.locator('#vote-form button[type=submit]').click();
  await page.waitForSelector('#results:not([hidden])');
  const x = await page.evaluate(() => window.__x);
  const y = await page.evaluate(() => window.__y);
  // OBSERVATION: injected script/img handlers did not execute; text rendered as literal.
  assert.equal(x, undefined, 'title script did not execute');
  assert.equal(y, undefined, 'option onerror did not execute');
  assert.equal(dialog, false, 'no dialog raised');
  await page.close();
});

test('E2E closed share page (CL-07): closed poll shows results only, no form', async () => {
  const { id, adminUrl } = await apiCreate({ title: '关掉我', options: ['a', 'b'], mode: 'single' });
  const token = new URL('http://x' + adminUrl).searchParams.get('token');
  await fetch(`${base}/api/polls/${id}/close`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminToken: token }) });
  const page = await browser.newPage();
  await page.goto(`${base}/poll/${id}`);
  await page.screenshot({ path: join(shotDir, 'e2e-closed-share.png') });
  // OBSERVATION: closed share page renders a "已关闭" banner and results, with no vote form.
  assert.equal(await page.locator('#vote-form').count(), 0, 'no vote form on closed page');
  assert.ok(await page.getByText(/已关闭|closed/i).first().isVisible());
  await page.close();
});

test('E2E create-page boundary (P7): the create UI can actually build a 10-option poll', async () => {
  const page = await browser.newPage();
  await page.goto(base + '/');
  await page.locator('#title').fill('十个选项');
  // two inputs exist; add 8 more to reach the spec max of 10
  for (let i = 0; i < 8; i++) await page.locator('#add-opt').click();
  const inputs = page.locator('.opt-in');
  assert.equal(await inputs.count(), 10, 'UI reaches the 10-option spec maximum');
  for (let i = 0; i < 10; i++) await inputs.nth(i).fill('opt' + i);
  // clicking add again must NOT exceed 10 (UI respects the cap)
  await page.locator('#add-opt').click();
  assert.equal(await page.locator('.opt-in').count(), 10, 'UI hard-stops at 10, matching server max');
  await page.locator('#create-form button[type=submit]').click();
  await page.waitForSelector('#links:not([hidden])');
  await page.screenshot({ path: join(shotDir, 'e2e-create-10.png') });
  // OBSERVATION: a full 10-option poll is creatable end-to-end and returns share+admin links.
  const txt = await page.locator('#links').innerText();
  assert.match(txt, /分享链接/);
  assert.match(txt, /管理链接/);
  await page.close();
});
