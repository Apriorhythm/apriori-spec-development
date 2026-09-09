'use strict';
// LNG-01..07 — the `lineage:` field moves into the Reality Check `decision:` line (batch C row 7).
//
// The scaffold stops writing the field and instead carries an INERT sample (an HTML comment —
// documentation, never an item) showing the migration target: the target branch/line + merge
// taboo recorded as the bundle's first `- decision: lineage — …` line. C3 drops `lineage` from
// its required-key table; the reader keeps the KEY as LEGACY TOLERANCE (flow.js STATE_KEYS):
// an old bundle carrying `lineage: main` — or even the unfilled scaffold placeholder — must
// parse with ZERO new defects and ZERO new C3 refusals. `status --json` keeps the `lineage`
// key for ONE version, always null on every change-view path (MIGRATING). Rollback criterion,
// held by TWO tests with different powers: LNG-05 replays the corpus with and without the
// legacy line (defect sets and C3 verdicts identical; readiness blockers merely free of
// lineage wording — a SELF-comparison, blind to a drift that hits both sides alike), and
// LNG-07 pins the frozen 6.1 baseline's complete verdicts as golden data the shipped code
// must reproduce literally. Any new C3 refusal on a legacy bundle without a named migration
// message rolls the row back.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const flow = require('../lib/flow');
const rd = require('../lib/readiness');
const nw = require('../lib/new');

const ROOT = path.join(__dirname, '..');
const BIN = path.join(ROOT, 'bin', 'apriori.js');

test('LNG-01 the scaffold no longer writes lineage: — and carries the inert decision-line sample instead', () => {
  const s = nw.flowStateSkeleton('my-change', new Date(2026, 0, 2, 3, 4));
  assert.ok(!/^lineage:/m.test(s), 'the retired lineage: field is still scaffolded');
  // the migration target is IN the template, as an inert sample: a decision line naming the
  // target branch/line + merge taboo
  assert.match(s, /decision: lineage — <target branch\/line \+ its merge taboo>/,
    'the template lost the lineage-as-decision sample (the row 7 migration path)');
  // …and the sample is documentation, never an item and never a defect
  assert.deepStrictEqual(flow.sectionItems(s, 'Reality Check'), []);
  assert.deepStrictEqual(flow.structuralDefects(s), []);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-lng-'));
  const r = nw.scaffoldChange(root, 'my-change', new Date(2026, 0, 2, 3, 4));
  assert.strictEqual(r.ok, true);
  const text = fs.readFileSync(path.join(root, 'apriori', 'changes', 'my-change', 'flow-state.md'), 'utf8');
  assert.ok(!/^lineage:/m.test(text), 'scaffolded flow-state still carries a live lineage line');
});

test('LNG-02 a legacy lineage: line is tolerated — read, ignored, never a defect, never a tracked scalar', () => {
  for (const [why, value] of [
    ['a filled value', 'main'],
    ['the 5.x/6.x taboo form', 'v2 (never merge to main)'],
    ['the unfilled scaffold placeholder', '<target branch/line + merge taboo>'],
  ]) {
    const legacy = [
      'change: old-change',
      `lineage: ${value}`,
      'phase: build',
      '',
      '## Open',
      '',
      'gates:',
      '  - 2026-01-02T03:04 note: scaffolded',
      '',
    ].join('\n');
    assert.deepStrictEqual(flow.structuralDefects(legacy), [], why);
    const st = flow.parseFlowState(legacy);
    assert.ok(!('lineage' in st), `${why}: lineage must not surface as a tracked scalar`);
    const c3 = rd.checkFlowState(st, 'old-change', legacy);
    assert.strictEqual(c3.status, 'pass', `${why}: C3 newly refuses a legacy lineage bundle: ${c3.detail}`);
  }
  // mid-file position: the key must still END a section (STATE_KEYS tolerance)
  const midFile = [
    'change: old-change',
    'phase: build',
    '',
    '## Open',
    '- R-1: still open',
    'lineage: main',
    '',
    'gates:',
    '  - 2026-01-02T03:04 note: scaffolded',
    '',
  ].join('\n');
  assert.deepStrictEqual(flow.structuralDefects(midFile), [],
    'a column-0 lineage: line stopped ending sections — legacy tolerance broken');
  assert.deepStrictEqual(flow.parseFlowState(midFile).openIssues, ['R-1: still open']);
});

test('LNG-03 C3 requires change and phase — and only those; a bundle with no lineage at all passes', () => {
  const text = 'change: c\nphase: build\n\n## Open\n\ngates:\n  - 2026-01-02T03:04 note: s\n';
  const c3 = rd.checkFlowState(flow.parseFlowState(text), 'c', text);
  assert.strictEqual(c3.status, 'pass', `C3 still demands the retired key: ${c3.detail}`);
  // the keys that stay required stay required
  for (const [drop, needle] of [
    ['change: c\n', /required key 'change' missing/],
    ['phase: build\n', /required key 'phase' missing/],
  ]) {
    const broken = text.replace(drop, '');
    const r = rd.checkFlowState(flow.parseFlowState(broken), 'c', broken);
    assert.strictEqual(r.status, 'blocked');
    assert.match(r.detail, needle);
  }
});

test('LNG-04 status --json keeps the lineage key for one version, always null — even when the state carries a value', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-lng4-'));
  const dir = path.join(root, 'apriori', 'changes', 'c');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'flow-state.md'),
    'change: c\nlineage: v2 (never merge to main)\nphase: build\n\n## Open\n\ngates:\n  - 2026-01-02T03:04 note: s\n');
  const r = spawnSync('node', [BIN, 'status', '--change', 'c', '--json'], { cwd: root, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const j = JSON.parse(r.stdout);
  assert.ok('lineage' in j, 'the lineage key must stay one version for shape compatibility (MIGRATING)');
  assert.strictEqual(j.lineage, null, 'the retired key must read null, never the legacy value');
});

test('LNG-05 zero lineage-attributable refusals: corpus and self-repo replay IDENTICALLY with and without the legacy line', () => {
  // The persistent form of the acceptance replay (P3 r1): for EVERY compatibility fixture and
  // EVERY shipped self-repo flow-state, the complete structural-defect set and the complete C3
  // verdict must be byte-identical whether the legacy `lineage:` line is present, absent (header
  // position), or carries a different value (section position, where deleting the line would
  // change section shape for an unrelated reason). Defect line numbers are normalized — a
  // stripped line shifts them by one; nothing else may differ. And no verdict may mention
  // lineage at all: an archived 5.x bundle keeps its RECORDED refusals (legacy identity keys —
  // recorded, not re-judged), but none may be attributable to this row.
  const stripLineage = (text) => {
    const m = /^lineage:[^\n]*\n/m.exec(text);
    if (!m) return null;                                   // nothing to replay for this file
    const firstHeading = text.search(/^#/m);
    if (firstHeading !== -1 && m.index > firstHeading)
      return text.replace(/^(lineage:)[^\n]*$/m, '$1 other-replay-value');
    return text.replace(/^lineage:[^\n]*\n/m, '');
  };
  const norm = (s) => s.replace(/lines \d+ and \d+/g, 'lines N and N').replace(/line \d+/g, 'line N');
  const normLines = (arr) => arr.map(norm);
  const replay = (p) => {
    const text = fs.readFileSync(p, 'utf8');
    const stripped = stripLineage(text);
    if (stripped === null) return false;
    const rel = path.relative(ROOT, p);
    assert.deepStrictEqual(normLines(flow.structuralDefects(stripped)), normLines(flow.structuralDefects(text)),
      `${rel}: the defect set changed when the lineage line left`);
    const st = flow.parseFlowState(text), st2 = flow.parseFlowState(stripped);
    const name = st.change || 'x';
    const c3 = rd.checkFlowState(st, name, text), c3b = rd.checkFlowState(st2, name, stripped);
    assert.deepStrictEqual({ status: c3b.status, detail: norm(c3b.detail) }, { status: c3.status, detail: norm(c3.detail) },
      `${rel}: the C3 verdict changed when the lineage line left`);
    assert.doesNotMatch(`${c3.status} ${c3.detail}`, /lineage/i, `${rel}: a C3 verdict attributes something to lineage`);
    return true;
  };
  // (a) the compatibility corpus, whole
  const corpusDir = path.join(ROOT, 'test', 'fixtures', 'flow-corpus');
  const fixtures = fs.readdirSync(corpusDir).filter((n) => n.endsWith('.md'));
  assert.ok(fixtures.length >= 20, `the compatibility corpus went missing: ${fixtures.length} fixtures`);
  let carrying = 0;
  for (const n of fixtures) if (replay(path.join(corpusDir, n))) carrying++;
  assert.ok(carrying >= 10, `the corpus lost its lineage-carrying fixtures (${carrying}) — the tolerance claim is untested`);
  // (b) the whole shipped self-repo corpus — same replay, plus archive READINESS: the three
  // active bundles' complete blocker sets carry nothing lineage-attributable either
  const flowStates = [];
  (function walk(d) {
    for (const n of fs.readdirSync(d)) {
      const p = path.join(d, n);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (n === 'flow-state.md') flowStates.push(p);
    }
  })(path.join(ROOT, 'apriori', 'changes'));
  assert.ok(flowStates.length >= 36, `the shipped corpus went missing: ${flowStates.length} flow-states`);
  for (const p of flowStates) replay(p);
  const activeDir = path.join(ROOT, 'apriori', 'changes');
  const active = fs.readdirSync(activeDir).filter((n) => n !== 'archive' && fs.existsSync(path.join(activeDir, n, 'flow-state.md')));
  assert.ok(active.length >= 3, `the active self bundles went missing: ${active.join(', ')}`);
  for (const n of active) {
    const r = rd.readinessOf({ bundleDir: path.join(activeDir, n), name: n });
    for (const b of r.blockers)
      assert.doesNotMatch(`${b.rule} ${b.detail}`, /lineage/i, `${n}: a readiness blocker attributes something to lineage`);
  }
  // (c) an end-to-end replay of a lineage-carrying self bundle through the CLI reader
  const r = spawnSync('node', [BIN, 'status', '--change', 'state-switch-completeness-principle', '--json'], { cwd: ROOT, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, `status newly refuses the self bundle: ${r.stdout}${r.stderr}`);
  assert.strictEqual(JSON.parse(r.stdout).lineage, null);
});

test('LNG-06 the retired key\'s FULL contract: present and strictly null on every path that carries a change view', () => {
  // success single object · list element · resolve error · invalid-name error · strict-parser
  // error — a `{}` (or any non-null) slipped into toJson OR emptyChangeView must turn this red.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-lng6-'));
  const dir = path.join(root, 'apriori', 'changes', 'c');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'flow-state.md'),
    'change: c\nlineage: v2 (never merge to main)\nphase: build\n\n## Open\n\ngates:\n  - 2026-01-02T03:04 note: s\n');
  const run = (args) => spawnSync('node', [BIN, 'status', ...args, '--json'], { cwd: root, encoding: 'utf8' });
  const pin = (j, label) => {
    assert.ok('lineage' in j, `${label}: the lineage key must be present`);
    assert.strictEqual(j.lineage, null, `${label}: the retired key must be STRICTLY null (got ${JSON.stringify(j.lineage)})`);
  };
  const single = run(['--change', 'c']);
  assert.strictEqual(single.status, 0, single.stdout + single.stderr);
  pin(JSON.parse(single.stdout), 'single');
  const list = run([]);
  assert.strictEqual(list.status, 0, list.stdout + list.stderr);
  const lj = JSON.parse(list.stdout);
  assert.ok(lj.changes.length >= 1, 'the list view must carry the fixture change');
  for (const c of lj.changes) pin(c, `list element ${c.change}`);
  for (const [label, args] of [
    ['resolve error', ['--change', 'nope']],
    ['invalid-name error', ['--change', '../evil']],
    ['strict-parser error', ['--change', 'c', '--bogus']],
  ]) {
    const r = run(args);
    assert.strictEqual(r.status, 2, `${label}: ${r.stdout}${r.stderr}`);
    const j = JSON.parse(r.stdout);
    assert.strictEqual(j.errors.length, 1, label);
    pin(j, label);
  }
});

test('LNG-07 baseline verdict oracle: the shipped code reproduces the frozen 6.1 baseline literally over the whole corpus', () => {
  // LNG-05 judges BOTH sides of its replay with the code under test, so a regression that
  // breaks the two sides identically — say a C3 refusal keyed on a bundle NAME, worded
  // without the string "lineage" — sails through it (P3 acceptance r2, item 3). This test
  // holds the FOREIGN expectation instead: the complete verdict record of the frozen
  // baseline (v6-dev@2853684) over this same corpus — structural-defect sets, C3 verdicts,
  // full gate blocked sets and the active bundles' readiness blocker sets, line numbers
  // normalized — pinned as golden data (test/fixtures/lineage-baseline-golden.json, built
  // by running test/helpers/verdict-corpus.js against the baseline's own lib). The shipped
  // implementation must reproduce EVERY pinned record literally: a drift shared by both
  // sides of a self-comparison is still a diff against the baseline.
  const { judgeCorpus } = require('./helpers/verdict-corpus');
  const golden = JSON.parse(fs.readFileSync(
    path.join(__dirname, 'fixtures', 'lineage-baseline-golden.json'), 'utf8'));
  delete golden._meta;
  // the golden itself must still cover the full acceptance corpus — a truncated pin must
  // not pass by expecting less
  assert.strictEqual(Object.keys(golden.fixtures).length, 24, 'the pinned fixture corpus shrank');
  assert.strictEqual(Object.keys(golden.states).length, 36, 'the pinned self-repo corpus shrank');
  assert.strictEqual(Object.keys(golden.gate).length, 36, 'the pinned gate corpus shrank');
  assert.strictEqual(Object.keys(golden.readiness).length, 3, 'the pinned active-readiness corpus shrank');
  const actual = judgeCorpus(ROOT, { flow, readiness: rd, gate: require('../lib/gate') });
  // compared on the golden's keys: a LATER change may add bundles (they join the oracle
  // when the baseline is deliberately re-pinned), but no pinned verdict may drift — and no
  // pinned corpus entry may disappear
  for (const section of ['fixtures', 'states', 'gate', 'readiness']) {
    for (const key of Object.keys(golden[section])) {
      assert.ok(key in actual[section], `${section}/${key}: a pinned corpus entry disappeared`);
      assert.deepStrictEqual(actual[section][key], golden[section][key],
        `${section}/${key}: the verdict drifted from the 6.1 baseline`);
    }
  }
});
