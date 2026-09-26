'use strict';
// archive-manifest — AM-128..131 (the archive carries a content manifest written inside the
// transaction) and CK-19..21 (check reports drift, never fails on it).
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('node:child_process');
const { readyFiles } = require('./helpers/ready-bundle');
const { canSymlink } = require('./helpers/can-symlink');
const am = require('../lib/archive-merge');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });
const sha = (p) => 'sha256:' + crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

const STORE_A = '### Requirement: Alpha\n\n#### Scenario: XA-01 a\n- t\n';
const ADD_A = '## ADDED Requirements\n\n### Requirement: Alpha2\n\n#### Scenario: XA-09 n\n- t\n';

function mkProject(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-manifest-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return root;
}
function bundleProject(extra = {}) {
  return mkProject({
    ...readyFiles('c'),
    'apriori/specs/a/spec.md': STORE_A,
    'apriori/changes/c/specs/a/spec.md': ADD_A,
    'apriori/changes/c/requirement/req-v1.md': 'v1',
    'apriori/changes/c/requirement/empty.md': '',
    'apriori/changes/c/review/深 层/with space.txt': 'unicode and spaces',
    'apriori/changes/c/review/code-review-v1-raw.txt': 'raw '.repeat(50_000),   // 200 KB, streamed
    ...extra,
  });
}
const archivedDir = (root) => {
  const a = path.join(root, 'apriori/changes/archive');
  const d = fs.readdirSync(a).find((n) => n.endsWith('-c'));
  return d ? path.join(a, d) : null;
};
const readManifest = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'archive-manifest.json'), 'utf8'));

// walk a bundle the way the manifest should see it
function expectedFiles(dir) {
  const out = {};
  (function walk(d, rel) {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((x, y) => x.name.localeCompare(y.name))) {
      const p = path.join(d, e.name), r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isSymbolicLink()) out[r] = 'link:' + fs.readlinkSync(p);
      else if (e.isDirectory()) walk(p, r);
      else if (e.isFile() && r !== 'archive-manifest.json') out[r] = sha(p);
    }
  })(dir, '');
  return out;
}

test('AM-128 the manifest lists the bundle and travels with it', () => {
  const root = bundleProject();
  const dry = run(['archive', '--change', 'c'], root);
  assert.strictEqual(dry.status, 0, dry.stdout + dry.stderr);
  assert.match(dry.stdout, /manifest: would list \d+ entr/);
  assert.ok(!fs.existsSync(path.join(root, 'apriori/changes/c/archive-manifest.json')), 'dry-run writes no manifest');
  const r = run(['archive', '--change', 'c', '--write'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const A = archivedDir(root);
  assert.ok(A, 'bundle archived');
  const m = readManifest(A);
  assert.strictEqual(m.manifest, 1);
  assert.strictEqual(m.change, 'c');
  assert.strictEqual(m.stamp, path.basename(A).replace(/-c$/, ''), 'stamp equals the directory stamp');
  assert.deepStrictEqual(m.files, expectedFiles(A));
  assert.ok(!('archive-manifest.json' in m.files), 'the manifest does not list itself');
  assert.ok('review/深 层/with space.txt' in m.files && 'requirement/empty.md' in m.files);
  assert.strictEqual(m.files['requirement/empty.md'], 'sha256:' + crypto.createHash('sha256').update('').digest('hex'));
  assert.match(r.stdout, new RegExp(`manifest: archive-manifest\\.json \\(${Object.keys(m.files).length} entr`));
});

test('AM-129 a manifest failure leaves the store untouched', () => {
  // (a) the hash reader throws for one file
  const root = bundleProject();
  const before = fs.readFileSync(path.join(root, 'apriori/specs/a/spec.md'), 'utf8');
  const failing = {
    writeFileSync: fs.writeFileSync.bind(fs), renameSync: fs.renameSync.bind(fs), rmSync: fs.rmSync.bind(fs),
    openSync: (p, ...rest) => {
      if (String(p).endsWith('req-v1.md')) throw new Error('injected read failure');
      return fs.openSync(p, ...rest);
    },
  };
  const res = am.archiveChange({ cwd: root, change: 'c', write: true, ops: failing });
  assert.strictEqual(res.code, 1);
  assert.match(res.err.join('\n'), /manifest/);
  assert.match(res.err.join('\n'), /injected read failure/);
  assert.strictEqual(fs.readFileSync(path.join(root, 'apriori/specs/a/spec.md'), 'utf8'), before, 'store untouched');
  assert.ok(!fs.existsSync(path.join(root, 'apriori/specs/a/spec.md.tmp-archive')), 'no temp store file');
  assert.ok(fs.existsSync(path.join(root, 'apriori/changes/c/requirement/req-v1.md')), 'bundle in flight');
  assert.ok(!fs.existsSync(path.join(root, 'apriori/changes/c/archive-manifest.json')), 'no half manifest');
  // (b) the manifest write itself fails
  const failWrite = {
    ...failing,
    openSync: (p, flags, ...rest) => {
      if (String(p).includes('archive-manifest.json') && flags === 'wx') throw new Error('injected write failure');
      return fs.openSync(p, flags, ...rest);
    },
  };
  const res2 = am.archiveChange({ cwd: root, change: 'c', write: true, ops: failWrite });
  assert.strictEqual(res2.code, 1);
  assert.match(res2.err.join('\n'), /manifest.*injected write failure|injected write failure.*manifest/);
  assert.strictEqual(fs.readFileSync(path.join(root, 'apriori/specs/a/spec.md'), 'utf8'), before, 'store still untouched');
  // (c) with the fault removed the archive proceeds
  const ok = am.archiveChange({ cwd: root, change: 'c', write: true });
  assert.strictEqual(ok.code, 0, ok.err.join('\n'));
  assert.ok(fs.existsSync(path.join(archivedDir(root), 'archive-manifest.json')));
});

test('AM-130 a rerun after a failed move recomputes the manifest', () => {
  const root = bundleProject();
  const ops = {
    writeFileSync: fs.writeFileSync.bind(fs), rmSync: fs.rmSync.bind(fs),
    renameSync: (a, b) => {
      if (String(b).includes(`${path.sep}archive${path.sep}`)) throw new Error('injected move failure');
      fs.renameSync(a, b);
    },
  };
  const r1 = am.archiveChange({ cwd: root, change: 'c', write: true, ops });
  assert.strictEqual(r1.code, 1);
  assert.match(r1.err.join('\n'), /rerun to complete/);
  assert.ok(fs.existsSync(path.join(root, 'apriori/changes/c/archive-manifest.json')), 'first manifest sits in the in-flight bundle');
  const first = readManifest(path.join(root, 'apriori/changes/c'));
  // an inventoried file changes between the attempts: a reused manifest would keep the old hash
  fs.writeFileSync(path.join(root, 'apriori/changes/c/requirement/req-v1.md'), 'v1 — amended before the retry');
  const r2 = am.archiveChange({ cwd: root, change: 'c', write: true });
  assert.strictEqual(r2.code, 0, r2.err.join('\n'));
  const A = archivedDir(root);
  const m = readManifest(A);
  assert.deepStrictEqual(m.files, expectedFiles(A), 'the second run\'s manifest matches the final content');
  assert.notStrictEqual(m.files['requirement/req-v1.md'], first.files['requirement/req-v1.md'], 'the retry recomputed the changed file');
  assert.strictEqual(m.files['requirement/req-v1.md'], 'sha256:' + crypto.createHash('sha256').update('v1 — amended before the retry').digest('hex'));
  assert.ok(!('archive-manifest.json' in m.files));
  assert.strictEqual(fs.readdirSync(A).filter((n) => n.startsWith('archive-manifest')).length, 1, 'exactly one manifest, no temp left');
});

test('AM-131 links are recorded, never followed', { skip: !canSymlink() && 'symlinks unavailable' }, () => {
  const root = bundleProject();
  const outside = path.join(root, 'outside.txt'); fs.writeFileSync(outside, 'outside');
  fs.symlinkSync(path.join(root, 'apriori/changes/c/requirement/req-v1.md'), path.join(root, 'apriori/changes/c/inside-link.md'));
  fs.symlinkSync(outside, path.join(root, 'apriori/changes/c/outside-link.md'));
  const r = run(['archive', '--change', 'c', '--write'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const m = readManifest(archivedDir(root));
  assert.match(m.files['inside-link.md'], /^link:/);
  assert.match(m.files['outside-link.md'], /^link:/);
  assert.strictEqual(m.files['requirement/req-v1.md'], 'sha256:' + crypto.createHash('sha256').update('v1').digest('hex'));
});

test('AM-132 publication is exclusive and replaces, never follows, an occupant', { skip: !canSymlink() && 'symlinks unavailable' }, () => {
  // (a) a symlink squatting on the manifest name points at a store file
  // the occupant points at a store file the change does NOT merge into, so the bytes must be exact
  const root = bundleProject({ 'apriori/specs/bystander/spec.md': '### Requirement: Bystander\n\n#### Scenario: XB-01 b\n- t\n' });
  const storeFile = path.join(root, 'apriori/specs/bystander/spec.md');
  const bytesBefore = fs.readFileSync(storeFile);
  fs.symlinkSync(storeFile, path.join(root, 'apriori/changes/c/archive-manifest.json'));
  const r = run(['archive', '--change', 'c', '--write'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.ok(fs.readFileSync(storeFile).equals(bytesBefore), 'the link target is byte-identical — publication never wrote through the link');
  const A = archivedDir(root);
  assert.ok(fs.lstatSync(path.join(A, 'archive-manifest.json')).isFile(), 'the published manifest is a regular file');
  assert.deepStrictEqual(readManifest(A).files, expectedFiles(A));
  // (b) a directory occupies the manifest name: publication fails, nothing else moves
  const root2 = bundleProject();
  const before = fs.readFileSync(path.join(root2, 'apriori/specs/a/spec.md'), 'utf8');
  fs.mkdirSync(path.join(root2, 'apriori/changes/c/archive-manifest.json'));
  const r2 = run(['archive', '--change', 'c', '--write'], root2);
  assert.strictEqual(r2.status, 1, r2.stdout + r2.stderr);
  assert.match(r2.stderr, /archive-manifest\.json/);
  assert.strictEqual(fs.readFileSync(path.join(root2, 'apriori/specs/a/spec.md'), 'utf8'), before, 'store untouched');
  assert.ok(fs.existsSync(path.join(root2, 'apriori/changes/c/requirement/req-v1.md')), 'bundle intact');
  assert.deepStrictEqual(fs.readdirSync(path.join(root2, 'apriori/changes/c')).filter((n) => n.includes('.tmp')), [], 'no temp left behind');
  fs.rmdirSync(path.join(root2, 'apriori/changes/c/archive-manifest.json'));
  const r3 = run(['archive', '--change', 'c', '--write'], root2);
  assert.strictEqual(r3.status, 0, r3.stdout + r3.stderr);
});

test('AM-135 a short write never publishes a truncated manifest', () => {
  const root = bundleProject();
  const before = fs.readFileSync(path.join(root, 'apriori/specs/a/spec.md'), 'utf8');
  // (a) the descriptor accepts a few bytes, then fails: nothing published, store untouched, temp gone
  let calls = 0;
  const shortThenFail = {
    writeFileSync: fs.writeFileSync.bind(fs), renameSync: fs.renameSync.bind(fs), rmSync: fs.rmSync.bind(fs),
    writeSync: (fd, buf, off, len, pos) => {
      calls++;
      if (calls === 1) return fs.writeSync(fd, buf, off, Math.min(7, len), pos);   // a short write
      throw new Error('injected disk full');
    },
  };
  const res = am.archiveChange({ cwd: root, change: 'c', write: true, ops: shortThenFail });
  assert.strictEqual(res.code, 1);
  assert.match(res.err.join('\n'), /manifest.*injected disk full|injected disk full.*manifest/);
  assert.strictEqual(fs.readFileSync(path.join(root, 'apriori/specs/a/spec.md'), 'utf8'), before, 'store untouched');
  assert.ok(!fs.existsSync(path.join(root, 'apriori/changes/c/archive-manifest.json')), 'no truncated manifest published');
  assert.deepStrictEqual(fs.readdirSync(path.join(root, 'apriori/changes/c')).filter((n) => n.includes('.tmp')), [], 'owned temp cleaned up');
  // (b) short writes that make progress are completed: the published manifest parses and is exact
  const dribble = {
    ...shortThenFail,
    writeSync: (fd, buf, off, len, pos) => fs.writeSync(fd, buf, off, Math.min(5, len), pos),
  };
  const ok = am.archiveChange({ cwd: root, change: 'c', write: true, ops: dribble });
  assert.strictEqual(ok.code, 0, ok.err.join('\n'));
  const A = archivedDir(root);
  assert.deepStrictEqual(readManifest(A).files, expectedFiles(A), 'the dribbled manifest is complete');
  // (c) a write that makes no progress is a failure, not a spin
  const root2 = bundleProject();
  const stuck = { ...shortThenFail, writeSync: () => 0 };
  const r2 = am.archiveChange({ cwd: root2, change: 'c', write: true, ops: stuck });
  assert.strictEqual(r2.code, 1);
  assert.match(r2.err.join('\n'), /short write/);
  assert.ok(!fs.existsSync(path.join(root2, 'apriori/changes/c/archive-manifest.json')));
});

test('AM-133 a symlinked bundle root is refused and an archived baseline stays intact', { skip: !canSymlink() && 'symlinks unavailable' }, () => {
  const root = archivedProject();
  const A = archivedDir(root);
  const manifestBefore = fs.readFileSync(path.join(A, 'archive-manifest.json'));
  // an alias at the in-flight path pointing at the archived bundle
  fs.symlinkSync(A, path.join(root, 'apriori/changes/c'));
  const r = run(['archive', '--change', 'c', '--write'], root);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /symbolic link|escapes|not a directory/i);
  assert.ok(fs.readFileSync(path.join(A, 'archive-manifest.json')).equals(manifestBefore), 'the archived manifest is byte-for-byte unchanged');
  assert.strictEqual(fs.readdirSync(A).filter((n) => n.includes('.tmp')).length, 0);
});

test('AM-134 prototype-named files are files', () => {
  const root = bundleProject({
    'apriori/changes/c/__proto__': 'p', 'apriori/changes/c/constructor': 'c', 'apriori/changes/c/toString': 't',
  });
  const r = run(['archive', '--change', 'c', '--write'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const m = readManifest(archivedDir(root));
  for (const [n, c] of [['__proto__', 'p'], ['constructor', 'c'], ['toString', 't']]) {
    assert.ok(Object.prototype.hasOwnProperty.call(m.files, n), `${n} is listed`);
    assert.strictEqual(m.files[n], 'sha256:' + crypto.createHash('sha256').update(c).digest('hex'));
  }
});

// ---- check: drift report ----
function archivedProject() {
  const root = bundleProject();
  const r = run(['archive', '--change', 'c', '--write'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  return root;
}

test('CK-19 drift is reported per bundle and does not change the exit code', () => {
  const root = archivedProject();
  const A = archivedDir(root);
  const clean = run(['check'], root);
  assert.strictEqual(clean.status, 0, clean.stdout + clean.stderr);
  assert.doesNotMatch(clean.stdout, /archive drift/);
  fs.writeFileSync(path.join(A, 'review', 'late-review-v9.md'), 'added later\n');
  fs.rmSync(path.join(A, 'requirement', 'req-v1.md'));
  fs.appendFileSync(path.join(A, 'requirement', 'empty.md'), 'not empty any more');
  const r = run(['check'], root);
  assert.strictEqual(r.status, 0, 'drift never fails check: ' + r.stdout + r.stderr);
  assert.match(r.stdout, new RegExp(`! archive drift: .*${path.basename(A)} \\+1 −1 ~1`));
  assert.match(r.stdout, /\+ review\/late-review-v9\.md/);
  assert.match(r.stdout, /− requirement\/req-v1\.md/);
  assert.match(r.stdout, /~ requirement\/empty\.md/);
  assert.match(r.stdout, /RESULT: PASS/);
  // an unrelated failure still fails as before, with the drift note beside it
  fs.writeFileSync(path.join(root, 'apriori/specs/a/spec.md'), STORE_A + '\n#### Scenario: no id here\n- t\n');
  const bad = run(['check'], root);
  assert.strictEqual(bad.status, 1);
  assert.match(bad.stdout, /archive drift/);
  assert.match(bad.stdout, /RESULT: FAIL/);
});

test('CK-20 bundles without a baseline are summarised once, and a broken manifest is named', () => {
  const root = mkProject({ 'apriori/specs/a/spec.md': STORE_A });
  const arch = path.join(root, 'apriori/changes/archive');
  for (const n of ['2026-01-01T0000-old1', '2026-01-02T0000-old2', '2026-01-03T0000-old3']) {
    fs.mkdirSync(path.join(arch, n), { recursive: true }); fs.writeFileSync(path.join(arch, n, 'flow-state.md'), 'change: x\n');
  }
  fs.mkdirSync(path.join(arch, '2026-01-04T0000-broken'), { recursive: true });
  fs.writeFileSync(path.join(arch, '2026-01-04T0000-broken', 'archive-manifest.json'), '{ not json');
  const r = run(['check'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.strictEqual((r.stdout.match(/no baseline/g) || []).length, 1, 'exactly one no-baseline line');
  assert.match(r.stdout, /no baseline: 3 archived bundle\(s\) carry no manifest/);
  assert.match(r.stdout, /archive manifest unreadable: .*2026-01-04T0000-broken/);
  assert.match(r.stdout, /RESULT: PASS/);
  // no archive root at all → nothing to report
  const root2 = mkProject({ 'apriori/specs/a/spec.md': STORE_A });
  const r2 = run(['check'], root2);
  assert.strictEqual(r2.status, 0);
  assert.doesNotMatch(r2.stdout, /baseline|drift/);
});

test('CK-21 identical content is not drift', () => {
  const root = archivedProject();
  const A = archivedDir(root);
  for (const [rel] of Object.entries(readManifest(A).files)) {
    const p = path.join(A, rel);
    if (fs.lstatSync(p).isSymbolicLink()) continue;
    const c = fs.readFileSync(p); fs.writeFileSync(p, c);                // new mtime, same bytes
    const t = new Date(Date.now() + 60_000); fs.utimesSync(p, t, t);
  }
  const r = run(['check'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout, /archive drift/);
});

test('CK-22 prototype-named files diff like any other, and a symlinked archive entry is named', () => {
  const root = bundleProject({ 'apriori/changes/c/__proto__': 'p', 'apriori/changes/c/constructor': 'c' });
  const r0 = run(['archive', '--change', 'c', '--write'], root);
  assert.strictEqual(r0.status, 0, r0.stdout + r0.stderr);
  const A = archivedDir(root);
  fs.rmSync(path.join(A, 'constructor'));
  if (canSymlink()) fs.symlinkSync(A, path.join(root, 'apriori/changes/archive/2026-01-01T0000-alias'));
  const r = run(['check'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /archive drift: .* \+0 −1 ~0/);
  assert.match(r.stdout, /− constructor/);
  if (canSymlink()) assert.match(r.stdout, /archive entry is a symbolic link, not compared: .*2026-01-01T0000-alias/);
  assert.match(r.stdout, /RESULT: PASS/);
});
