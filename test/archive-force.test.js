'use strict';
// AM-86..AM-91, AM-109..AM-111 — --force overrides progress only, on pre-recorded human authority.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');

const rd = require('../lib/readiness');
const { readyFiles, FLOW, withEvidence, LEDGER } = require('./helpers/ready-bundle');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 a\n- t\n';
const ADD = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-09 n\n- t\n';
const ROW = (status) => `| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n| Q-1 | i | low | 1 | ${status} |\n`;

// a bundle whose gates: block carries the given entries verbatim
function proj({ gates = [], tasks = null, ledger = null, mode = 'standard' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-force-'));
  const flow = FLOW('c', mode) + gates.map((g) => `${g}\n`).join('');
  const files = {
    ...readyFiles('c', { mode }),
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
const GRANT = (cls, reason = '还差两项文档') => `  - 2026-08-15T18:00 owner: archive-force ${cls} — ${reason}`;
const REVOKE = (cls, reason = '收回授权') => `  - 2026-08-15T19:00 owner: archive-force-revoke ${cls} — ${reason}`;

test('AM-86 an open ledger row is forceable when the record is on file', () => {
  // `tasks` left the grammar with the rule it authorized: 6.0 has no task rule to force past,
  // and an unchecked box never blocks in the first place.
  const t = proj({ tasks: '- [x] a\n- [ ] b\n' });
  assert.strictEqual(run(['archive', '--change', 'c'], t).status, 0, 'an unchecked task must not block at all');
  // an OPEN row is the one progress blocker left, and the record is what opens it
  const l = proj({ gates: [GRANT('ledger')], ledger: ROW('open') });
  const r = run(['archive', '--change', 'c', '--force'], l);
  assert.strictEqual(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.match(r.stdout, /forced: R3 Q-1 is open/);
  // the non-blocking bookkeeping kinds need no grant at all
  for (const status of ['fixed', 'rejected because x']) {
    const b = proj({ ledger: ROW(status) });
    assert.strictEqual(run(['archive', '--change', 'c'], b).status, 0, status);
  }
});

test('AM-87 everything else is not forceable', () => {
  const gates = [GRANT('ledger')];
  // R1 — every branch
  for (const phase of ['specify', 'abandoned', 'done']) {
    const root = proj({ gates });
    fs.writeFileSync(path.join(root, 'apriori/changes/c/flow-state.md'),
      FLOW('c').replace('phase: review', `phase: ${phase}`) + gates.map((g) => `${g}\n`).join(''));
    assert.strictEqual(run(['archive', '--change', 'c', '--force'], root).status, 1, phase);
  }
  // structural — on an artifact readiness still reads
  const st = proj({ gates, ledger: ROW('verified') });
  const p = path.join(st, 'apriori/changes/c/review/issues.md');
  fs.rmSync(p); fs.mkdirSync(p);
  assert.strictEqual(run(['archive', '--change', 'c', '--force'], st).status, 1, 'not-file');
  // R5 — blocked critical evidence is not progress, and no grant reaches it
  const ev = proj({ gates });
  fs.writeFileSync(path.join(ev, 'apriori/changes/c/flow-state.md'),
    withEvidence(FLOW('c'), ['data-schema: blocked — staging DB offline']) + gates.map((g) => `${g}\n`).join(''));
  assert.strictEqual(run(['archive', '--change', 'c', '--force'], ev).status, 1, 'blocked evidence');
});

test('AM-88 without the record the flag does nothing and a copyable template is printed', () => {
  const noRecord = proj({ ledger: ROW('open') });
  const r = run(['archive', '--change', 'c', '--force'], noRecord);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /archive-force ledger — <the human's reason, verbatim>/);
  assert.match(r.stderr, /owner: archive-force/);
  // the template is a skeleton, never a claim about a reason the human has not written
  assert.doesNotMatch(r.stderr, /还差两项文档/);

  // a reason with no letter or digit in any script is not a reason
  const noReason = proj({ gates: ['  - 2026-08-15T18:00 owner: archive-force ledger — ——'], ledger: ROW('open') });
  assert.strictEqual(run(['archive', '--change', 'c', '--force'], noReason).status, 1);
  // ...and a Chinese one IS: \w is ASCII-only and this log is written in Chinese
  const chinese = proj({ gates: [GRANT('ledger', '还差两项文档')], ledger: ROW('open') });
  assert.strictEqual(run(['archive', '--change', 'c', '--force'], chinese).status, 0);
});

test('AM-89 the retired class authorizes nothing, and ledger authorizes only itself', () => {
  // `ledger` is the only class in the grammar now: an `archive-force tasks` record is inert.
  const retired = proj({ gates: [GRANT('tasks')], ledger: ROW('open') });
  const rT = run(['archive', '--change', 'c', '--force'], retired);
  assert.strictEqual(rT.status, 1);
  assert.match(rT.stderr, /R3 Q-1 is open/);

  const onlyLedger = proj({ gates: [GRANT('ledger')], ledger: ROW('open') });
  assert.strictEqual(run(['archive', '--change', 'c', '--force'], onlyLedger).status, 0);
});

test('AM-110 the record is anchored and fully consumed', () => {
  const ledger = ROW('open');
  // the class word inside a REASON never authorizes that class
  const reasonMentions = proj({ gates: [GRANT('tasks', 'ledger cleanup deferred')], ledger });
  const r1 = run(['archive', '--change', 'c', '--force'], reasonMentions);
  assert.strictEqual(r1.status, 1);
  assert.match(r1.stderr, /R3 Q-1 is open/, 'the reason text must not grant ledger');

  // token boundaries
  for (const entry of [
    '  - 2026-08-15T18:00 owner: archive-force ledger2 — x',
    '  - 2026-08-15T18:00 owner: archive-force-2 ledger — x',
    '  - 2026-08-15T18:00 owner: archive-force ledger',
  ]) {
    const root = proj({ gates: [entry], ledger });
    assert.strictEqual(run(['archive', '--change', 'c', '--force'], root).status, 1, entry);
  }
  // a keyword preceded by free text is not a decision
  const negated = proj({ gates: ['  - 2026-08-15T18:00 note: do not archive-force ledger — 还没做完'], ledger });
  assert.strictEqual(run(['archive', '--change', 'c', '--force'], negated).status, 1,
    'substring search would have authorized a refusal');
  // the canonical template from the docs must work
  const canonical = proj({ gates: [GRANT('ledger')], ledger });
  assert.strictEqual(run(['archive', '--change', 'c', '--force'], canonical).status, 0);
  // …and the ACTOR is part of it. `note:` used to authorize here because this grammar read a
  // payload with "everything up to the first colon" removed; the §6 evidence exit was closed
  // against exactly that and this one was not, which left the same hole one door over.
  for (const g of ['  - 2026-08-15T18:00 note: archive-force ledger — 补一条',
    '  - 2026-08-15T18:00 producer: archive-force ledger — 我自己批准',
    '  - 2026-08-15T18:00 agent: archive-force ledger — 我自己批准',
    '  - 2026-08-15T18:00 gate\u2464 (owner): archive-force ledger — 旧写法',
    '  - owner: archive-force ledger — 没有时间戳',
    '  - 9999-99-99T99:99 owner: archive-force ledger — 假时间戳',
    '  - 2026-08-15T18:00 owner: archive-force ledger 补一条',
    '  - 2026-08-15T18:00 owner: archive-force ledger - 补一条']) {
    const root = proj({ gates: [g], ledger });
    const r = run(['archive', '--change', 'c', '--force'], root);
    assert.strictEqual(r.status, 1, g);
    assert.match(r.stderr, /R3 Q-1 is open/, g);
  }
});

test('AM-111 revocation appends and the last decision wins', () => {
  const ledger = ROW('open');
  const seq = [
    [[GRANT('ledger')], 0],
    [[GRANT('ledger'), REVOKE('ledger')], 1],
    [[GRANT('ledger'), REVOKE('ledger'), GRANT('ledger', '重新授权')], 0],
    [[REVOKE('ledger')], 1],
  ];
  for (const [gates, want] of seq) {
    const root = proj({ gates, ledger });
    assert.strictEqual(run(['archive', '--change', 'c', '--force'], root).status, want, gates.join(' | '));
  }
  // a revoke with no reason is ignored exactly as a reasonless grant is
  const ignored = proj({ gates: [GRANT('ledger'), '  - 2026-08-15T19:00 owner: archive-force-revoke ledger — ——'], ledger });
  assert.strictEqual(run(['archive', '--change', 'c', '--force'], ignored).status, 0,
    'an unreasoned revoke does not revoke');
});

test('AM-109 every forced item is named with the record it rests on', () => {
  const multi = '  - 2026-08-15T18:00 owner: archive-force ledger — 第一行理由\n    续行不该被打印';
  const root = proj({ gates: [multi], ledger: ROW('open') });
  const r = run(['archive', '--change', 'c', '--force'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /forced: R3 Q-1 is open/);
  assert.match(r.stdout, /archive-force ledger — 第一行理由/);
  assert.doesNotMatch(r.stdout, /续行不该被打印/, 'the RAW first line, not the continuation-joined entry');
  assert.doesNotMatch(r.stdout, /^forced$/m, 'never a bare "forced"');
});

test('AM-90 force changes the verdict in dry-run too, without touching the disk', () => {
  const root = proj({ gates: [GRANT('ledger')], ledger: ROW('open') });
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

test('AM-116 one canonical owner entry supplies the payload for every decision verb', () => {
  // There is ONE parser now. It answers `null` for anything that is not an owner decision, and
  // the verb regexes below it never see those entries at all — so no verb can be stricter or
  // looser than another about who is allowed to speak.
  const p = rd.ownerPayload;
  assert.strictEqual(p('- 2026-08-15T18:00 owner: archive-force ledger — r'), 'archive-force ledger — r');
  assert.strictEqual(p('- 2026-08-15T1800 owner: reframe cr round 2 split — r'), 'reframe cr round 2 split — r');
  assert.strictEqual(p('- 2026-08-15T18:00 owner: evidence-accept data-schema — r'), 'evidence-accept data-schema — r');
  for (const bad of [
    '- 2026-08-15T1800 note: archive-force ledger — r',      // the actor is not the owner
    '- 2026-08-15T18:00 producer: archive-force ledger — r',
    '- 2026-08-15T18:00 agent: archive-force ledger — r',
    '- 2026-08-15T18:00 gate\u2464 (owner): archive-force ledger — r',
    '- note: archive-force ledger — r',                      // …and there is no timestamp either
    '- archive-force ledger — r',                            // no prefix at all
    '- 2026-13-01T18:00 owner: archive-force ledger — r',    // a timestamp-shaped non-timestamp
    '- 2026-08-15T24:00 owner: archive-force ledger — r',
    '- 2026-08-15T18:60 owner: archive-force ledger — r',
    '- 2026-08-15T18:00 ownership: archive-force ledger — r',
  ]) assert.strictEqual(p(bad), null, bad);
  // a negated verb still yields a payload — it is the VERB regex that refuses it, and it must,
  // because the keyword has to OPEN the payload
  assert.strictEqual(p('- 2026-08-15T18:00 owner: do not archive-force ledger — r'), 'do not archive-force ledger — r');
  assert.strictEqual(rd.forceGrant('gates:\n  - 2026-08-15T18:00 owner: do not archive-force ledger — r\n'), null);
});
