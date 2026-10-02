'use strict';
// prototype-walk-guide — PW-01 (init installs the guide as one managed file), PW-02 (update installs it
// once, then refreshes/protects/leaves it by manifest state), PW-03 (doctor names a missing guide the
// runbook relies on), PW-04 (Ground offers a walk and sends the agent to the guide; the header names it),
// PW-05 (the guide's entry, checklist and constraints; the operator paragraph), PW-06 (MIGRATING's
// downgrade limit). Owner 2026-10-02 + Claude × Astra plan C-b.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const BIN = path.join(ROOT, 'bin', 'apriori.js');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const flat = (s) => s.replace(/\s+/g, ' ');
const GUIDE = 'apriori/guides/prototype-walk.md';
const PKG_GUIDE = read('guides/prototype-walk.md');
const init = require('../lib/init');
const update = require('../lib/update');
const doctor = require('../lib/doctor');
const managed = require('../lib/managed');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-pw-'));
const manifestOf = (root) => JSON.parse(fs.readFileSync(path.join(root, 'apriori', 'managed.json'), 'utf8')).files;
const sha = (p) => 'sha256:' + crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const actionOf = (actions, file) => (actions.find((a) => a.file === file) || {}).action;
// Platform facts the expectations depend on (batch-recheck-fixes SST-R1). update rewrites or adopts the
// guide in place only where it can locate an opened descriptor (/proc/self/fd); elsewhere it holds back.
const LOCATABLE = (() => {
  let fd;
  try { fd = fs.openSync(__filename, 'r'); return fs.readlinkSync(`/proc/self/fd/${fd}`).length > 0; }
  catch { return false; } finally { if (fd !== undefined) fs.closeSync(fd); }
})();
const HELD = /^not refreshed \(skipped — this platform cannot tell where an opened file really is/;
const CHANGED = /^changed during refresh \(skipped — what sits at the path was replaced after it was read/;
const SYMLINKS = process.platform !== 'win32';

test('PW-01 init installs the guide byte-for-byte and records it, and skips what is not its own', () => {
  // fresh project
  const fresh = tmp();
  const r = init.scaffold(fresh, ['claude']);
  assert.strictEqual(actionOf(r.actions, GUIDE), 'created');
  assert.strictEqual(fs.readFileSync(path.join(fresh, GUIDE), 'utf8'), PKG_GUIDE);
  assert.strictEqual(manifestOf(fresh)[GUIDE], sha(path.join(fresh, GUIDE)));
  // a user file already at the path: untouched, no entry
  const userFile = tmp();
  fs.mkdirSync(path.join(userFile, 'apriori', 'guides'), { recursive: true });
  fs.writeFileSync(path.join(userFile, GUIDE), 'my own notes\n');
  const u = init.scaffold(userFile, ['claude']);
  assert.strictEqual(actionOf(u.actions, GUIDE), 'skipped');
  assert.strictEqual(fs.readFileSync(path.join(userFile, GUIDE), 'utf8'), 'my own notes\n');
  assert.ok(!(GUIDE in manifestOf(userFile)), 'an existing file must never be adopted');
  // apriori/guides is a regular file: skipped with a reason
  const blocked = tmp();
  fs.mkdirSync(path.join(blocked, 'apriori'), { recursive: true });
  fs.writeFileSync(path.join(blocked, 'apriori', 'guides'), 'not a dir\n');
  const b = init.scaffold(blocked, ['claude']);
  assert.match(actionOf(b.actions, GUIDE), /not a regular file \(skipped/);
  assert.strictEqual(fs.readFileSync(path.join(blocked, 'apriori', 'guides'), 'utf8'), 'not a dir\n');
  if (SYMLINKS) {   // symlink creation needs privileges on Windows (update.test.js convention)
    // apriori/guides is a symlink out of the project: skipped, nothing written outside
    const esc = tmp(), outside = tmp();
    fs.mkdirSync(path.join(esc, 'apriori'), { recursive: true });
    fs.symlinkSync(outside, path.join(esc, 'apriori', 'guides'));
    const e = init.scaffold(esc, ['claude']);
    assert.match(actionOf(e.actions, GUIDE), /escapes the project root \(skipped/);
    assert.deepStrictEqual(fs.readdirSync(outside), [], 'nothing may be written outside the project');
    // batch review guide-1: what appears at the path after the checks — here a symlink to a file
    // outside the project, planted the moment apriori/guides is made — is never followed or overwritten
    const race = tmp(), victim = path.join(tmp(), 'victim.md');
    fs.writeFileSync(victim, 'outside\n');
    const realMkdir = fs.mkdirSync;
    fs.mkdirSync = function (p, o) {
      const r = realMkdir.call(fs, p, o);
      if (p === path.join(race, 'apriori', 'guides')) { fs.mkdirSync = realMkdir; fs.symlinkSync(victim, path.join(race, GUIDE)); }
      return r;
    };
    let ra;
    try { ra = init.scaffold(race, ['claude']); } finally { fs.mkdirSync = realMkdir; }
    assert.match(actionOf(ra.actions, GUIDE), /^changed during install \(skipped — something appeared at apriori\/guides\/prototype-walk\.md after the checks/);
    assert.strictEqual(fs.readFileSync(victim, 'utf8'), 'outside\n', 'the planted symlink must not be written through');
    assert.ok(!(GUIDE in manifestOf(race)), 'what the tool did not create gains no entry');
  }
  // batch review guide-2: the guide is recorded the moment it is created — an init that throws later
  // (its rules path is a directory) still leaves the guide owned
  const crash = tmp();
  fs.mkdirSync(path.join(crash, 'CLAUDE.md'));
  assert.throws(() => init.scaffold(crash, ['claude']), /EISDIR/);
  assert.strictEqual(fs.readFileSync(path.join(crash, GUIDE), 'utf8'), PKG_GUIDE);
  assert.strictEqual(manifestOf(crash)[GUIDE], sha(path.join(crash, GUIDE)));
  // dry run: reported, nothing written
  const dry = tmp();
  const d = init.scaffold(dry, ['claude'], { dryRun: true });
  assert.strictEqual(actionOf(d.actions, GUIDE), 'created');
  assert.ok(!fs.existsSync(path.join(dry, GUIDE)));
  // it ships
  assert.ok(JSON.parse(read('package.json')).files.includes('guides/'));
});

test('PW-02 the guide is installed once, then refreshed, protected or left alone by its manifest state', () => {
  // a project an older CLI initialized: no guide, no entry
  const aged = () => {
    const root = tmp();
    init.scaffold(root, ['claude']);
    fs.rmSync(path.join(root, 'apriori', 'guides'), { recursive: true, force: true });
    const files = manifestOf(root); delete files[GUIDE];
    managed.writeManifest(root, files);
    return root;
  };
  const root = aged();
  const first = update.run(root);
  assert.strictEqual(actionOf(first.actions, GUIDE), 'created (first install)');
  assert.strictEqual(fs.readFileSync(path.join(root, GUIDE), 'utf8'), PKG_GUIDE);
  assert.strictEqual(manifestOf(root)[GUIDE], sha(path.join(root, GUIDE)));
  // the summary counts it as a refresh (never "everything already matches" over a file it just wrote)
  const cliRoot = aged();
  const out = spawnSync('node', [BIN, 'update'], { cwd: cliRoot, encoding: 'utf8' });
  assert.strictEqual(out.status, 0, out.stderr);
  assert.match(out.stdout, /✓ apriori\/guides\/prototype-walk\.md {2}\(created \(first install\)\)/);
  assert.doesNotMatch(out.stdout, /everything already matches/);
  // second run
  assert.strictEqual(actionOf(update.run(root).actions, GUIDE), 'up-to-date');
  // the package's guide changed → updated and re-hashed
  const newer = path.join(tmp(), 'guide.md');
  fs.writeFileSync(newer, PKG_GUIDE + '\nA later edition.\n');
  if (LOCATABLE) {
    assert.strictEqual(actionOf(update.run(root, { guideSrc: newer }).actions, GUIDE), 'updated');
    assert.strictEqual(manifestOf(root)[GUIDE], sha(newer));
    assert.strictEqual(fs.readFileSync(path.join(root, GUIDE), 'utf8'), fs.readFileSync(newer, 'utf8'), 'the newer bytes are installed (batch review SST-4)');
  } else {                                        // held back where no descriptor can be located: bytes and entry unchanged
    const entryBefore = manifestOf(root)[GUIDE];
    assert.match(actionOf(update.run(root, { guideSrc: newer }).actions, GUIDE), HELD);
    assert.strictEqual(fs.readFileSync(path.join(root, GUIDE), 'utf8'), PKG_GUIDE);
    assert.strictEqual(manifestOf(root)[GUIDE], entryBefore);
  }
  // the user edited it → modified, bytes and entry kept
  fs.appendFileSync(path.join(root, GUIDE), '\nteam notes\n');
  const edited = fs.readFileSync(path.join(root, GUIDE), 'utf8'), entry = manifestOf(root)[GUIDE];
  assert.match(actionOf(update.run(root).actions, GUIDE), /^modified \(skipped/);
  assert.strictEqual(fs.readFileSync(path.join(root, GUIDE), 'utf8'), edited);
  assert.strictEqual(manifestOf(root)[GUIDE], entry);
  // the user deleted the listed guide → reported missing, not recreated (init's job)
  fs.rmSync(path.join(root, GUIDE));
  assert.match(actionOf(update.run(root).actions, GUIDE), /^missing \(skipped — recreating is init's job\)/);
  assert.ok(!fs.existsSync(path.join(root, GUIDE)));
  // an unlisted user file at the path → unmanaged, untouched
  const foreign = aged();
  fs.mkdirSync(path.join(foreign, 'apriori', 'guides'), { recursive: true });
  fs.writeFileSync(path.join(foreign, GUIDE), 'mine\n');
  assert.match(actionOf(update.run(foreign).actions, GUIDE), /^unmanaged \(skipped/);
  assert.strictEqual(fs.readFileSync(path.join(foreign, GUIDE), 'utf8'), 'mine\n');
  // batch review guide-2: an update that throws after installing the guide (a listed command path is a
  // directory) leaves it unrecorded; the next run adopts it on proof — its bytes are a shipped edition
  const crashed = aged();
  const cmd = path.join(crashed, '.claude', 'commands', 'apriori.md');
  fs.rmSync(cmd); fs.mkdirSync(cmd);
  assert.throws(() => update.run(crashed), /EISDIR/);
  assert.strictEqual(fs.readFileSync(path.join(crashed, GUIDE), 'utf8'), PKG_GUIDE);
  assert.ok(!(GUIDE in manifestOf(crashed)));
  fs.rmdirSync(cmd);
  if (LOCATABLE) {
    assert.strictEqual(actionOf(update.run(crashed).actions, GUIDE), 'adopted (its bytes are the shipped guide)');
    assert.strictEqual(manifestOf(crashed)[GUIDE], sha(path.join(crashed, GUIDE)));
    assert.strictEqual(actionOf(update.run(crashed).actions, GUIDE), 'up-to-date');
  } else {                                        // adoption records ownership on what was read: never on an unlocated read
    assert.match(actionOf(update.run(crashed).actions, GUIDE), HELD);
    assert.ok(!(GUIDE in manifestOf(crashed)));
  }
  // an earlier shipped edition left unrecorded is adopted and brought to the package's guide
  const earlier = aged();
  fs.mkdirSync(path.join(earlier, 'apriori', 'guides'), { recursive: true });
  fs.writeFileSync(path.join(earlier, GUIDE), '# an earlier edition\n');
  const gens = [sha(path.join(earlier, GUIDE))];
  const ADOPT = LOCATABLE ? /^adopted and updated/ : HELD;
  assert.match(actionOf(update.run(earlier, { dryRun: true, guideGenerations: gens }).actions, GUIDE), ADOPT);
  assert.strictEqual(fs.readFileSync(path.join(earlier, GUIDE), 'utf8'), '# an earlier edition\n', 'dry run writes nothing');
  assert.ok(!(GUIDE in manifestOf(earlier)));
  assert.match(actionOf(update.run(earlier, { guideGenerations: gens }).actions, GUIDE), ADOPT);
  if (LOCATABLE) {
    assert.strictEqual(fs.readFileSync(path.join(earlier, GUIDE), 'utf8'), PKG_GUIDE);
    assert.strictEqual(manifestOf(earlier)[GUIDE], sha(path.join(earlier, GUIDE)));
  } else {
    assert.strictEqual(fs.readFileSync(path.join(earlier, GUIDE), 'utf8'), '# an earlier edition\n');
    assert.ok(!(GUIDE in manifestOf(earlier)));
  }
  if (SYMLINKS) {   // symlink creation needs privileges on Windows (update.test.js convention)
    // round 1 BRF-R1: the hash judged and the bytes rewritten belong to one file — a symlink swapped in
    // between the read and the write (adoption of an earlier edition, and a listed guide's refresh) is
    // never written through; the run reports it and records nothing for it
    const swapAtWrite = (root, victim, fn) => {
      const abs = path.join(root, GUIDE), realOpen = fs.openSync;
      fs.openSync = function (p, flags, ...rest) {
        if (p === abs && typeof flags === 'number' && (flags & fs.constants.O_WRONLY)) {
          fs.openSync = realOpen;
          fs.renameSync(abs, abs + '.moved'); fs.symlinkSync(victim, abs);
        }
        return realOpen.call(fs, p, flags, ...rest);
      };
      try { return fn(); } finally { fs.openSync = realOpen; }
    };
    for (const listed of [false, true]) {
      const r = listed ? (() => { const x = tmp(); init.scaffold(x, ['claude']); return x; })() : aged();
      const victim = path.join(tmp(), 'victim.md');
      fs.writeFileSync(victim, 'outside\n');
      let opts;
      if (listed) opts = { guideSrc: newer };
      else {
        fs.mkdirSync(path.join(r, 'apriori', 'guides'), { recursive: true });
        fs.writeFileSync(path.join(r, GUIDE), '# an earlier edition\n');
        opts = { guideGenerations: [sha(path.join(r, GUIDE))] };
      }
      const before = manifestOf(r)[GUIDE];
      const res = swapAtWrite(r, victim, () => update.run(r, opts));
      assert.match(actionOf(res.actions, GUIDE), listed || LOCATABLE ? CHANGED : HELD, `listed=${listed}`);
      assert.strictEqual(fs.readFileSync(victim, 'utf8'), 'outside\n', `listed=${listed}: the swapped-in symlink must not be written through`);
      assert.strictEqual(manifestOf(r)[GUIDE], before, `listed=${listed}: nothing recorded for it`);
    }
    // round 2 BRF-R4: apriori/guides swapped for a symlink to an outside directory between the obstruction
    // check and the read — whose prototype-walk.md is an existing file with recognized bytes — is neither
    // adopted nor overwritten: containment is judged on the opened descriptor, not on the path checked earlier
    {
      const r = aged(), outside = tmp(), victim = path.join(outside, 'prototype-walk.md');
      fs.mkdirSync(path.join(r, 'apriori', 'guides'), { recursive: true });
      fs.writeFileSync(path.join(r, GUIDE), '# an earlier edition\n');
      fs.writeFileSync(victim, '# an earlier edition\n');
      const gens = [sha(victim)], abs = path.join(r, GUIDE), dir = path.join(r, 'apriori', 'guides'), realOpen = fs.openSync;
      fs.openSync = function (p, flags, ...rest) {
        if (p === abs && typeof flags === 'number' && !(flags & fs.constants.O_WRONLY)) {
          fs.openSync = realOpen;
          fs.renameSync(dir, dir + '.real'); fs.symlinkSync(outside, dir);
        }
        return realOpen.call(fs, p, flags, ...rest);
      };
      let res;
      try { res = update.run(r, { guideGenerations: gens }); } finally { fs.openSync = realOpen; }
      assert.match(actionOf(res.actions, GUIDE), /^changed during refresh \(skipped/);
      assert.strictEqual(fs.readFileSync(victim, 'utf8'), '# an earlier edition\n', 'the outside file must not be overwritten');
      assert.ok(!(GUIDE in manifestOf(r)), 'nothing outside the project is adopted');
    }
    // round 3 BRF-R4 (rest): redirect the directory for each open and restore it right after, so a pathname
    // checked afterwards looks fine — with the descriptor locatable (/proc) the read is refused; without it
    // the rewrite fails closed. The outside file is never adopted, truncated or overwritten either way.
    const flipAround = (r, outside, fn, noProc) => {
      const abs = path.join(r, GUIDE), dir = path.join(r, 'apriori', 'guides');
      const realOpen = fs.openSync, realReadlink = fs.readlinkSync;
      fs.openSync = function (p, flags, ...rest) {
        if (p !== abs) return realOpen.call(fs, p, flags, ...rest);
        fs.renameSync(dir, dir + '.real'); fs.symlinkSync(outside, dir);
        try { return realOpen.call(fs, p, flags, ...rest); }
        finally { fs.unlinkSync(dir); fs.renameSync(dir + '.real', dir); }
      };
      if (noProc) fs.readlinkSync = function (p, ...rest) {
        if (String(p).startsWith('/proc/self/fd/')) { const e = new Error('ENOENT'); e.code = 'ENOENT'; throw e; }
        return realReadlink.call(fs, p, ...rest);
      };
      try { return fn(); } finally { fs.openSync = realOpen; fs.readlinkSync = realReadlink; }
    };
    for (const noProc of [false, true]) {
      const r = aged(), outside = tmp(), victim = path.join(outside, 'prototype-walk.md');
      fs.mkdirSync(path.join(r, 'apriori', 'guides'), { recursive: true });
      fs.writeFileSync(path.join(r, GUIDE), '# an earlier edition\n');
      fs.writeFileSync(victim, '# an earlier edition\n');
      const res = flipAround(r, outside, () => update.run(r, { guideGenerations: [sha(victim)] }), noProc);
      assert.match(actionOf(res.actions, GUIDE), noProc || !LOCATABLE ? HELD : CHANGED, `noProc=${noProc}`);
      assert.strictEqual(fs.readFileSync(victim, 'utf8'), '# an earlier edition\n', `noProc=${noProc}: the outside file must stay as it was`);
      assert.ok(!(GUIDE in manifestOf(r)), `noProc=${noProc}: nothing adopted`);
    }
    // batch-recheck-fixes guide-R1: with no descriptor location, an outside file whose bytes are the CURRENT
    // guide (no rewrite needed) read through a redirect-and-restore is not adopted for the team's own
    // guide inside — adoption records ownership on what was read, so it wants the read located too
    for (const noProc of [false, true]) {
      const r = aged(), outside = tmp();
      fs.mkdirSync(path.join(r, 'apriori', 'guides'), { recursive: true });
      fs.writeFileSync(path.join(r, GUIDE), 'team-authored guide\n');
      fs.writeFileSync(path.join(outside, 'prototype-walk.md'), PKG_GUIDE);
      const res = flipAround(r, outside, () => update.run(r), noProc);
      assert.match(actionOf(res.actions, GUIDE), noProc || !LOCATABLE ? HELD : CHANGED, `noProc=${noProc}`);
      assert.strictEqual(fs.readFileSync(path.join(r, GUIDE), 'utf8'), 'team-authored guide\n');
      assert.ok(!(GUIDE in manifestOf(r)), `noProc=${noProc}: no ownership recorded for the team's guide`);
    }
  }
  // where the descriptor cannot be located, a guide needing a rewrite is held back — dry run and real run
  // alike — and the cure in the message still brings it current
  const noProcRun = (fn) => {
    const realReadlink = fs.readlinkSync;
    fs.readlinkSync = function (p, ...rest) {
      if (String(p).startsWith('/proc/self/fd/')) { const e = new Error('ENOENT'); e.code = 'ENOENT'; throw e; }
      return realReadlink.call(fs, p, ...rest);
    };
    try { return fn(); } finally { fs.readlinkSync = realReadlink; }
  };
  {
    const r = tmp(); init.scaffold(r, ['claude']);
    const entry = manifestOf(r)[GUIDE];
    for (const dryRun of [true, false])
      assert.match(actionOf(noProcRun(() => update.run(r, { guideSrc: newer, dryRun })).actions, GUIDE), /^not refreshed \(skipped — this platform cannot tell/, `dryRun=${dryRun}`);
    assert.strictEqual(fs.readFileSync(path.join(r, GUIDE), 'utf8'), PKG_GUIDE);
    assert.strictEqual(manifestOf(r)[GUIDE], entry);
    // an up-to-date guide needs no rewrite and is simply up-to-date there
    assert.strictEqual(actionOf(noProcRun(() => update.run(r)).actions, GUIDE), 'up-to-date');
    fs.rmSync(path.join(r, GUIDE)); init.scaffold(r, ['claude']);
    assert.strictEqual(manifestOf(r)[GUIDE], sha(path.join(r, GUIDE)), 'the delete-and-init cure records a fresh guide');
  }
  // a guide with another hard link is never rewritten in place: the rewrite would reach that other name too
  {
    const r = tmp(); init.scaffold(r, ['claude']);
    const other = path.join(tmp(), 'linked-guide.md');
    fs.linkSync(path.join(r, GUIDE), other);
    for (const dryRun of [true, false])
      assert.match(actionOf(update.run(r, { guideSrc: newer, dryRun }).actions, GUIDE), /^not refreshed \(skipped — the guide has other hard links/, `dryRun=${dryRun}`);
    assert.strictEqual(fs.readFileSync(other, 'utf8'), PKG_GUIDE, 'the other name keeps its bytes');
  }
  // the shipped-edition table carries the live guide and every edition shipped before it
  for (const h of [sha(path.join(ROOT, 'guides', 'prototype-walk.md')),
    'sha256:3d4e6dce8590ddb1207099e9a6ba1f70f61e28d46a10ec027773c59038f2b968',     // c290842
    'sha256:551c6686be36479d352ca3b364bd05dcdbda00b8ae40966bd50367f7c38255a7'])    // e22e8d8
    assert.ok(managed.GUIDE_GENERATIONS.includes(h), `GUIDE_GENERATIONS lacks ${h}`);
  // batch review guide-3: the summary never says everything matches over a guide it could not refresh
  for (const spoil of [(r) => fs.rmSync(path.join(r, GUIDE)), (r) => { fs.rmSync(path.join(r, GUIDE)); fs.mkdirSync(path.join(r, GUIDE)); }]) {
    const r = tmp(); init.scaffold(r, ['claude']); spoil(r);
    const o = spawnSync('node', [BIN, 'update'], { cwd: r, encoding: 'utf8' });
    assert.strictEqual(o.status, 0, o.stderr);
    assert.doesNotMatch(o.stdout, /everything already matches/);
    assert.match(o.stdout, /1 missing or obstructed \(skipped\) — not refreshed; see the lines above\./);
  }
  // dry run on a project without it: reported, neither the guide nor the manifest written
  const dryRoot = aged();
  const mBefore = fs.readFileSync(path.join(dryRoot, 'apriori', 'managed.json'), 'utf8');
  assert.strictEqual(actionOf(update.run(dryRoot, { dryRun: true }).actions, GUIDE), 'created (first install)');
  assert.ok(!fs.existsSync(path.join(dryRoot, GUIDE)));
  assert.strictEqual(fs.readFileSync(path.join(dryRoot, 'apriori', 'managed.json'), 'utf8'), mBefore);
  if (SYMLINKS) {   // symlink creation needs privileges on Windows (update.test.js convention)
    // PW-R1 (review round 1): every update branch refuses to hash or write through what is not a plain file
    // in a plain directory — a listed guide swapped for a symlink whose target still matches the hash
    const swapped = tmp(); init.scaffold(swapped, ['claude']);
    const elsewhere = path.join(swapped, 'docs', 'moved-guide.md');
    fs.mkdirSync(path.dirname(elsewhere), { recursive: true });
    fs.renameSync(path.join(swapped, GUIDE), elsewhere);
    fs.symlinkSync(elsewhere, path.join(swapped, GUIDE));
    const sw = update.run(swapped, { guideSrc: newer });
    assert.match(actionOf(sw.actions, GUIDE), /^not a regular file \(skipped — a symlink sits at/);
    assert.strictEqual(fs.readFileSync(elsewhere, 'utf8'), PKG_GUIDE, 'the symlink target must not be written through');
    // apriori/guides itself a symlink to a directory inside the project
    const linkedDir = tmp(); init.scaffold(linkedDir, ['claude']);
    fs.renameSync(path.join(linkedDir, 'apriori', 'guides'), path.join(linkedDir, 'real-guides'));
    fs.symlinkSync(path.join(linkedDir, 'real-guides'), path.join(linkedDir, 'apriori', 'guides'));
    const ld = update.run(linkedDir, { guideSrc: newer });
    assert.match(actionOf(ld.actions, GUIDE), /^not a regular file \(skipped — something other than a plain directory sits at apriori\/guides/);
    assert.strictEqual(fs.readFileSync(path.join(linkedDir, 'real-guides', 'prototype-walk.md'), 'utf8'), PKG_GUIDE);
  }
  // a directory at the guide's path: reported, no crash, the rest of the update still lands
  const dirAt = tmp(); init.scaffold(dirAt, ['claude']);
  fs.rmSync(path.join(dirAt, GUIDE)); fs.mkdirSync(path.join(dirAt, GUIDE));
  fs.writeFileSync(path.join(dirAt, 'apriori', 'runbook.md'), '# older runbook\n');
  const mf = manifestOf(dirAt); mf['apriori/runbook.md'] = sha(path.join(dirAt, 'apriori', 'runbook.md')); managed.writeManifest(dirAt, mf);
  const da = update.run(dirAt);
  assert.match(actionOf(da.actions, GUIDE), /^not a regular file \(skipped — a directory or other non-file sits at/);
  assert.strictEqual(actionOf(da.actions, 'apriori/runbook.md'), 'updated');
  assert.strictEqual(manifestOf(dirAt)['apriori/runbook.md'], sha(path.join(dirAt, 'apriori', 'runbook.md')));
  if (SYMLINKS) {   // symlink creation needs privileges on Windows (update.test.js convention)
    // an unlisted dangling symlink is reported, not silently passed over
    const dangling = aged();
    fs.mkdirSync(path.join(dangling, 'apriori', 'guides'), { recursive: true });
    fs.symlinkSync(path.join(dangling, 'nowhere.md'), path.join(dangling, GUIDE));
    assert.match(actionOf(update.run(dangling).actions, GUIDE), /^not a regular file \(skipped — a symlink sits at/);
    assert.ok(!fs.existsSync(path.join(dangling, 'nowhere.md')));
  }
});

test('PW-03 doctor reports a missing guide the runbook names, and nothing otherwise', () => {
  const healthy = () => {
    const root = tmp();
    init.scaffold(root, ['claude']);
    return root;
  };
  const TAP_OK = `node -e "console.log('TAP version 13\\n1..1\\nok 1 - fine')"`;
  const guideFindings = (r) => r.checks.filter((c) => c.id === 'D2' && c.status === 'finding' && c.detail.includes(GUIDE));
  const ok = doctor.runDoctor({ cwd: healthy(), testCmd: TAP_OK });
  assert.strictEqual(guideFindings(ok).length, 0, JSON.stringify(ok.checks));
  assert.strictEqual(ok.result, 'HEALTHY', JSON.stringify(ok.checks));      // batch review SST-6
  assert.strictEqual(ok.code, 0);
  const gone = healthy(); fs.rmSync(path.join(gone, GUIDE));
  const g = guideFindings(doctor.runDoctor({ cwd: gone, testCmd: TAP_OK }));
  assert.strictEqual(g.length, 1);
  assert.match(g[0].detail, /missing — the runbook names it/);
  assert.match(g[0].fix, /apriori update/);
  const dir = healthy(); fs.rmSync(path.join(dir, GUIDE)); fs.mkdirSync(path.join(dir, GUIDE));
  const dg = guideFindings(doctor.runDoctor({ cwd: dir, testCmd: TAP_OK }));
  assert.strictEqual(dg.length, 1);
  assert.match(dg[0].detail, /is not a regular file/);
  assert.match(dg[0].fix, /apriori update/);                                  // batch review SST-6
  if (SYMLINKS) {   // symlink creation needs privileges on Windows (update.test.js convention)
    // batch review guide-4: judged by lstat, as update judges it — a symlink to a good file in the
    // project, and apriori/guides as a symlink, are each one finding with the move-aside cure
    const ln = healthy(), moved = path.join(ln, 'docs', 'guide.md');
    fs.mkdirSync(path.dirname(moved), { recursive: true });
    fs.renameSync(path.join(ln, GUIDE), moved); fs.symlinkSync(moved, path.join(ln, GUIDE));
    const lnr = doctor.runDoctor({ cwd: ln, testCmd: TAP_OK });
    const lg = guideFindings(lnr);
    assert.strictEqual(lg.length, 1, JSON.stringify(lnr.checks));
    assert.match(lg[0].detail, /is not a regular file \(a symlink sits at apriori\/guides\/prototype-walk\.md\)/);
    assert.match(lg[0].fix, /^move it aside, then apriori update/);
    assert.strictEqual(lnr.result, 'FINDINGS');
    const ld = healthy();
    fs.renameSync(path.join(ld, 'apriori', 'guides'), path.join(ld, 'real-guides'));
    fs.symlinkSync(path.join(ld, 'real-guides'), path.join(ld, 'apriori', 'guides'));
    const ldg = guideFindings(doctor.runDoctor({ cwd: ld, testCmd: TAP_OK }));
    assert.strictEqual(ldg.length, 1);
    assert.match(ldg[0].detail, /something other than a plain directory sits at apriori\/guides/);
  }
  const noRb = healthy(); fs.rmSync(path.join(noRb, GUIDE)); fs.rmSync(path.join(noRb, 'apriori', 'runbook.md'));
  const nr = doctor.runDoctor({ cwd: noRb, testCmd: TAP_OK });
  assert.strictEqual(guideFindings(nr).length, 0);
  assert.ok(nr.checks.some((c) => c.id === 'D2' && c.status === 'finding' && /apriori\/runbook\.md/.test(c.detail)));
});

test('PW-04 Ground carries the offer, the once-per-requirement rule and the read-before-running pointer, and the header names the guide', () => {
  const EN = read('RUNBOOK.md');
  const bullet = flat(EN.match(/^- \*\*A runnable UI prototype among the sources\.\*\*.*$/m)[0]);
  assert.match(bullet, /sources include a runnable UI prototype meant as an acceptance basis, and nothing on record walks it for this scope \(a `checklist\.md` registered from a walk of the same prototype version\)/);
  assert.match(bullet, /offer the owner an optional \*\*prototype walk\*\* — once per requirement, when its sources are first registered; record their answer as a `decision`/);
  assert.match(bullet, /If they already authorized a walk, run it; if they already chose, do not ask again\./);
  assert.match(bullet, /Screenshots or a static design are not a runnable prototype\./);
  assert.match(bullet, /\*\*Before you run a walk, read `apriori\/guides\/prototype-walk\.md` in full and follow it\.\*\*/);
  // batch review PW-1: a recorded owner decision comes before the requirement sources
  assert.match(bullet, /the prototype's own defects follow the owner's recorded decisions first, then the requirement sources, and only what nothing settles goes to the owner as an `## Open` item/);
  assert.match(bullet, /Skipping the walk skips none of the source checks \(P2\)\./);
  // it sits in Ground, right after the source-material rule
  const ground = EN.slice(EN.indexOf('### Ground'), EN.indexOf('### Specify'));
  assert.ok(ground.indexOf('**A runnable UI prototype among the sources.**') > ground.indexOf('**Discussion held elsewhere is source material'));
  const header = EN.slice(0, EN.search(/^## /m));
  assert.match(flat(header), /This file is self-contained but for one guide: .* except the prototype-walk procedure, which lives in `apriori\/guides\/prototype-walk\.md` \(installed beside this copy\) and is read only when a walk runs \(§4 Ground\)\./);
  const p3 = EN.match(/### P3 [\s\S]*?(?=### P4 )/);
  assert.strictEqual(crypto.createHash('sha256').update(p3[0]).digest('hex').slice(0, 16), '97a85ca560d41c70');
});

test('PW-05 the guide carries its entry, method, checklist fields and four constraints, and both operator editions point a human at it', () => {
  const g = PKG_GUIDE;
  for (const p of ['`PROTOTYPE`', '`SOURCES`', '`SCOPE`', '`CAPS`', '`OUT`', '`SCRATCH`']) assert.ok(g.includes(`| ${p} |`), `entry parameter ${p}`);
  assert.match(g, /Walk the prototype `<PROTOTYPE>` against `<SOURCES>` per `apriori\/guides\/prototype-walk\.md`, scope `<SCOPE>`\./);
  for (const h of ['### 3.1 Static interaction analysis', '### 3.2 Serve it locally', '### 3.3 Runtime discovery', '### 3.4 UI state model',
                   '### 3.5 State signature and de-duplication', '### 3.6 Traversal', '### 3.7 Interactions and boundaries to cover',
                   '### 3.8 Path explosion control', '### 3.9 Errors', '### 3.10 Screenshots', '### 3.11 Coverage'])
    assert.ok(g.includes(h), h);
  const checklist = g.slice(g.indexOf('## 5. '), g.indexOf('## 6. '));
  for (const f of ['ID', 'version', 'observable', 'evidence', 'scope', 'ruling', 'implementation', 'verification'])
    assert.match(checklist, new RegExp('\\| `' + f + '` \\|'), `checklist field ${f}`);
  assert.match(flat(checklist), /keep \*\*one\*\* progress source: do not fork a second ledger elsewhere/);
  // PW-R2: scope (must the delivery show it?) is apart from ruling (how?); a corrected defect is an `in` row
  assert.match(flat(checklist), /\| `scope` \| whether the delivery must show this row: `in` · `out`/);
  assert.match(flat(checklist), /\| `ruling` \| how the delivery shows it: `as prototype` · `corrected — <source line or recorded decision>`/);
  assert.match(flat(checklist), /A prototype defect the sources correct is an `in` row with ruling `corrected — …`: the delivery must show the corrected behaviour, and it is reconciled like every other `in` row — against its ruling, not against the prototype/);
  assert.doesNotMatch(g, /not-reproduced/);
  // PW-R3: cited evidence survives the archive
  assert.match(flat(checklist), /\| `evidence` \| where it was read: a screenshot kept under `OUT\/evidence\/`/);
  assert.match(flat(g), /A screenshot a checklist row cites is kept in `OUT\/evidence\/` — it is that row's evidence and must survive the archive/);
  // PW-R4: reuse the covered scope; continue an authorized walk for what it did not cover
  assert.match(flat(g), /reuses it for the scope it covered at that prototype version\. It does not re-walk what is covered; with the owner's authorization it \*\*continues\*\* the same walk for what is not/);
  assert.match(flat(g), /The runbook's once-per-requirement offer is about starting a walk; finishing one the owner authorized needs no new offer\./);
  // PW-R5: an archived checklist is frozen — continuation and reconciliation go to a successor in the current change
  assert.match(flat(g), /once it is archived, its bundle is frozen \(§4\) — never edit it\. Instead start a \*\*successor\*\* `checklist\.md` in the current change's `OUT`: carry every row over with its id, sources and evidence references/);
  assert.match(flat(g), /From then on the successor is the one current progress source; the archived predecessor is history\./);
  assert.match(flat(g), /in the current checklist, which for an archived walk is a successor in the current change \(§9\)(?: or, for a requirement-level check, in the requirement's document directory \(§9\))? — never the frozen original|in the current checklist, which for an archived walk is a successor in the current change \(§9\), never the frozen original/);   // requirement-check-recipe added the requirement-directory exception
  assert.doesNotMatch(flat(g), /adding rows to the same checklist/);
  assert.match(flat(checklist), /Ticking is not proof: the check also looks at the assertion behind each tick and the conditions it ran under/);
  const constraints = flat(g.slice(g.indexOf('## 6. '), g.indexOf('## 7. ')));
  assert.match(constraints, /1\. \*\*Equivalence is justified \(§3\.5\)\.\*\*.*keep injected states apart from user-reachable ones/);
  assert.match(constraints, /2\. \*\*Caps are set before running and never become a claim\.\*\*.*it is never "fully covered"/);
  assert.match(constraints, /3\. \*\*Tools are optional prerequisites, not new dependencies\.\*\*.*apriori-cli does not install or require them.*The prototype itself stays unmodified/);
  assert.match(constraints, /4\. \*\*Isolation and scrubbing\.\*\*.*masking the screenshots alone is not enough/);
  // batch review SST-3: the isolation and scrubbing instructions themselves, not just the heading
  assert.match(constraints, /Use made-up data, never real customer or personal data\./);
  assert.match(constraints, /Block or avoid calls to external services; if the prototype makes one, record it without letting it reach anyone\./);
  assert.match(constraints, /Scrub everything written — screenshots, action logs, input values, storage dumps, error stacks — of tokens, keys, phone numbers, addresses and anything personal/);
  // batch review PW-1: who decides — recorded owner decisions first, then the sources
  const s4 = flat(g.slice(g.indexOf('## 4. '), g.indexOf('## 5. ')));
  assert.match(s4, /Who decides: the owner's recorded decisions first, then the requirement sources\. A valid owner decision on record settles what it names even where a source line says otherwise/);
  assert.match(s4, /ruling `corrected — <decision or source line>`/);
  assert.doesNotMatch(s4, /in that order/);
  // batch review PW-2: a walk before any change exists registers nothing, creates no change, and hands its owner rows on by id
  const s9 = flat(g.slice(g.indexOf('## 9. ')));
  assert.match(s9, /\*\*A walk run before any change exists\*\* \(the owner authorized the walk alone; `OUT` is a path they named\) registers nothing yet and creates no change — the walk never runs `apriori new`/);
  assert.match(s9, /Each row awaiting the owner gets the ruling `owner — <its own row id>`, and `REPORT\.md` and the final message list every such row by id\./);
  assert.match(s9, /opens those rows as `## Open` items under the same ids/);
  assert.match(flat(g.slice(g.indexOf('## 7. '), g.indexOf('## 8. '))), /every unsettled row pointing at an `## Open` item — or, for a walk before any change exists, listed by its id in `REPORT\.md` for the change that registers it \(§9\)/);
  assert.match(flat(g), /If anything is still uncovered, the report says so; it never says "all done"\./);
  assert.match(g, /`observed: <OUT>\/checklist\.md — prototype <version>, walked <date>;/);
  // generalized: none of one requirement's own components are rules here
  assert.doesNotMatch(g, /运维|工单|企微|Notification Channels|Region Picker|People Picker|Project Picker/);
  assert.match(flat(read('docs/operator.md')), /\*\*Prototype walk \(optional, before the contract\):\*\*.*per `apriori\/guides\/prototype-walk\.md`.*Playwright or an equivalent.*The checklist is source material: it authorizes nothing/);
  assert.match(flat(read('docs/operator_cn.md')), /\*\*原型走查\(可选,在写契约之前\):\*\*.*`apriori\/guides\/prototype-walk\.md`.*Playwright 或同类.*清单是来源材料:它不授权任何事/);
});

test('PW-06 MIGRATING names the first install and the downgrade limit', () => {
  const m = read('MIGRATING.md');
  const sec = flat(m.slice(m.indexOf('## prototype-walk-guide'), m.indexOf('\n## ', m.indexOf('## prototype-walk-guide') + 5)));
  assert.match(sec, /`apriori update` installs `apriori\/guides\/prototype-walk\.md`\*\* on a project that never had it/);
  assert.match(sec, /A guide you edited locally is reported `modified` and left alone/);
  assert.match(sec, /\*\*Downgrading is not supported\*\* once the guide is recorded: a CLI from before this change refuses a manifest that lists it \(`managed\.json: 'apriori\/guides\/prototype-walk\.md' is not a refresh target`\)/);
});
