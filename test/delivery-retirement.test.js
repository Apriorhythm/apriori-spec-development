'use strict';
// DLV-01..05 — the `delivery:` field is retired (batch C row 6).
//
// The scaffold stops writing the line; the reader keeps the KEY as LEGACY TOLERANCE (flow.js
// STATE_KEYS): an old bundle carrying `delivery: released` must parse with ZERO new defects,
// the line must still END a section, and no consumer reads a decision from it. The archive
// declaration's third state becomes ONE fixed sentence — an archive is not a release — instead
// of echoing the field (the 09-08 no-release ruling, plan/13). `status --json` keeps the
// `delivery` key for ONE version, always null (MIGRATING). Rollback criterion: existing
// archived bundles replay with zero new refusals; the JC envelopes stay equivalent.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const flow = require('../lib/flow');
const rd = require('../lib/readiness');
const nw = require('../lib/new');
const am = require('../lib/archive-merge');

const ROOT = path.join(__dirname, '..');
const BIN = path.join(ROOT, 'bin', 'apriori.js');

test('DLV-01 the scaffold no longer writes delivery: (template line retired)', () => {
  const s = nw.flowStateSkeleton('my-change', new Date(2026, 0, 2, 3, 4));
  assert.ok(!s.includes('delivery'), 'the retired delivery: field is still scaffolded');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-dlv-'));
  const r = nw.scaffoldChange(root, 'my-change', new Date(2026, 0, 2, 3, 4));
  assert.strictEqual(r.ok, true);
  const text = fs.readFileSync(path.join(root, 'apriori', 'changes', 'my-change', 'flow-state.md'), 'utf8');
  assert.ok(!text.includes('delivery'), 'scaffolded flow-state still carries delivery');
  assert.deepStrictEqual(flow.structuralDefects(text), []);
});

test('DLV-02 a legacy delivery: line is tolerated — read, ignored, never a defect, never a tracked scalar', () => {
  // top-of-file position (the 6.0..6.2 template shape)
  const legacy = [
    'change: old-change',
    'lineage: main',
    'phase: build',
    'delivery: pending-external-acceptance     # or: released',
    '',
    '## Open',
    '',
    'gates:',
    '  - 2026-01-02T03:04 note: scaffolded',
    '',
  ].join('\n');
  assert.deepStrictEqual(flow.structuralDefects(legacy), []);
  const st = flow.parseFlowState(legacy);
  assert.ok(!('delivery' in st), 'delivery must not surface as a tracked scalar');
  const c3 = rd.checkFlowState(st, 'old-change', legacy);
  assert.strictEqual(c3.status, 'pass', `C3 newly refuses a legacy delivery bundle: ${c3.detail}`);

  // mid-file position: the key must still END a section (STATE_KEYS tolerance) — it may never
  // fall INTO a judged section as a bare line and become a located structural defect
  const midFile = [
    'change: old-change',
    'lineage: main',
    'phase: build',
    '',
    '## Open',
    '- R-1: still open',
    'delivery: released',
    '',
    'gates:',
    '  - 2026-01-02T03:04 note: scaffolded',
    '',
  ].join('\n');
  assert.deepStrictEqual(flow.structuralDefects(midFile), [],
    'a column-0 delivery: line stopped ending sections — legacy tolerance broken');
  assert.deepStrictEqual(flow.parseFlowState(midFile).openIssues, ['R-1: still open']);
});

test('DLV-03 the archive declaration\'s third state is ONE fixed sentence — an archive is not a release', () => {
  // a bundle whose state says `delivery: released` and one that says nothing must declare the
  // SAME third line: the declaration no longer reads the field at all
  const mk = (sections) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-dlv3-'));
    const dir = path.join(root, 'apriori', 'changes', 'c');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'flow-state.md'),
      `change: c\nlineage: main\nphase: review\n${sections}\n## Open\n\ngates:\n  - 2026-01-02T03:04 note: s\n`);
    return dir;
  };
  const FIXED = 'delivery:          an archive is not a release';
  for (const sections of ['', 'delivery: released\n', 'delivery: pending-external-acceptance\n']) {
    const d = am.archiveDeclaration(mk(sections));
    const line = d.lines.find((l) => l.trim().startsWith('delivery'));
    assert.strictEqual(line, `  ${FIXED}`, `sections=${JSON.stringify(sections)}: the third state must be the fixed sentence`);
    // and neither field value leaks into the declaration
    assert.ok(!d.lines.join('\n').includes('released'), 'the retired field value leaks into the declaration');
    assert.ok(!d.lines.join('\n').includes('pending external acceptance'), 'the retired synthesized value survives');
  }
});

test('DLV-04 status --json keeps the delivery key for one version, always null — even when the state carries a value', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-dlv4-'));
  const dir = path.join(root, 'apriori', 'changes', 'c');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'flow-state.md'),
    'change: c\nlineage: main\nphase: build\ndelivery: released\n\n## Open\n\ngates:\n  - 2026-01-02T03:04 note: s\n');
  const r = spawnSync('node', [BIN, 'status', '--change', 'c', '--json'], { cwd: root, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const j = JSON.parse(r.stdout);
  assert.ok('delivery' in j, 'the delivery key must stay one version for shape compatibility (MIGRATING)');
  assert.strictEqual(j.delivery, null, 'the retired key must read null, never the legacy value');
});

test('DLV-05 the shipped corpus replays with zero new refusals — every flow-state under apriori/changes parses clean', () => {
  const flowStates = [];
  (function walk(d) {
    for (const n of fs.readdirSync(d)) {
      const p = path.join(d, n);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (n === 'flow-state.md') flowStates.push(p);
    }
  })(path.join(ROOT, 'apriori', 'changes'));
  assert.ok(flowStates.length >= 36, `the shipped corpus went missing: ${flowStates.length} flow-states`);
  let carrying = 0;
  for (const p of flowStates) {
    const text = fs.readFileSync(p, 'utf8');
    if (/^delivery:/m.test(text)) carrying++;
    assert.deepStrictEqual(flow.structuralDefects(text), [],
      `${path.relative(ROOT, p)}: new structural defect in the shipped corpus`);
  }
  assert.ok(carrying >= 1, 'the corpus lost every delivery-carrying fixture — the tolerance claim is untested');
  // and an end-to-end replay of a delivery-carrying self bundle through the CLI reader
  const r = spawnSync('node', [BIN, 'status', '--change', 'state-switch-completeness-principle', '--json'], { cwd: ROOT, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, `status newly refuses the self bundle: ${r.stdout}${r.stderr}`);
});
