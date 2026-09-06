'use strict';
// AM-87, AM-89, AM-91, AM-110, AM-111, AM-116 — --force overrides progress only, on pre-recorded
// human authority.
//
// 6.2 retired the issue ledger consumer, and with it the only class `archive-force` ever named:
// `ledger`. The grammar survives — the owner-entry parser is shared with `evidence-accept` and
// `reframe` — but an `archive-force` record now authorizes nothing and is reported as a note.
// The one forceable blocker left is the round-5 escalation (R4), whose double action is
// covered by AM-121 / FF-22..24. Everything here pins what `--force` can NOT do.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');

const rd = require('../lib/readiness');
const { readyFiles, FLOW, withOpen } = require('./helpers/ready-bundle');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 a\n- t\n';
const ADD = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-09 n\n- t\n';
const ROW = (status) => `| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n| Q-1 | i | low | 1 | ${status} |\n`;

// a bundle whose gates: block carries the given entries verbatim
function proj({ gates = [], tasks = null, ledger = null, flow = null } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-force-'));
  const files = {
    ...readyFiles('c'),
    'apriori/changes/c/flow-state.md': (flow || FLOW('c')) + gates.map((g) => `${g}\n`).join(''),
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

test('AM-89 an archive-force record is inert: nothing is forced, and the note says so', () => {
  // the ledger is not read to judge the change, so a closed row is nothing — the grant has
  // nothing to open
  const l = proj({ gates: [GRANT('ledger')], ledger: ROW('fixed'), tasks: '- [ ] b\n' });
  for (const args of [['archive', '--change', 'c'], ['archive', '--change', 'c', '--force']]) {
    const r = run(args, l);
    assert.strictEqual(r.status, 0, `${args.join(' ')}: ${r.stdout}${r.stderr}`);
    assert.match(r.stdout, /^note: archive-force has nothing left to force in 6\.2$/m, args.join(' '));
    assert.doesNotMatch(r.stdout, /^forced:/m, 'nothing was forced, so nothing may say it was');
    assert.doesNotMatch(r.stdout + r.stderr, /Q-1/, 'the unread ledger never reaches the report');
  }
  // an OPEN row is the one-shot migration refusal (6.2 A-5): structural at R1, and a force
  // record — with or without --force — opens nothing
  const o = proj({ gates: [GRANT('ledger')], ledger: ROW('open') });
  for (const args of [['archive', '--change', 'c'], ['archive', '--change', 'c', '--force']]) {
    const r = run(args, o);
    assert.strictEqual(r.status, 1, args.join(' '));
    assert.match(r.stderr, /archive: R1 legacy ledger has 1 open row\(s\)/, args.join(' '));
    assert.doesNotMatch(r.stdout, /^forced:/m);
  }
  // the note is about a GRANT — a revoked one, a retired class, or a near miss prints nothing
  for (const [why, gates] of [
    ['revoked', [GRANT('ledger'), REVOKE('ledger')]],
    ['the retired tasks class', [GRANT('tasks')]],
    ['a note is not a decision', ['  - 2026-08-15T18:00 note: archive-force ledger — 补一条']],
    ['no record at all', []],
  ]) {
    const r = run(['archive', '--change', 'c'], proj({ gates, ledger: ROW('fixed') }));
    assert.strictEqual(r.status, 0, why);
    assert.doesNotMatch(r.stdout, /archive-force/, why);
  }
});

test('AM-87 nothing but the answered round-5 escalation is forceable', () => {
  const gates = [GRANT('ledger')];
  // R1 — every branch
  for (const phase of ['specify', 'abandoned', 'done']) {
    const root = proj({ gates, flow: FLOW('c').replace('phase: review', `phase: ${phase}`) });
    assert.strictEqual(run(['archive', '--change', 'c', '--force'], root).status, 1, phase);
  }
  // structural — the flow-state is the one artifact readiness still reads
  const st = proj({ gates });
  const p = path.join(st, 'apriori/changes/c/flow-state.md');
  fs.rmSync(p); fs.mkdirSync(p);
  assert.strictEqual(run(['archive', '--change', 'c', '--force'], st).status, 1, 'not-file');
  // R5 — an open item nobody accepted is not progress, and no grant reaches it
  const ev = proj({ gates, flow: withOpen(FLOW('c'), ['R-01: restart recovery is unverified in the target runtime']) });
  const r = run(['archive', '--change', 'c', '--force'], ev);
  assert.strictEqual(r.status, 1, 'an unaccepted open item');
  assert.match(r.stderr, /R5 open item R-01 is pending/);
  assert.doesNotMatch(r.stderr, /progress blockers|--force needs/, 'nothing here is forceable, so no force advice is printed');
  const rdy = rd.readinessOf({ bundleDir: path.join(ev, 'apriori/changes/c'), name: 'c', force: true });
  assert.deepStrictEqual(rdy.blockers.map((b) => [b.rule, b.forceable]), [['R5', false]]);
  assert.deepStrictEqual(rdy.forced, []);
});

test('AM-110 the kept parser is anchored: only the canonical entry is a grant', () => {
  const g = (entries) => rd.forceGrant('gates:\n' + entries.map((e) => `${e}\n`).join(''));
  assert.deepStrictEqual(g([GRANT('ledger')]), { granted: true, firstLine: GRANT('ledger') });
  // the class word inside a REASON never authorizes that class
  assert.strictEqual(g([GRANT('tasks', 'ledger cleanup deferred')]), null);
  // token boundaries
  for (const entry of [
    '  - 2026-08-15T18:00 owner: archive-force ledger2 — x',
    '  - 2026-08-15T18:00 owner: archive-force-2 ledger — x',
    '  - 2026-08-15T18:00 owner: archive-force ledger',
    '  - 2026-08-15T18:00 owner: archive-force ledger — ——',
  ]) assert.strictEqual(g([entry]), null, entry);
  // a keyword preceded by free text is not a decision
  assert.strictEqual(g(['  - 2026-08-15T18:00 note: do not archive-force ledger — 还没做完']), null);
  // …and the ACTOR is part of it — the same prefix rule the other two verbs obey
  for (const e of ['  - 2026-08-15T18:00 note: archive-force ledger — 补一条',
    '  - 2026-08-15T18:00 producer: archive-force ledger — 我自己批准',
    '  - 2026-08-15T18:00 agent: archive-force ledger — 我自己批准',
    '  - 2026-08-15T18:00 gate⑤ (owner): archive-force ledger — 旧写法',
    '  - owner: archive-force ledger — 没有时间戳',
    '  - 9999-99-99T99:99 owner: archive-force ledger — 假时间戳',
    '  - 2026-08-15T18:00 owner: archive-force ledger 补一条',
    '  - 2026-08-15T18:00 owner: archive-force ledger - 补一条'])
    assert.strictEqual(g([e]), null, e);
  // a Chinese reason IS a reason: \w is ASCII-only and this log is written in Chinese
  assert.strictEqual(g([GRANT('ledger', '还差两项文档')]).granted, true);
});

test('AM-111 revocation appends and the last decision wins — in the parser and in the note', () => {
  const seq = [
    [[GRANT('ledger')], true],
    [[GRANT('ledger'), REVOKE('ledger')], false],
    [[GRANT('ledger'), REVOKE('ledger'), GRANT('ledger', '重新授权')], true],
    [[REVOKE('ledger')], false],
    // a revoke with no reason is ignored exactly as a reasonless grant is
    [[GRANT('ledger'), '  - 2026-08-15T19:00 owner: archive-force-revoke ledger — ——'], true],
  ];
  for (const [gates, want] of seq) {
    const g = rd.forceGrant('gates:\n' + gates.map((e) => `${e}\n`).join(''));
    assert.strictEqual(!!g && g.granted, want, gates.join(' | '));
    const out = run(['archive', '--change', 'c'], proj({ gates })).stdout;
    assert.strictEqual(/nothing left to force/.test(out), want, gates.join(' | '));
  }
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
    '- 2026-08-15T18:00 gate⑤ (owner): archive-force ledger — r',
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
