'use strict';
// Slice B — single-review-evidence. A review doc that opens with a LEGAL provenance header and
// carries its own verdict line is self-contained: the reviewer's raw output lives in the doc
// itself, so the `<stem>-raw.*` sibling is no longer required. Legacy (no-provenance) summaries
// are UNCHANGED — they still need their raw sibling, byte-for-byte the same as before this slice.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const review = require('../lib/review');
const gate = require('../lib/gate');
const check = require('../lib/check');

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n';
const DELTA = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';
const TAP_OK = `node -e "${['ok 1 - XA-01 a', 'ok 2 - XB-01 b'].map((l) => `console.log('${l}')`).join(';')}"`;
const LEDGER_OK = '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n| Q-1 | a | low | 1 | verified |\n';
const EVIDENCE = '\n## Evidence\n- producer-diff: done — read the whole diff, known P0/P1 zero\n'
  + '- data-schema: done — ran against the real schema\n\n';

function project(gates = '  - 2026-08-23T00:00 note: n\n', phase = 'build') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sre-'));
  const w = (rel, body) => {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
  };
  w('apriori/specs/kv/spec.md', STORE);
  w('apriori/changes/c/flow-state.md',
    `change: c\nmode: standard\nlineage: v6\nphase: ${phase}\n${EVIDENCE}gates:\n${gates}`);
  w('apriori/changes/c/tasks.md', '- [x] T1 done\n');
  w('apriori/changes/c/specs/kv/spec.md', DELTA);
  w('apriori/changes/c/review/issues.md', LEDGER_OK);
  return { root, bundle: path.join(root, 'apriori', 'changes', 'c'), w };
}

const doc = (bundle, stem, body) => fs.writeFileSync(path.join(bundle, 'review', `${stem}.md`), body);
const raw = (bundle, stem) => fs.writeFileSync(path.join(bundle, 'review', `${stem}-raw.txt`), 'raw transcript\n');
const facts = (bundle) => review.reviewFacts(bundle);
const kinds = (f) => f.problems.map((p) => p.kind).sort();
const c5 = (root) => gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK }).checks.find((x) => x.id === 'C5');
const c8 = (root) => gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK }).checks.find((x) => x.id === 'C8');

const PROV = '<!-- provenance: provider=anthropic model=claude-sonnet-5 session=sess-1 date=2026-08-24 -->';

// ===========================================================================
// Positive — a self-contained doc needs no raw sibling
// ===========================================================================

test('SB-01 a self-contained doc (legal provenance + VERDICT: ACCEPT) needs no raw sibling', () => {
  const { root, bundle } = project();
  doc(bundle, 'req-review-v1', `${PROV}\n# Independent Review — Round 1\n\nfindings…\n\nVERDICT: ACCEPT\n`);
  const f = facts(bundle);
  assert.deepStrictEqual(f.missingRaw, []);
  assert.deepStrictEqual(f.problems, []);
  assert.strictEqual(f.families[0].family, 'req-review');
  assert.strictEqual(f.families[0].verdict, 'accept');
  assert.strictEqual(c5(root).status, 'pass', c5(root).detail);
  assert.strictEqual(c8(root).status, 'pass', c8(root).detail);
});

test('SB-02 VERDICT: REVISE and VERDICT: ESCALATE are canonical too, case-insensitively', () => {
  for (const [line, cls] of [['VERDICT: REVISE', 'revise'], ['verdict: revise', 'revise'],
    ['VERDICT: ESCALATE', 'escalate'], ['VERDICT: Accept', 'accept']]) {
    const c = review.classifyVerdict(line);
    assert.ok(c, line);
    assert.strictEqual(c.cls, cls, line);
  }
});

test('SB-03 a self-contained REVISE round still counts toward the family loop', () => {
  const { root, bundle } = project();
  doc(bundle, 'spec-review-v1', `${PROV}\n# Review\n\nVERDICT: REVISE\n`);
  const f = facts(bundle);
  assert.deepStrictEqual(f.missingRaw, []);
  assert.strictEqual(f.families[0].verdict, 'revise');
  assert.strictEqual(c8(root).status, 'blocked');
  assert.match(c8(root).detail, /the independent review has not resolved/);
});

// ===========================================================================
// Negative — legacy behavior is fully preserved
// ===========================================================================

test('SB-04 a legacy doc with no provenance still needs its raw sibling (unchanged)', () => {
  const { root, bundle } = project();
  doc(bundle, 'req-review-v1', 'body\nVERDICT: no major issues\n');
  let f = facts(bundle);
  assert.deepStrictEqual(f.missingRaw, ['req-review-v1']);
  assert.strictEqual(c5(root).status, 'blocked');
  raw(bundle, 'req-review-v1');
  f = facts(bundle);
  assert.deepStrictEqual(f.missingRaw, []);
  assert.strictEqual(c5(root).status, 'pass');
});

// ===========================================================================
// Adversarial — a format-similar-but-incomplete header must not buy the exemption
// ===========================================================================

test('SB-05 provenance missing a required field is illegal — raw is still required', () => {
  const cases = [
    '<!-- provenance: provider=anthropic model=claude-sonnet-5 date=2026-08-24 -->',      // no session
    '<!-- provenance: provider=anthropic session=sess-1 date=2026-08-24 -->',             // no model
    '<!-- provenance: model=claude-sonnet-5 session=sess-1 date=2026-08-24 -->',          // no provider
    '<!-- provenance: provider=anthropic model=claude-sonnet-5 session=sess-1 -->',       // no date
    '<!-- provenance: provider=anthropic model= session=sess-1 date=2026-08-24 -->',      // empty value
    '<!-- provenance: provider=anthropic model=claude-sonnet-5 session=sess-1 date= -->', // trailing empty
    '<!-- provenance: provider=anthropic model=claude-sonnet-5 session=sess-1 date=notadate -->',    // not a date
    '<!-- provenance: provider=anthropic model=claude-sonnet-5 session=sess-1 date=13/45/2026 -->',  // wrong shape
    '<!-- provenance: provider=anthropic model=claude-sonnet-5 session=sess-1 date=yesterday -->',   // relative, not a date
  ];
  for (const header of cases) {
    const { root, bundle } = project();
    doc(bundle, 'req-review-v1', `${header}\n# Review\n\nVERDICT: no major issues\n`);
    const f = facts(bundle);
    assert.deepStrictEqual(f.missingRaw, ['req-review-v1'], header);
    assert.strictEqual(c5(root).status, 'blocked', header);
  }
});

test('SB-06 provenance must be the FIRST non-blank line — a preceding line disqualifies it', () => {
  const { root, bundle } = project();
  doc(bundle, 'req-review-v1', `# Independent Review\n${PROV}\n\nVERDICT: no major issues\n`);
  const f = facts(bundle);
  assert.deepStrictEqual(f.missingRaw, ['req-review-v1']);
  assert.strictEqual(c5(root).status, 'blocked');
});

test('SB-07 provenance IS legal after only leading blank lines', () => {
  const { root, bundle } = project();
  doc(bundle, 'req-review-v1', `\n\n${PROV}\n# Review\n\nVERDICT: no major issues\n`);
  const f = facts(bundle);
  assert.deepStrictEqual(f.missingRaw, []);
  assert.strictEqual(c5(root).status, 'pass');
});

test('SB-08 `unknown` is a legal value for every provenance field', () => {
  const { root, bundle } = project();
  doc(bundle, 'req-review-v1',
    '<!-- provenance: provider=unknown model=unknown session=unknown date=unknown -->\n'
    + '# Review\n\nVERDICT: no major issues\n');
  const f = facts(bundle);
  assert.deepStrictEqual(f.missingRaw, []);
  assert.strictEqual(c5(root).status, 'pass');
});

test('SB-09 a malformed VERDICT line (illegal tail) is refused exactly as before, provenance or not', () => {
  const { root, bundle } = project();
  doc(bundle, 'req-review-v1', `${PROV}\n# Review\n\nVERDICT: no major issues, but 3 blockers remain\n`);
  const f = facts(bundle);
  assert.deepStrictEqual(kinds(f), ['unclassified']);
  assert.strictEqual(c8(root).status, 'blocked');
});

// ===========================================================================
// Boundary 1 — a quoted VERDICT: example inside a fenced code block is not the final verdict
// ===========================================================================

test('SB-10 a fenced example VERDICT line does not create a conflicting verdict', () => {
  const { root, bundle } = project();
  doc(bundle, 'req-review-v1',
    `${PROV}\n# Review\n\nThe vocabulary:\n\n\`\`\`\nVERDICT: ESCALATE\n\`\`\`\n\nMy conclusion:\n\nVERDICT: ACCEPT\n`);
  const f = facts(bundle);
  assert.deepStrictEqual(f.problems, []);
  assert.strictEqual(f.families[0].verdict, 'accept');
  assert.strictEqual(c8(root).status, 'pass', c8(root).detail);
});

test('SB-10b fence-stripping is scoped to self-contained docs — a LEGACY doc with a fenced '
  + 'conflicting verdict still blocks exactly as before this slice', () => {
  const { root, bundle } = project();
  doc(bundle, 'spec-review-v1',
    '# Review\n\nThe vocabulary:\n\n```\nVERDICT: no major issues\n```\n\nMy conclusion:\n\nVERDICT: 3 issues open\n');
  raw(bundle, 'spec-review-v1');
  const f = facts(bundle);
  assert.deepStrictEqual(kinds(f), ['conflicting-verdict'], 'the fenced line must still be read on a legacy doc');
  assert.deepStrictEqual(f.families, []);
  assert.strictEqual(c8(root).status, 'blocked');
});

// ===========================================================================
// Boundary 2 — provenance already declares a round; its verdict cannot vanish without a trace
// ===========================================================================

test('SB-11 a provenance-headed doc whose verdict was deleted still blocks (no raw needed to prove it)', () => {
  const { root, bundle } = project();
  doc(bundle, 'req-review-v1', `${PROV}\n# Independent Review — Round 1\n\nfindings only, no verdict line\n`);
  const f = facts(bundle);
  assert.ok(kinds(f).some((k) => /verdict/i.test(k)), `expected a verdict-related problem, got ${kinds(f)}`);
  assert.deepStrictEqual(f.families, []);
  assert.strictEqual(c8(root).status, 'blocked');
});

test('SB-12 the same body with NO provenance is just an ordinary non-verdict file (unchanged)', () => {
  const { root, bundle } = project();
  doc(bundle, 'notes', '# Independent Review — Round 1\n\nfindings only, no verdict line\n');
  const f = facts(bundle);
  assert.deepStrictEqual(f.problems, []);
  assert.strictEqual(c8(root).status, 'blocked');   // still blocked — the floor: no completed round
  assert.match(c8(root).detail, /no completed independent review round/);
});

// ===========================================================================
// CK-10 must scan single-file review evidence exactly as it scans raws
// ===========================================================================

test('SB-13 CK-10 catches a secret embedded in a self-contained review doc (no -raw sibling)', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sre-ck10-'));
  fs.mkdirSync(path.join(root, 'apriori/specs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'apriori/specs/s.md'), '#### Scenario: XX-01 a\n- t\n');
  fs.mkdirSync(path.join(root, 'apriori/changes/x/review'), { recursive: true });
  fs.writeFileSync(path.join(root, 'apriori/changes/x/review/req-review-v1.md'),
    `${PROV}\n# Review\n\nkey=AKIA${'ABCDEFGHIJKLMNOP'}\n\nVERDICT: no major issues\n`);
  const r = require('node:child_process').spawnSync('node',
    [path.join(__dirname, '..', 'bin', 'apriori.js'), 'check'], { encoding: 'utf8', cwd: root });
  assert.strictEqual(r.status, 1, r.stdout);
  assert.match(r.stdout, /AWS/i);
  assert.match(r.stdout, /req-review-v1\.md/);
});

// ===========================================================================
// The shared classifier — CK-03's table matches review.js exactly
// ===========================================================================

test('SB-14 review.js and check.js still classify through ONE shared table after this slice', () => {
  assert.deepStrictEqual([...check.VERDICT_PHRASES].sort(), [...review.VERDICT_PHRASES].sort());
  for (const p of review.VERDICT_PHRASES) assert.ok(review.isKnownVerdict(p), p);
});
