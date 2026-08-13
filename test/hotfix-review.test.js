'use strict';
// hotfix-lane T8 — the review surface: verdict grammar, the ruled projection, and round
// selection (HF-31..HF-36).
const test = require('node:test');
const assert = require('node:assert');

const { parseVerdictZone, checkReview, selectRound, VERDICT_MARKER } = require('../lib/hotfix.js');

const D = 'a'.repeat(64);
const zone = (...lines) => ['transcript body', '', VERDICT_MARKER, ...lines].join('\n');
const state = (o = {}) => ({ header: new Map(Object.entries({ 'change-kind': 'code-trivial', kinds: '1', ...o })) });
const review = (lines, o = {}) => ({ ...parseVerdictZone(zone(...lines)), digest: D, ...o });

test('HF-31 the verdict zone is unique and its lines parse by fixed grammar', () => {
  const none = parseVerdictZone('a transcript with no marker at all');
  assert.ok(none.problems.some((p) => p.includes(VERDICT_MARKER)), `missing marker: ${none.problems}`);

  const twice = parseVerdictZone(['x', VERDICT_MARKER, `VERDICT: no findings role=inspection digest=${D}`, VERDICT_MARKER].join('\n'));
  assert.ok(twice.problems.some((p) => /unique/.test(p)), `duplicate marker: ${twice.problems}`);

  const ok = parseVerdictZone(zone(`VERDICT: no findings role=inspection digest=${D} boundary=within`));
  assert.deepStrictEqual(ok.problems, [], `clean zone: ${ok.problems}`);
  assert.deepStrictEqual(
    { phrase: ok.verdicts[0].phrase, role: ok.verdicts[0].role, digest: ok.verdicts[0].digest, boundary: ok.verdicts[0].boundary },
    { phrase: 'no findings', role: 'inspection', digest: D, boundary: 'within' },
  );
});

test('HF-32 role, digest and phrase pairing are mandatory and closed', () => {
  const cases = [
    [`VERDICT: no findings digest=${D}`, /role=/],
    ['VERDICT: no findings role=inspection', /digest=/],
    [`VERDICT: no findings role=inspection role=p8 digest=${D}`, /repeats 'role='/],
    ['VERDICT: no findings role=inspection digest=ABC', /64 lowercase hex/],
    [`VERDICT: no findings role=reviewer digest=${D}`, /not one of/],
    [`VERDICT: no findings role=p8 digest=${D}`, /not legal for role=p8/],
    [`VERDICT: 0 issues open role=inspection digest=${D}`, /not legal for role=inspection/],
  ];
  for (const [line, re] of cases) {
    const r = parseVerdictZone(zone(line));
    assert.ok(r.problems.some((p) => re.test(p)), `${line} → ${r.problems}`);
  }
  assert.deepStrictEqual(parseVerdictZone(zone(`VERDICT: 2 issues open role=inspection digest=${D}`)).problems, [], 'a legal non-passing phrase still parses');
});

test('HF-33 the projection demands exactly the ruled rounds and roles', () => {
  const r1 = checkReview({ radius: 'R1', subtype: 'n/a' }, state(), null);
  assert.deepStrictEqual([r1.problems, r1.need.roles], [[], []], 'R1 carries no point-check');

  const r0bare = checkReview({ radius: 'R0', subtype: 'n/a' }, state({ 'change-kind': 'no-code', kinds: '2' }), null);
  assert.deepStrictEqual(r0bare.problems, [], 'a bare conclusion carries no point-check');

  const r0dec = checkReview({ radius: 'R0', subtype: 'n/a' }, state({ 'change-kind': 'no-code', kinds: '2,3' }), null);
  assert.ok(r0dec.problems.some((p) => /no review round/.test(p)), `R0 with decisions demands one: ${r0dec.problems}`);

  const r2code = checkReview({ radius: 'R2', subtype: 'behavior' }, state({ 'change-kind': 'code-behavior' }),
    review([`VERDICT: no findings role=inspection digest=${D}`]));
  assert.deepStrictEqual(r2code.problems, [], `R2 code, one inspection line: ${r2code.problems}`);

  const docsOrder = checkReview({ radius: 'R2', subtype: 'whitelist' }, state({ 'change-kind': 'doc-fix' }),
    review([`VERDICT: no spec-vs-code gaps role=p8 digest=${D}`, `VERDICT: no findings role=inspection digest=${D} boundary=within`]));
  assert.ok(docsOrder.problems.some((p) => /ruled order/.test(p)), `docs order enforced: ${docsOrder.problems}`);

  const docsOk = checkReview({ radius: 'R2', subtype: 'whitelist' }, state({ 'change-kind': 'doc-fix' }),
    review([`VERDICT: no findings role=inspection digest=${D} boundary=within`, `VERDICT: no spec-vs-code gaps role=p8 digest=${D}`]));
  assert.deepStrictEqual(docsOk.problems, [], `R2 × docs, two duties: ${docsOk.problems}`);
});

test('HF-34 a non-passing verdict, an exceeded boundary and a stale digest each refuse the archive', () => {
  const g = { radius: 'R2', subtype: 'behavior' };
  const s = state({ 'change-kind': 'code-behavior' });

  const open = checkReview(g, s, review([`VERDICT: 2 issues open role=inspection digest=${D}`]));
  assert.ok(open.problems.some((p) => /does not pass/.test(p)), `open findings refuse: ${open.problems}`);

  const exceeds = checkReview({ radius: 'R2', subtype: 'whitelist' }, state(),
    review([`VERDICT: no findings role=inspection digest=${D} boundary=exceeds`]));
  assert.ok(exceeds.problems.some((p) => /EXCEED/.test(p)), `exceeded boundary refuses: ${exceeds.problems}`);

  const stale = checkReview(g, s, review([`VERDICT: no findings role=inspection digest=${'b'.repeat(64)}`]));
  assert.ok(stale.problems.some((p) => /recomputed/.test(p)), `stale digest refuses: ${stale.problems}`);
});

test('HF-35 the boundary trailer is required exactly where the ruling puts it', () => {
  const missing = checkReview({ radius: 'R2', subtype: 'whitelist' }, state(),
    review([`VERDICT: no findings role=inspection digest=${D}`]));
  assert.ok(missing.problems.some((p) => /boundary=/.test(p)), `whitelist demands the trailer: ${missing.problems}`);

  const extra = checkReview({ radius: 'R2', subtype: 'behavior' }, state({ 'change-kind': 'code-behavior' }),
    review([`VERDICT: no findings role=inspection digest=${D} boundary=within`]));
  assert.ok(extra.problems.some((p) => /does not ask/.test(p)), `behavior refuses the trailer: ${extra.problems}`);
});

test('HF-36 rounds are selected by highest n and must be complete pairs', () => {
  const full = selectRound(['round-1.md', 'round-1-raw.txt', 'round-2.md', 'round-2-raw.txt']);
  assert.deepStrictEqual({ n: full.n, problems: full.problems }, { n: 2, problems: [] });

  const half = selectRound(['round-1.md', 'round-1-raw.txt', 'round-2.md']);
  assert.ok(half.problems.some((p) => /round 2/.test(p)), `half round named: ${half.problems}`);

  const lowHalf = selectRound(['round-1.md', 'round-2.md', 'round-2-raw.txt']);
  assert.ok(lowHalf.problems.some((p) => /round 1/.test(p)), 'a lower incomplete round is not silently skipped');

  const padded = selectRound(['round-01.md', 'round-01-raw.txt']);
  assert.ok(padded.problems.some((p) => /leading zeros/.test(p)), `padded name refused: ${padded.problems}`);
});
