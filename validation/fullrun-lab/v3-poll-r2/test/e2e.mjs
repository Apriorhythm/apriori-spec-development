// Playwright E2E — 叠加在 apriori verify 绑定门之上（UI 层附加退出条件）。
// 驱动真实浏览器跑核心流：创建 → 投票 → 结果 → 关闭；截图存 apriori/tmp/（gitignored）。
// 输出一行 textual PASS/FAIL（visual/E2E 层不发 TAP）。
import { chromium } from 'playwright';
import { createServer } from '../src/server.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qp-e2e-'));
const srv = createServer({ dataDir });
await new Promise((r) => srv.listen(0, r));
const base = `http://127.0.0.1:${srv.address().port}`;
const shotDir = path.join(process.cwd(), 'apriori', 'tmp');
fs.mkdirSync(shotDir, { recursive: true });

const notes = [];
let ok = true;
function check(cond, msg) { if (!cond) ok = false; notes.push((cond ? 'PASS ' : 'FAIL ') + msg); }

const browser = await chromium.launch();
try {
  const page = await browser.newPage();

  // 1) 创建页 → 建投票（含一个带 XSS 元字符的选项，验证 SSR 不执行脚本）
  await page.goto(base + '/');
  await page.fill('input[name=title]', '晚饭去哪 <b>test</b>');
  const opts = await page.$$('input[name=option]');
  await opts[0].fill('火锅');
  await opts[1].fill('<img src=x onerror=window.__XSS__=1>');
  await page.click('button[type=submit]');
  await page.waitForSelector('#voteUrl');
  const voteUrl = (await page.textContent('#voteUrl')).trim();
  const adminUrl = (await page.textContent('#adminUrl')).trim();
  check(!!voteUrl && !!adminUrl, '创建返回投票链接+管理链接');
  await page.screenshot({ path: path.join(shotDir, 'e2e-1-created.png') });

  // 2) 投票页 → 投一票；验证 XSS 未执行
  await page.goto(voteUrl);
  const xssBefore = await page.evaluate(() => window.__XSS__);
  check(!xssBefore, 'SSR 注入未执行（window.__XSS__ 未定义）');
  await page.check('input[name=opt] >> nth=0');
  await page.click('#voteForm button[type=submit]');
  await page.waitForURL('**/r/**');
  await page.screenshot({ path: path.join(shotDir, 'e2e-2-voted.png') });

  // 3) 结果页 → 显示 1 票；软限：回投票页应被弹回结果页
  const total = await page.textContent('#total');
  check(total.trim() === '1', '结果页总票数=1');
  await page.goto(voteUrl);
  await page.waitForURL('**/r/**', { timeout: 3000 }).catch(() => {});
  check(page.url().includes('/r/'), '软限：已投浏览器回投票页被弹回结果视图');

  // 4) 管理页 → 关闭；投票页显示已关闭、无投票控件
  await page.goto(adminUrl);
  await page.click('#closeBtn');
  await page.waitForFunction(() => document.body.textContent.includes('已关闭'));
  await page.screenshot({ path: path.join(shotDir, 'e2e-3-closed.png') });
  await page.context().clearCookies();
  const fresh = await browser.newPage();
  await fresh.goto(voteUrl.replace('/p/', '/r/')); // 结果仍可读
  const closedResult = await fresh.goto(voteUrl); // 投票页（新浏览器无软限标记）
  const html = await fresh.content();
  check(html.includes('已关闭'), '关闭后投票页显式呈现已关闭');
  check(!/id="voteForm"/.test(html), '关闭后不渲染投票提交控件');

  console.log('\n' + notes.join('\n'));
  console.log('\nE2E RESULT: ' + (ok ? 'PASS' : 'FAIL'));
} finally {
  await browser.close();
  await new Promise((r) => srv.close(r));
}
process.exit(ok ? 0 : 1);
