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

const flowWith = (body) =>
  `change: c\n${body}lineage: fixture\ncurrent-step: STEP5\nnext-action: x\n` +
  'gates:\n  - 2026-07-11T00:00 note: fixture\n';

// the C-line for one check id out of `apriori gate` plain output
const checkLine = (stdout, id) => (stdout.split('\n').find((l) => l.includes(` ${id} `)) || '').trim();

test('MD-01 the scaffold carries one identity field, and none of the four it replaces', () => {
  const root = mk();
  const r = run(['new', 'demo'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const text = fs.readFileSync(path.join(root, 'apriori', 'changes', 'demo', 'flow-state.md'), 'utf8');
  assert.match(text, /^mode: <fast \| standard>/m, 'the one identity field must be scaffolded');
  for (const dead of ['tier', 'track', 'track-rationale', 'round'])
    assert.doesNotMatch(text, new RegExp(`^${dead}:`, 'm'), `${dead}: must not be scaffolded any more`);
  // the closing hint must not send the human to fill fields that no longer exist
  assert.doesNotMatch(r.stdout, /tier|track/, 'the next-step hint still names a removed field');
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

test('MD-03 C3 accepts exactly the two modes', () => {
  for (const mode of ['fast', 'standard'])
    assert.strictEqual(rd.checkFlowState({ change: 'c', mode, lineage: 'l', 'current-step': 'STEP5' }, 'c').status,
      'pass', mode);
  for (const bad of ['trivial', 'medium', 'large', 'harden', 'Fast', ''])
    assert.strictEqual(rd.checkFlowState({ change: 'c', mode: bad, lineage: 'l', 'current-step': 'STEP5' }, 'c').status,
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

test('MD-05 fast waives tasks.md; standard does not', () => {
  const fast = project(flowWith('mode: fast\n'), { tasks: null });
  const gf = run(['gate', '--change', 'c'], fast.root);
  assert.match(checkLine(gf.stdout, 'C2'), /^– C2 .*no tasks\.md/, checkLine(gf.stdout, 'C2'));

  const std = project(flowWith('mode: standard\n'), { tasks: null });
  const gs = run(['gate', '--change', 'c'], std.root);
  assert.strictEqual(gs.status, 1, 'a standard change without tasks.md must BLOCK');
  assert.match(checkLine(gs.stdout, 'C2'), /BLOCKED — tasks\.md missing/);

  // and the waiver is spelled by the mode, not by a leftover tier word
  assert.doesNotMatch(gf.stdout, /trivial/, 'the C2 waiver still explains itself in tier language');
});

test('MD-06 archive readiness takes its R2/R3 waivers from fast, not from a tier', () => {
  const mkBundle = (mode) => {
    const { dir } = project(flowWith(`mode: ${mode}\n`).replace('current-step: STEP5', 'current-step: STEP6'),
      { tasks: null, ledger: null });
    return dir;
  };
  const fast = rd.readinessOf({ bundleDir: mkBundle('fast'), name: 'c' });
  assert.strictEqual(fast.ready, true, JSON.stringify(fast.blockers));
  assert.deepStrictEqual(fast.na.sort(), ['R2', 'R3']);

  const std = rd.readinessOf({ bundleDir: mkBundle('standard'), name: 'c' });
  assert.strictEqual(std.ready, false, 'standard must still owe tasks.md and a ledger');
  assert.deepStrictEqual(std.na, []);
  assert.strictEqual(std.blockers.length, 2);
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
  const text = 'change: c\nmode:\nlineage: main\ncurrent-step: STEP5\n';
  const st = parseFlowState(text);
  assert.strictEqual(st.mode, undefined, `an empty key has no value, got ${JSON.stringify(st.mode)}`);
  assert.strictEqual(st.lineage, 'main', 'and the next line is still itself');

  // and the consumers agree: gate says the key is missing, not that the mode is 'lineage: main'
  const { root } = project(flowWith('mode:\n'));
  const g = run(['gate', '--change', 'c'], root);
  const c3 = checkLine(g.stdout, 'C3');
  assert.match(c3, /required key 'mode' missing/, c3);
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
    if (ok) assert.match(c3, /legal \(mode/, `'${spelling}' should pass — got ${c3}`);
    else assert.match(c3, /not in \{fast, standard\}/, `'${spelling}' should fail — got ${c3}`);
  }
});

test('MD-11 archive gives the same migration diagnosis the gate gives', () => {
  const legacy = flowWith('mode: standard\ntier: medium\ntrack: harden\n')
    .replace('current-step: STEP5', 'current-step: STEP6');
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

test('MD-15 the mechanical floor claims only what the CLI actually does today', () => {
  const en = fs.readFileSync(path.join(__dirname, '..', 'RUNBOOK.md'), 'utf8');
  const cn = fs.readFileSync(path.join(__dirname, '..', 'RUNBOOK_cn.md'), 'utf8');
  // no scanner ships in this slice; the runbook must not imply the CLI forces the choice
  assert.doesNotMatch(en, /Mechanical floor/, 'the CLI enforces nothing here yet');
  assert.doesNotMatch(cn, /机械下界/);
  assert.match(en, /not enforced by the CLI/, 'and it must say so out loud');
  assert.match(cn, /CLI 目前不做机械强制/);
});
