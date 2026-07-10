// E2E：起真实服务 + Chromium 走完整用户流程，另含并发与重启持久化验证。
// 运行：node test/e2e/run-e2e.js（npm test 已包含）
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = 3178;
const BASE = `http://localhost:${PORT}`;

let passed = 0;
function ok(cond, name) {
  if (!cond) throw new Error(`E2E 断言失败: ${name}`);
  passed++;
  console.log(`  ✔ ${name}`);
}

let serverProc = null;
async function startServer(dataDir) {
  serverProc = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT), POLL_DATA_DIR: dataDir },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(BASE + '/');
      return;
    } catch {
      await sleep(100);
    }
  }
  throw new Error('服务未能启动');
}
async function stopServer() {
  if (!serverProc) return;
  serverProc.kill('SIGTERM');
  await new Promise((r) => serverProc.on('exit', r));
  serverProc = null;
}

async function createPollViaHttp(body) {
  const res = await fetch(`${BASE}/create`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    redirect: 'manual',
  });
  const loc = res.headers.get('location'); // /p/<id>/created?key=<key>
  const id = loc.match(/\/p\/([^/]+)\/created/)[1];
  const key = loc.match(/key=(.+)$/)[1];
  return { id, key };
}

const dataDir = await mkdtemp(path.join(tmpdir(), 'poll-e2e-'));
await startServer(dataDir);
const browser = await chromium.launch();

try {
  // ---------- 场景 1：单选全流程（创建 → 投票 → 结果 → 软防重） ----------
  console.log('场景 1: 单选全流程');
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(BASE + '/');
    await page.fill('#title', '周五团建去哪');
    const opts = page.locator('input[name=option]');
    await opts.nth(0).fill('烧烤');
    await opts.nth(1).fill('火锅');
    await page.click('button[type=submit]');

    ok(/\/p\/[^/]+\/created\?key=/.test(page.url()), '创建后到达创建成功页（双链接）');
    const voteUrl = await page.inputValue('#vote-url');
    const adminUrl = await page.inputValue('#admin-url');
    ok(await page.locator('.notice').textContent().then((t) => t.includes('仅此一次')), '展示"仅此一次"提示');

    await page.goto(voteUrl);
    const html = await page.content();
    ok(!html.includes(adminUrl.split('/admin/')[1]), '投票页不含管理密钥');
    await page.locator('.choice', { hasText: '火锅' }).click();
    await page.click('button[type=submit]');
    ok(page.url().endsWith('/results'), '投票后 303 到结果页');
    ok(await page.locator('.row-head', { hasText: '火锅' }).textContent().then((t) => t.includes('1 票 · 100%')), '结果计票正确（火锅 1 票 100%）');
    ok((await page.content()).includes('共 1 人参与'), '总提交人数为 1');

    await page.goto(voteUrl); // 同浏览器重访
    ok(page.url().endsWith('/results'), '已投浏览器重访直达结果页（软防重）');
    await ctx.close();
  }

  // ---------- 场景 2：多选（上限 2，超上限拒绝） ----------
  console.log('场景 2: 多选与上限');
  {
    const { id } = await createPollViaHttp('title=装备选择&option=A&option=B&option=C&multi=1&maxChoices=2');
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/p/${id}`);
    ok((await page.content()).includes('最多选 2 项'), '多选页展示上限提示');
    for (const label of ['A', 'B', 'C']) await page.locator('.choice', { hasText: label }).click();
    await page.click('button[type=submit]');
    ok((await page.locator('.error').textContent()).includes('最多可选 2 项'), '超上限提交被拒绝');

    await page.locator('.choice', { hasText: 'C' }).click(); // 取消 C
    await page.click('button[type=submit]');
    ok(page.url().endsWith('/results'), '合规多选提交成功');
    ok((await page.content()).includes('合计可能超过 100%'), '结果页注明多选占比含义');
    await ctx.close();
  }

  // ---------- 场景 3：管理链接关闭 → 无法再投；错误密钥 404 ----------
  console.log('场景 3: 关闭与管理密钥');
  {
    const { id, key } = await createPollViaHttp('title=关门测试&option=X&option=Y');
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    const bad = await page.goto(`${BASE}/p/${id}/admin/WRONGKEY_123456789012345`);
    ok(bad.status() === 404, '错误管理密钥返回 404');

    await page.goto(`${BASE}/p/${id}/admin/${key}`);
    page.on('dialog', (d) => d.accept());
    await page.click('button[type=submit]');
    ok((await page.content()).includes('已关闭'), '关闭后管理页显示已关闭');

    const ctx2 = await browser.newContext(); // 全新浏览器（无 Cookie）
    const page2 = await ctx2.newPage();
    await page2.goto(`${BASE}/p/${id}`);
    ok(page2.url().endsWith('/results'), '已关闭投票的参与链接直达结果页');
    ok((await page2.content()).includes('已结束'), '结果页状态为已结束');
    const res = await fetch(`${BASE}/p/${id}/vote`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'choice=0',
    });
    ok(res.status === 403, '对已关闭投票直接 POST 被拒绝(403)');
    await ctx2.close();
    await ctx.close();
  }

  // ---------- 场景 4：截止时间过期后只读（预置过期投票文件） ----------
  console.log('场景 4: 截止时间过期');
  {
    const expired = {
      id: 'expiredp', title: '过期投票', options: ['a', 'b'], multi: false, maxChoices: null,
      deadline: new Date(Date.now() - 3600e3).toISOString(), adminKey: 'k'.repeat(24),
      closed: false, counts: [2, 1], totalVoters: 3, createdAt: new Date(Date.now() - 7200e3).toISOString(),
    };
    await writeFile(path.join(dataDir, 'expiredp.json'), JSON.stringify(expired));
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/p/expiredp`);
    ok(page.url().endsWith('/results'), '过期投票参与链接直达结果页');
    ok((await page.content()).includes('已结束'), '过期投票状态为已结束');
    const res = await fetch(`${BASE}/p/expiredp/vote`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'choice=0',
    });
    ok(res.status === 403, '向过期投票提交被拒绝(403)');
    await ctx.close();
  }

  // ---------- 场景 5：并发 12 票全部计入 + 重启持久化（Task 5.2） ----------
  console.log('场景 5: 并发与重启持久化');
  {
    const { id } = await createPollViaHttp('title=并发测试&option=p&option=q&option=r');
    const N = 12;
    const results = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        fetch(`${BASE}/p/${id}/vote`, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: `choice=${i % 3}`,
          redirect: 'manual',
        })
      )
    );
    ok(results.every((r) => r.status === 303), `并发 ${N} 票全部返回成功`);
    let body = await fetch(`${BASE}/p/${id}/results`).then((r) => r.text());
    ok(body.includes(`共 ${N} 人参与`), `并发 ${N} 票无丢失（总数恰为 ${N}）`);

    await stopServer(); // 模拟重启
    await startServer(dataDir);
    body = await fetch(`${BASE}/p/${id}/results`).then((r) => r.text());
    ok(body.includes(`共 ${N} 人参与`), '服务重启后数据仍在');
  }

  // ---------- 场景 6：手机视口渲染冒烟（Task 5.3） ----------
  console.log('场景 6: 手机视口冒烟');
  {
    const { id } = await createPollViaHttp('title=手机上看看这个比较长的标题会不会溢出容器边界&option=选项一&option=选项二');
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    for (const url of [`${BASE}/`, `${BASE}/p/${id}`, `${BASE}/p/${id}/results`]) {
      await page.goto(url);
      const noHScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      ok(noHScroll, `无横向滚动: ${new URL(url).pathname}`);
    }
    await ctx.close();
  }

  console.log(`\nE2E 全部通过（${passed} 项断言）`);
} finally {
  await browser.close();
  await stopServer();
}
