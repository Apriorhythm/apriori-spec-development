'use strict';
// P3 · /apriori-discuss 薄壳。卡 P3 ③ 的机械可验部分：模板 · 投递 · 世代 · D4 修复。
// ⚠ 五条功能契约与四授权场景是**行为验收**（P4 跑真实客户端），不在本文件冒充。
// ⚠ 本文件只验「入口装得对、内容是审定的、漏了能抓、fix 串能用」。
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const init = require('../lib/init');
const update = require('../lib/update');
const managed = require('../lib/managed');
const doctor = require('../lib/doctor');

const DISCUSS_SRC = path.join(ROOT, 'templates', 'discuss.md');
const DISCUSS_GOLDEN = path.join(__dirname, 'fixtures', 'discuss.golden.md');
const sha = (b) => 'sha256:' + crypto.createHash('sha256').update(b).digest('hex');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-p3-'));
const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const TAP_OK = `node -e "console.log('1..1');console.log('ok 1')"`;

// ── 模板本体 ──────────────────────────────────────────────────────────────
test('DS-01 the discuss shell matches its reviewed golden', () => {
  assert.strictEqual(fs.readFileSync(DISCUSS_SRC, 'utf8'), fs.readFileSync(DISCUSS_GOLDEN, 'utf8'),
    'templates/discuss.md diverged from test/fixtures/discuss.golden.md — the shell may only change together with a reviewed update of that fixture');
});

test('DS-02 the shell is thin: it delegates to the runbook by SECTION, never by line number', () => {
  const s = fs.readFileSync(DISCUSS_SRC, 'utf8');
  assert.match(s, /apriori\/runbook\.md/, 'shell must point at the runbook');
  // 绑章节标题，不绑行号（Goal 4 前提 (1)）
  assert.doesNotMatch(s, /runbook\.md:\d+|:\d+-\d+|sed -n '\d+/, 'shell binds a line number — sections only');
  assert.match(s, /§4/, 'shell must name the Discuss-first section of §4');
  // 薄壳不得自带一份规则副本
  assert.ok(s.length < 2600, `shell is ${s.length} bytes — a thin shell, not a second rulebook`);
});

test('DS-03 the shell carries the five functional meanings it is the entry for', () => {
  const s = fs.readFileSync(DISCUSS_SRC, 'utf8');
  const MEANINGS = {
    'subject is passed through': /\$ARGUMENTS/,
    'discuss only, do not implement': /do not start development|only discuss/i,
    'nothing durable without approval': /[Nn]othing durable/,
    'two approvals are separate': /[Tt]wo approvals, not one/,
    'existing state is reused, not rebuilt': /read its state and update the same one|do not re-run `apriori new`/,
  };
  for (const [label, re] of Object.entries(MEANINGS))
    assert.match(s, re, `discuss shell lost meaning: ${label}`);
});

// ── 投递：安装映射 + 世代 ─────────────────────────────────────────────────
test('DS-04 every command-level tool installs BOTH entries, and their paths differ', () => {
  const root = tmp();
  const tools = Object.keys(init.TOOLS).filter((k) => init.TOOLS[k].commands);
  init.scaffold(root, tools);
  for (const k of tools) {
    const cmds = init.TOOLS[k].commands;
    assert.ok(cmds.apriori && cmds.discuss, `${k}: missing an entry in commands map`);
    assert.notStrictEqual(cmds.apriori, cmds.discuss, `${k}: both entries share one path`);
    assert.strictEqual(read(root, cmds.discuss), fs.readFileSync(DISCUSS_SRC, 'utf8'),
      `${k}: installed discuss entry is not the shipped template`);
  }
});

test('DS-05 the manifest registers the discuss entry with its real byte digest', () => {
  const root = tmp();
  init.scaffold(root, ['claude']);
  const mf = JSON.parse(read(root, 'apriori/managed.json'));
  const rel = init.TOOLS.claude.commands.discuss;
  assert.ok(mf.files[rel], 'discuss entry absent from managed.json');
  assert.strictEqual(mf.files[rel], sha(fs.readFileSync(path.join(root, rel))),
    'registered digest ≠ actual bytes');
});

test('DS-06 discuss has its own generation table; templates are never adopted across ids', () => {
  const g = managed.TEMPLATE_GENERATIONS;
  assert.ok(Array.isArray(g.discuss) && g.discuss.length >= 1, 'discuss generation table missing');
  assert.strictEqual(g.discuss[g.discuss.length - 1], sha(fs.readFileSync(DISCUSS_SRC)),
    'current discuss template is not its newest generation');
  // 跨模板不得互认
  for (const h of g.discuss) assert.ok(!g.apriori.includes(h), 'a discuss generation leaked into apriori');
  for (const h of g.apriori) assert.ok(!g.discuss.includes(h), 'an apriori generation leaked into discuss');
});

test('DS-07 update refreshes an unmodified discuss entry and protects a hand-edited one', () => {
  const root = tmp();
  init.scaffold(root, ['claude']);
  const rel = init.TOOLS.claude.commands.discuss;
  // 未改 → up-to-date
  let by = Object.fromEntries(update.run(root).actions.map((a) => [a.file, a.action]));
  assert.strictEqual(by[rel], 'up-to-date');
  // 手改 → 受保护，且手改内容仍在
  fs.writeFileSync(path.join(root, rel), 'HAND EDITED\n');
  by = Object.fromEntries(update.run(root).actions.map((a) => [a.file, a.action]));
  assert.match(String(by[rel]), /hand-edited|protected|skipped/i, `hand-edited discuss entry was not protected: ${by[rel]}`);
  assert.match(read(root, rel), /HAND EDITED/, 'hand edit was overwritten');
});

// ── D4：漏了能抓，且打印的 fix 串原样可用（卡 P3 ③ 明禁以 P0 免验）────────
test('DS-08 D4 catches a deleted discuss entry and its printed fix actually repairs it', () => {
  const root = tmp();
  init.scaffold(root, ['claude']);
  const rel = init.TOOLS.claude.commands.discuss;
  fs.rmSync(path.join(root, rel));
  const findings = doctor.runDoctor({ cwd: root, testCmd: TAP_OK })
    .checks.filter((c) => c.id === 'D4' && c.status === 'finding');
  const mine = findings.find((c) => new RegExp(path.basename(rel)).test(c.detail));
  assert.ok(mine, `D4 did not report the missing discuss entry: ${JSON.stringify(findings)}`);
  assert.ok(mine.fix, 'D4 finding carries no fix string');
  // 原样执行打印的 fix 串
  const { spawnSync } = require('node:child_process');
  const argv = mine.fix.replace(/^apriori\s+/, '').split(/\s+/);
  const r = spawnSync('node', [path.join(ROOT, 'bin', 'apriori.js'), ...argv], { cwd: root, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, `printed fix failed: ${r.stderr}`);
  assert.strictEqual(read(root, rel), fs.readFileSync(DISCUSS_SRC, 'utf8'), 'fix did not restore the entry');
  const after = doctor.runDoctor({ cwd: root, testCmd: TAP_OK })
    .checks.filter((c) => c.id === 'D4' && c.status === 'finding' && new RegExp(path.basename(rel)).test(c.detail));
  assert.strictEqual(after.length, 0, 'finding persists after the printed fix ran');
});

test('DS-09 the fix does not clobber a hand-edited sibling entry', () => {
  const root = tmp();
  init.scaffold(root, ['claude']);
  const discuss = init.TOOLS.claude.commands.discuss;
  const apriori = init.TOOLS.claude.commands.apriori;
  fs.writeFileSync(path.join(root, apriori), 'HAND EDITED SIBLING\n');
  fs.rmSync(path.join(root, discuss));
  const { spawnSync } = require('node:child_process');
  const r = spawnSync('node', [path.join(ROOT, 'bin', 'apriori.js'), 'init', '--tools', 'claude'],
                      { cwd: root, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(read(root, apriori), /HAND EDITED SIBLING/, 'the hand-edited sibling was overwritten');
});

// ── 支持矩阵：不得由"目录里有文件"推出"该端支持"（卡 P3 ③）──────────────
test('DS-10 the README support matrix separates verified clients from unverified ones', () => {
  for (const f of ['README.md', 'README_cn.md']) {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.match(s, /apriori-discuss/, `${f}: the new entry is not documented`);
    assert.match(s, f.endsWith('_cn.md') ? /尚未支持|未实测/ : /not yet supported|unverified/i,
      `${f}: no "not yet supported" column — having a file is not support`);
    // 旧的"四端一样跑"式笼统宣称必须消失
    assert.doesNotMatch(s, /同一套协议在 Codex \/ Cursor \/ Windsurf \/ Copilot 里一样跑/,
      `${f}: the blanket "runs the same in all four" claim survives`);
    assert.doesNotMatch(s, /The same protocol runs in Codex \/ Cursor \/ Windsurf \/ Copilot/,
      `${f}: the blanket claim survives`);
  }
});

// ── R1 漏掉的两项（卡 P3 ①）─────────────────────────────────────────────
test('DS-11 the shared scope rule lands in BOTH runbooks, not only in the shell', () => {
  for (const f of ['RUNBOOK.md', 'RUNBOOK_cn.md']) {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    // 新入口必须在 runbook 里有短范围声明 —— 不能只让薄壳引用工作区纲领
    assert.match(s, /apriori-discuss/, `${f}: the dedicated entry is absent from the runbook`);
    // 范围声明，且明确它不改变 R1 的分流（卡 P3 ②：不首次定义全局停止语义）
    assert.match(s, f.endsWith('_cn.md') ? /入口的名字既不授予权限|不改变 §1 R1/ : /grants no permission|does not change §1 R1/,
      `${f}: the entry's scope statement does not defer to R1`);
  }
});

test('DS-12 the shell does not become a second copy of the rules it points at', () => {
  const shell = fs.readFileSync(DISCUSS_SRC, 'utf8');
  const runbook = fs.readFileSync(path.join(ROOT, 'RUNBOOK.md'), 'utf8');
  // 薄壳不得整段照搬 runbook 的规则正文
  const stance = runbook.match(/\*\*Two approvals, not one\.\*\*[^\n]*/);
  assert.ok(stance, 'runbook lost the two-approvals paragraph');
  assert.ok(!shell.includes(stance[0]), 'the shell copied the runbook paragraph verbatim — it must point, not duplicate');
});

// discuss-save-fidelity（FC3Y：一次保存附加了所有者没说过的风险接受解释，一次新增了未讨论的阻塞项）：
// 保存只是忠实记录——四类内容、不新增、不升格、开放保持开放、重复保存无实质变化、不启动开发。
test('DS-14 the discuss shell carries the save-fidelity rule and stays thin', () => {
  const s = fs.readFileSync(DISCUSS_SRC, 'utf8');
  const MEANINGS = {
    'a save is a faithful record': /[Aa] save is a faithful record, nothing more/,
    'decision in their words, only as far as they said it': /`decision` only as far as they said it, in\s+their words/,
    'four kinds': /`observed` with source; `assumption` labeled; open questions in `## Open`/,
    'nothing the discussion did not raise: no added reason / risk acceptance / requirement / blocker': /Nothing the discussion did not raise — no added reason, risk acceptance, requirement or\s+blocker/,
    'no assumption / advice / inference promoted to decision or fact': /no assumption, advice or inference of yours promoted to their decision or to fact/,
    'unanswered stays open, silence is not a decision': /unanswered stays open — silence is not a decision/,
    'write only once settled': /write only once the conclusion is\s+settled/,
    'idempotent re-save, of substance': /re-saving with nothing new changes nothing of substance/,
    'points at the runbook section for the full rule': /\(§4 "Discuss first"\)/,
  };
  for (const [label, re] of Object.entries(MEANINGS)) assert.match(s, re, `discuss shell lost meaning: ${label}`);
  assert.strictEqual(s, fs.readFileSync(path.join(ROOT, 'test', 'fixtures', 'discuss.golden.md'), 'utf8'), 'golden must follow the template');
  const digest = 'sha256:' + crypto.createHash('sha256').update(fs.readFileSync(DISCUSS_SRC)).digest('hex');
  assert.ok(managed.TEMPLATE_GENERATIONS.discuss.includes(digest), 'the discuss generation table must carry the shipped body');
  const runbook = fs.readFileSync(path.join(ROOT, 'RUNBOOK.md'), 'utf8');
  const para = runbook.match(/\*\*A save is a faithful record, nothing more\.\*\*[^\n]*/);
  assert.ok(para, 'runbook lost the faithful-record paragraph');
  assert.ok(!s.includes(para[0]), 'the shell copied the runbook paragraph verbatim — it must point, not duplicate');
});

test('DS-15 both runbook editions state the rule in §4 and mirror it in P6', () => {
  const en = fs.readFileSync(path.join(ROOT, 'RUNBOOK.md'), 'utf8');
  const cn = fs.readFileSync(path.join(ROOT, 'RUNBOOK_cn.md'), 'utf8');
  // every safeguard is pinned on its own, per edition and per section — deleting any one of them fails
  const enDiscuss = en.slice(en.indexOf('### Discuss first'), en.indexOf('### ', en.indexOf('### Discuss first') + 10));
  const EN_S4 = {
    'faithful record': /\*\*A save is a faithful record, nothing more\.\*\*/,
    'four kinds and no others': /four kinds and no others/,
    'decision in the human\'s words': /`decision` — what the human decided, in their words/,
    'no unstated reasons, conditions or risk acceptances (provenance)': /reasons, conditions or risk acceptances they did not state are not/,
    'observed with source': /`observed` — facts actually read, each with its source/,
    'assumption labelled': /`assumption` — what the discussion leaned on unconfirmed, labelled as such/,
    'open = questions left open': /`## Open` — the questions the discussion left open/,
    'no added commitment / risk acceptance / requirement / blocking item': /never adds a commitment, a risk acceptance, a requirement or a blocking item that was not raised in the discussion/,
    'no promotion': /never promotes an assumption or the agent's own recommendation into a decision or an observed fact/,
    'open stays open, not decided for them': /explicitly left open stays open — the agent does not decide it for them/,
    'idempotent, of substance': /Saving again with nothing new changes nothing of substance: no duplicated lines, no new items/,
    'never starts development': /never starts development/,
  };
  for (const [label, re] of Object.entries(EN_S4)) assert.match(enDiscuss, re, `RUNBOOK.md §4 Discuss first lacks: ${label}`);
  const enP6 = en.slice(en.indexOf('### P6'), en.indexOf('---', en.indexOf('### P6')));
  const EN_P6 = {
    'save only what we concluded, in my words': /Save only what we concluded, in my words/,
    'no added reasons/conditions/risk acceptances/requirements/blocking items I did not state': /no added reasons, conditions, risk acceptances, requirements or blocking items I did not state/,
    'assumption stays assumption': /an assumption stays an assumption/,
    'recommendation is not my decision': /your recommendation is not my decision/,
    'left open stays open': /a question I left open stays open/,
    'idempotent, of substance': /saving again with nothing new changes nothing of substance/,
  };
  for (const [label, re] of Object.entries(EN_P6)) assert.match(enP6, re, `RUNBOOK.md P6 lacks: ${label}`);
  const cnDiscuss = cn.slice(cn.indexOf('### 先讨论'), cn.indexOf('### ', cn.indexOf('### 先讨论') + 10));
  const CN_S4 = {
    '忠实记录': /\*\*保存只是忠实记录,不多一个字。\*\*/,
    '四类没有第五类': /分四类、没有第五类/,
    'decision 用人自己的话': /`decision`——人决定了什么,用人自己的话/,
    '没说过的理由/条件/风险接受不行': /人没说过的理由、条件或风险接受不行/,
    'observed 附来源': /`observed`——你实际读到的事实,各附来源/,
    'assumption 标明': /`assumption`——讨论所依赖、尚未证实的命题,并标明是假设/,
    'Open = 未决问题': /`## Open`——讨论留下的未决问题/,
    '不新增承诺/风险接受/需求/阻塞项': /绝不新增讨论里没出现过的承诺、风险接受、需求或阻塞项/,
    '不升格': /绝不把假设或你自己的建议升格成决定或事实/,
    '开放保持开放不替人决定': /保持开放——不替人决定/,
    '幂等（实质）': /再次保存不改变任何实质:不重复行、不新增条目/,
    '不启动开发': /永不启动开发/,
  };
  for (const [label, re] of Object.entries(CN_S4)) assert.match(cnDiscuss, re, `RUNBOOK_cn.md §4 先讨论 lacks: ${label}`);
  const cnP6 = cn.slice(cn.indexOf('### P6'), cn.indexOf('---', cn.indexOf('### P6')));
  const CN_P6 = {
    '只存结论用我的话': /只存我们得出的结论,用我的话/,
    '不加我没说过的理由/条件/风险接受/需求/阻塞项': /不加我没说过的理由、条件、风险接受、需求或阻塞项/,
    '假设仍是假设': /假设仍是假设/,
    '建议不是决定': /你的建议不是我的决定/,
    '留着的问题保持开放': /我留着的问题保持开放/,
    '幂等（实质）': /没有新内容再保存一次不改变任何实质/,
  };
  for (const [label, re] of Object.entries(CN_P6)) assert.match(cnP6, re, `RUNBOOK_cn.md P6 lacks: ${label}`);
});

// discuss-save-inference（层 2 第 1 批：006 把建模推论记成所有者决定；007 由「任意字符串」推出空串语义并关闭未答的 OPEN-1；001/007 拍板前先写）
test('DS-16 the shell states the three refinements and stays thin', () => {
  const s = fs.readFileSync(DISCUSS_SRC, 'utf8');
  for (const [label, re] of Object.entries({
    'only as far as they said it': /`decision` only as far as they said it/,
    'no assumption / advice / inference promoted to decision or fact': /no assumption, advice or inference of yours promoted to their decision or to fact/,
    'silence is not a decision': /unanswered stays open — silence is not a decision/,
    'write only once settled': /write only once the conclusion is\s+settled/,
  })) assert.match(s, re, `discuss shell lacks: ${label}`);
  assert.ok(s.length < 2600, `shell is ${s.length} chars`);
});

test('DS-17 both runbook editions carry the refinements in §4 and mirror them in P6', () => {
  const en = fs.readFileSync(path.join(ROOT, 'RUNBOOK.md'), 'utf8');
  const cn = fs.readFileSync(path.join(ROOT, 'RUNBOOK_cn.md'), 'utf8');
  const sec = (t, h) => t.slice(t.indexOf(h), t.indexOf('### ', t.indexOf(h) + 10));
  const p6 = (t) => t.slice(t.indexOf('### P6'), t.indexOf('---', t.indexOf('### P6')));
  for (const [label, re] of Object.entries({
    'only as far as stated': /A decision is recorded only as far as the human stated it/,
    'inference examples → assumption / Open, never their decision': /an implied answer to another open question, a modelling or spec-structure consequence — is the agent's inference and is written as `assumption` or stays in `## Open`, never as their decision/,
    'silence is not a decision, even when argued as one': /silence is not a decision, even when the agent argued that two questions are one/,
    'write only once settled, approval held': /With approval to save already held, the write still happens only once the conclusion is settled, not during the discussion/,
  })) assert.match(sec(en, '### Discuss first'), re, `RUNBOOK.md §4 lacks: ${label}`);
  for (const [label, re] of Object.entries({
    'your inference is not my decision': /what follows from my decision by your reasoning is your inference, not my decision/,
    'unanswered stays open': /a question I did not answer stays open/,
    'write only once settled': /write only once the conclusion is settled/,
  })) assert.match(p6(en), re, `RUNBOOK.md P6 lacks: ${label}`);
  for (const [label, re] of Object.entries({
    '只记到说到为止': /决定只记到人说到的地方为止/,
    '推论 → assumption / Open': /另一个未决问题的隐含答案、建模或规格结构上的后果——是你的推论,记成 `assumption` 或留在 `## Open`,绝不记成人的决定/,
    '沉默不是决定': /沉默不是决定,哪怕你论证过两个问题其实是一个/,
    '已拿到授权也只在结论定下之后才写': /已经拿到保存授权,也只在结论定下之后才写,不在讨论进行中写/,
  })) assert.match(sec(cn, '### 先讨论'), re, `RUNBOOK_cn.md §4 lacks: ${label}`);
  for (const [label, re] of Object.entries({
    '推论不是决定': /由我的决定经你推理得出的东西是你的推论,不是我的决定/,
    '没回答的保持开放': /我没回答的问题保持开放/,
    '结论定了才写': /结论定了才写/,
  })) assert.match(p6(cn), re, `RUNBOOK_cn.md P6 lacks: ${label}`);
});

// S2 A≥1 修复（人类 2026-09-24 批准，方案 ①）：FC3 中用户已在请求里写明「保存，别开始开发」，
// agent 仍把「只保存 / 保存并开始开发」抛回去重选。薄壳须明示：请求里已声明的范围就是已持有的批准；
// 尚待所有者拍板的只问那个决定，不再重开保存与开发之间的选择。
test('DS-13 a scope already stated in the request counts as held; the save-or-develop choice is not re-offered', () => {
  const s = fs.readFileSync(DISCUSS_SRC, 'utf8');
  assert.match(s, /already stated in (this|the) request[^.]*is an approval you already hold/i,
    'shell must say a scope the human already stated counts as an approval already held');
  assert.match(s, /ask only for that decision/i,
    'shell must limit the question to the decision still owed');
  assert.match(s, /do not offer the save-or-develop choice again/i,
    'shell must forbid re-offering the save-or-develop choice');
});
