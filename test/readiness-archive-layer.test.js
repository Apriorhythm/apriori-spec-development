'use strict';
// RY-08 / RY-09 / RY-10 plus the pure-function error injections (tasks B3).
// Helper-level only: whether ARCHIVE uses these is B4's business (AM-74..AM-115).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const rd = require('../lib/readiness');
const resolve = require('../lib/resolve');
const gate = require('../lib/gate');

const mk = () => fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-ral-'));
const w = (p, s = 'x') => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); return p; };

// the six shapes state A can also answer, built identically for both sides
function fileShapes() {
  const out = [];
  {
    const d = mk(); out.push(['clean', d, w(path.join(d, 'a.md'))]);
  }
  {
    const d = mk(); const real = w(path.join(d, 'real.md'));
    const link = path.join(d, 'a.md'); fs.symlinkSync(real, link);
    out.push(['symlink', d, link]);
  }
  {
    const d = mk(); const p = path.join(d, 'a.md'); fs.mkdirSync(p);
    out.push(['not-file', d, p]);
  }
  {
    const d = mk(); const outside = mk(); w(path.join(outside, 'x.md'));
    const sub = path.join(d, 'sub'); fs.mkdirSync(sub); fs.symlinkSync(outside, path.join(sub, 'esc'));
    out.push(['escape', d, path.join(sub, 'esc', 'x.md')]);
  }
  {
    const d = mk(); const file = w(path.join(d, 'blocker'));
    out.push(['bad-ancestor', d, path.join(file, 'a.md')]);
  }
  {
    const d = mk(); out.push(['missing', d, path.join(d, 'nope.md')]);
  }
  return out;
}

test('RY-08 the archive artifact check matches state A everywhere state A has an answer', () => {
  let n = 0;
  for (const [label, dir, p] of fileShapes()) {
    const mine = rd.artifactDefect(dir, p);
    const theirs = resolve.fileReadDefect(dir, p);
    const mineKind = mine === null ? null : mine.kind;
    const theirsKind = theirs === null ? null : theirs.kind;
    assert.strictEqual(mineKind, theirsKind, `${label}: state A says ${theirsKind}, archive layer says ${mineKind}`);
    n++;
  }
  assert.strictEqual(n, 6, 'all six state-A-answerable shapes must be compared');
  // the seventh outcome is one state A cannot produce
  const d = mk();
  const io = rd.artifactDefect(d, path.join(d, 'a.md'), {
    lstatSync: () => { const e = new Error('denied'); e.code = 'EACCES'; throw e; },
    realpathSync: fs.realpathSync,
  });
  assert.deepStrictEqual({ kind: io.kind, code: io.code }, { kind: 'io-error', code: 'EACCES' });
  assert.strictEqual(resolve.fileReadDefect(d, path.join(d, 'a.md')).kind, 'missing',
    'state A has no way to say io-error — that is why this layer exists');

  // ENOTDIR is NOT an io-error: it is what lstat raises for `<a-file>/child`, i.e. exactly the
  // bad-ancestor condition. Classifying it as unreadable loses a diagnosis state A gets right.
  const d2 = mk();
  const notdir = rd.artifactDefect(d2, path.join(d2, 'a.md'), {
    lstatSync: (q) => { if (q === path.join(d2, 'a.md')) { const e = new Error('nd'); e.code = 'ENOTDIR'; throw e; } return fs.lstatSync(q); },
    realpathSync: fs.realpathSync,
  });
  assert.strictEqual(notdir.kind, 'missing', 'ENOTDIR routes to the ancestor walk, not to io-error');
});

test('RY-09 the archive review-root check matches the gate check, absence included', () => {
  const cases = [
    ['clean', (d) => fs.mkdirSync(path.join(d, 'review')), null],
    ['absent', () => {}, null],
    ['symlink', (d) => { fs.mkdirSync(path.join(d, 'other')); fs.symlinkSync(path.join(d, 'other'), path.join(d, 'review')); }, 'symlink'],
    ['not-dir', (d) => fs.writeFileSync(path.join(d, 'review'), 'x'), 'not-dir'],
    ['escape', (d) => fs.symlinkSync(mk(), path.join(d, 'review')), 'symlink'],
  ];
  for (const [label, build, wantKind] of cases) {
    const d = mk(); build(d);
    const mine = rd.reviewRootDefect(d);
    const base = rd.reviewDirDefect(d);            // the state-A rule, still in the base layer
    assert.strictEqual(mine === null, base === null, `${label}: presence of a defect must match state A`);
    if (wantKind) assert.strictEqual(mine.kind, wantKind, label);
    else assert.strictEqual(mine, null, label);
  }
  // ENOTDIR resolves the same way absence does — the path cannot resolve, it is not unreadable
  const nd = mk();
  assert.strictEqual(rd.reviewRootDefect(nd, {
    lstatSync: () => { const e = new Error('nd'); e.code = 'ENOTDIR'; throw e; },
    realpathSync: fs.realpathSync,
  }), null);

  // the absent case is the one that keeps a missing review/ flowing to the tier rule
  const empty = mk();
  assert.strictEqual(rd.reviewRootDefect(empty), null, 'an absent review/ is not a defect');
  assert.strictEqual(rd.reviewDirDefect(empty), null, 'and state A agrees');
});

test('RY-10 the archive layer owns its error semantics end to end', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'readiness.js'), 'utf8');
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const start = src.indexOf('function containDefect');
  const end = src.indexOf('module.exports');
  const layer = strip(src.slice(start, end));
  assert.ok(layer.includes('function artifactDefect') && layer.includes('function reviewRootDefect'), 'span check');
  for (const forbidden of ['fileReadDefect', 'containsReal', 'reviewDirDefect'])
    assert.ok(!layer.includes(forbidden),
      `the archive layer must not call ${forbidden} — a second hop into a swallowing helper reopens the window`);
});

test('RY-12 a non-ENOENT beats a co-occurring ENOENT in the containment check', () => {
  const d = mk();
  const target = path.join(d, 'a.md');
  // root resolves; target raises EACCES → io-error
  let calls = 0;
  const mixed = rd.containDefect(d, target, {
    lstatSync: fs.lstatSync,
    realpathSync: (p) => {
      calls++;
      if (p === target) { const e = new Error('denied'); e.code = 'EACCES'; throw e; }
      const e = new Error('gone'); e.code = 'ENOENT'; throw e;         // root: ENOENT
    },
  });
  assert.strictEqual(calls, 2, 'both realpaths are attempted — no short circuit');
  assert.deepStrictEqual({ kind: mixed.kind, code: mixed.code }, { kind: 'io-error', code: 'EACCES' },
    'ENOENT must not hide a permission failure: that is the trivial-tier fail-open');
  // all-ENOENT is the only way to reach the enoent sentinel
  const bothGone = rd.containDefect(d, target, {
    lstatSync: fs.lstatSync,
    realpathSync: () => { const e = new Error('gone'); e.code = 'ENOENT'; throw e; },
  });
  assert.strictEqual(bothGone.kind, 'enoent');
});

test('RY-13 the ancestor walk classifies its own failures instead of walking past them', () => {
  const d = mk();
  const deep = path.join(d, 'sub', 'a.md');
  const io = rd.artifactDefect(d, deep, {
    lstatSync: (p) => {
      if (p === deep) { const e = new Error('gone'); e.code = 'ENOENT'; throw e; }
      const e = new Error('denied'); e.code = 'EIO'; throw e;          // the ancestor
    },
    realpathSync: fs.realpathSync,
  });
  assert.deepStrictEqual({ kind: io.kind, code: io.code }, { kind: 'io-error', code: 'EIO' },
    'state A swallows this one as "keep walking" and ends at missing');
  assert.strictEqual(resolve.fileReadDefect(d, deep).kind, 'missing', 'state A, for contrast');
});

test('RY-14 the review root classifies its own guard failures, and ENOENT stays benign', () => {
  const d = mk();
  const io = rd.reviewRootDefect(d, {
    lstatSync: () => { const e = new Error('denied'); e.code = 'EACCES'; throw e; },
    realpathSync: fs.realpathSync,
  });
  assert.deepStrictEqual({ kind: io.kind, code: io.code }, { kind: 'io-error', code: 'EACCES' });
  const gone = rd.reviewRootDefect(d, {
    lstatSync: () => { const e = new Error('gone'); e.code = 'ENOENT'; throw e; },
    realpathSync: fs.realpathSync,
  });
  assert.strictEqual(gone, null, 'an absent review root is handed to the tier rule, not refused');
  // and a realpath-stage ENOENT lands the same way (AM-115's helper half)
  fs.mkdirSync(path.join(d, 'review'));
  const rpGone = rd.reviewRootDefect(d, {
    lstatSync: fs.lstatSync,
    realpathSync: () => { const e = new Error('gone'); e.code = 'ENOENT'; throw e; },
  });
  assert.strictEqual(rpGone, null);
});

test('RY-15 every non-missing kind is structural, and gate is untouched by all of it', () => {
  for (const k of ['io-error', 'symlink', 'not-file', 'not-dir', 'escape', 'bad-ancestor'])
    assert.ok(rd.STRUCTURAL.has(k), `${k} must be structural (never forceable)`);
  assert.ok(!rd.STRUCTURAL.has('missing'), 'missing is the one kind that takes the tier branch');
  assert.strictEqual(typeof gate.runGate, 'function');
});
