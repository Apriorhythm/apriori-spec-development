'use strict';
// hotfix-lane T9 — mapping m1 at the gate and hotfix labelling in status
// (GT-28/GT-29, ST-10/ST-11).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const gate = require('../lib/gate.js');
const status = require('../lib/status.js');

function project() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-m1-'));
  fs.mkdirSync(path.join(root, 'apriori', 'specs'), { recursive: true });
  return root;
}
function hotfixBundle(root, name, o = {}) {
  const dir = path.join(root, 'apriori', 'changes', name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'hotfix-state.md'), `hotfix: ${name}\ndate: 2026-08-14\nkinds: 2\nchange-kind: no-code\n\n## Conclusion\n\nNothing needed fixing.\n`);
  if (o.alsoFormal) fs.writeFileSync(path.join(dir, 'flow-state.md'), `change: ${name}\ntier: trivial\ntrack: harden\nlineage: main\ncurrent-step: STEP0\n`);
  return dir;
}
function formalChange(root, name) {
  const dir = path.join(root, 'apriori', 'changes', name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'flow-state.md'), `change: ${name}\ntier: trivial\ntrack: harden\nlineage: main\ncurrent-step: STEP0\n`);
  return dir;
}

test('GT-28 the gate points a hotfix bundle at its own preflight', () => {
  const root = project();
  hotfixBundle(root, 'wording');
  const r = gate.runGate({ cwd: root, change: 'wording', testCmd: 'true' });
  assert.deepStrictEqual([r.code, r.result], [2, 'ERROR'], 'refused as an evaluation error');
  assert.ok(r.errors.some((e) => /hotfix bundle/.test(e) && /apriori hotfix archive wording/.test(e)), `pointed at the lane: ${r.errors}`);
  assert.deepStrictEqual(r.checks, [], 'the seven checks never ran');
});

test('GT-29 a bundle carrying both identities is an error at the gate too', () => {
  const root = project();
  hotfixBundle(root, 'wording', { alsoFormal: true });
  const r = gate.runGate({ cwd: root, change: 'wording', testCmd: 'true' });
  assert.deepStrictEqual([r.code, r.result], [2, 'ERROR']);
  assert.ok(r.errors.some((e) => /BOTH flow-state\.md and hotfix-state\.md/.test(e)), `identity error: ${r.errors}`);
});

test('ST-10 a hotfix bundle is listed and labelled, not reported as broken', () => {
  const root = project();
  hotfixBundle(root, 'wording');
  assert.deepStrictEqual(status.activeChanges(root), ['wording']);

  const s = status.changeStatus(root, 'wording');
  assert.deepStrictEqual([s.hotfix, s.hasFlowState], [true, false]);
  const text = status.formatOne(s);
  assert.ok(/hotfix lane/.test(text) && !/no flow-state file found/.test(text), `labelled as the lane: ${text}`);
});

test('ST-11 the JSON contract carries the hotfix flag and both identities are an error', () => {
  const root = project();
  hotfixBundle(root, 'wording');
  formalChange(root, 'formal');
  assert.strictEqual(status.toJson(status.changeStatus(root, 'wording')).hotfix, true);
  assert.strictEqual(status.toJson(status.changeStatus(root, 'formal')).hotfix, false);

  const both = project();
  hotfixBundle(both, 'wording', { alsoFormal: true });
  const cwd = process.cwd();
  try {
    process.chdir(both);
    const code = status.cli(['--change', 'wording']);
    assert.strictEqual(code, 2, 'both identities is an error');
  } finally { process.chdir(cwd); }
});
