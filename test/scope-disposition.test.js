'use strict';
// scope-disposition — RY-32/RY-33 (the follow-up item), PR-42/PR-43 (the disposition rule in both runbooks and P3).
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');
const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const ROOT = path.join(__dirname, '..');
const rd = require('../lib/readiness');
const gate = require('../lib/gate');
const { readyFiles, withOpen } = require('./helpers/ready-bundle');

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n';
const DELTA = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';
const TAP_OK = `node -e "${['ok 1 - XA-01 a', 'ok 2 - XB-01 b'].map((l) => `console.log('${l}')`).join(';')}"`;
function proj(openItems, gates = '') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sd-'));
  const files = { ...readyFiles('c'), 'apriori/specs/kv/spec.md': STORE, 'apriori/changes/c/specs/kv/spec.md': DELTA };
  for (const [rel, c] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), c);
  }
  const fs_ = path.join(root, 'apriori/changes/c/flow-state.md');
  fs.writeFileSync(fs_, withOpen(fs.readFileSync(fs_, 'utf8'), openItems) + gates);
  return root;
}
const run = (root, args) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd: root });
const bundle = (root) => path.join(root, 'apriori/changes/c');

test('RY-32 a follow-up item is a note for C9, R5, the declaration and status', () => {
  const root = proj(['F-01: follow-up → punctuation-policy — a pluggable punctuation policy object']);
  const rdy = rd.readinessOf({ bundleDir: bundle(root), name: 'c', cwd: root });
  assert.deepStrictEqual(rdy.blockers.filter((b) => b.rule === 'R5'), [], 'no R5 blocker');
  assert.ok(rdy.notes.some((n) => /follow-up F-01 → punctuation-policy: a pluggable punctuation policy object \(registered, not a blocker; moving it out is not closing it\)/.test(n)), rdy.notes.join('|'));
  const c9 = gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK }).checks.find((x) => x.id === 'C9');
  assert.strictEqual(c9.status, 'pass', c9.detail);
  assert.match(c9.detail, /1 follow-up\(s\) registered \(F-01 → punctuation-policy\)/);
  assert.match(c9.detail, /0 pending/);
  const a = run(root, ['archive', '--change', 'c', '--write']);
  assert.strictEqual(a.status, 0, a.stdout + a.stderr);
  assert.match(a.stdout, /implementation:    complete\n  critical evidence: complete, 1 follow-up\(s\) registered \(F-01 → punctuation-policy\)/);
  // status, on a fresh copy (the archived one is frozen)
  const root2 = proj(['F-01: follow-up → punctuation-policy — a pluggable punctuation policy object']);
  const st = run(root2, ['status', '--change', 'c']);
  assert.match(st.stdout, /open:\s+\[follow-up → punctuation-policy\] F-01: follow-up → punctuation-policy — a pluggable/);
  const j = JSON.parse(run(root2, ['status', '--change', 'c', '--json']).stdout);
  assert.strictEqual(j.openItems[0].followUp, 'punctuation-policy');
  assert.strictEqual(j.openItems[0].accepted, false);
  assert.deepStrictEqual(j.escalations.filter((e) => /F-01/.test(JSON.stringify(e))), [], 'a follow-up is not an escalation');
  // review-ready: a follow-up is not pending there either
  const rr = JSON.parse(run(root2, ['gate', '--change', 'c', '--review-ready', '--test-cmd', TAP_OK, '--json']).stdout);
  const openItem = (rr.items || rr.checks || []).find((x) => x.id === 'open');
  assert.ok(openItem && openItem.ok, JSON.stringify(rr).slice(0, 300));
  assert.doesNotMatch(openItem.detail, /pending items are what the review is for/);
  assert.match(openItem.detail, /1 follow-up\(s\) registered/);
});

test('RY-33 the grammar is exact — a malformed follow-up stays pending and blocks', () => {
  for (const item of ['F-02: follow-up → — no landing', 'F-03: follow-up → Bad_Name — x', 'F-04: follow-up → later —', 'F-05: follow up → later — x', 'F-06: later as a follow-up — x',
    'F-07: follow-up → bad--name — x', 'F-08: follow-up → archive — x', 'F-09: follow-up → 2026-09-next — x', 'F-10: follow-up → c — x']) {
    const root = proj([item]);
    const rdy = rd.readinessOf({ bundleDir: bundle(root), name: 'c', cwd: root });
    const r5 = rdy.blockers.filter((b) => b.rule === 'R5');
    assert.strictEqual(r5.length, 1, item);
    const id = item.split(':')[0];
    assert.match(r5[0].detail, new RegExp(`open item ${id} is pending`), item);
    assert.match(r5[0].detail, new RegExp(`register it as a follow-up with its landing spot \\(- ${id}: follow-up → <new-change-name> — <the ask, in one line>\\)`), item);
    assert.match(r5[0].detail, /record the owner's decision: .*evidence-accept/, item);
    assert.strictEqual(gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK }).checks.find((x) => x.id === 'C9').status, 'blocked', item);
    const a = run(root, ['archive', '--change', 'c']);
    assert.strictEqual(a.status, 1, item);
    assert.match(a.stdout, /RESULT: NOT READY — nothing written/, item);
  }
  // the self-name is read through the canonical parser: a fenced / commented `change:` example is inert both ways
  for (const wrap of [(x) => '```text\n' + x + '\n```\n', (x) => '<!-- ' + x + ' -->\n', (x) => '<!--\n' + x + '\n-->\n']) {   // fence, inline comment, multiline comment with the scalar at column zero
    let root = proj(['F-1: follow-up → c — platform ask']);
    let fsp = path.join(root, 'apriori/changes/c/flow-state.md');
    fs.writeFileSync(fsp, wrap('change: example') + fs.readFileSync(fsp, 'utf8'));
    let rdy = rd.readinessOf({ bundleDir: bundle(root), name: 'c', cwd: root });
    assert.strictEqual(rdy.blockers.filter((b) => b.rule === 'R5').length, 1, 'self-target stays pending behind an inert example');
    assert.strictEqual(gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK }).checks.find((x) => x.id === 'C9').status, 'blocked');
    root = proj(['F-2: follow-up → valid-next — platform ask']);
    fsp = path.join(root, 'apriori/changes/c/flow-state.md');
    fs.writeFileSync(fsp, wrap('change: valid-next') + fs.readFileSync(fsp, 'utf8'));
    rdy = rd.readinessOf({ bundleDir: bundle(root), name: 'c', cwd: root });
    assert.deepStrictEqual(rdy.blockers.filter((b) => b.rule === 'R5'), [], 'an inert example naming the landing does not block a real follow-up');
    assert.ok(rdy.notes.some((n) => /follow-up F-2 → valid-next/.test(n)));
  }
  // owner acceptance over a well-formed follow-up: accepted wins the report
  const root = proj(['F-01: follow-up → punctuation-policy — a pluggable policy'], '  - 2026-09-26T00:00 owner: evidence-accept F-01 — accepted as is\n');
  const rdy = rd.readinessOf({ bundleDir: bundle(root), name: 'c', cwd: root });
  assert.deepStrictEqual(rdy.blockers.filter((b) => b.rule === 'R5'), []);
  assert.ok(rdy.notes.some((n) => /1 accepted, still present \(F-01\)/.test(n)), rdy.notes.join('|'));
  assert.ok(!rdy.notes.some((n) => /registered, not a blocker/.test(n)), 'accepted is not reported as a follow-up note');
});

test('PR-42 the disposition rule lands in both editions of §4', () => {
  const sec = (t, h, next) => t.slice(t.indexOf(h), t.indexOf(next, t.indexOf(h)));
  const en = sec(fs.readFileSync(path.join(ROOT, 'RUNBOOK.md'), 'utf8'), '### Review & Deliver', '\n## ');
  for (const [label, re] of Object.entries({
    'per finding, never by volume': /scope is judged per finding, never by volume/,
    'three bases': /the \*current contract\*[^\n]*an \*existing constraint\*[^\n]*a \*new ask\*/,
    'necessary-fix criterion': /A finding is a necessary fix for THIS delivery when, left alone, the product as it would be delivered violates a locatable accepted acceptance condition, a valid owner decision or an applicable existing constraint/,
    'cites basis and evidence': /the disposition cites that basis and the evidence of the violation/,
    'never moved out for size': /never moved out because it is large: split the implementation if you must, the delivery keeps its dependency on it/,
    'commitment change is the owner\'s': /Changing a commitment is the owner's decision \(R1\); until it is recorded, the commitment and its blocking stand/,
    'follow-up grammar + note': /`- <ID>: follow-up → <new-change-name> — <text>` in `## Open`, which gate C9 \/ archive R5 \/ `status` report as a note, not a blocker/,
    'moving out is not closing': /moving it out is not closing it/,
    'recommended words, not closed': /are the recommended words, not a closed vocabulary: an unresolved finding keeps its id, its current impact and its next action/,
    'approach is not a ledger': /`review-progress`'s `approach:`[^\n]*not a second ledger of findings/,
  })) assert.match(en, re, `RUNBOOK.md §4 lacks: ${label}`);
  const cn = sec(fs.readFileSync(path.join(ROOT, 'RUNBOOK_cn.md'), 'utf8'), '### Review & Deliver', '\n## ');
  for (const [label, re] of Object.entries({
    '按每条发现': /范围按每条发现判断,从不按体量/,
    '三种依据': /\*当前契约\*[^\n]*\*既有约束\*[^\n]*\*新增诉求\*/,
    '必要修复判据': /若不处理该发现,拟交付的产物将违反一条可定位的已承诺验收条件、有效的所有者决定或适用的既有约束,那它就是本次交付的必要修复/,
    '引用依据与证据': /处置须同时引用该依据和违背它的证据/,
    '不因体量移出': /绝不因体量大而移出:实现可以拆,交付对它的依赖保留/,
    '改承诺是所有者的': /改变承诺是所有者的决定\(R1\);记录之前,承诺与它的阻断继续有效/,
    'follow-up 语法 + note': /`- <ID>: follow-up → <新 change 名> — <内容>`,gate C9 \/ archive R5 \/ `status` 把它当 note 报告而非阻断/,
    '移出不等于关闭': /移出不等于关闭/,
    '推荐写法非封闭': /是推荐写法,不是封闭词表:未解决的发现保留其 ID、当前影响与下一动作/,
    'approach 不是账本': /`approach:` 只说为什么保留或改变方案——它不是第二份问题账本/,
  })) assert.match(cn, re, `RUNBOOK_cn.md §4 lacks: ${label}`);
  // the P3 block is not touched (RIB-10 pins it verbatim by a recorded human ruling): the disposition is the producer's duty
  const crypto = require('crypto');
  for (const [file, want] of Object.entries({ 'RUNBOOK.md': '97a85ca560d41c70', 'RUNBOOK_cn.md': 'd3c2c74d8aa3f3b6' })) {
    const m = fs.readFileSync(path.join(ROOT, file), 'utf8').match(/### P3 [\s\S]*?(?=### P4 )/);
    assert.strictEqual(crypto.createHash('sha256').update(m[0]).digest('hex').slice(0, 16), want, `${file}: P3 must stay verbatim`);
  }
});

test('PR-44 §5 and the CLI reference distinguish a pending item from a registered follow-up', () => {
  const en = fs.readFileSync(path.join(ROOT, 'RUNBOOK.md'), 'utf8');
  assert.match(en, /\*\*Exactly one thing blocks: a pending item — one nobody has accepted and that is not a registered follow-up\.\*\*/);
  assert.match(en, /a new ask with no delivery dependency is a follow-up item, not a pending one/);
  assert.match(en, /R1's unresolved delivery obligations and R4's review stops keep their authority: a follow-up registration releases neither/);
  // commitment-carry: the receiving change now carries the original id as a pending item (PR-58)
  assert.match(en, /The landing spot is a valid change name that is not this change; when that change is later opened under its own authorization, it carries the original id and text as a pending `## Open` item/);
  const cn = fs.readFileSync(path.join(ROOT, 'RUNBOOK_cn.md'), 'utf8');
  assert.match(cn, /\*\*只有一件事阻断:pending 的条目——没有人接受、且不是已登记 follow-up 的条目。\*\*/);
  assert.match(cn, /本次交付不依赖的新增诉求是 follow-up 条目,不是 pending/);
  assert.match(cn, /R1 未了结的交付义务与 R4 的评审停止保持其效力:登记 follow-up 放行不了任何一个/);
  assert.match(cn, /落点必须是一个合法且不是本 change 的 change 名;日后在其自身授权下开启那个 change 时,它以原 ID 与原文记一条 pending 的 `## Open` 条目/);
  assert.match(fs.readFileSync(path.join(ROOT, 'docs', 'cli.md'), 'utf8'), /a registered follow-up item \(`- <ID>: follow-up → <new-change-name> — <text>`, see C9\) is a note, not a blocker/);
});
