'use strict';
// modified-block-integrity — AM-43..AM-47, SR-65..SR-68: MODIFIED replacement fidelity
// becomes a mechanical, informative report (never a verdict change).
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const am = require('../lib/archive-merge');
const sr = require('../lib/spec-runner');
const FIX = path.join(__dirname, 'fixtures', 'modified-integrity');
const idOfDefault = (t) => sr.leadId(t, /[A-Z]+-\d+/);

function proj(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-mbi-'));
  for (const [rel, c] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), c);
  }
  return root;
}
const FLOW = (n) => `change: ${n}\ntier: medium\ntrack: harden\ntrack-rationale: r\nlineage: main\ncurrent-step: STEP5\nround: 1\nnext-action: x\ngates:\n  - 2026-08-13T00:00 note: n\n`;
function tap(lines, exit = 0) {
  const body = lines.map((l) => `console.log(${JSON.stringify(l)})`).join(';');
  return `node -e "${body.replace(/"/g, '\\"')};process.exit(${exit})"`;
}
const run = (root, args) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd: root });

const blk = (name, body) => `### Requirement: ${name}\n${body}`;

test('AM-43 the cardinality truth table classifies every occurrence', () => {
  const oldB = blk('R', 'prose\n\n#### Scenario: KV-01 one\n- a\n\n#### Scenario: KV-02 two\n- b\n\n#### Scenario: KV-03 three\n- c\n');
  const newB = blk('R', 'prose\n\n#### Scenario: KV-01 one\n- a\n\n#### Scenario: KV-03 three CHANGED\n- c\n\n#### Scenario: KV-04 four\n- d\n');
  const r = am.compareModifiedBlock(oldB, newB, idOfDefault);
  assert.deepStrictEqual(r.retained, [{ id: 'KV-01', title: 'KV-01 one' }]);
  assert.deepStrictEqual(r.titleChanged, [{ id: 'KV-03', oldTitle: 'KV-03 three', newTitle: 'KV-03 three CHANGED' }]);
  assert.deepStrictEqual(r.dropped, [{ id: 'KV-02', title: 'KV-02 two' }]);
  assert.deepStrictEqual(r.added, [{ id: 'KV-04', title: 'KV-04 four' }]);
  assert.deepStrictEqual(r.ambiguous, []);
  // eight-row cardinality table, table-driven (o,n) → class
  const mk = (n, times, tag = '') => Array.from({ length: times }, (_, i) => `#### Scenario: ${n} t\n- line ${i}${tag}\n`).join('\n');
  const cases = [
    [0, 1, 'added'], [1, 0, 'dropped'], [1, 1, 'retained'],
    [0, 2, 'ambiguous', 'new'], [2, 0, 'ambiguous', 'old'],
    [2, 1, 'ambiguous', 'old'], [1, 2, 'ambiguous', 'new'], [2, 2, 'ambiguous', 'both'],
  ];
  for (const [o, n, cls, side] of cases) {
    const rr = am.compareModifiedBlock(blk('R', mk('ZZ-09', o)), blk('R', mk('ZZ-09', n, ' new')), idOfDefault);
    if (cls === 'ambiguous') {
      assert.deepStrictEqual(rr.ambiguous, [{ key: 'ZZ-09', side, oldCount: o, newCount: n }], `o=${o},n=${n}`);
      assert.strictEqual(rr.retained.length + rr.titleChanged.length + rr.dropped.length + rr.added.length, 0, `o=${o},n=${n} skips other classes`);
      assert.deepStrictEqual(rr.missingLines, [], `ambiguous skips body comparison`);
    } else if (o === 0 && n === 0) { /* n/a */ }
    else assert.strictEqual(rr[cls].length, 1, `o=${o},n=${n} → ${cls}`);
  }
  // mixed ambiguous ordering: old-present keys by old order, then new-only keys by new order
  const oldM = blk('R', '#### Scenario: AA-01 a\n- x\n\n#### Scenario: AA-01 a\n- x\n\n#### Scenario: BB-01 b\n- y\n\n#### Scenario: BB-01 b\n- y\n');
  const newM = blk('R', '#### Scenario: CC-01 c\n- z\n\n#### Scenario: CC-01 c\n- z\n\n#### Scenario: DD-01 d\n- w\n\n#### Scenario: DD-01 d\n- w\n');
  const rm = am.compareModifiedBlock(oldM, newM, idOfDefault);
  assert.deepStrictEqual(rm.ambiguous.map((a) => a.key), ['AA-01', 'BB-01', 'CC-01', 'DD-01']);
});

test('AM-44 the subsequence comparison reports lost lines faithfully', () => {
  // a lost line with leading/trailing whitespace reports its RAW original text
  const rawy = am.compareModifiedBlock(blk('R', '#### Scenario: KV-01 one\n- keep\n\t- lost with tail   \n'),
    blk('R', '#### Scenario: KV-01 one\n- keep\n'), idOfDefault);
  assert.deepStrictEqual(rawy.missingLines, [{ scenario: 'KV-01', line: '\t- lost with tail   ' }]);
  const oldB = blk('R', 'the SHALL sentence\n\n#### Scenario: KV-01 one\n- WHEN w\n- THEN t\n- AND a1\n- AND a2\n- dup\n- dup\n- first\n- second\n');
  const newB = blk('R', '\n#### Scenario: KV-01 one\n- WHEN w\n- THEN t\n   - AND a1   \n- dup\n- second\n- first\n');
  const r = am.compareModifiedBlock(oldB, newB, idOfDefault);
  const miss = r.missingLines;
  assert.deepStrictEqual(miss, [
    { scenario: null, line: 'the SHALL sentence' },              // prose loss
    { scenario: 'KV-01', line: '- AND a2' },                     // dropped AND
    { scenario: 'KV-01', line: '- dup' },                        // under-repeated (2→1)
    { scenario: 'KV-01', line: '- second' },                     // reordered out (in-order match consumed 'second' late? hand-check below)
  ].filter((x, i) => i !== 3).concat([{ scenario: 'KV-01', line: '- first' }]).slice(0, 4).length ? miss : miss);
  // precise hand-derivation: O = [WHEN, THEN, AND a1, AND a2, dup, dup, first, second]
  // N = [WHEN, THEN, AND a1, dup, second, first] (normalized) — in-order greedy:
  // WHEN✓ THEN✓ ANDa1✓(whitespace-normalized) ANDa2✗ dup✓ dup✗ first✓(matches last N 'first') second✗
  assert.deepStrictEqual(miss, [
    { scenario: null, line: 'the SHALL sentence' },
    { scenario: 'KV-01', line: '- AND a2' },
    { scenario: 'KV-01', line: '- dup' },
    { scenario: 'KV-01', line: '- second' },
  ]);
});

test('AM-45 structure boundaries follow state A exactly', () => {
  // rename-then-modify with verbatim content: zero missingLines (heading never compared)
  const oldA = blk('A', 'prose line\n\n#### Scenario: KV-01 one\n- a\n');
  const newG = blk('G', 'prose line\n\n#### Scenario: KV-01 one\n- a\n');
  assert.deepStrictEqual(am.compareModifiedBlock(oldA, newG, idOfDefault).missingLines, []);
  // a CLOSED fence's fake heading does not split; its lines are body-compared
  const oldF = blk('R', '#### Scenario: KV-01 one\n- a\n```\n#### Scenario: FAKE-01 x\nfence line\n```\n- tail\n');
  const rf = am.compareModifiedBlock(oldF, blk('R', '#### Scenario: KV-01 one\n- a\n```\n#### Scenario: FAKE-01 x\n```\n- tail\n'), idOfDefault);
  assert.deepStrictEqual(rf.retained.map((x) => x.id), ['KV-01']);
  assert.deepStrictEqual(rf.missingLines, [{ scenario: 'KV-01', line: 'fence line' }]);
  // an UNCLOSED opener is ordinary text; the later heading still splits
  const oldU = blk('R', '#### Scenario: KV-01 one\n- a\n```\n#### Scenario: KV-02 two\n- b\n');
  const ru = am.compareModifiedBlock(oldU, oldU, ' '.length ? idOfDefault : idOfDefault);
  // identical text → fast path, but structure claim proven via a dropped variant:
  const ru2 = am.compareModifiedBlock(oldU, blk('R', '#### Scenario: KV-01 one\n- a\n```\n'), idOfDefault);
  assert.deepStrictEqual(ru2.dropped, [{ id: 'KV-02', title: 'KV-02 two' }], 'unclosed fence does not swallow the later heading');
  // an INLINE closed fence sharing the heading's raw line: stripFences exposes the heading (IMPL-4)
  const oldI = blk('R', '```x```#### Scenario: KV-01 one\n- body\n');
  const ri = am.compareModifiedBlock(oldI, blk('R', 'nothing here\n'), idOfDefault);
  assert.deepStrictEqual(ri.dropped, [{ id: 'KV-01', title: 'KV-01 one' }], 'inline-fence heading is valid, state-A way');
  // \s+ crosses newlines in state A: split headings are valid delimiters there and here
  const split1 = blk('R', '####\nScenario: KV-01 split-a\n- body\n');
  const rs1 = am.compareModifiedBlock(split1, blk('R', 'nothing\n'), idOfDefault);
  assert.deepStrictEqual(rs1.dropped, [{ id: 'KV-01', title: 'KV-01 split-a' }]);
  const split2 = blk('R', '#### Scenario:\nKV-02 split-b\n- body\n');
  const rs2 = am.compareModifiedBlock(split2, blk('R', 'nothing\n'), idOfDefault);
  assert.deepStrictEqual(rs2.dropped, [{ id: 'KV-02', title: 'KV-02 split-b' }]);
  // fenced content INSIDE a cross-line delimiter span still participates (IMPL-6)
  const oldX = blk('R', '#### ```\nfenced-old\n``` Scenario: KV-01 one\n- body\n');
  const newX = blk('R', '#### ```\nfenced-new\n``` Scenario: KV-01 one\n- body\n');
  const rx = am.compareModifiedBlock(oldX, newX, idOfDefault);
  assert.deepStrictEqual(rx.retained.map((x) => x.id), ['KV-01']);
  assert.deepStrictEqual(rx.missingLines, [{ scenario: 'KV-01', line: 'fenced-old' }]);
  // multi-space heading is a valid delimiter
  const oldS = blk('R', '####   Scenario:   KV-07 spaced\n- s\n');
  const rs = am.compareModifiedBlock(oldS, blk('R', 'nothing\n'), idOfDefault);
  assert.deepStrictEqual(rs.dropped, [{ id: 'KV-07', title: 'KV-07 spaced' }]);
});

test('AM-43 the trim-equal fast path yields an all-empty entry without id extraction', () => {
  const b = blk('R', '#### Scenario: KV-01 one\n- a\n');
  let called = 0;
  const r = am.compareModifiedBlock(b, b + '\n\n', () => { called++; return null; });
  assert.deepStrictEqual(r, { retained: [], titleChanged: [], dropped: [], added: [], ambiguous: [], missingLines: [] });
  assert.strictEqual(called, 0, 'no id extraction on the fast path');
  assert.strictEqual(am.formatIntegrityHuman([{ file: 'm/spec.md', name: 'R', ...r }]), '', 'empty result renders nothing');
});

test('AM-44 the human formatter renders safely and truncates', () => {
  const evil = 'X'.repeat(150) + '\x1b[31mred\x07';
  const entries = [{ file: 'm/spec.md', name: 'R', retained: [], titleChanged: [],
    dropped: [{ id: 'KV-02', title: 'KV-02 ' + evil }], added: [], ambiguous: [],
    missingLines: [{ scenario: 'KV-01', line: '- ' + evil }] }];
  const out = am.formatIntegrityHuman(entries);
  assert.match(out, /— MODIFIED INTEGRITY —/);
  assert.doesNotMatch(out, /[\x00-\x08\x0b-\x1f\x7f]/, 'C0/DEL replaced');
  for (const line of out.split('\n')) assert.ok(line.length <= 120, `state-A whole-line cap: ${line.length}`);
  // long file+name on one line, long oldTitle+newTitle on one line — both capped
  const longs = am.formatIntegrityHuman([{ file: 'f'.repeat(130) + '.md', name: 'N'.repeat(130),
    retained: [], titleChanged: [{ id: 'KV-01', oldTitle: 'KV-01 ' + 'o'.repeat(130), newTitle: 'KV-01 ' + 'n'.repeat(130) }],
    dropped: [], added: [], ambiguous: [], missingLines: [{ scenario: 'S'.repeat(130), line: 'L'.repeat(130) }] }]);
  for (const line of longs.split('\n')) assert.ok(line.length <= 120, `assembled cap: ${line.length}`);
  assert.match(out, /…/);
  assert.match(out, /!/);
});

test('SR-68 the frozen live-specimen fixture reports exactly as hand-derived', () => {
  const oldB = fs.readFileSync(path.join(FIX, 'old-block.md'), 'utf8');
  const newB = fs.readFileSync(path.join(FIX, 'new-block.md'), 'utf8');
  const r = am.compareModifiedBlock(oldB, newB, idOfDefault);
  assert.deepStrictEqual(r.retained.map((x) => x.id),
    ['SR-16', 'SR-17', 'SR-18', 'SR-19', 'SR-20', 'SR-21', 'SR-22', 'SR-23', 'SR-24']);
  assert.deepStrictEqual(r.titleChanged, []);
  assert.deepStrictEqual(r.dropped, []);
  assert.deepStrictEqual(r.added, []);
  assert.deepStrictEqual(r.ambiguous, []);
  assert.deepStrictEqual(r.missingLines, [
    { scenario: 'SR-16', line: "- THEN the delta's scenarios are demanded alongside every existing store scenario, with no duplicate-ID error from the overlay (genuinely duplicate IDs in the projection remain GAPS)" },
    { scenario: 'SR-18', line: '- THEN the projection deprecates the block, its scenarios are not demanded, and each lingering test is reported ORPHAN (exit 1 until the tests are deleted)' },
  ]);
});

// ---- SR: verify surface ----

const STORE_KV = '### Requirement: R-K\nkeep me\n\n#### Scenario: KV-01 one\n- WHEN w\n- THEN t\n- AND a\n\n#### Scenario: KV-02 two\n- b\n';
function mkChange(delta, extra = {}) {
  return proj({
    ...require('./helpers/ready-bundle').readyFiles('c'),
    'apriori/specs/m/spec.md': STORE_KV,
        'apriori/changes/c/specs/m/spec.md': delta,
    ...extra,
  });
}
const MOD_DROP = '## MODIFIED Requirements\n\n### Requirement: R-K\nkeep me\n\n#### Scenario: KV-01 one\n- WHEN w\n- THEN t\n';

test('SR-65 the report rides the run without touching the verdict', () => {
  const root = mkChange(MOD_DROP);
  const ok = run(root, ['verify', '--change', 'c', '--test-cmd', tap(['ok 1 - KV-01 one']), '--json']);
  assert.strictEqual(ok.status, 0, ok.stdout + ok.stderr);
  const j = JSON.parse(ok.stdout);
  assert.deepStrictEqual(j.modifiedIntegrity, [{
    file: 'm/spec.md', name: 'R-K',
    retained: [{ id: 'KV-01', title: 'KV-01 one' }],
    titleChanged: [],
    dropped: [{ id: 'KV-02', title: 'KV-02 two' }],
    added: [], ambiguous: [],
    missingLines: [{ scenario: 'KV-01', line: '- AND a' }],
  }]);
  const human = run(root, ['verify', '--change', 'c', '--test-cmd', tap(['ok 1 - KV-01 one'])]);
  assert.match(human.stdout, /— MODIFIED INTEGRITY —/);
  assert.match(human.stdout, /! .*KV-02/);
  assert.match(human.stdout, /! .*AND a/);
  const gaps = run(root, ['verify', '--change', 'c', '--test-cmd', tap([]), '--json']);
  assert.strictEqual(gaps.status, 1);
  assert.deepStrictEqual(JSON.parse(gaps.stdout).modifiedIntegrity[0].dropped, [{ id: 'KV-02', title: 'KV-02 two' }]);
});

test('SR-66 presence follows the outcome class', () => {
  const added = mkChange('## ADDED Requirements\n\n### Requirement: R-N\n\n#### Scenario: KV-09 nine\n- t\n');
  const ja = JSON.parse(run(added, ['verify', '--change', 'c', '--test-cmd', tap(['ok 1 - KV-09 nine', 'ok 2 - KV-01 one', 'ok 3 - KV-02 two']), '--json']).stdout);
  assert.deepStrictEqual(ja.modifiedIntegrity, [], 'ADDED-only → empty array, field present');
  // idempotent MODIFIED (trim-equal): empty-diff entry present
  const idem = mkChange('## MODIFIED Requirements\n\n' + STORE_KV.trim() + '\n');
  const ji = JSON.parse(run(idem, ['verify', '--change', 'c', '--test-cmd', tap(['ok 1 - KV-01 one', 'ok 2 - KV-02 two']), '--json']).stdout);
  assert.deepStrictEqual(ji.modifiedIntegrity, [{ file: 'm/spec.md', name: 'R-K', retained: [], titleChanged: [], dropped: [], added: [], ambiguous: [], missingLines: [] }]);
  // ERROR classes: absent
  const err1 = mkChange(MOD_DROP, { 'apriori/process-config.md': '| id-pattern | ( |\n' });
  assert.ok(!('modifiedIntegrity' in JSON.parse(run(err1, ['verify', '--change', 'c', '--test-cmd', tap(['1..0']), '--json']).stdout)));
  const err2 = mkChange(MOD_DROP);
  const je2 = JSON.parse(run(err2, ['verify', '--change', 'c', '--test-cmd', `node -e "console.log('ok 1 - KV-01 one');process.exit(7)"`, '--json']).stdout);
  assert.ok(!('modifiedIntegrity' in je2));
  // --specs: absent
  const js = JSON.parse(run(err2, ['verify', '--specs', 'apriori/specs', '--test-cmd', tap(['ok 1 - KV-01 one', 'ok 2 - KV-02 two']), '--json']).stdout);
  assert.ok(!('modifiedIntegrity' in js));
});

test('SR-67 the old-block titles join the one batch and bind nothing', () => {
  const root = mkChange(MOD_DROP, { 'apriori/process-config.md': '| id-pattern | [A-Z]+-\\d+ |\n' });
  const payloads = [];
  sr._setChildRunner((payload) => {
    const { texts } = JSON.parse(payload);
    payloads.push(texts);
    return { status: 0, signal: null, stdout: JSON.stringify({ ids: texts.map((t) => sr.leadId(t, /[A-Z]+-\d+/)) }), error: null };
  });
  let r;
  try { r = sr.verify({ change: 'c', cwd: root, testCmd: tap(['ok 1 - KV-01 one']) }); }
  finally { sr._setChildRunner(null); }
  assert.strictEqual(r.errors.length, 0, JSON.stringify(r.errors));
  assert.strictEqual(payloads.length, 2, 'still exactly two batches');
  assert.ok(payloads[0].some((t) => t.startsWith('KV-02')), 'old-block titles in the first payload');
  assert.deepStrictEqual(r.changeScope.scenarioIds, ['KV-01'], 'old titles bind nothing');
  assert.deepStrictEqual(r.storeReport.unbound, [], 'KV-02 not demanded anywhere');
  assert.strictEqual(r.scenarioCount, 1, 'scenario count untouched by integrity titles');
  assert.deepStrictEqual(r.modifiedIntegrity[0].dropped, [{ id: 'KV-02', title: 'KV-02 two' }]);
});

// ---- AM: archive surface ----

function archiveProj(delta, extra = {}) {
  return proj({
    ...require('./helpers/ready-bundle').readyFiles('c'),
    'apriori/specs/m/spec.md': STORE_KV,
    'apriori/changes/c/specs/m/spec.md': delta,
    ...extra,
  });
}
function stamped(delta, storeText = STORE_KV) {
  const fp = am.fingerprint(storeText);
  return `<!-- apriori-base: ${fp} -->\n\n` + delta;
}

test('AM-46 archive prints the integrity section without changing its semantics', () => {
  const root = archiveProj(stamped(MOD_DROP));
  const dry = run(root, ['archive', '--change', 'c']);
  assert.strictEqual(dry.status, 0, dry.stdout + dry.stderr);
  assert.match(dry.stdout, /— MODIFIED INTEGRITY —/);
  assert.match(dry.stdout, /! .*KV-02/);
  const iIdx = dry.stdout.indexOf('MODIFIED INTEGRITY');
  const rIdx = dry.stdout.indexOf('RESULT:');
  assert.ok(iIdx < rIdx, 'report before the result line');
  assert.match(dry.stdout, /RESULT: MERGED \(dry-run; 1 module\(s\)\) — pass --write to apply/);
  // --write: report appears before write-result lines; bytes identical to a reportless write
  const rootW = archiveProj(stamped(MOD_DROP));
  const w = run(rootW, ['archive', '--change', 'c', '--write']);
  assert.strictEqual(w.status, 0, w.stdout + w.stderr);
  assert.match(w.stdout, /— MODIFIED INTEGRITY —/);
  const written = fs.readFileSync(path.join(rootW, 'apriori/specs/m/spec.md'), 'utf8');
  assert.ok(written.includes('#### Scenario: KV-01 one') && !written.includes('KV-02'), 'write semantics unchanged');
  // preflight failure classes print NO section
  const bad = archiveProj('## MODIFIED Requirements\n\n### Requirement: R-K\n\n#### Scenario: KV-01 one\n- t\n'); // unstamped mutation → CAS denial
  const rb = run(bad, ['archive', '--change', 'c']);
  assert.strictEqual(rb.status, 1);
  assert.doesNotMatch(rb.stdout, /MODIFIED INTEGRITY/);
  const tmpBlock = archiveProj(stamped(MOD_DROP));
  fs.writeFileSync(path.join(tmpBlock, 'apriori/specs/m/spec.md.tmp-archive'), 'x');
  const rt = run(tmpBlock, ['archive', '--change', 'c', '--write']);
  assert.strictEqual(rt.status, 1);
  assert.doesNotMatch(rt.stdout, /MODIFIED INTEGRITY/, 'pre-existing temp: no section');
});

test('AM-47 the archive id-pattern channel is resolved, terminable and degradable', () => {
  // A custom config pattern over IDs the BUILT-IN DEFAULT deliberately does not recognise (a
  // lowercase-led shape). The discriminator has to be a report line that PAIRS BY ID: a dropped
  // line prints the scenario's heading text either way, so it stays green even if the row were
  // ignored. `titleChanged` cannot be produced without recognising the ID on both sides.
  const store = '### Requirement: R-S\n\n#### Scenario: ac-08a old title\n- a\n';
  const delta = '## MODIFIED Requirements\n\n### Requirement: R-S\n\n#### Scenario: ac-08a new title\n- a\n';
  const files = {
    ...require('./helpers/ready-bundle').readyFiles('c'),
    'apriori/specs/m/spec.md': store,
        'apriori/changes/c/specs/m/spec.md': `<!-- apriori-base: ${am.fingerprint(store)} -->\n\n` + delta,
  };
  const root = proj({ ...files, 'apriori/process-config.md': '| id-pattern | [a-z]+-\\d+[a-z]* |\n' });
  const r = run(root, ['archive', '--change', 'c']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /titleChanged: ac-08a old title -> ac-08a new title/, r.stdout);
  // the same tree WITHOUT the row: the default cannot see those IDs, so nothing pairs
  const noRow = proj(files);
  const rn = run(noRow, ['archive', '--change', 'c']);
  assert.doesNotMatch(rn.stdout, /titleChanged/, 'the row is what made the pairing possible');
  assert.match(rn.stdout, /! dropped: ac-08a old title/, rn.stdout);
  // default positive path
  const root2 = archiveProj(stamped(MOD_DROP));
  assert.match(run(root2, ['archive', '--change', 'c']).stdout, /! .*KV-02/);
  // invalid config row: warning + skip, archive unchanged
  const root3 = archiveProj(stamped(MOD_DROP), { 'apriori/process-config.md': '| id-pattern | ( |\n' });
  const r3 = run(root3, ['archive', '--change', 'c']);
  assert.strictEqual(r3.status, 0, 'archive result unchanged');
  assert.doesNotMatch(r3.stdout, /MODIFIED INTEGRITY/);
  const wline = r3.stderr.split('\n').find((l) => l.includes('modified-integrity'));
  assert.ok(wline && wline.startsWith('warning: modified-integrity '), wline);
  assert.ok(wline.length <= 200);
  assert.doesNotMatch(wline, /[\x00-\x1f\x7f]/);
  assert.match(r3.stdout, /RESULT: MERGED/);
  // inline-fence heading pairs by ID through the archive matcher channel too (IMPL-5)
  const storeI = '### Requirement: R-I\n```x```#### Scenario: KV-01 old title\n- a\n';
  const rootI = proj({
    ...require('./helpers/ready-bundle').readyFiles('c'),
    'apriori/specs/m/spec.md': storeI,
        'apriori/changes/c/specs/m/spec.md': `<!-- apriori-base: ${am.fingerprint(storeI)} -->\n\n` +
      '## MODIFIED Requirements\n\n### Requirement: R-I\n```x```#### Scenario: KV-01 new title\n- a\n',
  });
  const factory = () => ({ batch: (ts) => ({ ids: ts.map((t) => sr.leadId(t, /[A-Z]+-\d+/)) }) });
  const resI = am.archiveChange({ change: 'c', cwd: rootI, write: false, idMatcherFactory: factory });
  assert.strictEqual(resI.code, 0, resI.err.join('\n'));
  const outI = resI.out.join('\n');
  assert.match(outI, /titleChanged: .*old title.*->.*new title/, 'inline-fence titles pair by ID: ' + outI);
  // programmatic call without a factory degrades the same way (module-level)
  const root4 = archiveProj(stamped(MOD_DROP));
  const res = am.archiveChange({ change: 'c', cwd: root4, write: false });
  assert.strictEqual(res.code, 0);
  assert.ok(!res.out.join('\n').includes('MODIFIED INTEGRITY'), 'missing factory = skip');
  assert.ok(res.err.some((l) => l.includes('modified-integrity')), 'missing factory warns');
});

test('AM-45 buildProjection captures old blocks at the right points', () => {
  // rename-then-modify: oldBlock is the COMPLETE pre-rename block
  const store = '### Requirement: A\nprose\n\n#### Scenario: KV-01 one\n- a\n';
  const delta = '## RENAMED Requirements\n\n- A -> G\n\n## MODIFIED Requirements\n\n### Requirement: G\nprose\n\n#### Scenario: KV-01 one\n- a\n- b\n';
  const root = proj({
    ...require('./helpers/ready-bundle').readyFiles('c'),
    'apriori/specs/m/spec.md': store,
    'apriori/changes/c/specs/m/spec.md': `<!-- apriori-base: ${am.fingerprint(store)} -->\n\n` + delta,
  });
  const d = am.discoverDeltas(path.join(root, 'apriori', 'changes'), 'c');
  const p = am.buildProjection(path.join(root, 'apriori', 'specs'), d.files, 'c');
  const pairs = p.modifiedBlocks.get('m/spec.md');
  assert.strictEqual(pairs.length, 1);
  assert.strictEqual(pairs[0].name, 'G');
  assert.match(pairs[0].oldBlock, /^### Requirement: A\nprose/, 'pre-rename baseline');
  assert.match(pairs[0].newBlock, /^### Requirement: G/);
  // repaired-rerun path still contributes its pair
  const storeApplied = '### Requirement: R-K\nkeep me\n\n#### Scenario: KV-01 one\n- WHEN w\n- THEN t\n';
  const root2 = proj({
    ...require('./helpers/ready-bundle').readyFiles('c'),
    'apriori/specs/m/spec.md': storeApplied,
    'apriori/changes/c/specs/m/spec.md': `<!-- apriori-base: ${am.fingerprint(STORE_KV)} -->\n\n` +
      '## MODIFIED Requirements\n\n### Requirement: R-K\nkeep me\n\n#### Scenario: KV-01 one\n- WHEN w\n- THEN t\n',
  });
  const d2 = am.discoverDeltas(path.join(root2, 'apriori', 'changes'), 'c');
  const p2 = am.buildProjection(path.join(root2, 'apriori', 'specs'), d2.files, 'c');
  assert.ok(p2.repaired.includes('m/spec.md'), 'rerun repair path taken');
  const pairs2 = p2.modifiedBlocks.get('m/spec.md');
  assert.strictEqual(pairs2.length, 1, 'repaired module still contributes its pair');
  assert.strictEqual(pairs2[0].oldBlock.trim(), pairs2[0].newBlock.trim());
  // repaired RENAME-then-modify rerun: pre-rename source gone — still one equal-text pair
  const storeDone = '### Requirement: G\nprose\n\n#### Scenario: KV-01 one\n- a\n- b\n';
  const storeBefore = '### Requirement: A\nprose\n\n#### Scenario: KV-01 one\n- a\n';
  const root3 = proj({
    ...require('./helpers/ready-bundle').readyFiles('c'),
    'apriori/specs/m/spec.md': storeDone,
    'apriori/changes/c/specs/m/spec.md': `<!-- apriori-base: ${am.fingerprint(storeBefore)} -->\n\n` +
      '## RENAMED Requirements\n\n- A -> G\n\n## MODIFIED Requirements\n\n### Requirement: G\nprose\n\n#### Scenario: KV-01 one\n- a\n- b\n',
  });
  const d3 = am.discoverDeltas(path.join(root3, 'apriori', 'changes'), 'c');
  const p3 = am.buildProjection(path.join(root3, 'apriori', 'specs'), d3.files, 'c');
  assert.ok(p3.repaired.includes('m/spec.md'), 'rerun repair path taken');
  const pairs3 = p3.modifiedBlocks.get('m/spec.md');
  assert.strictEqual(pairs3.length, 1, 'repaired rename-then-modify still owes its pair');
  assert.strictEqual(pairs3[0].oldBlock.trim(), pairs3[0].newBlock.trim());
});
