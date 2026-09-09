'use strict';
// LNG-01..05 — the `lineage:` field moves into the Reality Check `decision:` line (batch C row 7).
//
// The scaffold stops writing the field and instead carries an INERT sample (an HTML comment —
// documentation, never an item) showing the migration target: the target branch/line + merge
// taboo recorded as the bundle's first `- decision: lineage — …` line. C3 drops `lineage` from
// its required-key table; the reader keeps the KEY as LEGACY TOLERANCE (flow.js STATE_KEYS):
// an old bundle carrying `lineage: main` — or even the unfilled scaffold placeholder — must
// parse with ZERO new defects and ZERO new C3 refusals. `status --json` keeps the `lineage`
// key for ONE version, always null (MIGRATING). Rollback criterion: the 20-case compatibility
// corpus + the shipped self-repo bundles replay with zero new refusals; any new C3 refusal on
// a legacy bundle without a named migration message rolls the row back.

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

test('LNG-05 the compatibility corpus and the shipped corpus replay with zero new refusals', () => {
  // (a) the 20-case flow corpus: every fixture carries a lineage: line and every one must
  // keep its recorded verdict — the corpus test itself re-runs them; here the tolerance side:
  const corpusDir = path.join(ROOT, 'test', 'fixtures', 'flow-corpus');
  const fixtures = fs.readdirSync(corpusDir).filter((n) => n.endsWith('.md'));
  assert.ok(fixtures.length >= 20, `the compatibility corpus went missing: ${fixtures.length} fixtures`);
  let carrying = 0;
  for (const n of fixtures) if (/^lineage:/m.test(fs.readFileSync(path.join(corpusDir, n), 'utf8'))) carrying++;
  assert.ok(carrying >= 10, `the corpus lost its lineage-carrying fixtures (${carrying}) — the tolerance claim is untested`);
  // (b) the whole shipped corpus parses with a complete defect set of []
  const flowStates = [];
  (function walk(d) {
    for (const n of fs.readdirSync(d)) {
      const p = path.join(d, n);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (n === 'flow-state.md') flowStates.push(p);
    }
  })(path.join(ROOT, 'apriori', 'changes'));
  assert.ok(flowStates.length >= 36, `the shipped corpus went missing: ${flowStates.length} flow-states`);
  for (const p of flowStates)
    assert.deepStrictEqual(flow.structuralDefects(fs.readFileSync(p, 'utf8')), [],
      `${path.relative(ROOT, p)}: new structural defect in the shipped corpus`);
  // (c) an end-to-end replay of a lineage-carrying self bundle through the CLI reader
  const r = spawnSync('node', [BIN, 'status', '--change', 'state-switch-completeness-principle', '--json'], { cwd: ROOT, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, `status newly refuses the self bundle: ${r.stdout}${r.stderr}`);
  assert.strictEqual(JSON.parse(r.stdout).lineage, null);
});
