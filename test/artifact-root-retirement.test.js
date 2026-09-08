'use strict';
// ARR-01..04 — the `artifact-root:` promise is retired (batch C row 1).
//
// The key was a NEVER-IMPLEMENTED promise: no runtime consumer exists (status/gate/new/verify
// all hard-code `apriori/changes`). The scaffold and the prose stop writing it. The KEY itself
// stays LEGACY-TOLERATED in the reader (flow.js STATE_KEYS): v5.0.0's `lib/new.js` also wrote
// the line and that npm version is public — an old bundle carrying `artifact-root: .` must
// parse with ZERO new defects, the line must still END a section (never become judged section
// content), and nothing may consume it. Rollback criterion: existing corpus + the three
// self-repo bundles replay with zero new refusals.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const flow = require('../lib/flow');
const rd = require('../lib/readiness');
const nw = require('../lib/new');

const ROOT = path.join(__dirname, '..');

test('ARR-01 the scaffold no longer writes artifact-root (template line retired)', () => {
  const s = nw.flowStateSkeleton('my-change', new Date(2026, 0, 2, 3, 4));
  assert.ok(!s.includes('artifact-root'), 'the retired artifact-root: promise is still scaffolded');
  // and the scaffolded file on disk, through the CLI-facing function
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-arr-'));
  const r = nw.scaffoldChange(root, 'my-change', new Date(2026, 0, 2, 3, 4));
  assert.strictEqual(r.ok, true);
  const text = fs.readFileSync(path.join(root, 'apriori', 'changes', 'my-change', 'flow-state.md'), 'utf8');
  assert.ok(!text.includes('artifact-root'), 'scaffolded flow-state still carries artifact-root');
  // the fresh scaffold stays fully legal
  assert.deepStrictEqual(flow.structuralDefects(text), []);
});

test('ARR-02 a legacy artifact-root: line is tolerated — read, ignored, never a defect', () => {
  // top-of-file position (the 5.x / v5.0.0 template shape)
  const legacy = [
    'change: old-change',
    'lineage: main',
    'phase: build',
    'artifact-root: .                          # optional; root for process artifacts',
    '',
    '## Open',
    '',
    'gates:',
    '  - 2026-01-02T03:04 note: scaffolded',
    '',
  ].join('\n');
  assert.deepStrictEqual(flow.structuralDefects(legacy), []);
  const st = flow.parseFlowState(legacy);
  assert.ok(!('artifact-root' in st), 'artifact-root must not surface as a tracked scalar');
  const c3 = rd.checkFlowState(st, 'old-change', legacy);
  assert.strictEqual(c3.status, 'pass', `C3 newly refuses a legacy artifact-root bundle: ${c3.detail}`);

  // mid-file position: the key must still END a section (STATE_KEYS tolerance) — it may never
  // fall INTO a judged section as a bare line and become a located structural defect
  const midFile = [
    'change: old-change',
    'lineage: main',
    'phase: build',
    '',
    '## Open',
    '- R-1: still open',
    'artifact-root: .',
    '',
    'gates:',
    '  - 2026-01-02T03:04 note: scaffolded',
    '',
  ].join('\n');
  assert.deepStrictEqual(flow.structuralDefects(midFile), [],
    'a column-0 artifact-root: line stopped ending sections — legacy tolerance broken');
  assert.deepStrictEqual(flow.parseFlowState(midFile).openIssues, ['R-1: still open']);
});

test('ARR-03 the self-repo bundles and the legacy-lab archives replay with zero new refusals', () => {
  // (a) the three bundles at apriori/changes/ top level (state-switch carries artifact-root:):
  // the COMPLETE defect set is locked — [] exactly, not merely "nothing mentioning artifact-root"
  const selfBundles = ['state-switch-completeness-principle', 'archive-preflight', 'hotfix-channel'];
  for (const b of selfBundles) {
    const p = path.join(ROOT, 'apriori', 'changes', b, 'flow-state.md');
    const text = fs.readFileSync(p, 'utf8');
    assert.deepStrictEqual(flow.structuralDefects(text), [], `${b}: new structural defect`);
  }
  // and an end-to-end status replay per self bundle: the CLI reader accepts the bundle (exit 0)
  // and its whole JSON surface leaks no artifact-root — a refusal oracle, not a parser-only one
  const { spawnSync } = require('node:child_process');
  const BIN = path.join(ROOT, 'bin', 'apriori.js');
  for (const b of selfBundles) {
    const r = spawnSync('node', [BIN, 'status', '--change', b, '--json'], { cwd: ROOT, encoding: 'utf8' });
    assert.strictEqual(r.status, 0, `${b}: status newly refuses the bundle: ${r.stdout}${r.stderr}`);
    const st = JSON.parse(r.stdout);
    assert.ok(!JSON.stringify(st).includes('artifact-root'), `${b}: status --json leaks artifact-root`);
  }
  // (b) frozen legacy-lab archives that wrote the v5-era artifact-root line: complete defect
  // set locked to [] — the P3 injection (an appended `## Open` + bare line yields a REAL
  // located defect) must fail here, which the old artifact-root-only exclusion let pass
  const lab = path.join(ROOT, 'validation', 'legacy-lab', 'inherited-poll', 'apriori', 'changes', 'archive');
  for (const dir of ['2026-07-09T1226-json-body-400', '2026-07-09T1213-vote-dedup']) {
    const text = fs.readFileSync(path.join(lab, dir, 'flow-state.md'), 'utf8');
    assert.ok(text.includes('artifact-root'), `${dir}: fixture lost its artifact-root line`);
    assert.deepStrictEqual(flow.structuralDefects(text), [],
      `${dir}: the legacy archive stopped parsing clean — its complete defect set must stay empty`);
  }
  // (c) the WHOLE shipped corpus: every flow-state under apriori/changes (top level + archive)
  // parses with a complete defect set of [] — "zero new refusals" is an exhaustive oracle over
  // the tracked corpus, not a three-sample claim
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
});

test('ARR-04 no runtime consumer: the reader exposes no artifact-root anywhere in its surface', () => {
  const legacy = 'change: c\nlineage: main\nphase: build\nartifact-root: elsewhere/\n\ngates:\n  - 2026-01-02T03:04 note: s\n';
  const st = flow.parseFlowState(legacy);
  assert.ok(!JSON.stringify(st).includes('artifact-root'), 'parseFlowState leaks artifact-root to consumers');
  assert.ok(!JSON.stringify(st).includes('elsewhere'), 'parseFlowState leaks the artifact-root value');
});
