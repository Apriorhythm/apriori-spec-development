'use strict';
// MD-01..MD-07 — slice 1: the change identity collapses to ONE field.
//
// 5.x carried four: `tier` (trivial|medium|large), `track` (harden|explore),
// `track-rationale`, and `round`. Reality check found that `round` was written and then
// discarded (no decision reads it), `track` was only ever required to be PRESENT (no branch
// ever read harden vs explore), and only `tier === 'trivial'` actually decided anything —
// four times, all of them "relax a requirement". 6.0 replaces the four with `mode`.
//
// The migration is deliberate and loud: a 5.x flow-state is REFUSED, never silently read.
// Accepting both spellings would be "add the new path, keep the old one", which is the one
// thing the subtractive redesign forbids.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');

const rd = require('../lib/readiness');
const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });

const mk = () => fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-mode-'));
const w = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); return p; };

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n';
const DELTA = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';
const LEDGER = '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n| Q-1 | i | low | 1 | verified |\n';

// A gate-able project. `flow` is the literal flow-state body so a test can hand it 5.x text.
function project(flow, { tasks = '- [x] T1 done\n', ledger = LEDGER } = {}) {
  const root = mk();
  const dir = path.join(root, 'apriori', 'changes', 'c');
  w(path.join(root, 'apriori', 'specs', 'kv', 'spec.md'), STORE);
  w(path.join(dir, 'specs', 'kv', 'spec.md'), DELTA);
  w(path.join(dir, 'flow-state.md'), flow);
  if (tasks !== null) w(path.join(dir, 'tasks.md'), tasks);
  if (ledger !== null) w(path.join(dir, 'review', 'issues.md'), ledger);
  else fs.mkdirSync(path.join(dir, 'review'), { recursive: true });
  return { root, dir };
}

// the state's own answer to C9/R5: an empty `## Open` section — nothing owed. These fixtures
// are about the identity keys, so they fail on their own subject.
const OPEN = '\n## Open\n\n';

const flowWith = (body) =>
  `change: c\n${body}lineage: fixture\nphase: build\nnext-action: x\n` + OPEN +
  'gates:\n  - 2026-07-11T00:00 note: fixture\n';

// the C-line for one check id out of `apriori gate` plain output
const checkLine = (stdout, id) => (stdout.split('\n').find((l) => l.includes(` ${id} `)) || '').trim();

test('MD-01 the scaffold carries no identity field at all — neither mode nor the four it replaced', () => {
  const root = mk();
  const r = run(['new', 'demo'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const text = fs.readFileSync(path.join(root, 'apriori', 'changes', 'demo', 'flow-state.md'), 'utf8');
  for (const dead of ['mode', 'tier', 'track', 'track-rationale', 'round'])
    assert.doesNotMatch(text, new RegExp(`^${dead}:`, 'm'), `${dead}: must not be scaffolded any more`);
  // the closing hint must not send the human to fill fields that no longer exist
  assert.doesNotMatch(r.stdout, /tier|track|mode/, 'the next-step hint still names a removed field');
});

test('MD-02 status reports mode, and its JSON has no trace of the removed four', () => {
  const { root } = project(flowWith('mode: standard\n'));
  const plain = run(['status', '--change', 'c'], root);
  assert.strictEqual(plain.status, 0, plain.stdout + plain.stderr);
  assert.match(plain.stdout, /mode standard/, 'the human line must state the mode');
  assert.doesNotMatch(plain.stdout, /tier|track/, 'the human line still prints a removed field');

  const json = run(['status', '--change', 'c', '--json'], root);
  assert.strictEqual(json.status, 0, json.stdout + json.stderr);
  const o = JSON.parse(json.stdout);
  assert.strictEqual(o.mode, 'standard');
  for (const dead of ['tier', 'track', 'round'])
    assert.ok(!(dead in o), `'${dead}' must not survive in the machine shape`);
});

test('MD-03 C3 accepts exactly the two modes, or none at all', () => {
  for (const mode of ['fast', 'standard'])
    assert.strictEqual(rd.checkFlowState({ change: 'c', mode, lineage: 'l', phase: 'build' }, 'c').status,
      'pass', mode);
  // 6.2: the key is optional — absent and empty both read as "no mode", and that is legal
  for (const none of [undefined, ''])
    assert.strictEqual(rd.checkFlowState({ change: 'c', mode: none, lineage: 'l', phase: 'build' }, 'c').status,
      'pass', String(none));
  for (const bad of ['trivial', 'medium', 'large', 'harden', 'Fast'])
    assert.strictEqual(rd.checkFlowState({ change: 'c', mode: bad, lineage: 'l', phase: 'build' }, 'c').status,
      'blocked', `'${bad}' must not be a legal mode`);
  assert.ok(!('TIER_ENUM' in rd), 'the tier vocabulary must be gone, not merely unused');
  assert.deepStrictEqual(rd.MODE_ENUM, ['fast', 'standard']);
});

test('MD-04 a 5.x flow-state is refused with a migration pointer, never silently read', () => {
  const legacy = flowWith('tier: medium\ntrack: harden\ntrack-rationale: r\nround: 1\n');
  const { root } = project(legacy);
  const g = run(['gate', '--change', 'c'], root);
  assert.notStrictEqual(g.status, 0, 'a 5.x bundle must never reach PASS');
  const c3 = checkLine(g.stdout, 'C3');
  assert.match(c3, /BLOCKED/, `C3 must block a 5.x flow-state, got: ${c3}`);
  assert.match(c3, /tier/, 'the diagnosis must name what it found');
  assert.match(c3, /mode/, 'and what it wants instead');
  // silent double-reading is the failure this test exists to prevent
  assert.doesNotMatch(c3, /legal \(/, 'C3 must not have accepted the legacy spelling');
});

test('MD-05 neither mode is asked for tasks.md — the reader is gone, whatever the mode says', () => {
  for (const mode of ['fast', 'standard']) {
    for (const tasks of [null, '- [ ] never finished\n']) {
      const p = project(flowWith(`mode: ${mode}\n`), { tasks });
      const g = run(['gate', '--change', 'c'], p.root);
      assert.match(checkLine(g.stdout, 'C2'), /^– C2 retired in 6\.2 — nothing is read$/, `${mode}: ${checkLine(g.stdout, 'C2')}`);
      assert.doesNotMatch(g.stdout, /trivial|unchecked/, 'a leftover word survives in the C2 line');
    }
  }
});

test('MD-06 archive readiness no longer branches on the mode at all', () => {
  const mkBundle = (mode) => {
    const { dir } = project(flowWith(`mode: ${mode}\n`).replace('phase: build', 'phase: review'),
      { tasks: null, ledger: null });
    // R4's one independent review is the floor both modes owe; the artifacts are what went away
    w(path.join(dir, 'review', 'code-review-v1.md'), 'VERDICT: no major issues\n');
    w(path.join(dir, 'review', 'code-review-v1-raw.txt'), 'raw\n');
    return dir;
  };
  for (const mode of ['fast', 'standard']) {
    const r = rd.readinessOf({ bundleDir: mkBundle(mode), name: 'c' });
    assert.strictEqual(r.ready, true, `${mode}: ${JSON.stringify(r.blockers)}`);
    // neither R2 nor R3 exists any more: nothing is n/a because no artifact rule is left to be n/a
    assert.deepStrictEqual(r.na, [], mode);
    assert.ok(!r.blockers.some((b) => /^R[23]$/.test(b.rule)), 'a retired artifact rule came back');
  }
});

test('MD-07 no decision anywhere in lib/ still reads the removed four', () => {
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const libDir = path.join(__dirname, '..', 'lib');
  // hotfix.js has its own `tier` (the screenshot grade incremental|full) — a different word.
  // readiness.js is the ONE place allowed to say these words, and only to diagnose a 5.x
  // bundle: naming what it found is the whole point of the migration message (MD-04).
  const skip = new Set(['hotfix.js', 'readiness.js']);
  for (const f of fs.readdirSync(libDir)) {
    if (!f.endsWith('.js') || skip.has(f)) continue;
    const src = strip(fs.readFileSync(path.join(libDir, f), 'utf8'));
    for (const dead of ['tier', 'track-rationale'])
      assert.ok(!new RegExp(`\\b${dead}\\b`).test(src), `lib/${f} still mentions '${dead}'`);
  }
  // readiness may NAME them; it must never BRANCH on them
  const rdSrc = strip(fs.readFileSync(path.join(libDir, 'readiness.js'), 'utf8'));
  for (const branch of ['state.tier', "state\\['tier'\\]", "'trivial'", 'TIER_ENUM'])
    assert.ok(!new RegExp(branch).test(rdSrc), `readiness.js still branches on ${branch}`);
  assert.ok(/LEGACY_IDENTITY/.test(rdSrc), 'the 5.x keys must live in one named migration constant');

  // status.js must no longer parse them at all
  const stat = strip(fs.readFileSync(path.join(libDir, 'status.js'), 'utf8'));
  for (const dead of ['round', 'track', 'tier'])
    assert.ok(!new RegExp(`'${dead}'`).test(stat), `status.js still parses '${dead}'`);
});

// ---------------------------------------------------------------------------
// REVISE round: the review found four holes in the first cut. Each one gets a
// behaviour test through a real consumer, not a unit call on the predicate.
// ---------------------------------------------------------------------------

test('MD-08 a legacy key rejects even when a legal mode sits beside it', () => {
  // the first cut only looked for legacy keys when `mode` was ABSENT, so a bundle that
  // carried both spellings was read under the new one and the stale 5.x row rode along
  for (const [label, extra] of [
    ['tier', 'tier: medium\n'],
    ['track', 'track: harden\n'],
    ['track-rationale', 'track-rationale: r\n'],
    ['round', 'round: 1\n'],
    ['all four', 'tier: medium\ntrack: harden\ntrack-rationale: r\nround: 1\n'],
  ]) {
    const { root } = project(flowWith(`mode: standard\n${extra}`));
    const g = run(['gate', '--change', 'c'], root);
    const c3 = checkLine(g.stdout, 'C3');
    assert.match(c3, /BLOCKED/, `${label}: a legal mode must not launder a 5.x key — got: ${c3}`);
    assert.match(c3, /5\.x identity/, label);
    for (const k of extra.split('\n').filter(Boolean).map((l) => l.split(':')[0]))
      assert.ok(c3.includes(k), `${label}: the diagnosis must list ${k}`);
    assert.notStrictEqual(g.status, 0, label);
  }
});

test('MD-09 an empty mode: never swallows the next line', () => {
  const { parseFlowState } = require('../lib/status');
  // the parser first: `\s*` matched the newline, so `mode:` took `lineage: main` as its value
  const text = 'change: c\nmode:\nlineage: main\nphase: build\n';
  const st = parseFlowState(text);
  assert.strictEqual(st.mode, undefined, `an empty key has no value, got ${JSON.stringify(st.mode)}`);
  assert.strictEqual(st.lineage, 'main', 'and the next line is still itself');

  // and the consumers agree: gate reads an empty mode as ABSENT (legal since 6.2), never as
  // 'lineage: main'
  const { root } = project(flowWith('mode:\n'));
  const g = run(['gate', '--change', 'c'], root);
  const c3 = checkLine(g.stdout, 'C3');
  assert.match(c3, /^✓ C3 legal \(build\)$/, c3);
  assert.doesNotMatch(c3, /lineage/, 'the diagnosis must not quote the line it swallowed');

  const j = JSON.parse(run(['status', '--change', 'c', '--json'], root).stdout);
  assert.strictEqual(j.mode, null);
  assert.strictEqual(j.lineage, 'fixture');
});

test('MD-10 a mode value is trimmed, and only the two spellings pass', () => {
  const { parseFlowState } = require('../lib/status');
  assert.strictEqual(parseFlowState('mode:   fast   \n').mode, 'fast', 'padding is not part of the value');
  assert.strictEqual(parseFlowState('mode: standard   # why\n').mode, 'standard', 'a trailing comment is not part of it');
  for (const [spelling, ok] of [['fast', true], ['standard', true], [' fast ', true],
                                ['Fast', false], ['FAST', false], ['fast standard', false]]) {
    const { root } = project(flowWith(`mode:${spelling}\n`.replace('mode:', 'mode: ')));
    const c3 = checkLine(run(['gate', '--change', 'c'], root).stdout, 'C3');
    if (ok) assert.match(c3, /legal \(mode (fast|standard), build\)/, `'${spelling}' should pass — got ${c3}`);
    else assert.match(c3, /not in \{fast, standard\}/, `'${spelling}' should fail — got ${c3}`);
  }
});

test('MD-11 archive gives the same migration diagnosis the gate gives', () => {
  const legacy = flowWith('mode: standard\ntier: medium\ntrack: harden\n')
    .replace('phase: build', 'phase: review');
  const { root } = project(legacy);
  const r = run(['archive', '--change', 'c'], root);
  assert.strictEqual(r.status, 1, r.stdout + r.stderr);
  const said = r.stdout + r.stderr;
  assert.match(said, /RESULT: NOT READY/);
  assert.match(said, /5\.x identity/, 'archive must not stop at "mode missing"');
  assert.match(said, /tier/); assert.match(said, /track/);
  assert.match(said, /MIGRATING/, 'and must point at the migration');
});

test('MD-12 doctor reports a 5.x identity bundle instead of calling it healthy', () => {
  const { root } = project(flowWith('mode: standard\ntier: medium\nround: 1\n'));
  const dr = require('../lib/doctor').runDoctor({ cwd: root });
  const d7 = dr.checks.filter((x) => x.id === 'D7');
  const finding = d7.find((x) => x.status === 'finding' && /5\.x identity/.test(x.detail));
  assert.ok(finding, `D7 must name it: ${JSON.stringify(d7)}`);
  assert.match(finding.detail, /tier/); assert.match(finding.detail, /round/);
  assert.match(String(finding.fix), /MIGRATING/);
  // it is a finding, not a stop: the other diagnostics still ran
  for (const id of ['D1', 'D2', 'D8']) assert.ok(dr.checks.some((x) => x.id === id), `${id} must still run`);
});

test('MD-13 status surfaces the legacy identity rather than printing a healthy line', () => {
  const { root } = project(flowWith('mode: standard\ntier: medium\ntrack: harden\n'));
  const plain = run(['status', '--change', 'c'], root);
  assert.match(plain.stdout, /5\.x identity/, plain.stdout);
  assert.match(plain.stdout, /tier, track/);
  const j = JSON.parse(run(['status', '--change', 'c', '--json'], root).stdout);
  assert.deepStrictEqual(j.legacyIdentity, ['tier', 'track']);
  // a clean bundle carries the field as null, so a consumer can test it without guessing
  const clean = project(flowWith('mode: standard\n'));
  assert.strictEqual(JSON.parse(run(['status', '--change', 'c', '--json'], clean.root).stdout).legacyIdentity, null);
});

test('MD-14 the runbook kickoff and session-start no longer ask for the removed four', () => {
  const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  for (const f of ['RUNBOOK.md', 'RUNBOOK_cn.md']) {
    const doc = read(f);
    // the kickoff prompt block is the copy-and-fill line a human actually pastes
    const kickoff = doc.split('\n').filter((l) => /apriori runbook|apriori\/runbook\.md/.test(l)).join('\n');
    for (const dead of ['tier', 'track', '级别', '轨道'])
      assert.ok(!kickoff.includes(dead), `${f}: the kickoff prompt still asks for '${dead}'`);
    // the session-start rule must not route by a vocabulary that no longer exists
    assert.doesNotMatch(doc, /begin at the tier's first step/, f);
    assert.doesNotMatch(doc, /从该级别的第一步开始/, f);
    // and no dangling reference to a deleted tier value anywhere
    for (const dead of [/\btrivial tier\b/, /\bLarge tier\b/, /\bmedium\/large\b/])
      assert.doesNotMatch(doc, dead, `${f}: dangling ${dead}`);
  }
});

test('MD-15 the mechanical floor claims exactly what the CLI actually does', () => {
  const en = fs.readFileSync(path.join(__dirname, '..', 'RUNBOOK.md'), 'utf8');
  const cn = fs.readFileSync(path.join(__dirname, '..', 'RUNBOOK_cn.md'), 'utf8');
  // slice 3 made ONE of §2's situations mechanical. The runbook must claim that one...
  assert.match(en, /contract-mutation/, 'the mechanical half must be named, with its reason token');
  assert.match(cn, /contract-mutation/);
  // ...and must still say plainly that the others are the human's, so it never over-claims a
  // diff scanner this CLI does not have. The slice-1 sentence "not enforced by the CLI" is
  // retired WITH the thing it described — a rule that becomes mechanical takes its own
  // disclaimer with it, rather than leaving a false statement standing beside a true one.
  assert.doesNotMatch(en, /not enforced by the CLI/, 'the blanket disclaimer outlived its truth');
  assert.doesNotMatch(cn, /CLI 目前不做机械强制/);
  assert.match(en, /reads none of them/, 'the unimplemented rows must still be declared unimplemented');
  assert.match(cn, /CLI 一个都不读/);
  // and the review floor is stated where the mode is chosen — for BOTH modes, plus the
  // resolved-verdict rule that is fast's alone because fast keeps no ledger
  assert.match(en, /Neither mode may drop the one independent review/);
  assert.match(cn, /两种模式都不能省那一次独立评审/);
  // slice 5: what decides whether the review itself must close is no longer the MODE but where
  // the findings live — a mode is one edited word, a ledger is a file with rows in it.
  assert.match(en, /The review must also have CLOSED — in either mode/);
  assert.match(cn, /评审还必须已经收敛——两种模式都一样/);
});

test('MD-16 every session runs status + flow-state + Next first, reading the runbook only on demand', () => {
  const en = fs.readFileSync(path.join(__dirname, '..', 'RUNBOOK.md'), 'utf8');
  const cn = fs.readFileSync(path.join(__dirname, '..', 'RUNBOOK_cn.md'), 'utf8');
  assert.doesNotMatch(en, /read this runbook in full/i);
  assert.doesNotMatch(cn, /完整读本 RUNBOOK/);
  // the old fixed default reading set (read §1/§3/§2/§5/§4 every session) is gone
  for (const token of ['§1 hard rules', '§3 state-file rules', "recorded mode's §2 entry",
                        'recorded phase in §5', "phase's §4 entry"])
    assert.ok(!en.includes(token), `EN still declares the old default reading set: ${token}`);
  for (const token of ['§1 铁律', '§3 状态文件规则', 'mode 在 §2', 'phase 在 §5', '阶段在 §4'])
    assert.ok(!cn.includes(token), `CN still declares the old default reading set: ${token}`);
  // the on-demand entry point: status first, then flow-state's Next, then a runbook section
  // only when status/Next/a blocked command/an uncertain fact points there
  assert.match(en, /Run `apriori status --change <name>`/);
  assert.match(en, /Read a runbook section only when `status`, `## Next`, a blocked command, or an uncertain fact points you there/);
  assert.match(cn, /先跑 `apriori status --change <name>`/);
  assert.match(cn, /只有当 `status`、`## Next`、一个被阻塞的命令、或一个不确定的事实指向某节时,才去读那一节 runbook/);

  const command = fs.readFileSync(path.join(__dirname, '..', 'templates', 'command.md'), 'utf8');
  assert.doesNotMatch(command, /current mode\/phase minimal set/);
  assert.match(command, /never preload the full runbook/i);
  assert.doesNotMatch(require('../lib/init').POINTER, /current mode\/phase minimal set/);
  assert.match(require('../lib/init').POINTER, /never preload the full runbook/i);
});
