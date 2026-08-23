'use strict';
// LN-01..LN-10 + GT-28 / ST-10 / ST-11 — slice 4: `explore` and the hotfix lane stop being process concepts.
//
// 5.x carried two parallel lanes beside the ordinary change. The hotfix lane had its own
// state file, its own grading, digest, approval token, preflight, review roles and archive
// path (988 lines of runtime); the explore track had its own intent card, spike dir,
// extraction review and three named human gates. Blueprint §2 retires both: new work is
// ONE flow — `apriori new <name>` with `mode: fast | standard`.
//
// These are removal pins, so most of them are negative. The two positive ones matter just
// as much: a retired verb must REFUSE with a pointer (not vanish into "unknown subcommand"),
// and a bundle left behind by the old lane must be diagnosed rather than crash or pass as a
// healthy change.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const BIN = path.join(ROOT, 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });

const mk = () => fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-lane-'));
const w = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); return p; };
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

// the six agent-facing live docs — the ones an agent is told to read and obey
const LIVE = {
  'RUNBOOK.md': rd('RUNBOOK.md'),
  'RUNBOOK_cn.md': rd('RUNBOOK_cn.md'),
  'README.md': rd('README.md'),
  'README_cn.md': rd('README_cn.md'),
  'docs/concepts.md': rd('docs/concepts.md'),
  'docs/concepts_cn.md': rd('docs/concepts_cn.md'),
  'docs/cli.md': rd('docs/cli.md'),
  'docs/cli_cn.md': rd('docs/cli_cn.md'),
};

// A minimal bundle left over from the retired lane: hotfix-state.md and no flow-state.
// `dir` is the bundle directory itself — an archived one must be `archive/<stamp>-<name>`
// exactly, because that is the shape resolveChange matches to decide stage.
function laneBundle(dir, name) {
  w(path.join(dir, 'hotfix-state.md'), `hotfix: ${name}\ndate: 2026-08-01\nkinds: doc-fix\n\n## Conclusion\n\nnothing was broken.\n`);
  return dir;
}
const inflightLane = (root, name = 'leftover') =>
  laneBundle(path.join(root, 'apriori', 'changes', name), name);
const archivedLane = (root, name, stamp = '2026-08-01T0000') =>
  laneBundle(path.join(root, 'apriori', 'changes', 'archive', `${stamp}-${name}`), name);

// ---- the CLI surface ----------------------------------------------------------------

test('LN-01 the usage lists no hotfix and the retired verb refuses with a fast-change pointer', () => {
  const help = run(['--help']);
  assert.strictEqual(help.status, 0, help.stderr);
  assert.doesNotMatch(help.stdout, /hotfix/i, 'usage still advertises the retired lane');

  // refused — with a pointer. Not silently gone, and not still dispatching.
  for (const argv of [['hotfix'], ['hotfix', 'new', 'x'], ['hotfix', 'archive', 'x']]) {
    const r = run(argv);
    assert.strictEqual(r.status, 2, `${argv.join(' ')} → ${r.status}`);
    assert.match(r.stderr, /apriori new <name>/, `${argv.join(' ')} names no replacement`);
    assert.match(r.stderr, /mode: fast/, `${argv.join(' ')} names no mode`);
    assert.strictEqual(r.stdout, '', 'a refusal writes nothing to stdout');
  }
});

test('LN-02 no hotfix runtime, spec or dedicated test file survives', () => {
  // Only tracked artifacts are pinned here. `apriori/truth/` is gitignored local dogfooding
  // state, so a truth doc's absence in any given checkout proves nothing and is not asserted.
  for (const f of ['lib/hotfix.js', 'apriori/specs/hotfix/spec.md'])
    assert.ok(!fs.existsSync(path.join(ROOT, f)), `${f} still exists`);
  assert.deepStrictEqual(fs.readdirSync(path.join(ROOT, 'test')).filter((f) => /^hotfix-/.test(f)), []);
  // nothing in lib/ requires the deleted module any more
  assert.throws(() => require.resolve('../lib/hotfix'), /Cannot find module/);
});

test('LN-03 new scaffolds one shape — no track, tier, intent card or lane', () => {
  const root = mk();
  const r = run(['new', 'ordinary'], root);
  assert.strictEqual(r.status, 0, r.stderr);
  const flow = fs.readFileSync(path.join(root, 'apriori', 'changes', 'ordinary', 'flow-state.md'), 'utf8');
  assert.match(flow, /^mode: <fast \| standard>/m, 'the one identity field is missing');
  for (const dead of [/\btrack:/, /\btier:/, /intent[- ]card/i, /\bspike\b/i, /hotfix/i])
    assert.doesNotMatch(flow, dead, `scaffold still carries ${dead}`);
  // the scaffolded dirs are the bundle's, and spike/ is not one of them
  const subs = fs.readdirSync(path.join(root, 'apriori', 'changes', 'ordinary')).sort();
  assert.deepStrictEqual(subs, ['flow-state.md', 'review', 'specs']);
});

test('LN-11 the explore track\'s positions, and the numbered steps, are no longer legal', () => {
  // INTENT-CARD / SPIKE / EXTRACTION were `current-step` values; slice 5 retired the whole
  // numbered vocabulary along with the artifacts hung on it. A bundle parked on any of them is
  // refused rather than read — a retired path does not survive as a synonym.
  const rd = require('../lib/readiness');
  for (const dead of ['INTENT-CARD', 'SPIKE', 'EXTRACTION', 'STEP0', 'STEP5', 'STEP6', 'DONE', 'ABANDONED'])
    assert.ok(!rd.PHASE_ENUM.includes(dead), `${dead} is still a legal phase`);
  assert.deepStrictEqual(rd.PHASE_ENUM, ['ground', 'specify', 'build', 'review', 'done', 'abandoned']);
  assert.ok(!('STEP_ENUM' in rd), 'the numbered vocabulary must be gone, not merely unused');
  // and the key itself refuses, with a migration pointer
  const c3 = rd.checkFlowState({ change: 'c', mode: 'fast', lineage: 'v6', phase: 'review' }, 'c',
    'change: c\nmode: fast\nlineage: v6\ncurrent-step: STEP6\nphase: review\n');
  assert.strictEqual(c3.status, 'blocked');
  assert.match(c3.detail, /current-step/);
  assert.match(c3.detail, /MIGRATING\.md/);
});

// ---- what happens to bundles the retired lane left behind ----------------------------

test('GT-28 an active leftover lane bundle is diagnosed by the gate, not crashed or passed', () => {
  const root = mk();
  inflightLane(root);
  const r = run(['gate', '--change', 'leftover'], root);
  assert.notStrictEqual(r.status, 0, 'a leftover lane bundle must not gate as healthy');
  assert.doesNotMatch(r.stderr + r.stdout, /\n\s+at /, 'a stack frame reached the user');
  const out = r.stderr + r.stdout;
  assert.match(out, /hotfix-state\.md/, 'the diagnosis does not name what it found');
  assert.match(out, /apriori new <name>|convert/i, 'the diagnosis offers no migration');
  assert.doesNotMatch(out, /apriori hotfix archive/, 'the diagnosis still points at the retired command');
});

test('ST-10 status reports a leftover lane bundle as needing migration, and does not crash', () => {
  const root = mk();
  inflightLane(root);
  const listed = run(['status'], root);
  assert.strictEqual(listed.status, 0, listed.stderr);
  assert.doesNotMatch(listed.stdout, /hotfix lane/, 'status still speaks of the lane as a live thing');
  assert.match(listed.stdout, /leftover/, 'the bundle vanished from the listing');

  const one = run(['status', '--change', 'leftover'], root);
  assert.doesNotMatch(one.stderr + one.stdout, /\n\s+at /, 'a stack frame reached the user');
  assert.match(one.stdout + one.stderr, /hotfix-state\.md|migrat/i, 'no migration diagnosis');

});

test('ST-11 the JSON contract still parses with a leftover bundle present', () => {
  const root = mk();
  inflightLane(root);
  run(['new', 'ordinary'], root);

  const json = run(['status', '--json'], root);
  assert.strictEqual(json.status, 0, json.stderr);
  const doc = JSON.parse(json.stdout);
  const rows = Array.isArray(doc) ? doc : doc.changes;
  const leftover = rows.find((c) => c.change === 'leftover');
  const ordinary = rows.find((c) => c.change === 'ordinary');
  assert.ok(leftover && ordinary, `both bundles reported: ${JSON.stringify(rows.map((c) => c.change))}`);
  assert.strictEqual(leftover.hotfix, true, 'the flag reports the file it detects');
  assert.strictEqual(ordinary.hotfix, false);
});

test('LN-04 an archived lane bundle reads as frozen history, never as work to migrate', () => {
  const root = mk();
  archivedLane(root, 'old-note');   // apriori/changes/archive/2026-08-01T0000-old-note/

  // the resolver takes the BARE name and resolves it to the archived stamp — a date-prefixed
  // query is refused before resolution, so asking that way would test nothing.
  const one = run(['status', '--change', 'old-note'], root);
  assert.strictEqual(one.status, 0, one.stderr);
  assert.doesNotMatch(one.stderr + one.stdout, /\n\s+at /, 'a stack frame reached the user');
  assert.match(one.stdout, /old-note/, 'the archived bundle was not actually read');
  assert.match(one.stdout, /frozen history|read-only/i, 'it is not reported as frozen history');
  // frozen history is never handed a write-back instruction
  assert.doesNotMatch(one.stdout, /apriori new /, 'an archived record was told to migrate');
  assert.doesNotMatch(one.stdout, /convert this to a change/, 'an archived record was told to migrate');

  // and the gate refuses it as frozen rather than retroactively judging or migrating it
  const g = run(['gate', '--change', 'old-note'], root);
  const gout = g.stdout + g.stderr;
  assert.notStrictEqual(g.status, 0);
  assert.doesNotMatch(gout, /\n\s+at /, 'a stack frame reached the user');
  assert.match(gout, /frozen history|read-only/i, `gate should call it frozen: ${gout}`);
  assert.doesNotMatch(gout, /apriori new /, 'gate told an archived record to migrate');

  // the bare listing covers in-flight changes only, so the archived one is read through
  // --change — which is exactly the path that resolves the stamp and proves the stage.
  const json = run(['status', '--change', 'old-note', '--json'], root);
  assert.strictEqual(json.status, 0, json.stderr);
  const row = JSON.parse(json.stdout);
  assert.strictEqual(row.change, 'old-note');
  assert.strictEqual(row.stage, 'archived', 'the stamped dir must resolve as archived');
  assert.strictEqual(row.hotfix, true);
  // `path` is path.relative output, so the separator is the platform's — compare normalized
  assert.match(row.path.replace(/\\/g, '/'), /archive\/2026-08-01T0000-old-note$/, `resolved to the stamped dir: ${row.path}`);

  const chk = run(['check'], root);
  assert.doesNotMatch(chk.stderr + chk.stdout, /\n\s+at /, 'a stack frame reached the user');
});

// ---- the live docs stop teaching either lane -----------------------------------------

test('LN-05 no live doc teaches the hotfix lane', () => {
  for (const [name, doc] of Object.entries(LIVE)) {
    assert.doesNotMatch(doc, /apriori hotfix/, `${name}: still shows the retired command`);
    assert.doesNotMatch(doc, /hotfix-state\.md/, `${name}: still teaches the lane's state file`);
    assert.doesNotMatch(doc, /hotfix lane/i, `${name}: still names the lane as a concept`);
  }
});

test('LN-06 no live doc teaches the explore track', () => {
  for (const [name, doc] of Object.entries(LIVE)) {
    assert.doesNotMatch(doc, /explore track/i, `${name}: the track survives`);
    assert.doesNotMatch(doc, /intent[- ]card/i, `${name}: the intent card survives`);
    assert.doesNotMatch(doc, /extraction[- ]review/i, `${name}: the extraction review survives`);
    assert.doesNotMatch(doc, /\bP11\b|\bP12\b/, `${name}: the track's prompts survive`);
    assert.doesNotMatch(doc, /spike\//, `${name}: the spike dir survives as a path`);
  }
});

test('LN-07 the live docs name the four phases, in both languages', () => {
  for (const [name, doc] of [['RUNBOOK.md', LIVE['RUNBOOK.md']], ['docs/concepts.md', LIVE['docs/concepts.md']]])
    for (const phase of ['Ground', 'Specify', 'Build & Test', 'Review & Deliver'])
      assert.ok(doc.includes(phase), `${name}: phase '${phase}' is not named`);
  for (const [name, doc] of [['RUNBOOK_cn.md', LIVE['RUNBOOK_cn.md']], ['docs/concepts_cn.md', LIVE['docs/concepts_cn.md']]])
    for (const phase of ['Ground', 'Specify', 'Build & Test', 'Review & Deliver'])
      assert.ok(doc.includes(phase), `${name}: phase '${phase}' is not named`);
});

// ---- one meaning of "round", in both languages ---------------------------------------

test('LN-08 no live doc sells rounds as a continuous patching budget', () => {
  for (const [name, doc] of Object.entries(LIVE)) {
    assert.doesNotMatch(doc, /up to 5 rounds|up to N rounds|max 5 rounds|maximum of 5 rounds/i, `${name}: a round budget survives`);
    assert.doesNotMatch(doc, /最多 ?5 ?轮|最多 ?N ?轮|5 轮预算/, `${name}: a CN round budget survives`);
    // a cap is a stop-loss, never the exit condition: "decide after hitting the cap" reads as
    // "spend the rounds first". Note `No round cap` is the correct negation and must survive,
    // so the cap patterns are anchored to the budget phrasings, not the bare word.
    assert.doesNotMatch(doc, /\d+-round cap/i, `${name}: an N-round cap survives`);
    assert.doesNotMatch(doc, /(?:after|upon|on) (?:hitting )?the (?:\d+-round )?cap/i, `${name}: decide-after-the-cap survives`);
    assert.doesNotMatch(doc, /hitting the \d+-round/i, `${name}: hitting-the-cap survives`);
    assert.doesNotMatch(doc, /\d+ ?轮上限|达上限|达到 ?\d+ ?轮/, `${name}: a CN cap survives`);
    // every surviving mention of a round cap must be a denial of one
    for (const m of doc.match(/.{0,12}round cap/gi) || [])
      assert.match(m, /no round cap/i, `${name}: a non-negated round cap survives — ${m}`);
  }
});

test('LN-09 both languages carry the same round semantics', () => {
  const en = LIVE['RUNBOOK.md'] + LIVE['docs/concepts.md'];
  const cn = LIVE['RUNBOOK_cn.md'] + LIVE['docs/concepts_cn.md'];
  // target 2 / the control point is round 2
  assert.match(en, /converge within 2 rounds|target(?:s)? 2 rounds/i, 'EN: the 2-round target is missing');
  assert.match(cn, /2 轮内收敛|目标.{0,4}2 轮/, 'CN: the 2-round target is missing');
  assert.match(en, /control point/i, 'EN: the round-2 control point is missing');
  assert.match(cn, /控制点/, 'CN: the round-2 control point is missing');
  // rounds 3-5 only verify a CHANGED approach
  assert.match(en, /split|add tests|redo the approach/i, 'EN: the three reframes are missing');
  assert.match(cn, /拆分.{0,4}补测试.{0,4}重做/, 'CN: the three reframes are missing');
  // round 5 is a human decision, not an automatic cap
  assert.match(en, /round 5[\s\S]{0,200}(owner|human)/i, 'EN: round 5 does not end at a person');
  assert.match(cn, /第 ?5 ?轮[\s\S]{0,200}(人|owner|Owner)/, 'CN: round 5 does not end at a person');
});

test('LN-10 the packaged templates carry neither lane', () => {
  for (const f of fs.readdirSync(path.join(ROOT, 'templates'))) {
    const t = fs.readFileSync(path.join(ROOT, 'templates', f), 'utf8');
    for (const dead of [/hotfix/i, /explore track/i, /intent[- ]card/i, /spike\//])
      assert.doesNotMatch(t, dead, `templates/${f}: ${dead} survives`);
  }
});
