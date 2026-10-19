'use strict';
// archive-unreviewed — AM-137..AM-142, CK-24: the owner may close a delivered change that never
// completed an independent review. It takes the owner's own `archive-unreviewed <change>` record
// AND an explicit --unreviewed; it relaxes only the phase demand (build or review) and the review
// loop's convergence; the declaration and the manifest say there was no converged review; and it
// never waives a pending open item, a structural defect, a CAS conflict or an illegal state.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');
const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const am = require('../lib/archive-merge');
const rd = require('../lib/readiness');
const { FLOW, REVIEW, REVIEW_RAW, withOpen } = require('./helpers/ready-bundle');

const DELTA = '## ADDED Requirements\n\n### Requirement: R-U\nThe system SHALL do u.\n\n#### Scenario: UV-01 u\n- WHEN w\n- THEN t\n';
const DECISION = '  - 2026-10-20T01:00 owner: archive-unreviewed c — 已交付上线，不再补评审\n';
const REVISE = '# code review, round 1\n\n- RV-1 a gap\n- RV-2 another\n\nVERDICT: 2 issues open\n';

function proj({ phase = 'review', gates = DECISION, review = null, open = null, flow = null, extra = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-aur-'));
  fs.mkdirSync(path.join(root, 'apriori/specs'), { recursive: true });   // a project's store root exists
  let fl = flow || FLOW('c').replace('phase: review', `phase: ${phase}`);
  if (open) fl = withOpen(fl, open);
  const files = { 'apriori/changes/c/flow-state.md': fl + gates, 'apriori/changes/c/specs/m/spec.md': DELTA, ...extra };
  if (review) Object.assign(files, review);
  for (const [rel, c] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), c);
  }
  return root;
}
const run = (root, args) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd: root });
const archived = (root) => {
  const a = path.join(root, 'apriori/changes/archive');
  return fs.existsSync(a) ? fs.readdirSync(a).filter((d) => d.endsWith('-c')) : [];
};
const untouched = (root) => !fs.existsSync(path.join(root, 'apriori/specs/m/spec.md')) && archived(root).length === 0
  && fs.existsSync(path.join(root, 'apriori/changes/c/flow-state.md'));
const DECL_FIRST = '  - 2026-10-20T01:00 owner: archive-unreviewed c — 已交付上线，不再补评审';

test('AM-137 the owner closes a change that never had an independent review: merged, moved, and declared without one', () => {
  for (const phase of ['build', 'review']) {
    const root = proj({ phase });
    const dry = run(root, ['archive', '--change', 'c', '--unreviewed']);
    assert.strictEqual(dry.status, 0, dry.stdout + dry.stderr);
    assert.match(dry.stdout, /critical evidence: complete; independent review: none — closed by the owner without one/);
    assert.ok(dry.stdout.includes(`note: owner decision on record: ${DECL_FIRST.trim()}`), dry.stdout);
    assert.match(dry.stdout, /note: waived by the owner's closeout: R4 .*no completed independent review/);
    assert.ok(untouched(root), 'a dry-run writes nothing');
    const r = run(root, ['archive', '--change', 'c', '--unreviewed', '--write']);
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /RESULT: MERGED — 1 module store\(s\) rewritten; change archived/);
    assert.match(r.stdout, /independent review: none — closed by the owner without one/);
    assert.match(fs.readFileSync(path.join(root, 'apriori/specs/m/spec.md'), 'utf8'), /### Requirement: R-U/);
    const [dir] = archived(root);
    const m = JSON.parse(fs.readFileSync(path.join(root, 'apriori/changes/archive', dir, 'archive-manifest.json'), 'utf8'));
    assert.deepStrictEqual(Object.keys(m).sort(), ['change', 'files', 'manifest', 'review', 'stamp']);
    assert.strictEqual(m.review.independentReview, 'none');
    assert.deepStrictEqual(m.review.rounds, []);
    assert.strictEqual(m.review.decision, DECL_FIRST.trim());
    assert.ok(m.review.waived.length >= 1 && m.review.waived.every((w) => typeof w === 'string'));
    assert.ok(!m.files['archive-manifest.json']);
    // the phase relaxation is a waived demand too, recorded first — and only when it happened
    const phaseNote = /note: waived by the owner's closeout: R1 flow-state is at 'build'; archiving happens at 'phase: review'/;
    if (phase === 'build') {
      assert.match(r.stdout, phaseNote);
      assert.match(m.review.waived[0], /^R1 flow-state is at 'build'/);
    } else {
      assert.doesNotMatch(r.stdout, phaseNote);
      assert.ok(m.review.waived.every((w) => !w.startsWith('R1')));
    }
  }
});

test('AM-138 the double action: the record alone and the flag alone archive nothing', () => {
  // the flag without a record — and every near miss of the record
  const misses = ['', '  - 2026-10-20T01:00 note: archive-unreviewed c — 已交付上线\n',
    '  - 2026-10-20T01:00 owner: archive-unreviewed other — 已交付上线\n',
    '  - 2026-10-20T01:00 owner: archive-unreviewed c — \n',
    '  - 2026-10-20T01:00 owner: archive-unreviewed c 已交付上线\n',
    '  - 2026-10-20T01:00 owner: do archive-unreviewed c — 已交付上线\n'];
  for (const gates of misses) {
    const root = proj({ gates });
    for (const write of [false, true]) {
      const r = run(root, ['archive', '--change', 'c', '--unreviewed', ...(write ? ['--write'] : [])]);
      assert.strictEqual(r.status, 1, `${JSON.stringify(gates)}: ${r.stdout}${r.stderr}`);
      assert.match(r.stdout, /RESULT: NOT READY — nothing written/);
      assert.ok(r.stderr.includes('owner: archive-unreviewed c — <the human\'s reason, verbatim>'), r.stderr);
      assert.ok(untouched(root));
    }
  }
  // the record without the flag: the ordinary refusal, plus the pointer to the flag
  const root = proj();
  const r = run(root, ['archive', '--change', 'c', '--write']);
  assert.strictEqual(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /R4 no completed independent review round/);
  assert.match(r.stderr, /an archive-unreviewed decision is on record — pass --unreviewed/);
  assert.ok(untouched(root));
  // readiness: only the canonical entry for THIS change is a grant
  assert.ok(rd.unreviewedGrant('gates:\n' + DECISION, 'c'));
  assert.strictEqual(rd.unreviewedGrant('gates:\n' + DECISION, 'other'), null);
  for (const g of misses) assert.strictEqual(rd.unreviewedGrant('gates:\n' + g, 'c'), null, g);
});

test('AM-139 a review that never converged is closed and declared as not converged, with its last round', () => {
  const root = proj({ review: { 'apriori/changes/c/review/code-review-v1.md': REVISE, 'apriori/changes/c/review/code-review-v1-raw.txt': REVIEW_RAW } });
  const r = run(root, ['archive', '--change', 'c', '--unreviewed', '--write']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /independent review: not converged — code-review round 1 \(revise, 2 open\)/);
  assert.match(r.stdout, /note: waived by the owner's closeout: R4 the independent review has not resolved/);
  const [dir] = archived(root);
  const m = JSON.parse(fs.readFileSync(path.join(root, 'apriori/changes/archive', dir, 'archive-manifest.json'), 'utf8'));
  assert.strictEqual(m.review.independentReview, 'not converged');
  assert.deepStrictEqual(m.review.rounds, ['code-review round 1 (revise, 2 open)']);
  // a verdict with no raw evidence is no round at all: the change is declared as having had none,
  // and the unattributable doc is named among what was waived
  const root2 = proj({ review: { 'apriori/changes/c/review/code-review-v1.md': REVIEW } });
  const r2 = run(root2, ['archive', '--change', 'c', '--unreviewed']);
  assert.strictEqual(r2.status, 0, r2.stdout + r2.stderr);
  assert.match(r2.stdout, /independent review: none — code-review round 1 \(unattributable\) — closed by the owner without one/);
  assert.match(r2.stdout, /note: waived by the owner's closeout: R4 verdict doc without a raw archive/);
  // mixed attribution in one family: an unattributable round 1, an attributable round 2 — the
  // record names round 2, the round that actually carries the last conclusion
  const mixed = { 'apriori/changes/c/review/code-review-v1.md': REVIEW,
    'apriori/changes/c/review/code-review-v2.md': REVISE.replace('round 1', 'round 2'), 'apriori/changes/c/review/code-review-v2-raw.txt': REVIEW_RAW };
  const r3 = run(proj({ review: mixed }), ['archive', '--change', 'c', '--unreviewed']);
  assert.strictEqual(r3.status, 0, r3.stdout + r3.stderr);
  assert.match(r3.stdout, /independent review: not converged — code-review round 2 \(revise, 2 open\)/);
  // a family that converged but whose evidence is incomplete is declared as exactly that
  const accepted = { ...mixed, 'apriori/changes/c/review/code-review-v2.md': '# code review, round 2\n\nVERDICT: no major issues\n' };
  const r4 = run(proj({ review: accepted }), ['archive', '--change', 'c', '--unreviewed']);
  assert.strictEqual(r4.status, 0, r4.stdout + r4.stderr);
  assert.match(r4.stdout, /independent review: evidence incomplete — code-review round 2 \(accept\) — closed by the owner with its review evidence incomplete/);
  assert.match(r4.stdout, /note: waived by the owner's closeout: R4 verdict doc without a raw archive or self-contained provenance: code-review-v1\.md/);
  // the status is read from the families themselves, never from the obligations left over (review r2,
  // AU-5): at a review-round-limit of 1 a revising round owes rulings — evidence obligations only —
  // and it still did not converge
  const lim = proj({ review: { 'apriori/changes/c/review/code-review-v1.md': REVISE, 'apriori/changes/c/review/code-review-v1-raw.txt': REVIEW_RAW },
    extra: { 'apriori/process-config.md': '| Field | Value |\n|---|---|\n| review-round-limit | 1 |\n' } });
  const r5 = run(lim, ['archive', '--change', 'c', '--unreviewed']);
  assert.strictEqual(r5.status, 0, r5.stdout + r5.stderr);
  assert.match(r5.stdout, /independent review: not converged — code-review round 1 \(revise, 2 open\)/);
  // …and an escalation the owner answered and --force overrode is still an escalated review, even
  // when the only demand left to waive is the phase
  const ESC = '# code review, round 1\n\nVERDICT: escalate\n';
  const esc = proj({ phase: 'build', gates: DECISION + '  - 2026-10-20T01:01 owner: reframe code-review round 1 accept-risk — 已上线，接受\n',
    review: { 'apriori/changes/c/review/code-review-v1.md': ESC, 'apriori/changes/c/review/code-review-v1-raw.txt': REVIEW_RAW } });
  const r6 = run(esc, ['archive', '--change', 'c', '--unreviewed', '--force']);
  assert.strictEqual(r6.status, 0, r6.stdout + r6.stderr);
  assert.match(r6.stdout, /independent review: not converged — code-review round 1 \(escalate\)/);
  assert.doesNotMatch(r6.stdout, /independent review: converged/);
  // a history the evidence cannot vouch for is never called converged (review r3, AU-6/AU-7): a later
  // round that is unattributable, a removed verdict, an orphan transcript, a gap, a conflicting doc —
  // each is waived by the closeout, named, and the family declared not converged
  const ACC = '# code review, round 1\n\nVERDICT: no major issues\n';
  const v = (n, body, raw = true) => ({ [`apriori/changes/c/review/code-review-v${n}.md`]: body,
    ...(raw ? { [`apriori/changes/c/review/code-review-v${n}-raw.txt`]: REVIEW_RAW } : {}) });
  const histories = [
    ['a later revise without a raw', { ...v(1, ACC), ...v(2, REVISE, false) }, /code-review round 1 \(accept\); code-review round 2 \(unattributable\)/],
    ['a later round whose verdict was removed', { ...v(1, ACC), ...v(2, '# code review, round 2\n\nno verdict here\n') }, /code-review round 1 \(accept\); code-review round 2 \(unattributable\)/],
    ['an orphan later transcript', { ...v(1, ACC), 'apriori/changes/c/review/code-review-v2-raw.txt': REVIEW_RAW }, /code-review round 1 \(accept\); code-review round 2 \(unattributable\)/],
    ['a gap in the rounds', { ...v(1, ACC), ...v(3, ACC) }, /independent review: not converged — /],
    ['a doc declaring two outcomes', { ...v(1, ACC), ...v(2, '# r2\n\nVERDICT: no major issues\nVERDICT: 2 issues open\n') }, /independent review: not converged — /],
  ];
  for (const [label, review, want] of histories) {
    const rh = run(proj({ review }), ['archive', '--change', 'c', '--unreviewed']);
    assert.strictEqual(rh.status, 0, `${label}: ${rh.stdout}${rh.stderr}`);
    assert.match(rh.stdout, /independent review: not converged — /, label);
    assert.match(rh.stdout, want, label);
    assert.match(rh.stdout, /note: waived by the owner's closeout: R4 /, label);
  }
});

test('AM-140 the closeout never waives a pending item, an illegal or unfinished state, a structural defect or a CAS conflict', () => {
  const cases = [
    ['pending open item', proj({ open: ['UR-1: not verified'] }), /R5 open item UR-1 is pending/],
    ['standing assumption', proj({ flow: FLOW('c').replace('## Open', '## Reality Check\n- assumption: not measured\n\n## Open') }), /R5 unverified assumption/],
    ['phase ground', proj({ phase: 'ground' }), /R1 flow-state is at 'ground'/],
    ['phase specify', proj({ phase: 'specify' }), /R1 flow-state is at 'specify'/],
    ['phase abandoned', proj({ phase: 'abandoned' }), /R1 flow-state declares abandoned/],
    ['phase done', proj({ phase: 'done' }), /R1 in-flight bundle declares done/],
    ['illegal phase', proj({ phase: 'shipping' }), /R1 /],
  ];
  for (const [label, root, want] of cases) {
    const r = run(root, ['archive', '--change', 'c', '--unreviewed', '--write']);
    assert.strictEqual(r.status, 1, `${label}: ${r.stdout}${r.stderr}`);
    assert.match(r.stderr, want, label);
    assert.match(r.stdout, /RESULT: NOT READY — nothing written/, label);
    assert.ok(untouched(root), label);
  }
  // a symlinked review root stays a structural refusal
  const linked = proj();
  fs.mkdirSync(path.join(linked, 'apriori/changes/c/elsewhere'));
  fs.writeFileSync(path.join(linked, 'apriori/changes/c/elsewhere/code-review-v1.md'), REVIEW);
  fs.writeFileSync(path.join(linked, 'apriori/changes/c/elsewhere/code-review-v1-raw.txt'), REVIEW_RAW);
  fs.symlinkSync('elsewhere', path.join(linked, 'apriori/changes/c/review'));
  const rl = run(linked, ['archive', '--change', 'c', '--unreviewed', '--write']);
  assert.strictEqual(rl.status, 1, rl.stdout + rl.stderr);
  assert.match(rl.stderr, /R4 review\/: symlink/);
  assert.ok(untouched(linked));
  // a symlinked raw beside a regular summary is structural, not a merely missing raw (review r1, AU-1)
  const rawLink = proj({ review: { 'apriori/changes/c/review/code-review-v1.md': REVISE, 'apriori/changes/c/elsewhere.txt': REVIEW_RAW } });
  fs.symlinkSync('../elsewhere.txt', path.join(rawLink, 'apriori/changes/c/review/code-review-v1-raw.txt'));
  for (const write of [false, true]) {
    const rr = run(rawLink, ['archive', '--change', 'c', '--unreviewed', ...(write ? ['--write'] : [])]);
    assert.strictEqual(rr.status, 1, rr.stdout + rr.stderr);
    assert.match(rr.stderr, /R4 review\/code-review-v1-raw\.txt is a symlink/);
    assert.ok(untouched(rawLink));
  }
  // a summary that cannot be read is structural too: readiness refuses, even under the closeout
  const unread = proj({ review: { 'apriori/changes/c/review/code-review-v1.md': REVISE, 'apriori/changes/c/review/code-review-v1-raw.txt': REVIEW_RAW } });
  const doc = path.join(unread, 'apriori/changes/c/review/code-review-v1.md');
  const orig = fs.readFileSync;
  fs.readFileSync = function (p, ...rest) {
    if (String(p) === doc) throw Object.assign(new Error('EACCES'), { code: 'EACCES' });
    return orig.call(fs, p, ...rest);
  };
  let ru;
  try { ru = rd.readinessOf({ bundleDir: path.join(unread, 'apriori/changes/c'), name: 'c', unreviewed: true, cwd: unread }); }
  finally { fs.readFileSync = orig; }
  assert.strictEqual(ru.ready, false);
  assert.strictEqual(ru.closeout, null);
  assert.ok(ru.blockers.some((b) => b.rule === 'R4' && b.class === 'structural' && /cannot be read \(EACCES\)/.test(b.detail)), JSON.stringify(ru.blockers));
  // a diverged base stamp is refused at preflight, before readiness is consulted
  const store = '### Requirement: R-OLD\nold\n';
  const cas = proj({ extra: { 'apriori/specs/m/spec.md': store,
    'apriori/changes/c/specs/m/spec.md': `<!-- apriori-base: ${am.fingerprint('something else')} -->\n\n${DELTA}` } });
  const rc = run(cas, ['archive', '--change', 'c', '--unreviewed', '--write']);
  assert.strictEqual(rc.status, 1, rc.stdout + rc.stderr);
  assert.match(rc.stdout, /RESULT: FAILED PREFLIGHT — nothing written/);
  assert.strictEqual(fs.readFileSync(path.join(cas, 'apriori/specs/m/spec.md'), 'utf8'), store);
  assert.strictEqual(archived(cas).length, 0);
  // a merge conflict (ADDED of a requirement the store already has) and a dropped store scenario
  // with no archive-drop decision refuse exactly as on the normal path
  const has = '### Requirement: R-U\nThe system SHALL do u.\n\n#### Scenario: UV-01 u\n- WHEN w\n- THEN t\n';
  const other = '### Requirement: R-U\nThe system SHALL do something else.\n';
  const conflict = proj({ extra: { 'apriori/specs/m/spec.md': other } });
  const rx = run(conflict, ['archive', '--change', 'c', '--unreviewed', '--write']);
  assert.strictEqual(rx.status, 1, rx.stdout + rx.stderr);
  assert.match(rx.stdout, /RESULT: FAILED PREFLIGHT — nothing written/);
  assert.strictEqual(fs.readFileSync(path.join(conflict, 'apriori/specs/m/spec.md'), 'utf8'), other);
  const store2 = has + '\n#### Scenario: UV-02 two\n- b\n';
  const dropDelta = `<!-- apriori-base: ${am.fingerprint(store2)} -->\n\n## MODIFIED Requirements\n\n${has}`;
  const drop = proj({ extra: { 'apriori/specs/m/spec.md': store2, 'apriori/changes/c/specs/m/spec.md': dropDelta } });
  const rd2 = run(drop, ['archive', '--change', 'c', '--unreviewed', '--write']);
  assert.strictEqual(rd2.status, 1, rd2.stdout + rd2.stderr);
  assert.match(rd2.stdout, /RESULT: REFUSED — nothing written/);
  assert.strictEqual(fs.readFileSync(path.join(drop, 'apriori/specs/m/spec.md'), 'utf8'), store2);
  assert.strictEqual(archived(drop).length, 0);
});

test('AM-141 a converged review has nothing to close without: --unreviewed is refused there', () => {
  const root = proj({ review: { 'apriori/changes/c/review/code-review-v1.md': REVIEW, 'apriori/changes/c/review/code-review-v1-raw.txt': REVIEW_RAW } });
  const r = run(root, ['archive', '--change', 'c', '--unreviewed', '--write']);
  assert.strictEqual(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /--unreviewed: nothing is left for the closeout to waive \(the review loop owes nothing and the phase is review\) — archive without --unreviewed/);
  assert.ok(untouched(root));
  // …but at `phase: build` the phase IS a demand the closeout relaxes: it archives, declaring the
  // review as converged and the phase as the one thing waived
  const built = proj({ phase: 'build', review: { 'apriori/changes/c/review/code-review-v1.md': REVIEW, 'apriori/changes/c/review/code-review-v1-raw.txt': REVIEW_RAW } });
  const rb = run(built, ['archive', '--change', 'c', '--unreviewed', '--write']);
  assert.strictEqual(rb.status, 0, rb.stdout + rb.stderr);
  assert.match(rb.stdout, /independent review: converged — code-review round 1 \(accept\) — closed by the owner at phase build/);
  const [bdir] = archived(built);
  const bm = JSON.parse(fs.readFileSync(path.join(built, 'apriori/changes/archive', bdir, 'archive-manifest.json'), 'utf8'));
  assert.strictEqual(bm.review.independentReview, 'converged');
  assert.deepStrictEqual(bm.review.waived, ["R1 flow-state is at 'build'; archiving happens at 'phase: review'"]);
  const ok = run(root, ['archive', '--change', 'c', '--write']);
  assert.strictEqual(ok.status, 0, ok.stdout + ok.stderr);
  assert.doesNotMatch(ok.stdout, /independent review:/);
  const [dir] = archived(root);
  const m = JSON.parse(fs.readFileSync(path.join(root, 'apriori/changes/archive', dir, 'archive-manifest.json'), 'utf8'));
  assert.strictEqual(m.review, undefined, 'a normal archive keeps the manifest shape it always had');
});

test('AM-142 --unreviewed belongs to the high-level form, and the usage says so', () => {
  const root = proj();
  fs.mkdirSync(path.join(root, 'other'));
  fs.writeFileSync(path.join(root, 'other/delta.md'), DELTA);
  const r = run(root, ['archive', '--store', 'other/store.md', '--delta', 'other/delta.md', '--change', 'c', '--unreviewed']);
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /--unreviewed belongs to the high-level form only/);
  const u = run(root, ['archive']);
  const [single, high] = u.stderr.split('\n');
  assert.doesNotMatch(single, /--unreviewed/);
  assert.match(high, /\[--unreviewed\]/);
});

test('CK-24 check names every archived bundle the owner closed without a converged independent review', () => {
  const root = proj();
  assert.strictEqual(run(root, ['archive', '--change', 'c', '--unreviewed', '--write']).status, 0);
  const c = run(root, ['check']);
  assert.strictEqual(c.status, 0, c.stdout + c.stderr);
  const [dir] = archived(root);
  assert.ok(c.stdout.includes(`closed by the owner's closeout (archive-unreviewed): 1 archived bundle(s) — ${dir} (none)`), c.stdout);
  // a build-phase closeout of a converged review is named with ITS state — never as unconverged (review r2, AU-4)
  const built = proj({ phase: 'build', review: { 'apriori/changes/c/review/code-review-v1.md': REVIEW, 'apriori/changes/c/review/code-review-v1-raw.txt': REVIEW_RAW } });
  assert.strictEqual(run(built, ['archive', '--change', 'c', '--unreviewed', '--write']).status, 0);
  const cb = run(built, ['check']);
  assert.strictEqual(cb.status, 0, cb.stdout + cb.stderr);
  assert.ok(cb.stdout.includes(`closed by the owner's closeout (archive-unreviewed): 1 archived bundle(s) — ${archived(built)[0]} (converged)`), cb.stdout);
  assert.doesNotMatch(cb.stdout, /without a converged/);
  // a normal archive adds no such line
  const plain = proj({ review: { 'apriori/changes/c/review/code-review-v1.md': REVIEW, 'apriori/changes/c/review/code-review-v1-raw.txt': REVIEW_RAW } });
  assert.strictEqual(run(plain, ['archive', '--change', 'c', '--write']).status, 0);
  assert.doesNotMatch(run(plain, ['check']).stdout, /archive-unreviewed/);
});
