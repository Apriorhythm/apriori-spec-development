'use strict';
// id-pattern-and-delta-notes — the built-in default recognises the ID shapes real projects use
// (SR-08/SR-13, CK-13, CF-12/CF-18), doctor stops borrowing that vocabulary for its TAP probe and
// tells you which repair it means (DR-19/DR-20), and delta gains a legal home for commentary while
// losing the silent-absorption hole (AM-71..AM-73).
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');

const { DEFAULT_ID, resolveIdPattern } = require('../lib/config');
const { leadId, collectScenarios } = require('../lib/spec-runner');
const { parseDeltaStrict, deltaOpCount } = require('../lib/archive-merge');
const doctor = require('../lib/doctor');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const OLD_ID = '[A-Z]+-\\d+';                 // the pre-change default, kept as the comparison base
const run = (root, args) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd: root });

function proj(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-idn-'));
  for (const [rel, c] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), c);
  }
  return root;
}
const specFile = (text) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-idn-s-'));
  const f = path.join(d, 'spec.md');
  fs.writeFileSync(f, text);
  return f;
};

// ---------------------------------------------------------------- the default

test('SR-08 the default recognises multi-segment and lowercase-suffixed IDs', () => {
  const re = new RegExp(DEFAULT_ID);
  for (const [title, want] of [
    ['AC-01 plain', 'AC-01'],
    ['AC-BIS-01 multi', 'AC-BIS-01'],
    ['LIFE-DWS-01 three', 'LIFE-DWS-01'],
    ['AC-30f suffixed', 'AC-30f'],
    ['GT-27 existing', 'GT-27'],
  ]) assert.strictEqual(leadId(title, re), want, title);
});

test('SR-08 compatibility holds at the leadId level, which is the only level it could', () => {
  const oldRe = new RegExp(OLD_ID), newRe = new RegExp(DEFAULT_ID);
  // A systematic sweep, not a handful of hand-picked strings: every combination of prefix length,
  // digit count, trailing context and near-miss shape, plus a run over this repo's REAL titles.
  const prefixes = ['A', 'AC', 'ABC', 'LONGPREFIX'];
  const digits = ['0', '1', '01', '999'];
  const tails = ['', ' x', ' a longer title', '\ttab', ' 01', ' -dash', ':colon', '.', '_x', 'b', 'b2', 'Z'];
  const extras = ['', '-BIS', '-BIS-X', '_u', '.d', ' '];
  let checked = 0, boundCount = 0;
  for (const p of prefixes) for (const d of digits) for (const t of tails) for (const e of extras) {
    const title = `${p}${e}-${d}${t}`;
    const o = leadId(title, oldRe);
    checked++;
    if (o === null) continue;              // the claim is only about titles the OLD pattern BOUND
    boundCount++;
    assert.strictEqual(leadId(title, newRe), o, `${JSON.stringify(title)} must bind identically`);
  }
  assert.ok(checked > 500, `the sweep is broad: ${checked}`);
  assert.ok(boundCount > 50, `and it actually exercises the guarded case: ${boundCount} bound`);
  // and over every real scenario title in this repo's own store
  const store = collectScenarios([path.join(__dirname, '..', 'apriori', 'specs')], oldRe);
  let real = 0;
  for (const id of store.byId.keys()) { assert.strictEqual(leadId(`${id} whatever`, newRe), id, id); real++; }
  assert.ok(real > 300, `over the real corpus too: ${real}`);
  // and the raw-regex comparison is deliberately NOT the oracle — here is why
  assert.strictEqual('AC-30f suffixed'.match(oldRe)[0], 'AC-30');
  assert.strictEqual('AC-30f suffixed'.match(newRe)[0], 'AC-30f');
  assert.strictEqual('AC-BIS-01 multi'.match(oldRe).index, 3);   // matches BIS-01, not from 0
  assert.strictEqual(leadId('AC-30f suffixed', oldRe), null);    // neither was ever a BINDING
  assert.strictEqual(leadId('AC-BIS-01 multi', oldRe), null);
});

test('SR-13 an ID is never truncated, and a trailing word character still rejects', () => {
  const re = new RegExp(DEFAULT_ID);
  assert.strictEqual(leadId('XX-01b something', re), 'XX-01b');   // the suffix is part of the ID
  assert.strictEqual(leadId('XX-01b2 something', re), null);      // a digit after the suffix is not
  assert.strictEqual(leadId('XX-01_x more', re), null);           // underscore is a word character
  assert.strictEqual(leadId('XX-01 something', re), 'XX-01');
});

test('SR-08 this repo\'s own store is unmoved by the widening', () => {
  const specs = [path.join(__dirname, '..', 'apriori', 'specs')];
  const a = collectScenarios(specs, new RegExp(OLD_ID));
  const b = collectScenarios(specs, new RegExp(DEFAULT_ID));
  assert.deepStrictEqual([...b.byId.keys()].sort(), [...a.byId.keys()].sort());
  assert.strictEqual(b.unidentified.length, a.unidentified.length);
  assert.strictEqual(b.duplicates.length, a.duplicates.length);
});

test('SR-08 a title with no leading ID stays unidentified, and near-misses do not bind', () => {
  const re = new RegExp(DEFAULT_ID);
  for (const t of ['no id here', '123 numeric', 'AC- dangling', 'ac-01 lowercase', 'AC_01 underscore'])
    assert.strictEqual(leadId(t, re), null, t);
});

test('SR-08 AC-30 and AC-30f are two IDs, not one truncated twice', () => {
  const f = specFile('#### Scenario: AC-30 base\n#### Scenario: AC-30f suffixed\n');
  const { byId, duplicates } = collectScenarios([f], new RegExp(DEFAULT_ID));
  assert.ok(byId.has('AC-30') && byId.has('AC-30f'));
  assert.deepStrictEqual(duplicates, []);
});

test('SR-08 newly-recognised titles that collide are reported as duplicates', () => {
  const f = specFile('#### Scenario: AC-BIS-01 one\n#### Scenario: AC-BIS-01 two\n');
  const { duplicates } = collectScenarios([f], new RegExp(DEFAULT_ID));
  assert.strictEqual(duplicates.length, 1);
  assert.strictEqual(duplicates[0].id, 'AC-BIS-01');
});

test('SR-50 a config row narrower than the default still governs', () => {
  const root = proj({
    'apriori/process-config.md': `| Field | Value |\n|---|---|\n| id-pattern | ${OLD_ID} |\n`,
    'apriori/specs/m/spec.md': '#### Scenario: AC-01 a\n#### Scenario: AC-08a b\n#### Scenario: AC-BIS-01 c\n',
  });
  const withRow = resolveIdPattern(root, null);
  assert.strictEqual(withRow.origin, 'config');
  assert.strictEqual(withRow.source, OLD_ID);
  const bare = proj({ 'apriori/specs/m/spec.md': '#### Scenario: AC-01 a\n#### Scenario: AC-08a b\n#### Scenario: AC-BIS-01 c\n' });
  const noRow = resolveIdPattern(bare, null);
  assert.strictEqual(noRow.origin, 'default');
  const specs = (r) => [path.join(r, 'apriori', 'specs')];
  assert.strictEqual(collectScenarios(specs(root), new RegExp(withRow.source)).unidentified.length, 2, 'the row makes it stricter');
  assert.strictEqual(collectScenarios(specs(bare), new RegExp(noRow.source)).unidentified.length, 0, 'the default recognises all three');
});

// ---------------------------------------------------------------- doctor

test('DR-19 D5 does not consume the project ID vocabulary', () => {
  // a tagged skip whose description uses a newly-recognised shape: under a shared vocabulary this
  // would move from `untagged` (parsed=1, ok) to a tagged skip (parsed=0, "truncated or malformed")
  const tap = "TAP version 13\n1..1\nok 1 - AC-30f pending # SKIP flaky\n";
  const r = doctor.classifyProbe({ out: tap, stderr: '', status: 0, signal: null, error: null });
  assert.strictEqual(r.status, 'ok', `D5 must not be moved by the widening: ${r.detail}`);
  // and structurally, on the WHOLE file rather than a fragile slice: doctor no longer imports the
  // project's ID constant at all, so no future edit can reintroduce the coupling by accident
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'doctor.js'), 'utf8');
  assert.ok(!/DEFAULT_ID/.test(src), 'lib/doctor.js must not mention the project ID constant anywhere');
  assert.ok(/const D5_TAP_ID = /.test(src), 'it has its own frozen classification shape');
  assert.ok(!/D5_TAP_ID/.test(String(Object.keys(require('../lib/doctor')))), 'and never exports it');
});

function drProject(cfgRows, specText) {
  return proj({
    'apriori/runbook.md': fs.readFileSync(path.join(__dirname, '..', 'RUNBOOK.md'), 'utf8'),
    'apriori/.gitignore': 'tmp/\n',
    'apriori/tmp/.keep': '',
    'apriori/specs/m/spec.md': specText,
    ...(cfgRows ? { 'apriori/process-config.md': `| Field | Value |\n|---|---|\n${cfgRows}` } : {}),
  });
}

test('DR-20 D6 tells you which repair it means', () => {
  // both classes present: an ID-shaped token the pattern rejects, and a title with no ID at all
  const root = drProject(`| id-pattern | ${OLD_ID} |\n`,
    '#### Scenario: AC-BIS-01 shaped but unmatched\n#### Scenario: LIFE-DWS-01 also shaped\n#### Scenario: no id at all\n');
  const d6 = doctor.runDoctor({ cwd: root, noRun: true }).checks.filter((c) => c.id === 'D6' && c.status === 'finding');
  assert.strictEqual(d6.length, 2, `exactly one finding per class: ${JSON.stringify(d6.map((c) => c.detail))}`);
  const mismatch = d6.find((c) => /id-pattern/.test(c.fix));
  const missing = d6.find((c) => !/id-pattern/.test(c.fix));
  assert.ok(mismatch, 'a pattern-mismatch finding whose fix names the id-pattern row');
  assert.ok(missing, 'a missing-ID finding keeping the add-an-ID fix');
  assert.match(mismatch.detail, /AC-BIS-01|LIFE-DWS-01/, 'it names its own samples');
  assert.ok(!/no id at all/.test(mismatch.detail), 'and only its own');
  assert.match(mismatch.detail, /config/, 'the origin is stated');
  assert.match(missing.fix, /leading ID/i);
});

test('DR-20 only the matching class appears when only one class exists', () => {
  const only = drProject('', '#### Scenario: no id at all\n');
  const f1 = doctor.runDoctor({ cwd: only, noRun: true }).checks.filter((c) => c.id === 'D6' && c.status === 'finding');
  assert.strictEqual(f1.length, 1);
  assert.ok(!/id-pattern/.test(f1[0].fix), 'a title with no ID never blames the pattern');
});

test('DR-20 the sample list is bounded', () => {
  const many = Array.from({ length: 6 }, (_, i) => `#### Scenario: AC-BIS-0${i} ${'x'.repeat(80)}`).join('\n') + '\n';
  const root = drProject(`| id-pattern | ${OLD_ID} |\n`, many);
  const f = doctor.runDoctor({ cwd: root, noRun: true }).checks.find((c) => c.id === 'D6' && /id-pattern/.test(c.fix || ''));
  assert.ok(f, 'the pattern-mismatch finding exists');
  const shown = f.detail.split(': ').pop().split(' · ');
  assert.strictEqual(shown.length, 3, `exactly three samples, not six: ${f.detail}`);
  // store order: the first three titles as they appear in the file, not an arbitrary subset
  assert.ok(shown[0].startsWith('AC-BIS-00') && shown[1].startsWith('AC-BIS-01') && shown[2].startsWith('AC-BIS-02'),
    `store order: ${JSON.stringify(shown)}`);
  for (const smp of shown) assert.ok(smp.length <= 40, `each sample capped at 40: ${smp.length}`);
  assert.ok(f.detail.includes(OLD_ID), 'the effective pattern source is echoed');
});

// ---------------------------------------------------------------- delta syntax

const DELTA_OK = '## ADDED Requirements\n\n### Requirement: R\n\n#### Scenario: ZZ-01 x\n- t\n';

test('AM-73 a Notes section is opaque and costs nothing', () => {
  const d = parseDeltaStrict('## Notes\n\n说明：为什么这么改\n\n' + DELTA_OK);
  assert.deepStrictEqual(d.problems, []);
  assert.strictEqual(deltaOpCount(d.delta), 1);
  assert.ok(d.delta.ADDED.has('R'));
});

test('AM-73 Notes may repeat and may sit anywhere', () => {
  const d = parseDeltaStrict('## Notes\na\n' + DELTA_OK + '\n## Notes\nb\n\n## REMOVED Requirements\n\n### Requirement: Q\n\n#### Scenario: ZZ-02 y\n- t\n\n## Notes\nc\n');
  assert.deepStrictEqual(d.problems, []);
  assert.ok(d.delta.ADDED.has('R') && d.delta.REMOVED.has('Q'));
});

test('AM-73 structure inside Notes creates nothing and complains about nothing', () => {
  const d = parseDeltaStrict('## Notes\n### Requirement: NotReal\n#### Scenario: ZZ-99 nope\n- t\n\n' + DELTA_OK);
  assert.deepStrictEqual(d.problems, []);
  assert.strictEqual(d.delta.ADDED.size, 1);
  assert.ok(!d.delta.ADDED.has('NotReal'));
});

test('AM-73 a stamp before Notes counts; one inside it does not', () => {
  const stamp = '<!-- apriori-base: sha256:' + 'a'.repeat(64) + ' -->';
  const before = parseDeltaStrict(`${stamp}\n\n## Notes\nwhy\n\n${DELTA_OK}`);
  assert.deepStrictEqual(before.problems, []);
  assert.strictEqual(before.stamp, 'sha256:' + 'a'.repeat(64));
  const inside = parseDeltaStrict(`## Notes\nwhy\n${stamp}\n\n${DELTA_OK}`);
  assert.deepStrictEqual(inside.problems, [], 'a stamp inside Notes is ignored, not reported');
  assert.strictEqual(inside.stamp, null, 'and never adopted — the delta is simply unstamped');
});

test('AM-73 Notes ends at the next fence-outside h2, all four operation kinds included', () => {
  for (const kind of ['ADDED', 'MODIFIED', 'REMOVED']) {
    const d = parseDeltaStrict(`## Notes\nwhy\n\n## ${kind} Requirements\n\n### Requirement: R\n\n#### Scenario: ZZ-01 x\n- t\n`);
    assert.deepStrictEqual(d.problems, [], kind);
    assert.strictEqual(d.delta[kind].size, 1, kind);
  }
  const rn = parseDeltaStrict('## Notes\nwhy\n\n## RENAMED Requirements\n\n- Old -> New\n');
  assert.deepStrictEqual(rn.problems, []);
  assert.deepStrictEqual(rn.delta.RENAMED, [['Old', 'New']]);
  const bad = parseDeltaStrict('## Notes\nwhy\n\n## Something Else\n\n' + DELTA_OK);
  assert.ok(bad.problems.some((p) => /unrecognized section heading/.test(p)), bad.problems.join('; '));
});

test('AM-73 an unterminated fence inside Notes keeps the rest opaque', () => {
  const d = parseDeltaStrict('## Notes\n```\n## ADDED Requirements\n\n### Requirement: R\n\n#### Scenario: ZZ-01 x\n- t\n');
  assert.deepStrictEqual(d.problems, []);
  assert.strictEqual(deltaOpCount(d.delta), 0, 'everything after the open fence is opaque');
});

test('AM-73 commentary is not an operation', () => {
  const d = parseDeltaStrict('## Notes\n\njust an explanation\n');
  assert.deepStrictEqual(d.problems, []);
  assert.strictEqual(deltaOpCount(d.delta), 0, 'a Notes-only delta still has zero operations');
});

test('AM-73 the declared consequences hold end to end, not only in the parser', () => {
  const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n';
  const FLOW = 'change: c\ntier: medium\ntrack: harden\ntrack-rationale: r\nlineage: v4\ncurrent-step: STEP6\nround: 1\nnext-action: x\ngates:\n  - 2026-08-15T00:00 note: n\n';
  const stamp = '<!-- apriori-base: sha256:' + 'c'.repeat(64) + ' -->';

  // (a) a Notes-only delta is refused by the real command, with the existing zero-op wording
  const only = proj({
    'apriori/specs/kv/spec.md': STORE,
    'apriori/changes/c/flow-state.md': FLOW,
    'apriori/changes/c/specs/kv/spec.md': '## Notes\n\nwhy this change exists\n',
  });
  const r1 = run(only, ['archive', '--change', 'c']);
  assert.notStrictEqual(r1.status, 0, r1.stdout + r1.stderr);
  assert.match(r1.stdout + r1.stderr, /0 delta operations/, 'the existing zero-op wording is reused');

  // (b) a MUTATION delta whose only stamp sits inside Notes is UNSTAMPED, so CAS default-deny fires
  const hidden = proj({
    'apriori/specs/kv/spec.md': STORE,
    'apriori/changes/c/flow-state.md': FLOW,
    'apriori/changes/c/specs/kv/spec.md':
      `## Notes\n\nthe stamp below is an EXAMPLE, not this delta's stamp\n${stamp}\n\n` +
      '## MODIFIED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- changed\n',
  });
  const r2 = run(hidden, ['archive', '--change', 'c', '--write', '--changes-dir', 'apriori/changes']);
  assert.strictEqual(r2.status, 1, r2.stdout + r2.stderr);
  assert.match(r2.stdout + r2.stderr, /denied by default|apriori stamp/, 'CAS default-deny fires: ' + r2.stderr);
  assert.strictEqual(fs.readFileSync(path.join(hidden, 'apriori/specs/kv/spec.md'), 'utf8'), STORE, 'nothing written');
  assert.ok(fs.existsSync(path.join(hidden, 'apriori/changes/c')), 'and nothing moved');

  // (c) the same delta with the stamp BEFORE Notes is accepted — the placement rule is the difference
  const before = proj({
    'apriori/specs/kv/spec.md': STORE,
    'apriori/changes/c/flow-state.md': FLOW,
    'apriori/changes/c/specs/kv/spec.md':
      `${stamp}\n\n## Notes\n\nwhy\n\n` +
      '## MODIFIED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- changed\n',
  });
  const r3 = run(before, ['archive', '--change', 'c']);
  assert.match(r3.stdout + r3.stderr, /diverged|CAS|base/i,
    'the stamp before Notes IS consumed — it now fails on divergence, not on being absent: ' + r3.stdout + r3.stderr);
});

test('AM-71 a non-Requirement h3 inside a block is a problem, not body text', () => {
  const d = parseDeltaStrict('## ADDED Requirements\n\n### Requirement: R\n\n#### Scenario: ZZ-01 x\n- t\n\n### 说明\nwhy\n');
  assert.strictEqual(d.problems.length, 1, d.problems.join('; '));
  assert.match(d.problems[0], /line 8/);
  assert.match(d.problems[0], /Notes/, 'the diagnostic points at the legal home');
  assert.strictEqual(d.delta.ADDED.size, 0, 'the block is discarded, never merged');
});

test('AM-71 the same heading elsewhere keeps its existing meaning', () => {
  for (const text of [
    '### 说明\nfree text\n\n' + DELTA_OK,                                  // FILE_PREAMBLE
    '## ADDED Requirements\n\n### 说明\n\n### Requirement: R\n\n#### Scenario: ZZ-01 x\n- t\n', // IN_SECTION preamble
    '## Notes\n### 说明\n\n' + DELTA_OK,                                    // IN_NOTES
  ]) {
    const d = parseDeltaStrict(text);
    assert.deepStrictEqual(d.problems, [], text.slice(0, 40));
  }
  // deeper headings inside a block stay body text
  const deep = parseDeltaStrict('## ADDED Requirements\n\n### Requirement: R\n\n#### Scenario: ZZ-01 x\n- t\n\n##### note\n');
  assert.deepStrictEqual(deep.problems, []);
  assert.ok(deep.delta.ADDED.get('R').includes('##### note'));
});

test('AM-72 one problem per bad block, and the next requirement recovers', () => {
  const d = parseDeltaStrict('## ADDED Requirements\n\n### Requirement: R\n\n### bad\nprose\n### also bad\nmore\n\n### Requirement: S\n\n#### Scenario: ZZ-02 y\n- t\n');
  assert.strictEqual(d.problems.length, 1, `only the first bad heading reports: ${d.problems.join('; ')}`);
  assert.ok(!d.delta.ADDED.has('R'), 'the discarded block never lands');
  assert.ok(d.delta.ADDED.has('S'), 'the following legal requirement opens normally');
});

test('AM-72 a discarded block does not swallow a stamp — either discard source', () => {
  const stamp = '<!-- apriori-base: sha256:' + 'b'.repeat(64) + ' -->';
  // (a) discarded by the new h3 rule
  const a = parseDeltaStrict(`## ADDED Requirements\n\n### Requirement: R\n\n### bad\n${stamp}\n`);
  assert.ok(a.problems.some((p) => /after the first delta section heading/.test(p)),
    `the stamp is still judged by the stamp rules: ${a.problems.join('; ')}`);
  // (b) discarded by the pre-existing illegal-requirement-inside-RENAMED rule
  const b = parseDeltaStrict(`## RENAMED Requirements\n\n### Requirement: R\n${stamp}\n`);
  assert.ok(b.problems.some((p) => /after the first delta section heading/.test(p)),
    `RENAMED's existing behaviour is unchanged: ${b.problems.join('; ')}`);
});

test('AM-72 a heading in the skipped region stays covered by its h2 problem', () => {
  const d = parseDeltaStrict('## Bogus Heading\n\n### 说明\nprose\n\n' + DELTA_OK);
  assert.strictEqual(d.problems.length, 1, d.problems.join('; '));
  assert.match(d.problems[0], /unrecognized section heading/);
});

test('AM-73 Notes terminates the skipped region', () => {
  const d = parseDeltaStrict('## Bogus Heading\n\n## Notes\nwhy\n\n' + DELTA_OK);
  assert.strictEqual(d.problems.length, 1, 'only the bogus heading complains');
  assert.strictEqual(d.delta.ADDED.size, 1, 'and parsing resumed after Notes');
});

// ---------------------------------------------------------------- template

test('CF-12 the template carries one pattern in all three places, each pinned separately', () => {
  const t = fs.readFileSync(path.join(__dirname, '..', 'templates', 'process-config.md'), 'utf8');
  const want = DEFAULT_ID;                    // the source string as the parser will see it
  // (1) the VALUE cell — what `init` writes and `resolveIdPattern` consumes FIRST
  const { parseConfig } = require('../lib/config');
  assert.strictEqual(parseConfig(t).values.get('id-pattern'), want, 'VALUE cell');
  // (2) the DEFAULT cell — the fourth column of that same row
  const row = t.split('\n').find((l) => /^\|\s*id-pattern\s*\|/.test(l));
  assert.ok(row, 'the id-pattern row exists');
  const cells = row.split('|').map((c) => c.trim());
  assert.strictEqual(cells[cells.length - 2], want, `DEFAULT cell: ${row}`);
  // (3) the built-in-default wording in the adjacent comment
  const comment = t.split('\n').find((l) => /built-in default/.test(l));
  assert.ok(comment && comment.includes(want), `comment: ${comment}`);
  // and nothing stale anywhere
  for (const line of t.split('\n'))
    assert.ok(!(line.includes('[A-Z]+-\\d+') && !line.includes(want)), `stale pattern: ${line}`);
});

test('CF-18 a freshly initialised project inherits the current pattern end to end', () => {
  const root = proj({ 'package.json': '{"name":"x"}' });
  const init = run(root, ['init', '--tools', 'none']);
  assert.strictEqual(init.status, 0, init.stdout + init.stderr);
  const resolved = resolveIdPattern(root, null);
  assert.strictEqual(resolved.origin, 'config', 'the template row is live, not decorative');
  // the CONFIG origin runs its matching in a child process — exercise that path, not a plain RegExp
  const { makeIdMatcher, parseTap } = require('../lib/spec-runner');
  const matcher = makeIdMatcher(resolved);
  const titles = ['AC-BIS-01 a', 'LIFE-DWS-01 b', 'AC-30f c'];
  const batch = matcher.batch(titles);
  assert.ok(!batch.failure, `the config-origin child answered: ${JSON.stringify(batch.failure)}`);
  assert.deepStrictEqual(batch.ids, ['AC-BIS-01', 'LIFE-DWS-01', 'AC-30f'], 'titles, through the child');
  // and the TAP side of the binding, through the same child
  const tapBatch = matcher.batch(titles.map((t) => t));
  assert.deepStrictEqual(tapBatch.ids, ['AC-BIS-01', 'LIFE-DWS-01', 'AC-30f'], 'TAP descriptions too');
  assert.ok(parseTap, 'the TAP side shares this matcher in the real pipeline');

  // the four consumers agree on that project
  fs.mkdirSync(path.join(root, 'apriori', 'specs', 'm'), { recursive: true });
  fs.writeFileSync(path.join(root, 'apriori', 'specs', 'm', 'spec.md'),
    '### Requirement: R\n\n' + titles.map((t) => `#### Scenario: ${t}\n- t\n`).join('\n'));
  const tap = `node -e "${titles.map((t, i) => `console.log('ok ${i + 1} - ${t}')`).join(';')}"`;
  const chk = run(root, ['check']);
  assert.strictEqual(chk.status, 0, 'check (CK-04): ' + chk.stdout + chk.stderr);
  const dr = require('../lib/doctor').runDoctor({ cwd: root, noRun: true });
  const d6 = dr.checks.filter((c) => c.id === 'D6');
  assert.ok(d6.every((c) => c.status !== 'finding'), 'doctor D6: ' + JSON.stringify(d6));
  const vf = run(root, ['verify', '--specs', 'apriori/specs', '--test-cmd', tap, '--json']);
  const vj = JSON.parse(vf.stdout);
  assert.strictEqual(vj.unidentified.length, 0, 'verify: ' + vf.stdout);
  assert.strictEqual(vj.result, 'GREEN', 'verify verdict: ' + vf.stdout);

  // the fourth consumer — gate C1 — needs a change bundle to judge, so give it one
  const bundle = path.join(root, 'apriori', 'changes', 'c');
  fs.mkdirSync(path.join(bundle, 'specs', 'm'), { recursive: true });
  fs.mkdirSync(path.join(bundle, 'review'), { recursive: true });
  fs.writeFileSync(path.join(bundle, 'flow-state.md'),
    'change: c\ntier: medium\ntrack: harden\ntrack-rationale: r\nlineage: main\ncurrent-step: STEP5\nround: 1\nnext-action: x\ngates:\n  - 2026-08-15T00:00 note: n\n');
  fs.writeFileSync(path.join(bundle, 'tasks.md'), '- [x] T1 done\n');
  fs.writeFileSync(path.join(bundle, 'review', 'issues.md'),
    '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n| Q-1 | a | low | 1 | verified |\n');
  fs.writeFileSync(path.join(bundle, 'specs', 'm', 'spec.md'),
    '## ADDED Requirements\n\n### Requirement: Delta\n\n#### Scenario: AC-BIS-99 added\n- t\n');
  const gtap = `node -e "${[...titles, 'AC-BIS-99 added'].map((t, i) => `console.log('ok ${i + 1} - ${t}')`).join(';')}"`;
  const g = require('../lib/gate').runGate({ cwd: root, change: 'c', testCmd: gtap });
  const c1 = g.checks.find((c) => c.id === 'C1');
  assert.strictEqual(c1.status, 'pass', 'gate C1: ' + (c1 && c1.detail));
  assert.match(c1.detail, /0 unidentified/, 'and nothing unidentified: ' + c1.detail);
});
