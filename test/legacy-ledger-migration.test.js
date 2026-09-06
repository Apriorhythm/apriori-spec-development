'use strict';
// LM-01..LM-10 — the legacy issue-ledger migration gate (6.2 batch A-5): one-shot, MOVE not copy.
//
// 6.2 retired the ledger CONSUMER (nothing reads review/issues.md to judge a change). What that
// left open was the transition: a bundle written under 6.0 may still carry `open` rows in the
// old table, and "the ledger is never read" would have made them disappear. So, for ACTIVE
// bundles only: if review/issues.md exists it is parsed with the OLD table contract (first cell
// id, last cell status, `open` as the leading token, case-insensitive) — a private migration
// helper, not a runtime consumer. Open rows → C3/R1 structural refusal listing each row and its
// line; closed-only or a missing file → nothing; unreadable or non-empty-but-unparseable →
// structural migration error. The completion condition is that no open row remains (or the
// file is gone): move each row into ## Open and delete it from the ledger, and the gate never
// re-fires. Frozen archives are never scanned.
//
// Also here: the ID rules the docs state (one test each) and the Reality Check assumption
// lifecycle (verified → observed; carried forward → an ## Open item; the two never coexist).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const rd = require('../lib/readiness');
const gateLib = require('../lib/gate');
const { canSymlink } = require('./helpers/can-symlink');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const ROOT = path.join(__dirname, '..');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });
const w = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); return p; };

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n';
const ADDED = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';
const TAP2 = 'node -e "console.log(\'TAP version 13\');console.log(\'1..2\');console.log(\'ok 1 - XA-01 a\');console.log(\'ok 2 - XB-01 b\')"';
const HEADER = '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n';
const row = (id, issue, st) => `| ${id} | ${issue} | med | 1 | ${st} |\n`;

function project({ ledger = null, open = '', sections = '', gates = '', archived = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-lm-'));
  w(path.join(root, 'apriori', 'specs', 'kv', 'spec.md'), STORE);
  const dir = archived
    ? path.join(root, 'apriori', 'changes', 'archive', '2026-01-01T0000-c')
    : path.join(root, 'apriori', 'changes', 'c');
  w(path.join(dir, 'specs', 'kv', 'spec.md'), ADDED);
  w(path.join(dir, 'flow-state.md'), `change: c\nlineage: v6\nphase: review\n\n## Open\n${open}\n${sections}gates:\n  - 2026-08-23T00:00 note: scaffolded\n${gates}`);
  w(path.join(dir, 'review', 'code-review-v1.md'), '# review r1\n\nVERDICT: no major issues\n');
  w(path.join(dir, 'review', 'code-review-v1-raw.txt'), 'raw\n');
  if (ledger !== null) w(path.join(dir, 'review', 'issues.md'), ledger);
  return { root, dir, ledger: path.join(dir, 'review', 'issues.md'), flow: path.join(dir, 'flow-state.md') };
}
const gate = (p, extra = []) => run(['gate', '--change', 'c', '--test-cmd', TAP2, '--no-cas', ...extra], p.root);
const archive = (p, extra = []) => run(['archive', '--change', 'c', '--no-cas', ...extra], p.root);
const esc = (p) => run(['status', '--change', 'c', '--escalation'], p.root);
const line = (out, id) => (out.split('\n').find((l) => l.includes(` ${id} `)) || '').trim();
const r1 = (p) => rd.readinessOf({ bundleDir: p.dir, name: 'c' }).blockers.filter((b) => b.rule === 'R1');
const storeOf = (p) => fs.readFileSync(path.join(p.root, 'apriori', 'specs', 'kv', 'spec.md'), 'utf8');

// ---------------------------------------------------------------------------

test('LM-01 open rows in an active bundle are a C3/R1 structural refusal listing each row and its line', () => {
  const p = project({ ledger: HEADER + row('Q-1', 'restart recovery unproven', 'open') + row('Q-2', 'fixed already', 'fixed') + row('Q-3', 'schema drift', 'OPEN (since r2)') });
  const want = /legacy ledger has 2 open row\(s\) — move each into ## Open as `- <ID>: <text>` and delete it from review\/issues\.md \(or delete the file\): line 3: Q-1 \(restart recovery unproven\); line 5: Q-3 \(schema drift\)/;
  assert.match(rd.legacyLedgerMigration(p.dir) || '', want);
  const g = gate(p);
  assert.strictEqual(g.status, 1, g.stdout);
  assert.match(line(g.stdout, 'C3'), /BLOCKED — legacy ledger has 2 open row\(s\)/);
  assert.match(line(g.stdout, 'C3'), /line 3: Q-1/);
  assert.match(line(g.stdout, 'C3'), /line 5: Q-3/);
  assert.doesNotMatch(line(g.stdout, 'C3'), /Q-2/, 'a closed row is not listed');
  // review-ready refuses on the same words, R1 is structural and never forceable, status stops
  assert.strictEqual(gate(p, ['--review-ready']).status, 1);
  assert.match(gate(p, ['--review-ready']).stdout, /✗ open {2}legacy ledger has 2 open row/);
  assert.deepStrictEqual(r1(p).map((b) => [b.class, b.forceable]), [['structural', false]]);
  assert.match(r1(p)[0].detail, want);
  const before = storeOf(p);
  const a = archive(p, ['--force', '--write']);
  assert.strictEqual(a.status, 1);
  assert.match(a.stderr, /archive: R1 .*legacy ledger has 2 open row/);
  assert.strictEqual(storeOf(p), before, 'nothing written');
  assert.ok(fs.existsSync(p.ledger), 'the tool never deletes or rewrites the ledger');
  const e = esc(p);
  assert.strictEqual(e.status, 3);
  assert.match(e.stdout, /legacy ledger has 2 open row/);
  assert.match(run(['status', '--change', 'c'], p.root).stdout, /^migration: {4}legacy ledger has 2 open row/m);
});

test('LM-02 move, not copy: the gate re-fires while any open row remains, and never again once none does', () => {
  const p = project({ ledger: HEADER + row('Q-1', 'restart recovery unproven', 'open') + row('Q-3', 'schema drift', 'open') });
  // copying one row into ## Open without deleting it from the ledger is not a migration
  fs.writeFileSync(p.flow, fs.readFileSync(p.flow, 'utf8').replace('## Open\n', '## Open\n- Q-1: restart recovery unproven'));
  let g = gate(p);
  assert.match(line(g.stdout, 'C3'), /legacy ledger has 2 open row/, 'copied, not moved');
  // move Q-1 (delete its row) — Q-3 still refuses, alone
  fs.writeFileSync(p.ledger, HEADER + row('Q-3', 'schema drift', 'open'));
  g = gate(p);
  assert.match(line(g.stdout, 'C3'), /legacy ledger has 1 open row\(s\) — .*: line 3: Q-3/);
  assert.doesNotMatch(line(g.stdout, 'C3'), /Q-1/);
  // move Q-3 — the ledger keeps only closed rows: the gate never re-fires
  fs.writeFileSync(p.flow, fs.readFileSync(p.flow, 'utf8').replace('- Q-1: restart recovery unproven', '- Q-1: restart recovery unproven\n- Q-3: schema drift'));
  fs.writeFileSync(p.ledger, HEADER + row('Q-9', 'long fixed', 'verified'));
  g = gate(p);
  assert.match(line(g.stdout, 'C3'), /^✓ C3 legal/);
  assert.match(line(g.stdout, 'C9'), /open item Q-1 is pending/);
  assert.match(line(g.stdout, 'C9'), /open item Q-3 is pending/);
  assert.strictEqual(rd.legacyLedgerMigration(p.dir), null);
  assert.strictEqual(gate(p, ['--review-ready']).status, 0, 'pending items are what the review is for');
  // the owner settles both by id; the delivery goes through with the closed-only ledger still there
  fs.appendFileSync(p.flow, '  - 2026-08-23T11:00 owner: evidence-accept Q-1 — accepted\n  - 2026-08-23T11:01 owner: evidence-accept Q-3 — accepted\n');
  assert.strictEqual(gate(p).status, 0, gate(p).stdout);
  assert.strictEqual(archive(p).status, 0, archive(p).stderr);
  // deleting the file is the other completion
  const q = project({ ledger: HEADER + row('Q-1', 'x', 'open') });
  assert.strictEqual(gate(q).status, 1);
  fs.unlinkSync(q.ledger);
  assert.strictEqual(gate(q).status, 0, gate(q).stdout);
});

test('LM-03 closed-only, missing, or empty ledger: nothing — no refusal, no mention', () => {
  for (const [why, ledger] of [
    ['closed-only', HEADER + row('Q-1', 'x', 'fixed') + row('Q-2', 'y', 'Verified') + row('Q-3', 'z', 'advisory-acked') + row('Q-4', 'w', 'rejected-verified — no') + row('Q-5', 'v', 'waived — owner')],
    ['reopened is not the leading token `open` under the old contract', HEADER + row('Q-1', 'x', 'reopened')],
    ['missing', null],
    ['empty', ''],
    ['blank lines only', '\n\n'],
  ]) {
    const p = project({ ledger });
    assert.strictEqual(rd.legacyLedgerMigration(p.dir), null, why);
    const g = gate(p);
    assert.strictEqual(g.status, 0, `${why}: ${g.stdout}`);
    assert.doesNotMatch(g.stdout + g.stderr, /legacy ledger/, why);
    assert.strictEqual(esc(p).status, 0, why);
  }
});

test('LM-04 a ledger with content but no readable table row is a structural migration error', () => {
  for (const [why, ledger] of [
    ['prose', 'Issues:\n- Q-1 is still open\n'],
    ['a table with no cells', '| just one cell |\n'],
    ['rows fenced away (an example is not a ledger)', '```\n' + HEADER + row('Q-1', 'x', 'open') + '```\n'],
  ]) {
    const p = project({ ledger });
    const m = rd.legacyLedgerMigration(p.dir);
    assert.match(m || '', /legacy ledger review\/issues\.md has content but no readable table row \(old contract: \| ID \| … \| Status \|\) — migrate it by hand into ## Open and delete the file/, why);
    const g = gate(p);
    assert.strictEqual(g.status, 1, `${why}: ${g.stdout}`);
    assert.match(line(g.stdout, 'C3'), /BLOCKED — legacy ledger review\/issues\.md has content but no readable table row/, why);
    assert.strictEqual(r1(p).length, 1, why);
  }
});

test('LM-05 an unreadable ledger is a structural migration error, never "no rows"', () => {
  const dirCase = project();
  fs.mkdirSync(dirCase.ledger);
  assert.match(rd.legacyLedgerMigration(dirCase.dir) || '', /legacy ledger review\/issues\.md: not-file at .*issues\.md — a ledger that cannot be read cannot be proven closed; fix or delete it/);
  assert.match(line(gate(dirCase).stdout, 'C3'), /BLOCKED — legacy ledger review\/issues\.md: not-file/);
  assert.deepStrictEqual(r1(dirCase).map((b) => b.class), ['structural']);
  if (canSymlink()) {
    const link = project();
    const outside = w(path.join(link.root, 'elsewhere.md'), HEADER + row('Q-1', 'x', 'fixed'));
    fs.symlinkSync(outside, link.ledger);
    assert.match(rd.legacyLedgerMigration(link.dir) || '', /legacy ledger review\/issues\.md: symlink at/);
    assert.match(line(gate(link).stdout, 'C3'), /BLOCKED — legacy ledger review\/issues\.md: symlink/);
  }
});

test('LM-06 a frozen archive is never scanned', () => {
  const p = project({ ledger: HEADER + row('Q-1', 'x', 'open'), archived: true });
  const g = gate(p);
  assert.strictEqual(g.status, 0, g.stdout);
  assert.match(line(g.stdout, 'C3'), /^✓ C3 legal/);
  assert.doesNotMatch(g.stdout, /legacy ledger/);
  assert.strictEqual(esc(p).status, 0);
  assert.doesNotMatch(run(['status', '--change', 'c'], p.root).stdout, /legacy ledger/);
});

// ---------------------------------------------------------------------------
// the ID rules
// ---------------------------------------------------------------------------

test('LM-07 an Open id is one token (`[^\\s:]+`); a legacy name with spaces must be re-keyed', () => {
  // the Open grammar: a spaced name is not an id, so the line is an item with no id
  const f = rd.evidenceFindings('## Open\n- data schema: the v1 risk is unverified\n');
  assert.deepStrictEqual(f.items.map((i) => i.id), [null]);
  // and the migration says so about a spaced legacy row, with a re-keyed suggestion
  const p = project({ ledger: HEADER + row('data schema', 'the v1 risk', 'open') });
  assert.match(rd.legacyLedgerMigration(p.dir) || '', /line 3: 'data schema' \(re-key it — an Open id has no spaces, e\.g\. `data-schema`\) \(the v1 risk\)/);
});

test('LM-08 the two ID rules the CLI cannot prove are stated as rules, in both editions', () => {
  for (const f of ['RUNBOOK.md', 'RUNBOOK_cn.md', 'docs/cli.md', 'docs/cli_cn.md']) {
    const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.match(t, /never reused for a different risk|不复用给另一个风险/, `${f}: a closed id is never reused for a different risk within the same bundle`);
    assert.match(t, /cannot prove|无法证明/, `${f}: the CLI cannot prove it — say so`);
    assert.match(t, /documentation violation|文档层面的违规/, `${f}: an acceptance whose id later names a different item is a documentation violation, not something the tool detects`);
  }
});

// ---------------------------------------------------------------------------
// the Reality Check assumption lifecycle
// ---------------------------------------------------------------------------

test('LM-09 an assumption blocks C9 with the lifecycle in its message; an accepted item and a standing assumption for the same fact must not coexist', () => {
  const LIFE = /unverified assumption: the schema matches — verified\? rewrite it as `- observed: …`; carried forward unverified\? move it to ## Open as `- <ID>: the schema matches` and delete this line \(an accepted item and a standing assumption for the same fact must not coexist\)/;
  const alone = rd.evidenceFindings('## Reality Check\n- assumption: the schema matches\n');
  assert.strictEqual(alone.blockers.length, 1);
  assert.match(alone.blockers[0], LIFE);
  // the coexistence: R-1 accepted, the assumption still standing → C9 blocks on the assumption
  const both = project({ open: '- R-1: the schema matches', sections: '## Reality Check\n- assumption: the schema matches\n\n',
    gates: '  - 2026-08-23T11:00 owner: evidence-accept R-1 — accepted\n' });
  const g = gate(both);
  assert.strictEqual(g.status, 1, g.stdout);
  assert.match(line(g.stdout, 'C9'), LIFE);
  assert.match(line(g.stdout, 'C9'), /^✗ C9 BLOCKED — unverified assumption/);
  // the accepted item is still present and reported as such — it just does not cure the assumption
  assert.match(run(['status', '--change', 'c'], both.root).stdout, /^open: {9}\[accepted\] R-1: the schema matches$/m);
  assert.strictEqual(gate(both, ['--review-ready']).status, 1);
  // deleting the assumption line (the item carries the fact now) clears it
  fs.writeFileSync(both.flow, fs.readFileSync(both.flow, 'utf8').replace('- assumption: the schema matches\n', ''));
  assert.strictEqual(gate(both).status, 0, gate(both).stdout);
  // a malformed line is structural: no acceptance names it, nothing cures it but rewriting it
  const bad = rd.evidenceFindings('## Reality Check\n- the schema matches\n\ngates:\n  - 2026-08-23T11:00 owner: evidence-accept the — x\n');
  assert.strictEqual(bad.blockers.length, 1);
  assert.match(bad.blockers[0], /Reality Check entry names no kind: 'the schema matches' — write observed\/decision\/assumption/);
});

test('LM-10 the assumption lifecycle is documented in both RUNBOOK editions', () => {
  const en = fs.readFileSync(path.join(ROOT, 'RUNBOOK.md'), 'utf8');
  const cn = fs.readFileSync(path.join(ROOT, 'RUNBOOK_cn.md'), 'utf8');
  assert.match(en, /rewrite it as `observed`/);
  assert.match(en, /must not coexist/);
  assert.match(cn, /改写为 `observed`/);
  assert.match(cn, /不能并存/);
});

test('LM-11 an unusable review ROOT is the root guard\'s finding (C5 / R4), never a second ledger finding', { skip: canSymlink() ? false : 'platform refuses symlinks' }, () => {
  const p = project({ ledger: HEADER + row('Q-1', 'x', 'open') });
  // turn review/ into a symlink to a directory outside the bundle that holds the same files
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-lm-out-'));
  for (const f of fs.readdirSync(path.join(p.dir, 'review'))) fs.copyFileSync(path.join(p.dir, 'review', f), path.join(outside, f));
  fs.rmSync(path.join(p.dir, 'review'), { recursive: true });
  fs.symlinkSync(outside, path.join(p.dir, 'review'));
  assert.strictEqual(rd.legacyLedgerMigration(p.dir), null, 'the root guard owns this');
  const r = rd.readinessOf({ bundleDir: p.dir, name: 'c' });
  assert.deepStrictEqual(r.blockers.map((b) => b.rule), ['R4']);
  assert.match(r.blockers[0].detail, /review\/: symlink/);
  const g = gate(p);
  assert.match(line(g.stdout, 'C3'), /^✓ C3 legal/);
  assert.match(line(g.stdout, 'C5'), /BLOCKED — review is a symlink/);
});
