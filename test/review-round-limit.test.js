'use strict';
// review-round-limit — GT-50..59 / CF-30..35 / PR-40..41 / ST-40: the review loop is governed by the
// human-held `review-round-limit` (missing = 8 since limit-ruling), not by fixed round-2 / round-5
// control points; round n >= 3 needs a structurally checked `review-progress` note. Since
// limit-ruling the owner is stopped for only on `escalate` or a round past the one automatic
// re-review — a `revise` AT the limit owes rulings (test/limit-ruling.test.js).
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');

const review = require('../lib/review');
const gate = require('../lib/gate');
const config = require('../lib/config');
const rd = require('../lib/readiness');

const ROOT = path.join(__dirname, '..');
const BIN = path.join(ROOT, 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n';
const DELTA = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';
const TAP_OK = `node -e "${['ok 1 - XA-01 a', 'ok 2 - XB-01 b'].map((l) => `console.log('${l}')`).join(';')}"`;
const ACCEPT = 'VERDICT: no major issues';
const REVISE = 'VERDICT: 3 issues open';
const ESCALATE = 'VERDICT: escalate';

function project(gates = '  - 2026-09-25T00:00 note: n\n', configRows = null, phase = 'build') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-rrl-'));
  const w = (rel, body) => {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
  };
  w('apriori/specs/kv/spec.md', STORE);
  w('apriori/changes/c/flow-state.md',
    `change: c\nmode: standard\nlineage: v6\nphase: ${phase}\n\n## Open\n\ngates:\n${gates}`);
  w('apriori/changes/c/specs/kv/spec.md', DELTA);
  fs.mkdirSync(path.join(root, 'apriori', 'changes', 'c', 'review'), { recursive: true });
  if (configRows !== null) w('apriori/process-config.md', `| Field | Value |\n|---|---|\n${configRows}`);
  const bundle = path.join(root, 'apriori', 'changes', 'c');
  return { root, bundle, w };
}
const doc = (bundle, stem, body) => fs.writeFileSync(path.join(bundle, 'review', `${stem}.md`), body);
const raw = (bundle, stem) => fs.writeFileSync(path.join(bundle, 'review', `${stem}-raw.txt`), 'raw transcript\n');
const landRound = (bundle, stem, verdict, body = 'findings…') => { doc(bundle, stem, `# review\n\n${body}\n\n${verdict}\n`); raw(bundle, stem); };
const landFamily = (bundle, family, verdicts) => verdicts.forEach((v, i) => landRound(bundle, `${family}-v${i + 1}`, v));
const progress = (family, n, { issues = 'none', evidence = 'apriori/specs/kv/spec.md', actor = 'note' } = {}) =>
  `  - 2026-09-25T0${Math.min(n, 9)}:00 ${actor}: review-progress ${family} round ${n} — issues: ${issues}; actions: fixed the finding; evidence: ${evidence}; approach: kept — same plan, narrower patch\n`;
const flowOf = (bundle) => fs.readFileSync(path.join(bundle, 'flow-state.md'), 'utf8');
const c8 = (root) => gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK }).checks.find((x) => x.id === 'C8');
const loopOf = (root, bundle) => review.reviewLoop(review.reviewFacts(bundle), flowOf(bundle), 'in-flight',
  { limit: config.resolveReviewRoundLimit(root), cwd: root });
const fam = (l, name) => l.families.find((f) => f.family === name);
const escStatus = (root) => run(['status', '--change', 'c', '--escalation'], root).status;

test('GT-50 no configured limit means 8, and rounds 2 to 7 at revise never stop the loop', () => {
  const gates = ['  - 2026-09-25T00:00 note: n\n', ...[3, 4, 5, 6, 7].map((n) => progress('spec-review', n))].join('');
  const { root, bundle } = project(gates);
  landFamily(bundle, 'spec-review', [REVISE, REVISE, REVISE, REVISE, REVISE, REVISE, REVISE]);
  const l = loopOf(root, bundle);
  assert.strictEqual(fam(l, 'spec-review').round, 7);
  assert.strictEqual(fam(l, 'spec-review').ruling, null, 'below the limit nothing is ruled');
  assert.strictEqual(fam(l, 'spec-review').stopped, false);
  assert.strictEqual(l.escalation, null);
  const c = c8(root);
  assert.strictEqual(c.status, 'blocked', c.detail);                       // the floor: not resolved
  assert.match(c.detail, /the independent review has not resolved/);
  assert.doesNotMatch(c.detail, /stops here|ESCALATION|owner: reframe/);
  assert.strictEqual(escStatus(root), 0);
});

test('GT-51 a revise verdict at the effective limit asks the producer for rulings, not the owner; accept at the limit proceeds', () => {
  const g = '  - 2026-09-25T00:00 note: n\n' + progress('spec-review', 3);
  const { root, bundle } = project(g, '| review-round-limit | 3 |\n');
  landFamily(bundle, 'spec-review', [REVISE, REVISE, REVISE]);
  const l = loopOf(root, bundle);
  assert.strictEqual(l.escalation, null);
  assert.strictEqual(fam(l, 'spec-review').stopped, false);
  const c = c8(root);
  assert.strictEqual(c.status, 'blocked');
  assert.match(c.detail, /ruling spec-review round 3 — the round is at the review-round limit \(3\) and still revising/);
  assert.match(c.detail, /note: ruling spec-review round 3 — <ID>: <fixed\|rejected\|follow-up\|owner> — <basis>/);
  assert.doesNotMatch(c.detail, /owner: reframe|ESCALATION/);
  assert.strictEqual(escStatus(root), 0);
  // accept AT the limit proceeds
  const p2 = project(g, '| review-round-limit | 3 |\n');
  landFamily(p2.bundle, 'spec-review', [REVISE, REVISE, ACCEPT]);
  assert.strictEqual(loopOf(p2.root, p2.bundle).escalation, null);
  assert.strictEqual(c8(p2.root).status, 'pass', c8(p2.root).detail);
});

test('GT-52 an owner reframe at the limit takes the family out of the automatic path, and the count never resets', () => {
  const g = '  - 2026-09-25T00:00 note: n\n' + progress('spec-review', 3)
    + '  - 2026-09-25T04:00 owner: reframe spec-review round 3 redo — new approach\n' + progress('spec-review', 4);
  const { root, bundle } = project(g, '| review-round-limit | 3 |\n');
  landFamily(bundle, 'spec-review', [REVISE, REVISE, REVISE]);
  let l = loopOf(root, bundle);
  assert.strictEqual(l.escalation[0].acknowledged, true);
  assert.strictEqual(l.escalation[0].state, 'acknowledged');
  assert.strictEqual(fam(l, 'spec-review').ruling, null, 'the owner took the limit round: no ruling is asked for');
  assert.doesNotMatch(c8(root).detail, /ruling spec-review/);
  landRound(bundle, 'spec-review-v4', REVISE);
  l = loopOf(root, bundle);
  assert.strictEqual(fam(l, 'spec-review').round, 4);                     // nothing reset
  assert.strictEqual(l.escalation[0].round, 4);
  assert.strictEqual(l.escalation[0].acknowledged, false);                // round 4 needs its own answer (or a raised limit)
  assert.strictEqual(c8(root).status, 'blocked');
});

test('GT-53 escalate stops at any round, whatever the limit', () => {
  const { root, bundle } = project();
  landFamily(bundle, 'spec-review', [ESCALATE]);
  const l = loopOf(root, bundle);
  assert.strictEqual(l.escalation[0].reason, 'the reviewer escalated');
  assert.strictEqual(c8(root).status, 'blocked');
  assert.match(c8(root).detail, /ESCALATION/);
});

test('GT-54 the review-progress record is required from round 3 and checked structurally', () => {
  // no record at all
  let p = project();
  landFamily(p.bundle, 'spec-review', [REVISE, REVISE, REVISE]);
  let c = c8(p.root);
  assert.strictEqual(c.status, 'blocked');
  assert.match(c.detail, /review-progress spec-review round 3/);
  assert.doesNotMatch(c.detail, /owner: reframe/);
  // a record that omits an ID the round-2 summary opens a list item with
  p = project('  - 2026-09-25T00:00 note: n\n' + progress('spec-review', 3, { issues: 'none' }));
  landRound(p.bundle, 'spec-review-v1', REVISE);
  landRound(p.bundle, 'spec-review-v2', REVISE, '- R-02 the ledger is not read\n- R-03 the stamp is off by one');
  landRound(p.bundle, 'spec-review-v3', REVISE);
  c = c8(p.root);
  assert.strictEqual(c.status, 'blocked');
  assert.match(c.detail, /review-progress spec-review round 3/);
  assert.match(c.detail, /R-02/);
  assert.match(c.detail, /R-03/);
  // an evidence path that does not exist
  p = project('  - 2026-09-25T00:00 note: n\n' + progress('spec-review', 3, { evidence: 'lib/nope.js' }));
  landFamily(p.bundle, 'spec-review', [REVISE, REVISE, REVISE]);
  c = c8(p.root);
  assert.strictEqual(c.status, 'blocked');
  assert.match(c.detail, /review-progress spec-review round 3/);
  assert.match(c.detail, /lib\/nope\.js/);
  // complete: covered IDs, existing path — the record check is satisfied; only the floor remains
  p = project('  - 2026-09-25T00:00 note: n\n' + progress('spec-review', 3, { issues: 'R-02, R-03' }));
  landRound(p.bundle, 'spec-review-v1', REVISE);
  landRound(p.bundle, 'spec-review-v2', REVISE, '- R-02 the ledger is not read\n- R-03 the stamp is off by one');
  landRound(p.bundle, 'spec-review-v3', ACCEPT);
  c = c8(p.root);
  assert.strictEqual(c.status, 'pass', c.detail);
  assert.doesNotMatch(c.detail, /review-progress/);
});

test('GT-55 an invalid limit blocks at consumption and names the range', () => {
  for (const bad of ['0', '-1', 'abc', '2.5']) {
    const p = project(undefined, `| review-round-limit | ${bad} |\n`, 'review');
    landFamily(p.bundle, 'spec-review', [REVISE]);
    const c = c8(p.root);
    assert.strictEqual(c.status, 'blocked', bad);
    assert.match(c.detail, /review-round-limit/, bad);
    assert.match(c.detail, new RegExp(bad.replace('.', '\\.')), bad);
    assert.match(c.detail, /an integer >= 1 \(missing row = 8\)/, bad);
    const a = run(['archive', '--change', 'c'], p.root);
    assert.strictEqual(a.status, 1, a.stdout + a.stderr);
    assert.match(a.stdout + a.stderr, /review-round-limit/);
  }
  const p = project(undefined, '| review-round-limit | 3 |\n| review-round-limit | 5 |\n');
  landFamily(p.bundle, 'spec-review', [REVISE]);
  const c = c8(p.root);
  assert.strictEqual(c.status, 'blocked');
  assert.match(c.detail, /review-round-limit: .*conflicting rows \('3' vs '5'\)/);
});

test('GT-56 the progress record is a note entry, not an owner decision', () => {
  // owner-authored progress record: counts as the record, authorizes nothing
  // (limit-ruling: the stop exercised here is an `escalate` verdict — a revise at the limit owes rulings)
  let p = project('  - 2026-09-25T00:00 note: n\n' + progress('spec-review', 3, { actor: 'owner' }), '| review-round-limit | 3 |\n');
  landFamily(p.bundle, 'spec-review', [REVISE, REVISE, ESCALATE]);
  let c = c8(p.root);
  assert.doesNotMatch(c.detail, /review-progress spec-review round 3 —.*missing/);
  assert.match(c.detail, /ESCALATION spec-review round 3/);                 // still stopped: it is not a reframe
  // note-authored reframe: not a reframe, not a progress record
  p = project('  - 2026-09-25T00:00 note: reframe spec-review round 3 redo — nope\n' + progress('spec-review', 3), '| review-round-limit | 3 |\n');
  landFamily(p.bundle, 'spec-review', [REVISE, REVISE, ESCALATE]);
  c = c8(p.root);
  assert.strictEqual(c.status, 'blocked');
  assert.strictEqual(loopOf(p.root, p.bundle).escalation[0].acknowledged, false);
});

test('GT-57 evidence references are confined to the project', () => {
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-rrl-outside-'));
  fs.writeFileSync(path.join(outside, 'ext.txt'), 'x');
  const cases = [];
  const mk = (evidence, prep) => cases.push({ evidence, prep });
  mk(path.join(outside, 'ext.txt'));                                                       // absolute, outside
  mk(`../${path.basename(outside)}/ext.txt`);                                                // `..` traversal
  mk('apriori/ext-link.txt', (root) => fs.symlinkSync(path.join(outside, 'ext.txt'), path.join(root, 'apriori', 'ext-link.txt')));   // escaping symlink
  mk('apriori/specs', null);                                                                 // a directory
  for (const { evidence, prep } of cases) {
    const p = project('  - 2026-09-25T00:00 note: n\n' + progress('spec-review', 3, { evidence }));
    if (prep) prep(p.root);
    landFamily(p.bundle, 'spec-review', [REVISE, REVISE, ACCEPT]);
    const c = c8(p.root);
    assert.strictEqual(c.status, 'blocked', evidence);
    assert.match(c.detail, /not an existing regular file inside the project/, evidence);
    assert.ok(!c.detail.includes('x\n'), 'the file is stat\'ed, never read');
  }
  // a regular file inside, and a symlink whose target is inside, both satisfy the record
  for (const [evidence, prep] of [
    ['apriori/specs/kv/spec.md', null],
    ['apriori/spec-link.md', (root) => fs.symlinkSync(path.join(root, 'apriori', 'specs', 'kv', 'spec.md'), path.join(root, 'apriori', 'spec-link.md'))],
  ]) {
    const p = project('  - 2026-09-25T00:00 note: n\n' + progress('spec-review', 3, { evidence }));
    if (prep) prep(p.root);
    landFamily(p.bundle, 'spec-review', [REVISE, REVISE, ACCEPT]);
    assert.strictEqual(c8(p.root).status, 'pass', evidence);
  }
  assert.strictEqual(review.evidenceFileInside(cases[0].evidence.replace('/ext.txt', ''), 'ext.txt'), true);
  assert.strictEqual(review.evidenceFileInside(outside, '.'), false);
});

test('GT-58 the record grammar is exact: labels at part boundaries, a reasoned approach, timestamp and actor', () => {
  const round3 = (bundle, body2) => {
    landRound(bundle, 'spec-review-v1', REVISE);
    landRound(bundle, 'spec-review-v2', REVISE, body2);
    landRound(bundle, 'spec-review-v3', ACCEPT);
  };
  const rec = (payload) => `  - 2026-09-25T03:00 note: review-progress spec-review round 3 — ${payload}\n`;
  // `transactions:` does not supply `actions:`
  let p = project('  - 2026-09-25T00:00 note: n\n' + rec('issues: none; transactions: updated; evidence: apriori/specs/kv/spec.md; approach: kept — same plan'));
  round3(p.bundle, 'findings…');
  let c = c8(p.root);
  assert.strictEqual(c.status, 'blocked');
  assert.match(c.detail, /incomplete: actions missing/);
  // `approach: kept` without a reason
  p = project('  - 2026-09-25T00:00 note: n\n' + rec('issues: none; actions: fixed; evidence: apriori/specs/kv/spec.md; approach: kept'));
  round3(p.bundle, 'findings…');
  c = c8(p.root);
  assert.strictEqual(c.status, 'blocked');
  assert.match(c.detail, /approach must read `kept — <reason>` or `changed — <reason>`/);
  // no timestamp / no actor / an impossible timestamp: not a record at all (the stamp rule is the owner entry's)
  const flow = require('../lib/flow');
  for (const bad of ['2026-99-99T99:99', '2026-13-01T10:00', '2026-00-10T10:00', '2026-09-32T10:00', '2026-09-25T24:00', '2026-09-25T10:60']) {
    assert.strictEqual(flow.stampInRange(bad), false, bad);
    assert.strictEqual(flow.ownerEntry(`- ${bad} owner: reframe spec-review round 3 redo — x`), null, bad);
  }
  for (const line of [
    '  - review-progress spec-review round 3 — issues: none; actions: fixed; evidence: apriori/specs/kv/spec.md; approach: kept — r\n',
    '  - 2026-09-25T03:00 review-progress spec-review round 3 — issues: none; actions: fixed; evidence: apriori/specs/kv/spec.md; approach: kept — r\n',
    '  - 2026-09-25T03:00 agent: review-progress spec-review round 3 — issues: none; actions: fixed; evidence: apriori/specs/kv/spec.md; approach: kept — r\n',
    '  - 2026-99-99T99:99 note: review-progress spec-review round 3 — issues: none; actions: fixed; evidence: apriori/specs/kv/spec.md; approach: kept — r\n',
    '  - 2026-13-01T10:00 note: review-progress spec-review round 3 — issues: none; actions: fixed; evidence: apriori/specs/kv/spec.md; approach: kept — r\n',
    '  - 2026-09-25T24:00 note: review-progress spec-review round 3 — issues: none; actions: fixed; evidence: apriori/specs/kv/spec.md; approach: kept — r\n',
    '  - 2026-09-25T10:60 note: review-progress spec-review round 3 — issues: none; actions: fixed; evidence: apriori/specs/kv/spec.md; approach: kept — r\n',
  ]) {
    p = project('  - 2026-09-25T00:00 note: n\n' + line);
    round3(p.bundle, 'findings…');
    c = c8(p.root);
    assert.strictEqual(c.status, 'blocked', line);
    assert.match(c.detail, /review-progress spec-review round 3 — missing/, line);
  }
  // ids opening ordered items, `+` items and table rows all count; prose mentions do not
  p = project('  - 2026-09-25T00:00 note: n\n' + rec('issues: R-01; actions: fixed; evidence: apriori/specs/kv/spec.md; approach: kept — r'));
  round3(p.bundle, '1. R-02 unresolved\n+ R-03 unresolved\n| R-04 | row |\n- R-01 fixed\nsee also R-99 in passing');
  c = c8(p.root);
  assert.strictEqual(c.status, 'blocked');
  assert.match(c.detail, /does not cover R-02, R-03, R-04 from round 2/);
  assert.doesNotMatch(c.detail, /R-99/);
  assert.deepStrictEqual([...review.openingIds('1) R-05 a\n* **R-06** b\n2. `R-07a` c\n- r-08 lower\n- R09 no hyphen')], ['R-05', 'R-06', 'R-07a']);
  // the same content in the exact form passes the record check
  p = project('  - 2026-09-25T00:00 note: n\n' + rec('issues: R-01, R-02, R-03, R-04; actions: fixed each; evidence: apriori/specs/kv/spec.md; approach: changed — split the patch'));
  round3(p.bundle, '1. R-02 unresolved\n+ R-03 unresolved\n| R-04 | row |\n- R-01 fixed');
  assert.strictEqual(c8(p.root).status, 'pass', c8(p.root).detail);
});

test('GT-59 archive consumes the same loop: progress failures block R4, an unanswered stop is not forceable, a custom changes dir reads the project config', () => {
  // a round-3 accept whose record fails: non-forceable R4 evidence blocker, with and without --force
  for (const [why, gates, body2] of [
    ['missing', '', 'findings…'],
    ['uncovered', progress('spec-review', 3, { issues: 'none' }), '- R-02 open'],
    ['bad path', progress('spec-review', 3, { evidence: 'lib/nope.js' }), 'findings…'],
  ]) {
    const p = project('  - 2026-09-25T00:00 note: n\n' + gates, null, 'review');
    landRound(p.bundle, 'spec-review-v1', REVISE);
    landRound(p.bundle, 'spec-review-v2', REVISE, body2);
    landRound(p.bundle, 'spec-review-v3', ACCEPT);
    const rdy = rd.readinessOf({ bundleDir: p.bundle, name: 'c', cwd: p.root });
    const r4 = rdy.blockers.filter((b) => b.rule === 'R4');
    assert.ok(r4.length >= 1, why);
    assert.ok(r4.every((b) => b.class === 'evidence' && b.forceable === false && /review-progress spec-review round 3/.test(b.detail)), why);
    for (const args of [['archive', '--change', 'c'], ['archive', '--change', 'c', '--force']]) {
      const a = run(args, p.root);
      assert.strictEqual(a.status, 1, why + args.join(' '));
      assert.match(a.stderr, /R4 review-progress spec-review round 3/, why);
      assert.ok(fs.existsSync(p.bundle), why);
    }
  }
  // an unanswered escalation stop: forceable false, the cure named, archive prints it (and --force changes nothing)
  let p = project('  - 2026-09-25T00:00 note: n\n', '| review-round-limit | 2 |\n', 'review');
  landFamily(p.bundle, 'spec-review', [REVISE, ESCALATE]);
  let rdy = rd.readinessOf({ bundleDir: p.bundle, name: 'c', cwd: p.root });
  const stop = rdy.blockers.find((b) => b.class === 'escalation');
  assert.ok(stop, 'the escalation stop is reported');
  assert.strictEqual(stop.forceable, false);
  assert.match(stop.detail, /not yet on record/);
  assert.match(stop.cure, /owner: reframe spec-review round 2 <split\|tests\|redo\|accept-risk>/);
  let a = run(['archive', '--change', 'c'], p.root);
  assert.strictEqual(a.status, 1);
  assert.match(a.stderr, /not forceable until the owner's decision is on record/);
  assert.match(a.stderr, /owner: reframe spec-review round 2/);
  a = run(['archive', '--change', 'c', '--force'], p.root);
  assert.strictEqual(a.status, 1);
  assert.match(a.stderr, /--force needs a pre-recorded human decision/);
  // once the owner answered with accept-risk, the SAME blocker is forceable (and the double action archives)
  fs.appendFileSync(path.join(p.bundle, 'flow-state.md'), '  - 2026-09-25T05:00 owner: reframe spec-review round 2 accept-risk — ship with the known gap\n');
  rdy = rd.readinessOf({ bundleDir: p.bundle, name: 'c', cwd: p.root });
  assert.strictEqual(rdy.blockers.find((b) => b.class === 'escalation').forceable, true);
  assert.strictEqual(rd.readinessOf({ bundleDir: p.bundle, name: 'c', cwd: p.root, force: true }).blockers.some((b) => b.class === 'escalation'), false);
  // a custom changes dir: archive must read THIS project's config, not a guessed ancestor's
  p = project(undefined, '| review-round-limit | 0 |\n', 'review');
  fs.renameSync(path.join(p.root, 'apriori', 'changes'), path.join(p.root, 'changes'));
  const bundle = path.join(p.root, 'changes', 'c');
  landFamily(bundle, 'spec-review', [ACCEPT]);
  a = run(['archive', '--change', 'c', '--changes-dir', 'changes'], p.root);
  assert.strictEqual(a.status, 1, a.stdout + a.stderr);
  assert.match(a.stderr, /R4 review-round-limit: .*'0'/);
  rdy = rd.readinessOf({ bundleDir: bundle, name: 'c', cwd: p.root });
  assert.ok(rdy.blockers.some((b) => /review-round-limit/.test(b.detail)));
});

test('ST-40 status shows the limit and the progress findings the loop computed', () => {
  const json = (root) => JSON.parse(run(['status', '--change', 'c', '--json'], root).stdout);
  const text = (root) => run(['status', '--change', 'c'], root).stdout;
  // round 1, default limit
  let p = project();
  landFamily(p.bundle, 'spec-review', [REVISE]);
  assert.match(text(p.root), /review:\s+review-round-limit 8 \(default\)/);
  let j = json(p.root);
  assert.deepStrictEqual(j.review.limit, { value: 8, origin: 'default' });
  assert.deepStrictEqual(j.review.progress, []);
  assert.strictEqual(j.review.families[0].round, 1);
  // round 3 with the record missing
  p = project();
  landFamily(p.bundle, 'spec-review', [REVISE, REVISE, REVISE]);
  const t = text(p.root);
  assert.match(t, /review progress: review-progress spec-review round 3 — missing/);
  j = json(p.root);
  assert.strictEqual(j.review.progress.length, 1);
  assert.match(j.review.progress[0], /review-progress spec-review round 3 — missing/);
  assert.strictEqual(j.review.limit.value, 8);
  // an invalid row: the resolver's error stands in for the limit
  p = project(undefined, '| review-round-limit | 0 |\n');
  landFamily(p.bundle, 'spec-review', [REVISE]);
  assert.match(text(p.root), /review:\s+review-round-limit: .*'0'.*an integer >= 1 \(missing row = 8\)/);
  j = json(p.root);
  assert.ok(j.review.limit.error);
  assert.match(j.review.limit.error, /^review-round-limit: .*an integer >= 1 \(missing row = 8\)$/);
});

test('CF-30 the default is 8 and the template ships it visibly', () => {
  const none = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-rrl-'));
  assert.deepStrictEqual(config.resolveReviewRoundLimit(none), { value: 8, origin: 'default' });
  const p = project(undefined, '| cas | required |\n');
  assert.deepStrictEqual(config.resolveReviewRoundLimit(p.root), { value: 8, origin: 'default' });
  const tpl = fs.readFileSync(path.join(ROOT, 'templates', 'process-config.md'), 'utf8');
  assert.strictEqual(config.parseConfig(tpl).values.get('review-round-limit'), '8');
  // a raised default never overrides an explicit value
  const seven = project(undefined, '| review-round-limit | 7 |\n');
  assert.deepStrictEqual(config.resolveReviewRoundLimit(seven.root), { value: 7, origin: 'config' });
});

test('CF-31 legal and illegal cells', () => {
  for (const [cell, n] of [['1', 1], ['7', 7], ['12', 12], [' 9 ', 9]]) {
    const p = project(undefined, `| review-round-limit |${cell}|\n`);
    assert.deepStrictEqual(config.resolveReviewRoundLimit(p.root), { value: n, origin: 'config' }, cell);
  }
  for (const bad of ['0', '-1', '2.5', 'abc', '7 rounds']) {
    const p = project(undefined, `| review-round-limit | ${bad} |\n`);
    const r = config.resolveReviewRoundLimit(p.root);
    assert.ok(r.error, bad);
    assert.match(r.error, /review-round-limit/);
    assert.ok(r.error.includes(bad), bad);
    assert.match(r.error, /an integer >= 1 \(missing row = 8\)/);
  }
  const p = project(undefined, '| review-round-limit | 3 |\n| review-round-limit | 5 |\n');
  const conflict = config.resolveReviewRoundLimit(p.root).error;
  assert.match(conflict, /^review-round-limit: .*conflicting rows \('3' vs '5'\)/);
  assert.match(conflict, /an integer >= 1 \(missing row = 8\)/);
  // the cap is spent on the cells, never on the key or the range
  const rows = ['a'.repeat(120), 'b'.repeat(120), 'c', 'd', 'e'].map((v) => `| review-round-limit | ${v} |\n`).join('');
  const long = config.resolveReviewRoundLimit(project(undefined, rows).root).error;
  assert.ok(long.length <= 200, long.length);
  assert.match(long, /^review-round-limit: /);
  assert.match(long, / — must be an integer >= 1 \(missing row = 8\)$/);
  assert.match(long, /and 2 more/);
});

test('CF-33 a present row with an empty or hyphen cell is an error, never the default', () => {
  for (const cell of ['', ' ', '-', '---']) {
    const p = project(undefined, `| review-round-limit |${cell}|\n`);
    const r = config.resolveReviewRoundLimit(p.root);
    assert.ok(r.error, JSON.stringify(cell));
    assert.match(r.error, /review-round-limit/);
    assert.match(r.error, /empty value cell/);
    assert.match(r.error, /an integer >= 1 \(missing row = 8\)/);
    // and it blocks C8 the same way an explicit `0` does
    landFamily(p.bundle, 'spec-review', [REVISE]);
    const c = c8(p.root);
    assert.strictEqual(c.status, 'blocked', JSON.stringify(cell));
    assert.match(c.detail, /empty value cell/);
  }
  // a blank row beside a numbered one fails too, in either order — it never resolves to the number
  for (const rows of ['| review-round-limit | |\n| review-round-limit | 3 |\n', '| review-round-limit | 3 |\n| review-round-limit | - |\n']) {
    const p = project(undefined, rows);
    const r = config.resolveReviewRoundLimit(p.root);
    assert.ok(r.error, rows);
    assert.match(r.error, /empty value cell \(beside a row reading '3'\)/, rows);
    assert.match(r.error, /an integer >= 1 \(missing row = 8\)/, rows);
  }
  // the shared reader still ignores a blank cell for every OTHER key (id-pattern keeps its default)
  const q = project(undefined, '| id-pattern | |\n');
  assert.deepStrictEqual(config.resolveIdPattern(q.root, null).origin, 'default');
});

test('CF-34 a cell too long to be a safe integer is an error, not an infinite limit', () => {
  for (const big of ['9'.repeat(20), '1'.repeat(400), '9007199254740992']) {
    const p = project(undefined, `| review-round-limit | ${big} |\n`);
    const r = config.resolveReviewRoundLimit(p.root);
    assert.ok(r.error, big.length);
    assert.match(r.error, /review-round-limit/);
    assert.match(r.error, /an integer >= 1 \(missing row = 8\)/);
  }
  const p = project(undefined, '| review-round-limit | 9007199254740991 |\n');
  assert.deepStrictEqual(config.resolveReviewRoundLimit(p.root), { value: 9007199254740991, origin: 'config' });
});

test('CF-35 an unreadable file and a conflict resolve to errors that name the key and the range', () => {
  const p = project(undefined, null);
  fs.mkdirSync(path.join(p.root, 'apriori', 'process-config.md'));            // a directory where the file should be
  const r = config.resolveReviewRoundLimit(p.root);
  assert.match(r.error, /^review-round-limit: /);
  assert.match(r.error, /cannot be read/);
  assert.match(r.error, /an integer >= 1 \(missing row = 8\)/);
  landFamily(p.bundle, 'spec-review', [REVISE]);
  // gate itself refuses a broken config before any check runs (gate-degrade); the loop, asked
  // directly (status --json and archive R4 do), carries the decorated error once, not prefixed twice
  const l = loopOf(p.root, p.bundle);
  assert.strictEqual(l.status, 'blocked');
  assert.match(l.detail, /review-round-limit: .*cannot be read.*an integer >= 1/);
  assert.strictEqual((l.detail.match(/review-round-limit: /g) || []).length, 1, 'the key is said once, not prefixed twice');
  assert.deepStrictEqual(l.limit, { error: r.error });
  const a = run(['archive', '--change', 'c'], p.root);
  assert.strictEqual(a.status, 1);
  assert.match(a.stderr, /cannot be read/);          // the structural preflight refuses the broken file even earlier
});

test('CF-32 the key is consumed by C8 through the shared reader only', () => {
  const rv = fs.readFileSync(path.join(ROOT, 'lib', 'review.js'), 'utf8');
  const gt = fs.readFileSync(path.join(ROOT, 'lib', 'gate.js'), 'utf8');
  for (const src of [rv, gt]) {
    assert.doesNotMatch(src, /readFileSync\([^)]*process-config/);
    assert.doesNotMatch(src, /splitCells|parseConfig\(/);
  }
  assert.match(gt + fs.readFileSync(path.join(ROOT, 'lib', 'status.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'lib', 'readiness.js'), 'utf8'),
    /resolveReviewRoundLimit\(/);
  assert.doesNotMatch(rv, /STOP_AFTER|ESCALATE_AT/);
});

test('PR-40 R4 carries the limit rule in both editions', () => {
  for (const f of ['RUNBOOK.md', 'RUNBOOK_cn.md']) {
    const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.match(t, /review-round-limit/, f);
    assert.match(t, /review-progress/, f);
    assert.match(t, /VERDICT: escalate|`escalate`/, f);
    assert.doesNotMatch(t, /still `revise` after ITS round 2 → that loop stops/, f);
    assert.doesNotMatch(t, /reaching ITS round 5 → an escalation/, f);
    assert.doesNotMatch(t, /它自己的第 2 轮后仍是 `revise` → 该循环停止/, f);
    assert.doesNotMatch(t, /到达它自己的第 5 轮 → escalation/, f);
    assert.doesNotMatch(t, /第五轮|第二轮|round-5 escalation|round-2 stop/, f);
  }
  assert.match(fs.readFileSync(path.join(ROOT, 'RUNBOOK.md'), 'utf8'), /defaults to 8/);
  assert.match(fs.readFileSync(path.join(ROOT, 'RUNBOOK_cn.md'), 'utf8'), /缺行默认 8/);
  // limit-ruling: both editions carry the ruling line, its four kinds and the re-review's per-id answer,
  // and neither says a revise at the limit stops the loop
  for (const f of ['RUNBOOK.md', 'RUNBOOK_cn.md']) {
    const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.match(t, /`- <YYYY-MM-DDTHH:MM> note: ruling <family> round <n> — <ID>: <fixed\|rejected\|follow-up\|owner> — <(basis|依据)>`/, f);
    assert.match(t, /`- <ID>: ADDRESSED — <(basis|依据)>` (or|或) `- <ID>: NOT ADDRESSED — <(basis|依据)>`/, f);
    assert.doesNotMatch(t, /or a REVISE verdict at the effective limit; PASS at the limit proceeds|或在有效上限仍是 REVISE;上限处 PASS 照常继续/, f);
  }
});

test('PR-41 the derived documents follow the runbook', () => {
  for (const f of ['docs/operator.md', 'docs/operator_cn.md', 'docs/concepts.md', 'docs/concepts_cn.md', 'docs/cli.md', 'docs/cli_cn.md']) {
    const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.doesNotMatch(t, /stalled after (its|ITS) round 2/, f);
    assert.doesNotMatch(t, /at round 5\b(?! in 6\.0)/, f);
    assert.doesNotMatch(t, /round-5 stop-loss/, f);
    assert.doesNotMatch(t, /第 2 轮后停滞|第 5 轮止损|到第 5 轮/, f);
    // the retired control points as the derived docs used to teach them
    assert.doesNotMatch(t, /still revising after round 2/, f);
    assert.doesNotMatch(t, /REVISE, round 1-2/, f);
    assert.doesNotMatch(t, /reaching round 5/, f);
    assert.doesNotMatch(t, /round-2 verdict that is still revise/, f);
    assert.doesNotMatch(t, /holds no turn or round number/, f);
    assert.doesNotMatch(t, /第 2 轮后仍在修订|第 1-2 轮|到达第 5 轮|第 2 轮结论仍是修订|不含任何轮次或 turn 数/, f);
  }
  // no derived doc or runbook names a fixed round as a current stop, in any wording — the only
  // legal mentions are the retirement sentence itself ("no fixed round-2, round-3 or round-5 stop")
  // and the advisory "2 rounds" target
  for (const f of ['docs/operator.md', 'docs/operator_cn.md', 'docs/concepts.md', 'docs/concepts_cn.md', 'docs/cli.md', 'docs/cli_cn.md', 'RUNBOOK.md', 'RUNBOOK_cn.md']) {
    const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.doesNotMatch(t, /\b(at|reached|reaching|reaches) (its |ITS )?round [25]\b/, f);
    assert.doesNotMatch(t, /(after|beyond) (its |ITS )?round 2\b/, f);
    assert.doesNotMatch(t, /`revise` after (its |ITS )?round 2/, f);
    assert.doesNotMatch(t, /(?<!或)第 5 轮/, f);
    assert.doesNotMatch(t, /第 2 轮后/, f);
  }
  // and the runbook promises only what the CLI enforces: C8 lives in `gate` (and status), not in `check`
  for (const f of ['RUNBOOK.md', 'RUNBOOK_cn.md']) {
    assert.doesNotMatch(fs.readFileSync(path.join(ROOT, f), 'utf8'), /`apriori check` \/ `gate`/, f);
  }
  // positive: the Specify exit and the status reference tie their stop condition to the configured limit
  const rb = fs.readFileSync(path.join(ROOT, 'RUNBOOK.md'), 'utf8');
  assert.match(rb, /\*\*Exit \(when a spec-review loop ran\):\*\*[^\n]*still `revise` at the effective limit/);
  assert.match(rb, /A review family past its one automatic re-review \(reframe\)\.\*\*[^\n]*`accept` proceeds/);
  const cli = fs.readFileSync(path.join(ROOT, 'docs', 'cli.md'), 'utf8');
  assert.match(cli, /`pending`\*\* — [^\n]*a round past its one automatic re-review at the review-round limit/);
  assert.match(cli, /`review\.limit` is the effective review-round limit/);
  // continuation after a limit stop: raise the row OR one reframe per further revise round — never "must raise" alone
  for (const f of ['docs/cli.md', 'docs/operator.md', 'RUNBOOK.md']) {
    const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.doesNotMatch(t, /needs the owner to raise the row|raise `review-round-limit` if it should keep going|needs the owner to raise the limit too/, f);
    assert.match(t, /either raises? (the row|`review-round-limit`)|raise `review-round-limit` in `process-config\.md` if the family should run on/, f);
  }
  for (const f of ['docs/cli_cn.md', 'docs/operator_cn.md', 'RUNBOOK_cn.md']) {
    const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.doesNotMatch(t, /还要所有者提高那一行|要继续就同时提高|还需要所有者提高上限/, f);
    assert.match(t, /提高那一行或用该轮自己的 reframe|提高 `review-round-limit`|提高 `review-round-limit` 或用该轮自己的 reframe/, f);
  }
  assert.match(fs.readFileSync(path.join(ROOT, 'docs', 'cli_cn.md'), 'utf8'), /`review\.limit`/);
  assert.match(fs.readFileSync(path.join(ROOT, 'docs', 'cli.md'), 'utf8'), /### 8\.0 process-config keys:[^\n]*review-round-limit/);
  assert.match(fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8'), /review-round-limit/);
});
