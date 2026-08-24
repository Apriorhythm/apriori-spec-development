'use strict';
// R03 subtraction #1: lib/spec-runner.js natively supports consecutive top-level TAP
// documents (each independently version/plan/point-validated) instead of requiring an
// external merge-tap.sh adapter. Fixtures are R02's REAL raw output — captured verbatim
// from `corepack yarn workspace @actual-app/core test:node tags --reporter=tap` and the
// matching @actual-app/web command, in the tag-rename-v6-r02 worktree (both exit 0).
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { parseTap, verify, DEFAULT_ID, _setTestRunner } = require('../lib/spec-runner');

const idRe = new RegExp(DEFAULT_ID);
const FIXDIR = path.join(__dirname, 'fixtures', 'multi-tap');
const CORE_RAW = fs.readFileSync(path.join(FIXDIR, 'r02-core-raw.tap'), 'utf8');
const WEB_RAW = fs.readFileSync(path.join(FIXDIR, 'r02-web-raw.tap'), 'utf8');

// A trailing-plan TAP v13 document — the shape `node --test --test-reporter=tap` actually
// emits: the plan line comes AFTER its points, not before. Confirmed live (see MT-15) and
// what P1 flagged: splitTapDocuments previously only recognized plan-FIRST documents as complete.
function trailingPlanDoc(id, title) {
  return `TAP version 13\nok 1 - ${id} ${title}\n1..1\n`;
}

function tmpSpec(content) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-mt-'));
  const f = path.join(d, 'spec.md');
  fs.writeFileSync(f, content);
  return f;
}

// Two independent, self-consistent TAP v13 documents — each starts with its own
// "TAP version 13", each closes its own plan against its own point count.
function truncateSecondDoc(raw) {
  // web fixture's plan says 1..2 — drop the second top-level point so the SECOND
  // document's own plan (2) no longer matches its own point count (1): a truncated
  // second document, not a truncated first one.
  return raw.replace(/^ok 2 - .*\n(?:.*\n)*/m, '');
}

test('MT-01 real R02 core+web raw output, concatenated verbatim, parses as two trustworthy documents', () => {
  const u = parseTap(CORE_RAW + WEB_RAW, idRe);
  assert.deepStrictEqual(u.tapProblems, []);
  assert.strictEqual(u.bailout, null);
  assert.strictEqual(u.executedPoints, 4);            // 2 files in core + 2 files in web
  assert.strictEqual(u.points, 4);
  assert.deepStrictEqual(u.dupNumbers, []);            // point numbering restarts 1,2 per document — not a collision
  assert.deepStrictEqual(u.plans, [2, 2]);
});

test('MT-02 native multi-doc verify GREEN on the real concatenated raw output — no merge-tap.sh needed', () => {
  const specFile = tmpSpec('#### Scenario: XX-01 unrelated placeholder\n');
  const testCmd = 'irrelevant — overridden by the test-runner seam';
  _setTestRunner(() => ({ out: CORE_RAW + WEB_RAW, stderr: '', status: 0, signal: null, error: null }));
  try {
    const run = verify({ specs: [specFile], testCmd, cwd: '.' });
    assert.deepStrictEqual(run.errors, []);
    assert.strictEqual(run.exec.status, 0);
  } finally {
    _setTestRunner(null);
  }
});

test('MT-03 second document truncated (its own plan promises more than it delivers) fails closed', () => {
  const truncatedWeb = truncateSecondDoc(WEB_RAW);
  const u = parseTap(CORE_RAW + truncatedWeb, idRe);
  assert.ok(u.tapProblems.length > 0, u.tapProblems.join('\n'));
  assert.match(u.tapProblems.join('\n'), /document 2.*declares 2 test point\(s\) but 1/s);
});

test('MT-04 second document contributes zero real execution points (all SKIP) fails closed', () => {
  const skippedWeb = WEB_RAW
    .replace(/^ok (\d+) - ([^#]*?)\s*#.*$/gm, 'ok $1 - $2 # SKIP nothing ran');
  const u = parseTap(CORE_RAW + skippedWeb, idRe);
  assert.ok(u.tapProblems.length > 0, u.tapProblems.join('\n'));
  assert.match(u.tapProblems.join('\n'), /document 2.*zero real test points/s);
});

test('MT-05 second document declares an unsupported TAP version fails closed', () => {
  const badWeb = WEB_RAW.replace('TAP version 13', 'TAP version 99');
  const u = parseTap(CORE_RAW + badWeb, idRe);
  assert.ok(u.tapProblems.length > 0, u.tapProblems.join('\n'));
  assert.match(u.tapProblems.join('\n'), /document 2.*TAP version 99 is not supported/s);
});

test('MT-06 second document\'s own plan sits mid-stream (points before and after) fails closed', () => {
  // reorder web's own plan line to land between its two points — corrupt only within doc 2
  const badWeb = WEB_RAW.replace(/^1\.\.2\n/m, '');
  const lines = badWeb.split('\n');
  const okIdx = lines.findIndex((l) => l.startsWith('ok 1 -'));
  lines.splice(okIdx + 1, 0, '1..2');
  const u = parseTap(CORE_RAW + lines.join('\n'), idRe);
  assert.ok(u.tapProblems.length > 0, u.tapProblems.join('\n'));
  assert.match(u.tapProblems.join('\n'), /document 2.*mid-stream/s);
});

test('MT-07 a real failure inside the second document still fails closed (not an infra error, a red)', () => {
  const failingWeb = WEB_RAW.replace('ok 1 - src/components/tags/SelectedTagsButton.test.tsx',
    'not ok 1 - src/components/tags/SelectedTagsButton.test.tsx');
  const u = parseTap(CORE_RAW + failingWeb, idRe);
  assert.deepStrictEqual(u.tapProblems, []);           // structurally trustworthy — this is a real red, not corruption
  assert.strictEqual(u.unattributedFailures.length, 1); // the title carries no scenario ID, so it is unattributed
  assert.match(u.unattributedFailures[0], /not ok 1/);
});

test('MT-08 a fake TAP boundary hidden inside a YAML diagnostic block between two real documents is inert', () => {
  const fakeYaml = '---\nnote: |\n  TAP version 99\n  1..9\n  ok 5 - not a real point\n...\n';
  const u = parseTap(CORE_RAW + fakeYaml + WEB_RAW, idRe);
  assert.deepStrictEqual(u.tapProblems, []);
  assert.strictEqual(u.executedPoints, 4);             // the embedded fake lines never became tokens
  assert.deepStrictEqual(u.plans, [2, 2]);              // still exactly two real documents, not three
});

test('MT-09 a genuinely corrupted single stream (duplicate leading version headers) is NOT reinterpreted as two documents', () => {
  // pre-existing single-stream regression (SR-42 dup case): two version lines with no
  // completed document between them must still be ONE malformed stream, never a split.
  const u = parseTap('TAP version 13\nTAP version 13\nok 1 - XX-01 a\n1..1\n', idRe);
  assert.match(u.tapProblems.join('\n'), /multiple TAP version lines/);
});

test('MT-10 a truncated FIRST document cannot be laundered by appending a real-looking second one', () => {
  // first doc promises 3, delivers 2, THEN a structurally real second doc starts — the
  // first document never reached self-consistency, so this stays ONE corrupted stream.
  const stream = 'TAP version 13\n1..3\nok 1 - a\nok 2 - b\n' + WEB_RAW;
  const u = parseTap(stream, idRe);
  assert.ok(u.tapProblems.length > 0, u.tapProblems.join('\n'));
});

test('MT-11 pre-existing single-TAP behavior is unchanged: masked multi-plan totals still fail closed', () => {
  // SR-28 fixture verbatim, no version lines at all — must still be treated as ONE stream.
  const u = parseTap('1..2\nok 1 - a\n1..1\nok 1 - b\nok 2 - c\n', idRe);
  assert.match(u.tapProblems.join('\n'), /multiple TAP plans/);
});

// ---- P1 fix (round-1 reviewer finding): trailing-plan documents ------------------------
// splitTapDocuments previously only recognized a document as complete when its plan led its
// points (plan.total already met by that point). node's own `--test-reporter=tap` reporter
// emits the plan AFTER the points (trailing-plan) — a real, common shape, not a hypothetical.

test('MT-12 two legal trailing-plan documents (node\'s own shape) split and parse as trustworthy', () => {
  const stream = trailingPlanDoc('AA-01', 'first') + trailingPlanDoc('BB-01', 'second');
  const u = parseTap(stream, idRe);
  assert.deepStrictEqual(u.tapProblems, []);
  assert.deepStrictEqual(u.plans, [1, 1]);
  assert.strictEqual(u.points, 2);
  assert.strictEqual(u.executedPoints, 2);
});

test('MT-13 a corrupted trailing-plan first document (declared count wrong) cannot be laundered by a real second one', () => {
  // first doc's trailing plan claims 2 points but only delivers 1 — never reaches
  // completeness, so the next document's version line stays folded into the SAME stream.
  const badFirst = 'TAP version 13\nok 1 - AA-01 first\n1..2\n';
  const u = parseTap(badFirst + trailingPlanDoc('BB-01', 'second'), idRe);
  assert.ok(u.tapProblems.length > 0, u.tapProblems.join('\n'));
});

test('MT-14 a plan-less document with a real point still splits cleanly at the next version line', () => {
  // supported per P1's fix #1: no plan at all, but a real point already seen, is a legal
  // completed document (SR-30's plan-less-is-legal rule) — and does not stop the split.
  const stream = 'TAP version 13\nok 1 - AA-01 first\n' + trailingPlanDoc('BB-01', 'second');
  const u = parseTap(stream, idRe);
  assert.deepStrictEqual(u.tapProblems, []);
  assert.deepStrictEqual(u.plans, [1]);          // only the second document declares a plan
  assert.strictEqual(u.points, 2);
});

test('MT-15 end-to-end: two REAL sequential `node --test --test-reporter=tap` runs, concatenated as-is', () => {
  const a = path.join(FIXDIR, 'node-tap-a', 'a.test.js');
  const b = path.join(FIXDIR, 'node-tap-b', 'b.test.js');
  // NODE_TEST_CONTEXT is set on THIS process by the outer `node --test` run; inherited by a
  // spawned child, node's own test runner detects the "recursive" call and silently skips it
  // (produces empty output) — strip it so the child genuinely runs its own real TAP stream.
  const childEnv = { ...process.env };
  delete childEnv.NODE_TEST_CONTEXT;
  const ra = spawnSync(process.execPath, ['--test', '--test-reporter=tap', a], { encoding: 'utf8', env: childEnv });
  const rb = spawnSync(process.execPath, ['--test', '--test-reporter=tap', b], { encoding: 'utf8', env: childEnv });
  assert.strictEqual(ra.status, 0, ra.stdout + ra.stderr);
  assert.strictEqual(rb.status, 0, rb.stdout + rb.stderr);
  assert.match(ra.stdout, /^TAP version 13/);
  // confirm this is genuinely trailing-plan output, not a hypothetical shape
  assert.ok(ra.stdout.indexOf('1..1') > ra.stdout.indexOf('ok 1'), 'expected the plan to trail its point');

  const specFile = tmpSpec('#### Scenario: XX-01 unrelated placeholder\n');
  _setTestRunner(() => ({ out: ra.stdout + rb.stdout, stderr: '', status: 0, signal: null, error: null }));
  try {
    const run = verify({ specs: [specFile], testCmd: 'irrelevant', cwd: '.' });
    assert.deepStrictEqual(run.errors, [], JSON.stringify(run.errors));
    assert.strictEqual(run.executedPoints, 2);
  } finally {
    _setTestRunner(null);
  }
});
