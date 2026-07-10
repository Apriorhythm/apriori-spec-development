// Playwright E2E 叠加层（design §5）：不参与 apriori verify 绑定（Playwright 不吐 TAP），
// 是 STEP5 验证矩阵中 UI 项目的附加出口条件。文本化 PASS/FAIL 输出；截图落 apriori/tmp/。
// 运行：NPMROOT=$(npm root -g) node tests/e2e/e2e.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createApp } from '../../server.js';

const require = createRequire(path.join(process.env.NPMROOT || '/usr/lib/node_modules', 'x.js'));
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SHOTS = path.join(ROOT, 'apriori/tmp');
let failures = 0;
const check = (name, cond) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) failures++;
};

await fs.mkdir(SHOTS, { recursive: true });
const dataDir = await fs.mkdtemp(path.join(ROOT, 'tests/.tmp/', 'e2e-'));
const app = await createApp({ dataDir, logger: () => {} });
await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.server.address().port}`;

const browser = await chromium.launch();
try {
  // 1. 创建
  const creator = await browser.newContext({ viewport: { width: 390, height: 844 } }); // 手机尺寸
  const cPage = await creator.newPage();
  await cPage.goto(base + '/');
  await cPage.screenshot({ path: path.join(SHOTS, 'e2e-1-create-blank.png') });
  await cPage.fill('#title', '周五团建去哪？');
  const inputs = cPage.locator('#options input');
  await inputs.nth(0).fill('密室逃脱');
  await inputs.nth(1).fill('桌游');
  await cPage.click('#add-option');
  await cPage.locator('#options input').nth(2).fill('唱K');
  await cPage.click('button[type=submit]');
  await cPage.waitForSelector('#result:not([hidden])');
  const voteUrl = await cPage.locator('#vote-link').textContent();
  const adminUrl = await cPage.locator('#admin-link').textContent();
  await cPage.screenshot({ path: path.join(SHOTS, 'e2e-2-created-links.png') });
  check('创建成功并展示双链接', voteUrl.includes('/p/') && adminUrl.includes('/admin/'));

  // 2. 参与者投票（独立 context = 独立 localStorage）
  const rel = (u) => new URL(u).pathname;
  const voter = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const vPage = await voter.newPage();
  await vPage.goto(base + rel(voteUrl));
  await vPage.waitForSelector('.vote-btn');
  await vPage.screenshot({ path: path.join(SHOTS, 'e2e-3-vote-page.png') });
  await vPage.click('.vote-btn >> nth=0');
  await vPage.waitForSelector('#vote-area[hidden]', { state: 'attached' });
  const statusText = await vPage.locator('#status').textContent();
  check('投票后进入已投状态、无投票入口', statusText.includes('已投过'));
  check('投票后结果显示 1 票', (await vPage.locator('#total').textContent()).includes('共 1 票'));
  await vPage.screenshot({ path: path.join(SHOTS, 'e2e-4-after-vote.png') });

  // 3. 刷新后仍锁定（localStorage 持久）
  await vPage.reload();
  await vPage.waitForSelector('#results-area .result-row');
  check('刷新后仍为已投状态', (await vPage.locator('#status').textContent()).includes('已投过'));
  const voteAreaHidden = await vPage.locator('#vote-area').evaluate((el) => el.hidden);
  check('刷新后无投票入口', voteAreaHidden === true);

  // 4. 旁观者（第三个 context）可看到实时结果且可投
  const watcher = await browser.newContext();
  const wPage = await watcher.newPage();
  await wPage.goto(base + rel(voteUrl));
  await wPage.waitForSelector('.vote-btn');
  check('新浏览器可见当前 1 票并可投票', (await wPage.locator('#total').textContent()).includes('共 1 票'));

  // 5. 发起人从管理页关闭
  const aPage = await creator.newPage();
  await aPage.goto(base + rel(adminUrl));
  await aPage.waitForSelector('#close-btn');
  await aPage.screenshot({ path: path.join(SHOTS, 'e2e-5-admin.png') });
  await aPage.click('#close-btn');
  await aPage.waitForSelector('#close-btn[disabled]');
  check('管理页关闭后按钮呈已关闭态', (await aPage.locator('#close-btn').textContent()).includes('已关闭'));
  await aPage.screenshot({ path: path.join(SHOTS, 'e2e-6-admin-closed.png') });

  // 6. 旁观者轮询后看到已关闭、无法再投（3s 轮询 + 余量）
  await wPage.waitForTimeout(3500);
  check('旁观者 3 秒轮询后看到已关闭', (await wPage.locator('#status').textContent()).includes('已关闭'));
  const wVoteHidden = await wPage.locator('#vote-area').evaluate((el) => el.hidden);
  check('关闭后旁观者无投票入口', wVoteHidden === true);
  await wPage.screenshot({ path: path.join(SHOTS, 'e2e-7-closed-view.png') });
} finally {
  await browser.close();
  await new Promise((r) => app.server.close(r));
}

console.log(failures === 0 ? 'E2E RESULT: PASS (all checks)' : `E2E RESULT: FAIL (${failures} checks)`);
process.exit(failures === 0 ? 0 : 1);
