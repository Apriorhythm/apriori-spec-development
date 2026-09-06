'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const nw = require('../lib/new');

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-nw-')); }
const NOW = new Date(2026, 6, 7, 3, 5); // 2026-07-07T03:05

test('NW-01 scaffolds flow-state skeleton and specs dir', () => {
  const root = tmp();
  const r = nw.scaffoldChange(root, 'add-playback', NOW);
  assert.strictEqual(r.ok, true);
  const flow = fs.readFileSync(path.join(root, 'apriori', 'changes', 'add-playback', 'flow-state.md'), 'utf8');
  assert.match(flow, /^change: add-playback$/m);
  assert.match(flow, /^phase: ground /m);
  assert.doesNotMatch(flow, /^mode:/m);                             // 6.2: optional and inert — not scaffolded
  for (const gone of ['tier', 'track', 'track-rationale', 'round', 'current-step'])
    assert.doesNotMatch(flow, new RegExp(`^${gone}:`, 'm'), `5.x '${gone}:' must not be scaffolded`);
  assert.match(flow, /lineage: <target branch\/line/);
  assert.match(flow, /2026-07-07T03:05 note: change scaffolded by `apriori new`/);
  assert.ok(fs.existsSync(path.join(root, 'apriori', 'changes', 'add-playback', 'specs')));
});

test('NW-02 refuses an existing change or the reserved archive name', () => {
  const root = tmp();
  assert.strictEqual(nw.scaffoldChange(root, 'dup', NOW).ok, true);
  const dup = nw.scaffoldChange(root, 'dup', NOW);
  assert.strictEqual(dup.ok, false);
  assert.match(dup.error, /already exists/);
  const reserved = nw.scaffoldChange(root, 'archive', NOW);
  assert.strictEqual(reserved.ok, false);
  assert.match(reserved.error, /reserved/);
});

test('NW-03 enforces bare kebab-case names (dates stamped at archive time, not here)', () => {
  const root = tmp();
  for (const bad of ['Add-Playback', 'add playback', '2026-07-07T0305-add-playback', '2026-07-07-add-playback', '', '-lead', 'a--b', 'a-']) {
    const r = nw.scaffoldChange(root, bad, NOW);
    assert.strictEqual(r.ok, false, `should refuse '${bad}'`);
  }
  // the date-prefix error explains the rule
  assert.match(nw.scaffoldChange(root, '2026-07-late', NOW).error, /archive time/);
  assert.strictEqual(nw.scaffoldChange(root, 'ok-name-2', NOW).ok, true); // digits inside are fine
});

test('NW-04 the skeleton carries every flow-state schema field the runbook defines', () => {
  const { flowStateSkeleton } = require('../lib/new');
  const s = flowStateSkeleton('my-change', new Date(2026, 0, 2, 3, 4));
  for (const field of ['change:', 'lineage:', 'phase:', 'reviewer-session:',
                       'delivery:', 'artifact-root:', 'gates:'])
    assert.ok(s.includes(field), `skeleton missing ${field}`);
  assert.ok(!s.includes('mode:'), '6.2: mode is optional and inert, so the skeleton does not ask for it');
  assert.ok(!s.includes('escalation:'), '6.2: the hand-written escalation field is retired — a pending decision is an ## Open item');
  // and the three short sections the ONE state carries — the Evidence table went with its readers
  for (const section of ['## Reality Check', '## Open', '## Next'])
    assert.ok(s.includes(section), `skeleton missing ${section}`);
  assert.ok(!s.includes('## Evidence'), 'the retired Evidence section must not be scaffolded');
  assert.match(s, /reviewer-session: n\/a/);
  assert.match(s, /artifact-root: \./);
  assert.match(s, /delivery: pending-external-acceptance/);
});

test('NW-05 the scaffold is a two-directory bundle with no artifact obligations', () => {
  const rpFs = require('node:fs');
  const rpPath = require('node:path');
  const rpOs = require('node:os');
  const { spawnSync: rpSpawn } = require('node:child_process');
  const root = rpFs.mkdtempSync(rpPath.join(rpOs.tmpdir(), 'apriori-nw05-'));
  const r = rpSpawn('node', [rpPath.join(__dirname, '..', 'bin', 'apriori.js'), 'new', 'my-change'], { cwd: root, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const dir = rpPath.join(root, 'apriori', 'changes', 'my-change');
  // exactly two dirs and one file — `requirement/` went with the artifact family
  assert.deepStrictEqual(rpFs.readdirSync(dir).sort(), ['flow-state.md', 'review', 'specs']);
  assert.ok(rpFs.statSync(rpPath.join(dir, 'specs')).isDirectory(), 'specs/ skeleton missing');
  assert.ok(rpFs.statSync(rpPath.join(dir, 'review')).isDirectory(), 'review/ skeleton missing');
  // and neither the tree nor the state names a retired artifact
  const flow = rpFs.readFileSync(rpPath.join(dir, 'flow-state.md'), 'utf8');
  for (const gone of ['req-v1.md', 'req-final.md', 'proposal.md', 'design.md', 'tasks.md', 'gap-report.md', 'issues.md'])
    assert.ok(!flow.includes(gone), `the scaffold still names ${gone}`);
});

test('NW-06 the scaffold states the split test, not a first document to write', () => {
  const rpFs = require('node:fs');
  const rpPath = require('node:path');
  const rpOs = require('node:os');
  const { spawnSync: rpSpawn } = require('node:child_process');
  const root = rpFs.mkdtempSync(rpPath.join(rpOs.tmpdir(), 'apriori-nw06-'));
  const r = rpSpawn('node', [rpPath.join(__dirname, '..', 'bin', 'apriori.js'), 'new', 'my-change'], { cwd: root, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Ground/);
  assert.match(r.stdout, /## Reality Check/);
  assert.match(r.stdout, /ONE main result and ONE evidence chain/);
  assert.match(r.stdout, /split it first/);
  assert.ok(!/draft |req-v1|tasks\.md/.test(r.stdout), 'the scaffold still tells the human to draft an artifact');
});
