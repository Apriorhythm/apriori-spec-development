'use strict';
// BD-01..BD-10 — init / update / read boundaries / raw evidence / doctor D7 (6.2 batch A-7).
//
// Astra P7/P8/P10/P11/P12: `init --tools claud` succeeded and wrote nothing useful; `update`
// said "everything already matches" while skipping a modified file, never recreated a lone
// missing tmp/, and could not see that a rules-file pointer was an older generation; gate read a
// symlinked flow-state that archive refused; `risk.scanDeltas` swallowed EACCES into "no risk";
// `mdFilesUnder` walked through symlinked directories before judging them; a 0-byte raw file
// counted as review evidence; doctor called a normally frozen archive "closeout pending".

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readyFiles, FLOW } = require('./helpers/ready-bundle');
const { canSymlink } = require('./helpers/can-symlink');
const init = require('../lib/init');
const update = require('../lib/update');
const risk = require('../lib/risk');
const am = require('../lib/archive-merge');
const review = require('../lib/review');
const rd = require('../lib/readiness');
const gateLib = require('../lib/gate');
const doctor = require('../lib/doctor');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const ROOT = path.join(__dirname, '..');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });
const w = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); return p; };
const tmp = (pfx = 'apriori-bd-') => fs.mkdtempSync(path.join(os.tmpdir(), pfx));
const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n';
const ADDED = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';
const TAP2 = 'node -e "console.log(\'TAP version 13\');console.log(\'1..2\');console.log(\'ok 1 - XA-01 a\');console.log(\'ok 2 - XB-01 b\')"';

function project() {
  const root = tmp();
  for (const [rel, c] of Object.entries(readyFiles('c'))) w(path.join(root, rel), c);
  w(path.join(root, 'apriori', 'specs', 'kv', 'spec.md'), STORE);
  w(path.join(root, 'apriori', 'changes', 'c', 'specs', 'kv', 'spec.md'), ADDED);
  return { root, dir: path.join(root, 'apriori', 'changes', 'c') };
}
const listing = (root) => spawnSync('find', [root, '-mindepth', '1'], { encoding: 'utf8' }).stdout.split('\n').filter(Boolean).sort();

// ---------------------------------------------------------------------------
// init --tools
// ---------------------------------------------------------------------------

test('BD-01 init --tools validates the WHOLE list before writing anything — an unknown key is exit 2, nothing written', () => {
  for (const [why, tools] of [['a typo', 'claud'], ['mixed with a valid one', 'claude,claud'], ['mixed, unknown first', 'claud,claude'], ['uppercase', 'Claude']]) {
    const root = tmp();
    const r = run(['init', '--tools', tools, '--yes'], root);
    assert.strictEqual(r.status, 2, `${why}: ${r.stdout}${r.stderr}`);
    assert.match(r.stderr, /unknown tool 'claud'|unknown tool 'Claude'/, why);
    assert.match(r.stderr, /known tools: claude, codex, cursor, copilot, opencode, windsurf/, why);
    assert.deepStrictEqual(listing(root), [], `${why}: nothing written`);
  }
  // the programmatic face fails closed the same way
  const root = tmp();
  assert.throws(() => init.scaffold(root, ['claude', 'claud']), /unknown tool 'claud'/);
  assert.deepStrictEqual(listing(root), []);
  // and the valid list still works
  assert.strictEqual(run(['init', '--tools', 'claude,codex', '--yes'], tmp()).status, 0);
});

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------

test('BD-02 update recreates apriori/tmp/ when only it is missing, and never touches an existing .gitignore', () => {
  const root = tmp();
  init.scaffold(root, ['claude']);
  fs.rmSync(path.join(root, 'apriori', 'tmp'), { recursive: true, force: true });
  const gi = fs.readFileSync(path.join(root, 'apriori', '.gitignore'), 'utf8');
  const { actions } = update.run(root);
  assert.ok(actions.some((a) => a.file === 'apriori/tmp/' && a.action === 'created'), JSON.stringify(actions));
  assert.ok(fs.statSync(path.join(root, 'apriori', 'tmp')).isDirectory());
  assert.strictEqual(fs.readFileSync(path.join(root, 'apriori', '.gitignore'), 'utf8'), gi);
  assert.ok(!actions.some((a) => a.file === 'apriori/.gitignore'), 'the present .gitignore is not an action');
  // dry-run reports it and creates nothing
  fs.rmSync(path.join(root, 'apriori', 'tmp'), { recursive: true, force: true });
  const dry = update.run(root, { dryRun: true });
  assert.ok(dry.actions.some((a) => a.file === 'apriori/tmp/' && a.action === 'created'));
  assert.ok(!fs.existsSync(path.join(root, 'apriori', 'tmp')));
  // a file where the directory should be is not "present": reported, never replaced
  fs.writeFileSync(path.join(root, 'apriori', 'tmp'), 'not a dir\n');
  const bad = update.run(root);
  assert.ok(bad.actions.some((a) => a.file === 'apriori/tmp/' && /not a directory/.test(a.action)), JSON.stringify(bad.actions));
  assert.strictEqual(fs.readFileSync(path.join(root, 'apriori', 'tmp'), 'utf8'), 'not a dir\n');
});

test('BD-03 the update summary says "N modified (skipped)" when anything was skipped — never "everything already matches"', () => {
  const root = tmp();
  init.scaffold(root, ['claude']);
  fs.appendFileSync(path.join(root, 'apriori', 'runbook.md'), '\nlocal notes\n');
  const r = run(['update'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /1 modified \(skipped\) — locally modified, not refreshed; delete it and rerun 'apriori init --tools <t>' to hand it back to the tool/);
  assert.doesNotMatch(r.stdout, /everything already matches/);
  // with nothing modified and nothing to refresh, the old line is still right
  const clean = tmp();
  init.scaffold(clean, ['claude']);
  assert.match(run(['update'], clean).stdout, /everything already matches apriori-cli/);
});

test('BD-04 update upgrades an OLD tool-generated pointer paragraph in a rules file — only that paragraph; user text and hand-edited pointers are left alone', () => {
  const OLD = init.POINTER_GENERATIONS;
  assert.ok(Array.isArray(OLD) && OLD.length >= 2, 'every previous shipped generation is listed');
  assert.ok(!OLD.includes(init.POINTER), 'the current text is not a previous generation');
  for (const [i, old] of OLD.entries()) {
    const root = tmp();
    init.scaffold(root, ['claude']);
    const rules = path.join(root, 'CLAUDE.md');
    fs.writeFileSync(rules, `# My project\n\nHouse rules that are mine.\n\n${old}\n\nMore of my own text below the pointer.\n`);
    const dry = update.run(root, { dryRun: true });
    assert.ok(dry.actions.some((a) => a.file === 'CLAUDE.md' && a.action === 'pointer updated'), `gen ${i}: ${JSON.stringify(dry.actions)}`);
    assert.match(fs.readFileSync(rules, 'utf8'), new RegExp(old.slice(0, 40).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'dry-run writes nothing');
    const { actions } = update.run(root);
    assert.ok(actions.some((a) => a.file === 'CLAUDE.md' && a.action === 'pointer updated'), `gen ${i}`);
    assert.strictEqual(fs.readFileSync(rules, 'utf8'),
      `# My project\n\nHouse rules that are mine.\n\n${init.POINTER}\n\nMore of my own text below the pointer.\n`, `gen ${i}: only the paragraph changed`);
    // idempotent: with the current generation in place, the user-owned file is not an action at all
    const again = update.run(root);
    assert.ok(!again.actions.some((a) => a.file === 'CLAUDE.md'), JSON.stringify(again.actions));
  }
  // a hand-edited pointer (not a shipped generation) is the user's: reported, never rewritten
  const root = tmp();
  init.scaffold(root, ['claude']);
  const rules = path.join(root, 'CLAUDE.md');
  fs.writeFileSync(rules, 'Development follows `apriori/runbook.md`, but read it my way.\n');
  const { actions } = update.run(root);
  assert.ok(actions.some((a) => a.file === 'CLAUDE.md' && /pointer \(skipped — not a shipped generation/.test(a.action)), JSON.stringify(actions));
  assert.strictEqual(fs.readFileSync(rules, 'utf8'), 'Development follows `apriori/runbook.md`, but read it my way.\n');
  // a rules file with no pointer at all is not update's business (init appends pointers)
  fs.writeFileSync(rules, 'nothing about apriori here\n');
  assert.ok(!update.run(root).actions.some((a) => a.file === 'CLAUDE.md'));
  // the CLI face prints the row
  fs.writeFileSync(rules, `${OLD[0]}\n`);
  assert.match(run(['update'], root).stdout, /CLAUDE\.md {2}\(pointer updated\)/);
});

test('BD-05 README states the pre-manifest runbook adoption policy honestly, in both editions', () => {
  const en = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const cn = fs.readFileSync(path.join(ROOT, 'README_cn.md'), 'utf8');
  assert.match(en, /pre-manifest `apriori\/runbook\.md`[^|]*overwritten once/);
  assert.match(cn, /managed\.json[^|]*覆盖一次/);
});

// ---------------------------------------------------------------------------
// trust roots
// ---------------------------------------------------------------------------

test('BD-06 gate resolves the flow-state through the same guard archive uses: a symlinked flow-state is C3 structural, as R1', { skip: canSymlink() ? false : 'platform refuses symlinks' }, () => {
  const { root, dir } = project();
  // a perfectly legal state, one directory over — the bytes are fine, the trust root is not
  const real = w(path.join(root, 'elsewhere', 'flow-state.md'), FLOW('c'));
  fs.rmSync(path.join(dir, 'flow-state.md'));
  fs.symlinkSync(real, path.join(dir, 'flow-state.md'));
  const g = gateLib.runGate({ cwd: root, change: 'c', testCmd: TAP2, noCas: true });
  assert.strictEqual(g.code, 1, JSON.stringify(g.checks));
  const c3 = g.checks.find((c) => c.id === 'C3');
  assert.strictEqual(c3.status, 'blocked');
  assert.match(c3.detail, /^flow-state\.md: symlink at /);
  for (const id of ['C8', 'C9']) assert.match(g.checks.find((c) => c.id === id).detail, /flow-state not read — see C3/, id);
  const r = rd.readinessOf({ bundleDir: dir, name: 'c' });
  assert.deepStrictEqual(r.blockers.map((b) => [b.rule, b.class]), [['R1', 'structural']]);
  assert.match(r.blockers[0].detail, /^flow-state\.md: symlink at /);
  // the archive CLI agrees, and status never reads through either
  assert.match(run(['archive', '--change', 'c', '--no-cas'], root).stderr, /R1 flow-state\.md: symlink/);
  assert.strictEqual(run(['status', '--change', 'c'], root).status, 2);
});

test('BD-07 risk.scanDeltas: an lstat or read failure is unreadable-delta (fail-closed), never []; only true absence is []', () => {
  const { dir } = project();
  const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
  const eacces = Object.assign(new Error('EACCES'), { code: 'EACCES' });
  const eio = Object.assign(new Error('EIO'), { code: 'EIO' });
  // absence: no specs/ at all — genuinely no delta, no signal
  assert.deepStrictEqual(risk.scanDeltas(dir, { lstatSync: () => { throw enoent; } }), []);
  // a check that could not be made must never read as "no risk found"
  for (const [why, ops] of [
    ['lstat EACCES', { lstatSync: () => { throw eacces; } }],
    ['lstat EIO', { lstatSync: () => { throw eio; } }],
    ['read EIO', { readFileSync: () => { throw eio; } }],
  ]) {
    const out = risk.scanDeltas(dir, ops);
    assert.deepStrictEqual(out.map((s) => s.signal), ['unreadable-delta'], `${why}: ${JSON.stringify(out)}`);
    assert.match(out[0].detail, why.startsWith('lstat') ? /specs\/ cannot be checked \((EACCES|EIO)\)/ : /unreadable \(EIO\)/, why);
  }
  // the normal path is unchanged
  assert.deepStrictEqual(risk.scanDeltas(dir), []);
});

test('BD-08 archive-merge.mdFilesUnder judges a directory BEFORE descending: a symlink loop terminates, an escaping directory is refused', { skip: canSymlink() ? false : 'platform refuses symlinks' }, () => {
  const { root, dir } = project();
  const specs = path.join(dir, 'specs');
  // a loop: specs/kv/loop -> specs (would recurse forever without a visited set)
  fs.symlinkSync(specs, path.join(specs, 'kv', 'loop'));
  const files = am.mdFilesUnder(specs);
  assert.deepStrictEqual(files.map((f) => path.relative(specs, f)), ['kv/spec.md'], 'each real file once, the loop terminated');
  assert.strictEqual(run(['verify', '--change', 'c', '--test-cmd', TAP2], root).status, 0);
  assert.strictEqual(run(['archive', '--change', 'c', '--no-cas'], root).status, 0);
  fs.unlinkSync(path.join(specs, 'kv', 'loop'));
  // an escaping directory: specs/kv/out -> a directory OUTSIDE the walk root, never entered
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-bd-out-'));
  fs.writeFileSync(path.join(outside, 'smuggled.md'), ADDED);
  fs.symlinkSync(outside, path.join(specs, 'kv', 'out'));
  assert.throws(() => am.mdFilesUnder(specs), /escapes the walk root: .*kv\/out/);
  const v = run(['verify', '--change', 'c', '--test-cmd', TAP2, '--json'], root);
  assert.strictEqual(v.status, 2);
  assert.ok(JSON.parse(v.stdout).errors.some((e) => /escapes the walk root/.test(e)), v.stdout);
  const a = run(['archive', '--change', 'c', '--no-cas'], root);
  assert.strictEqual(a.status, 2);
  assert.match(a.stderr, /escapes the walk root/);
  // and the delta scan reports it as a scan that could not be made
  assert.deepStrictEqual(risk.scanDeltas(dir).map((s) => s.signal), ['unreadable-delta']);
});

// ---------------------------------------------------------------------------
// raw evidence, doctor D7
// ---------------------------------------------------------------------------

test('BD-09 a `<stem>-raw.*` sibling must be non-empty to count — 0 bytes is a missing raw; the self-contained form is unchanged', () => {
  const { root, dir } = project();
  fs.writeFileSync(path.join(dir, 'review', 'code-review-v1-raw.txt'), '');
  const facts = review.reviewFacts(dir);
  assert.deepStrictEqual(facts.missingRaw, ['code-review-v1']);
  assert.deepStrictEqual(facts.emptyRaw, ['code-review-v1-raw.txt']);
  const g = gateLib.runGate({ cwd: root, change: 'c', testCmd: TAP2, noCas: true });
  const c5 = g.checks.find((c) => c.id === 'C5');
  assert.strictEqual(c5.status, 'blocked');
  assert.match(c5.detail, /code-review-v1\.md \(code-review-v1-raw\.txt is empty\)/);
  const r = rd.readinessOf({ bundleDir: dir, name: 'c' });
  assert.ok(r.blockers.some((b) => b.rule === 'R4' && /verdict doc without a raw archive or self-contained provenance: code-review-v1\.md \(code-review-v1-raw\.txt is empty\)/.test(b.detail)), JSON.stringify(r.blockers));
  // one byte of transcript is a transcript (the tool judges shape, not independence)
  fs.writeFileSync(path.join(dir, 'review', 'code-review-v1-raw.txt'), 'x');
  assert.deepStrictEqual(review.reviewFacts(dir).missingRaw, []);
  // the self-contained provenance form needs no sibling at all (SB-01)
  fs.rmSync(path.join(dir, 'review', 'code-review-v1-raw.txt'));
  fs.writeFileSync(path.join(dir, 'review', 'code-review-v1.md'), '<!-- provenance: provider=p model=m session=s date=2026-01-01 -->\n# r1\n\nVERDICT: ACCEPT\n');
  assert.deepStrictEqual(review.reviewFacts(dir).missingRaw, []);
  assert.strictEqual(gateLib.runGate({ cwd: root, change: 'c', testCmd: TAP2, noCas: true }).code, 0);
});

test('BD-10 doctor D7: an archived bundle at phase: review is the normal frozen state — no "closeout pending"', () => {
  const root = tmp();
  init.scaffold(root, ['claude']);
  w(path.join(root, 'apriori', 'specs', 'kv', 'spec.md'), STORE);
  w(path.join(root, 'apriori', 'changes', 'archive', '2026-07-10T1200-old', 'flow-state.md'), 'change: old\nlineage: v6\nphase: review\n\n## Open\n\ngates:\n  - 2026-07-10T00:00 note: archived\n');
  w(path.join(root, 'apriori', 'changes', 'archive', '2026-07-11T1200-early', 'flow-state.md'), 'change: early\nlineage: v6\nphase: build\n\n## Open\n\ngates:\n  - 2026-07-11T00:00 note: archived\n');
  const res = doctor.runDoctor({ cwd: root, noRun: true });
  const d7 = res.checks.filter((c) => c.id === 'D7');
  const all = d7.map((c) => c.detail).join(' | ');
  assert.doesNotMatch(all, /closeout pending/);
  assert.doesNotMatch(all, /old/, 'a frozen review-phase archive is not surfaced as anything');
  assert.match(all, /archived 2026-07-11T1200-early @ build — archived before review; frozen as is/);
  assert.ok(d7.every((c) => c.status !== 'finding'), 'neither is a finding');
});
