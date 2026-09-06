'use strict';
// FC-01..FC-20 — the flow-state grammar is ONE explicit Markdown subset, read by ONE reader
// (lib/flow.js), fail-closed on the unreadable (6.2 batch A-2).
//
// The corpus under test/fixtures/flow-corpus/ is frozen FIRST and every case pins its outcome:
//
//   still read       annotated headings (`## Open # …`, `### Open`), `*` bullets, indented
//                    continuation lines, CRLF, case-different titles, `T1100` and `T11:00`
//                    stamps, a Chinese reason, a duplicated scalar with the SAME value
//   structural       a numbered or bare line under ## Open (never silently empty), a section
//   defect           written twice, a scalar set twice with different values, an unclosed
//                    fence / comment (must not swallow the rest of the file and read GREEN)
//   inert            fenced or commented content anywhere — never an item, a fact, or an
//                    authorization
//   range-checked    2026-02-31 still authorizes: the stamp is range-checked, not calendar-checked
//
// A structural defect blocks C9/R5 and review-ready `open` on an ACTIVE bundle and names the
// line; on an ARCHIVED bundle it is reported and never blocks. The reader never rewrites a file.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const flow = require('../lib/flow');
const status = require('../lib/status');
const rd = require('../lib/readiness');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });
const w = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); return p; };
const CORPUS = path.join(__dirname, 'fixtures', 'flow-corpus');
const fx = (name) => fs.readFileSync(path.join(CORPUS, name), 'utf8');

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n';
const ADDED = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';
const TAP2 = 'node -e "console.log(\'TAP version 13\');console.log(\'1..2\');console.log(\'ok 1 - XA-01 a\');console.log(\'ok 2 - XB-01 b\')"';

// a gate-able project whose flow-state is one corpus file, verbatim
function project(name, { archived = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-fc-'));
  w(path.join(root, 'apriori', 'specs', 'kv', 'spec.md'), STORE);
  const dir = archived
    ? path.join(root, 'apriori', 'changes', 'archive', '2026-01-01T0000-c')
    : path.join(root, 'apriori', 'changes', 'c');
  w(path.join(dir, 'specs', 'kv', 'spec.md'), ADDED);
  w(path.join(dir, 'flow-state.md'), fx(name));
  w(path.join(dir, 'review', 'code-review-v1.md'), '# review r1\n\nVERDICT: no major issues\n');
  w(path.join(dir, 'review', 'code-review-v1-raw.txt'), 'raw\n');
  return { root, dir };
}
const gate = (p, extra = []) => run(['gate', '--change', 'c', '--test-cmd', TAP2, '--no-cas', ...extra], p.root);
const line = (out, id) => (out.split('\n').find((l) => l.includes(` ${id} `)) || '').trim();
const bytesOf = (p) => fs.readFileSync(path.join(p.dir, 'flow-state.md'));

// ---------------------------------------------------------------------------
// the reader is one leaf module, and every surface goes through it
// ---------------------------------------------------------------------------

test('FC-00 lib/flow.js is a leaf (no requires) and status/readiness read through it', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'flow.js'), 'utf8');
  assert.doesNotMatch(src, /require\(/, 'the flow reader must not require anything — any sibling may import it without a cycle');
  assert.strictEqual(status.parseFlowState, flow.parseFlowState);
  assert.strictEqual(status.sectionItems, flow.sectionItems);
  assert.strictEqual(status.realityCheck, flow.realityCheck);
  for (const k of ['scan', 'parseFlowState', 'sectionItems', 'realityCheck', 'gatesEntries', 'structuralDefects'])
    assert.strictEqual(typeof flow[k], 'function', k);
});

// ---------------------------------------------------------------------------
// still read — the compatibility rows
// ---------------------------------------------------------------------------

test('FC-01..05 annotated headings, `*` bullets, continuation, CRLF and case-different titles still read', () => {
  const cases = [
    ['FC-01 annotated-heading.md', 'annotated-heading.md', ['R-1: the retry path is unproven']],
    ['FC-02 h3-annotated.md', 'h3-annotated.md', ['R-1: the retry path is unproven']],
    ['FC-03 star-continuation.md', 'star-continuation.md', ['R-1: the retry path is unproven in the target runtime']],
    ['FC-04 crlf.md', 'crlf.md', ['R-1: the retry path is unproven']],
    ['FC-05 case-title.md', 'case-title.md', ['R-1: the retry path is unproven']],
  ];
  for (const [why, name, items] of cases) {
    const text = fx(name);
    const st = flow.parseFlowState(text);
    assert.deepStrictEqual(st.openIssues, items, why);
    assert.deepStrictEqual(st.defects, [], `${why}: a legal file has no structural defect`);
    assert.deepStrictEqual(flow.structuralDefects(text), [], why);
    assert.strictEqual(st.phase, 'review', why);
  }
  // CRLF: the gates block reads too — the acceptance inside it authorizes
  assert.strictEqual(rd.ownerAccepted(fx('crlf.md'), 'R-1'), true, 'FC-04: CRLF gates entry');
  assert.deepStrictEqual(rd.evidenceFindings(fx('crlf.md')).blockers, [], 'FC-04');
  // case-different Reality Check title is read too
  assert.deepStrictEqual(flow.realityCheck(fx('case-title.md')).observed, ['the schema was read'], 'FC-05');
  // and at the CLI: a pending item under an annotated heading blocks C9, exactly as RY-30 pins
  for (const name of ['annotated-heading.md', 'h3-annotated.md', 'star-continuation.md']) {
    const p = project(name);
    const g = gate(p);
    assert.strictEqual(g.status, 1, `${name}: ${g.stdout}`);
    assert.match(line(g.stdout, 'C9'), /open item R-1 is pending/, name);
  }
});

test('FC-06/07/19 compact and colon stamps, a Chinese reason and a 31st of February still authorize', () => {
  for (const [why, name] of [['FC-06 T1100', 'stamp-compact.md'], ['FC-07 Chinese reason', 'stamp-chinese.md'], ['FC-19 2026-02-31 (range-checked, not calendar-checked)', 'feb-31.md']]) {
    const text = fx(name);
    assert.strictEqual(rd.ownerAccepted(text, 'R-1'), true, why);
    const e = rd.evidenceFindings(text);
    assert.deepStrictEqual(e.blockers, [], why);
    assert.deepStrictEqual(e.items.map((i) => [i.id, i.accepted]), [['R-1', true]], why);
    assert.deepStrictEqual(flow.structuralDefects(text), [], why);
    const g = gate(project(name));
    assert.strictEqual(g.status, 0, `${why}: ${g.stdout}`);
  }
});

test('FC-20 a scalar written twice with the SAME value is not a defect', () => {
  const text = fx('dup-scalar-same.md');
  assert.deepStrictEqual(flow.structuralDefects(text), []);
  assert.strictEqual(flow.parseFlowState(text).phase, 'review');
  const g = gate(project('dup-scalar-same.md'));
  assert.strictEqual(g.status, 0, g.stdout);
});

// ---------------------------------------------------------------------------
// structural defects — named by line, never silently empty
// ---------------------------------------------------------------------------

test('FC-08/09 a numbered or bare line under ## Open is a structural defect naming the line — never an empty section', () => {
  for (const [why, name] of [['FC-08 numbered list', 'numbered-list.md'], ['FC-09 bare line', 'bare-line.md']]) {
    const text = fx(name);
    const st = flow.parseFlowState(text);
    assert.strictEqual(st.defects.length, 1, `${why}: ${JSON.stringify(st.defects)}`);
    assert.match(st.defects[0], /^line 6: open section line is not a list item — write `- R-1: the retry path is unproven`$/, why);
    assert.deepStrictEqual(st.openIssues, [], `${why}: the unreadable line is not an item either`);
    const e = rd.evidenceFindings(text);
    assert.ok(e.blockers.some((b) => /flow-state structural defect: line 6: open section line is not a list item — write `- R-1: the retry path is unproven`/.test(b)), `${why}: ${e.blockers}`);
    assert.ok(e.openDefects.some((b) => /line 6: open section line is not a list item/.test(b)), `${why}: review-ready reads it`);
    // CLI: C9 blocks, review-ready `open` fails, status names it and --escalation exits 3
    const p = project(name);
    const before = bytesOf(p);
    const g = gate(p);
    assert.strictEqual(g.status, 1, `${why}: ${g.stdout}`);
    assert.match(line(g.stdout, 'C9'), /BLOCKED — .*line 6: open section line is not a list item/, why);
    const rr = gate(p, ['--review-ready']);
    assert.strictEqual(rr.status, 1, why);
    assert.match(rr.stdout, /✗ open {2}.*line 6: open section line is not a list item/, why);
    const s = run(['status', '--change', 'c'], p.root);
    assert.match(s.stdout, /BLOCKED: {6}flow-state structural defect: line 6/, why);
    assert.strictEqual(run(['status', '--change', 'c', '--escalation'], p.root).status, 3, why);
    assert.ok(before.equals(bytesOf(p)), `${why}: the reader never rewrites a bundle`);
  }
});

test('FC-10 a section written twice is a defect naming both positions; nothing under either is hidden', () => {
  const text = fx('dup-open.md');
  const st = flow.parseFlowState(text);
  assert.deepStrictEqual(st.defects, ['line 8: section `## Open` is written twice (lines 5 and 8) — one section per title']);
  assert.deepStrictEqual(st.openIssues, ['R-1: the retry path is unproven'], 'the second section\'s item is still read');
  const p = project('dup-open.md');
  const g = gate(p);
  assert.strictEqual(g.status, 1, g.stdout);
  assert.match(line(g.stdout, 'C9'), /written twice \(lines 5 and 8\)/);
  assert.match(line(g.stdout, 'C9'), /open item R-1 is pending/);
});

test('FC-11 a scalar set twice with different values is a defect naming both lines — C3 refuses, C9 refuses', () => {
  const text = fx('dup-scalar.md');
  const st = flow.parseFlowState(text);
  assert.deepStrictEqual(st.defects, ['line 4: `phase:` is set twice with different values (line 3: review, line 4: build) — one value per key']);
  assert.strictEqual(st.phase, 'review', 'the first value is what the parsed state carries');
  const p = project('dup-scalar.md');
  const g = gate(p);
  assert.strictEqual(g.status, 1, g.stdout);
  assert.match(line(g.stdout, 'C3'), /BLOCKED — flow-state: .*`phase:` is set twice/);
  assert.match(line(g.stdout, 'C9'), /BLOCKED — .*`phase:` is set twice/);
  // archive readiness R1 refuses on the same legality
  const r = rd.readinessOf({ bundleDir: p.dir, name: 'c' });
  assert.strictEqual(r.ready, false);
  assert.ok(r.blockers.some((b) => b.rule === 'R1' && /`phase:` is set twice/.test(b.detail)), JSON.stringify(r.blockers));
});

test('FC-17/18 an unclosed fence or comment is a defect and must not swallow the rest of the file into GREEN', () => {
  for (const [why, name, re] of [
    ['FC-17 unclosed fence', 'unclosed-fence.md', /^line 6: unclosed code fence — everything after it is unreadable/],
    ['FC-18 unclosed comment', 'unclosed-comment.md', /^line 6: unclosed HTML comment — everything after it is unreadable/],
  ]) {
    const text = fx(name);
    const st = flow.parseFlowState(text);
    assert.strictEqual(st.defects.length, 1, `${why}: ${JSON.stringify(st.defects)}`);
    assert.match(st.defects[0], re, why);
    const e = rd.evidenceFindings(text);
    assert.ok(e.blockers.some((b) => /flow-state structural defect: line 6: unclosed/.test(b)), `${why}: ${e.blockers}`);
    const p = project(name);
    const g = gate(p);
    assert.strictEqual(g.status, 1, `${why}: ${g.stdout}`);
    assert.match(line(g.stdout, 'C9'), /BLOCKED — .*line 6: unclosed/, why);
    assert.strictEqual(gate(p, ['--review-ready']).status, 1, why);
    const r = rd.readinessOf({ bundleDir: p.dir, name: 'c' });
    assert.strictEqual(r.ready, false, why);
  }
});

test('FC-08a a structural defect in an ARCHIVED bundle is reported, never a refusal, never migrated', () => {
  const p = project('numbered-list.md', { archived: true });
  const before = bytesOf(p);
  const g = gate(p);
  assert.strictEqual(g.status, 0, g.stdout);
  assert.match(line(g.stdout, 'C9'), /archived: .*recorded: .*line 6: open section line is not a list item/);
  const s = run(['status', '--change', 'c'], p.root);
  assert.strictEqual(s.status, 0, s.stderr);
  assert.match(s.stdout, /recorded: {5}not re-judged \(archived\) — flow-state structural defect: line 6/);
  assert.strictEqual(run(['status', '--change', 'c', '--escalation'], p.root).status, 0);
  assert.ok(before.equals(bytesOf(p)), 'frozen history is never rewritten');
});

// ---------------------------------------------------------------------------
// inert content — never an item, a fact, or an authorization
// ---------------------------------------------------------------------------

test('FC-12/13 an item inside a fence or a comment is not an item', () => {
  for (const [why, name] of [['FC-12 fenced', 'fenced-open.md'], ['FC-13 commented', 'commented-open.md']]) {
    const text = fx(name);
    const st = flow.parseFlowState(text);
    assert.deepStrictEqual(st.openIssues, [], why);
    assert.deepStrictEqual(st.defects, [], why);
    const e = rd.evidenceFindings(text);
    assert.deepStrictEqual(e.items, [], why);
    assert.deepStrictEqual(e.blockers, [], why);
    const g = gate(project(name));
    assert.strictEqual(g.status, 0, `${why}: ${g.stdout}`);
    assert.match(line(g.stdout, 'C9'), /no open items/, why);
  }
});

test('FC-14/15 an acceptance inside a fence or a comment authorizes nothing', () => {
  for (const [why, name] of [['FC-14 fenced gates', 'fenced-gates.md'], ['FC-15 commented gates', 'commented-gates.md']]) {
    const text = fx(name);
    assert.strictEqual(rd.ownerAccepted(text, 'R-1'), false, why);
    assert.deepStrictEqual(flow.gatesEntries(text).map((e) => e.payload), [null], `${why}: only the note survives`);
    const e = rd.evidenceFindings(text);
    assert.deepStrictEqual(e.items.map((i) => [i.id, i.accepted]), [['R-1', false]], why);
    assert.ok(e.blockers.some((b) => /open item R-1 is pending/.test(b)), why);
    const g = gate(project(name));
    assert.strictEqual(g.status, 1, `${why}: ${g.stdout}`);
  }
});

test('FC-16 an assumption inside a fence is not a fact', () => {
  const text = fx('fenced-reality.md');
  const rc = flow.realityCheck(text);
  assert.deepStrictEqual(rc.assumption, []);
  assert.deepStrictEqual(rc.observed, ['the schema was read']);
  assert.deepStrictEqual(rd.evidenceFindings(text).blockers, []);
  const g = gate(project('fenced-reality.md'));
  assert.strictEqual(g.status, 0, g.stdout);
});

// ---------------------------------------------------------------------------
// the grammar itself, at the unit
// ---------------------------------------------------------------------------

test('FC-21 the subset: list items, indented continuation, defects for the rest; Next stays lenient', () => {
  // indented continuation joins; an unindented follow-on line is a defect (it could be a second item the reader would otherwise merge)
  const st = flow.parseFlowState('## Open\n- R-1: first\n  more of the first\n- R-2: second\n\n## Next\n- a\nprose is fine here\n- b\n');
  assert.deepStrictEqual(st.openIssues, ['R-1: first more of the first', 'R-2: second']);
  assert.deepStrictEqual(st.next, ['a', 'b']);
  assert.deepStrictEqual(st.defects, []);
  const bad = flow.parseFlowState('## Open\n- R-1: first\nR-2: second\n');
  assert.deepStrictEqual(bad.defects, ['line 3: open section line is not a list item — write `- R-2: second`']);
  assert.deepStrictEqual(bad.openIssues, ['R-1: first']);
  // the Reality Check is judged the same way
  const rc = flow.parseFlowState('## Reality Check\n1. observed: x\n');
  assert.deepStrictEqual(rc.defects, ['line 2: reality check section line is not a list item — write `- observed: x`']);
  // an inline comment span is stripped and the rest of the line stays live
  assert.deepStrictEqual(flow.sectionItems('## Open\n- R-1: real <!-- not an item: - R-9: x --> item\n', 'Open'), ['R-1: real  item']);
  // `lastGate` comes from the gates block only, not from any dated list line elsewhere
  const lg = flow.parseFlowState('## Open\n- 2026-01-01T00:00 not a gate\n\ngates:\n  - 2026-08-23T00:00 note: scaffolded\n');
  assert.strictEqual(lg.lastGate, '2026-08-23T00:00 note: scaffolded');
});
