'use strict';
// AM-86..AM-91, AM-109..AM-111 — --force overrides progress only, on pre-recorded human authority.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');

const rd = require('../lib/readiness');
const { readyFiles, FLOW, LEDGER } = require('./helpers/ready-bundle');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 a\n- t\n';
const ADD = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-09 n\n- t\n';
const ROW = (status) => `| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n| Q-1 | i | low | 1 | ${status} |\n`;

// a bundle whose gates: block carries the given entries verbatim
function proj({ gates = [], tasks = null, ledger = null, tier = 'medium' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-force-'));
  const flow = FLOW('c', tier) + gates.map((g) => `${g}\n`).join('');
  const files = {
    ...readyFiles('c', { tier }),
    'apriori/changes/c/flow-state.md': flow,
    'apriori/specs/a/spec.md': STORE,
    'apriori/changes/c/specs/a/spec.md': ADD,
  };
  if (tasks !== null) files['apriori/changes/c/tasks.md'] = tasks;
  if (ledger !== null) files['apriori/changes/c/review/issues.md'] = ledger;
  for (const [rel, c] of Object.entries(files)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, c);
  }
  return root;
}
const GRANT = (cls, reason = '还差两项文档') => `  - 2026-08-15T18:00 gate⑤ (owner): archive-force ${cls} — ${reason}`;
const REVOKE = (cls, reason = '收回授权') => `  - 2026-08-15T19:00 gate⑤ (owner): archive-force-revoke ${cls} — ${reason}`;

test('AM-86 progress blockers are forceable when the record is on file', () => {
  // unchecked tasks
  const t = proj({ gates: [GRANT('tasks')], tasks: '- [x] a\n- [ ] b\n' });
  const rt = run(['archive', '--change', 'c', '--force'], t);
  assert.strictEqual(rt.status, 0, rt.stdout + rt.stderr);
  assert.match(rt.stdout, /forced: R2 tasks\.md has 1 unchecked/);
  // open / fixed / rejected-with-reason
  for (const status of ['open', 'fixed', 'rejected because x']) {
    const l = proj({ gates: [GRANT('ledger')], ledger: ROW(status) });
    const r = run(['archive', '--change', 'c', '--force'], l);
    assert.strictEqual(r.status, 0, `${status}: ${r.stdout}${r.stderr}`);
    assert.match(r.stdout, /forced: R3 /, status);
  }
});

test('AM-87 everything else is not forceable', () => {
  const gates = [GRANT('tasks'), GRANT('ledger')];
  // R1 — every branch
  for (const step of ['STEP2', 'ABANDONED', 'DONE']) {
    const root = proj({ gates });
    fs.writeFileSync(path.join(root, 'apriori/changes/c/flow-state.md'),
      FLOW('c').replace('STEP6', step) + gates.map((g) => `${g}\n`).join(''));
    assert.strictEqual(run(['archive', '--change', 'c', '--force'], root).status, 1, step);
  }
  // structural
  const st = proj({ gates });
  const p = path.join(st, 'apriori/changes/c/tasks.md');
  fs.rmSync(p); fs.mkdirSync(p);
  assert.strictEqual(run(['archive', '--change', 'c', '--force'], st).status, 1, 'not-file');
  // format / evidence classes
  for (const status of ['frobnicated', 'rejected', 'waived by someone']) {
    const l = proj({ gates, ledger: ROW(status) });
    assert.strictEqual(run(['archive', '--change', 'c', '--force'], l).status, 1, status);
  }
});

test('AM-88 without the record the flag does nothing and a copyable template is printed', () => {
  const noRecord = proj({ tasks: '- [ ] b\n' });
  const r = run(['archive', '--change', 'c', '--force'], noRecord);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /archive-force tasks — <the human's reason, verbatim>/);
  assert.match(r.stderr, /gate⑤ \(owner\)/);
  // the template is a skeleton, never a claim about a reason the human has not written
  assert.doesNotMatch(r.stderr, /还差两项文档/);

  // a reason with no letter or digit in any script is not a reason
  const noReason = proj({ gates: ['  - 2026-08-15T18:00 gate⑤ (owner): archive-force tasks — ——'], tasks: '- [ ] b\n' });
  assert.strictEqual(run(['archive', '--change', 'c', '--force'], noReason).status, 1);
  // ...and a Chinese one IS: \w is ASCII-only and this log is written in Chinese (step2-amendment)
  const chinese = proj({ gates: [GRANT('tasks', '还差两项文档')], tasks: '- [ ] b\n' });
  assert.strictEqual(run(['archive', '--change', 'c', '--force'], chinese).status, 0);
});

test('AM-89 a record authorizes its own class and no other', () => {
  const both = { tasks: '- [ ] b\n', ledger: ROW('open') };
  const onlyTasks = proj({ gates: [GRANT('tasks')], ...both });
  const rT = run(['archive', '--change', 'c', '--force'], onlyTasks);
  assert.strictEqual(rT.status, 1);
  assert.match(rT.stderr, /R3 Q-1 is open/);
  assert.doesNotMatch(rT.stderr, /R2 tasks\.md has/);

  const onlyLedger = proj({ gates: [GRANT('ledger')], ...both });
  const rL = run(['archive', '--change', 'c', '--force'], onlyLedger);
  assert.strictEqual(rL.status, 1);
  assert.match(rL.stderr, /R2 tasks\.md has/);
  assert.doesNotMatch(rL.stderr, /R3 Q-1 is open/);

  const bothGranted = proj({ gates: [GRANT('tasks'), GRANT('ledger')], ...both });
  assert.strictEqual(run(['archive', '--change', 'c', '--force'], bothGranted).status, 0);
});

test('AM-110 the record is anchored and fully consumed', () => {
  const tasks = '- [ ] b\n', ledger = ROW('open');
  // the class word inside a REASON never authorizes that class
  const reasonMentions = proj({ gates: [GRANT('tasks', 'ledger cleanup deferred')], tasks, ledger });
  const r1 = run(['archive', '--change', 'c', '--force'], reasonMentions);
  assert.strictEqual(r1.status, 1);
  assert.match(r1.stderr, /R3 Q-1 is open/, 'the reason text must not grant ledger');
  assert.doesNotMatch(r1.stderr, /R2 tasks\.md has/, 'and tasks must still be granted');

  // token boundaries
  for (const entry of [
    '  - 2026-08-15T18:00 gate⑤ (owner): archive-force tasks2 — x',
    '  - 2026-08-15T18:00 gate⑤ (owner): archive-force-2 tasks — x',
    '  - 2026-08-15T18:00 gate⑤ (owner): archive-force tasks',
  ]) {
    const root = proj({ gates: [entry], tasks });
    assert.strictEqual(run(['archive', '--change', 'c', '--force'], root).status, 1, entry);
  }
  // a keyword preceded by free text is not a decision
  const negated = proj({ gates: ['  - 2026-08-15T18:00 note: do not archive-force tasks — 还没做完'], tasks });
  assert.strictEqual(run(['archive', '--change', 'c', '--force'], negated).status, 1,
    'substring search would have authorized a refusal');
  // the canonical template from the docs must work, and so must a plain note: prefix
  for (const g of [GRANT('tasks'), '  - 2026-08-15T18:00 note: archive-force tasks — 补一条']) {
    const root = proj({ gates: [g], tasks });
    assert.strictEqual(run(['archive', '--change', 'c', '--force'], root).status, 0, g);
  }
});

test('AM-111 revocation appends and the last decision wins', () => {
  const tasks = '- [ ] b\n';
  const seq = [
    [[GRANT('tasks')], 0],
    [[GRANT('tasks'), REVOKE('tasks')], 1],
    [[GRANT('tasks'), REVOKE('tasks'), GRANT('tasks', '重新授权')], 0],
    [[REVOKE('tasks')], 1],
  ];
  for (const [gates, want] of seq) {
    const root = proj({ gates, tasks });
    assert.strictEqual(run(['archive', '--change', 'c', '--force'], root).status, want, gates.join(' | '));
  }
  // a revoke with no reason is ignored exactly as a reasonless grant is
  const ignored = proj({ gates: [GRANT('tasks'), '  - 2026-08-15T19:00 gate⑤ (owner): archive-force-revoke tasks — ——'], tasks });
  assert.strictEqual(run(['archive', '--change', 'c', '--force'], ignored).status, 0,
    'an unreasoned revoke does not revoke');
});

test('AM-109 every forced item is named with the record it rests on', () => {
  const multi = '  - 2026-08-15T18:00 gate⑤ (owner): archive-force tasks — 第一行理由\n    续行不该被打印';
  const root = proj({ gates: [multi], tasks: '- [ ] b\n- [ ] c\n' });
  const r = run(['archive', '--change', 'c', '--force'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /forced: R2 tasks\.md has 2 unchecked box\(es\)/);
  assert.match(r.stdout, /archive-force tasks — 第一行理由/);
  assert.doesNotMatch(r.stdout, /续行不该被打印/, 'the RAW first line, not the continuation-joined entry');
  assert.doesNotMatch(r.stdout, /^forced$/m, 'never a bare "forced"');
});

test('AM-90 force changes the verdict in dry-run too, without touching the disk', () => {
  const root = proj({ gates: [GRANT('tasks')], tasks: '- [ ] b\n' });
  const before = fs.readFileSync(path.join(root, 'apriori/specs/a/spec.md'), 'utf8');
  const without = run(['archive', '--change', 'c'], root);
  assert.strictEqual(without.status, 1);
  const with_ = run(['archive', '--change', 'c', '--force'], root);
  assert.strictEqual(with_.status, 0, with_.stdout + with_.stderr);
  assert.match(with_.stdout, /RESULT: MERGED \(dry-run/);
  assert.strictEqual(fs.readFileSync(path.join(root, 'apriori/specs/a/spec.md'), 'utf8'), before,
    'dry-run has no disk side effect, forced or not');
});

test('AM-91 the single-file form does not take --force', () => {
  const root = proj();
  fs.writeFileSync(path.join(root, 'store.md'), STORE);
  fs.writeFileSync(path.join(root, 'delta.md'), ADD);
  const r = run(['archive', '--store', 'store.md', '--delta', 'delta.md', '--change', 'c', '--force'], root);
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /usage/);
  // the high-level usage line is where --force belongs
  assert.match(r.stderr, /--change <name>.*--force/s);
});

test('AM-116 the decision payload is extracted the same way for every legal prefix', () => {
  const p = rd.decisionPayload;
  assert.strictEqual(p('- 2026-08-15T18:00 gate⑤ (owner): archive-force tasks — r'), 'archive-force tasks — r');
  assert.strictEqual(p('- 2026-08-15T1800 note: archive-force ledger — r'), 'archive-force ledger — r');
  assert.strictEqual(p('- note: archive-force tasks — r'), 'archive-force tasks — r');
  assert.strictEqual(p('- archive-force tasks — r'), 'archive-force tasks — r');
  assert.strictEqual(p('- 2026-08-15T18:00 note: do not archive-force tasks — r'), 'do not archive-force tasks — r');
});
