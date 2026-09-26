'use strict';
/**
 * archive-manifest.json — what an archived bundle contained at archive time.
 *
 * One reading for the writer (archive --write) and the reader (check): the same walk, the
 * same hashing, the same exclusion. Regular files are hashed as a stream of chunks (review
 * raws run to megabytes); a symbolic link is recorded as `link:<target>` and never followed;
 * directories are traversed; anything else is skipped. The manifest never lists itself, nor
 * the one temporary file the current run owns — every other occupant of the bundle, whatever
 * its name, is inventoried.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MANIFEST_NAME = 'archive-manifest.json';
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// chunked, synchronous — archive-merge is a synchronous transaction, and the file may be large
function hashFileSync(p, ops) {
  const open = (ops && ops.openSync) || fs.openSync;
  const fd = open(p, 'r');
  try {
    const h = crypto.createHash('sha256');
    const buf = Buffer.allocUnsafe(1 << 16);
    for (;;) {
      const n = fs.readSync(fd, buf, 0, buf.length, null);
      if (n === 0) break;
      h.update(n === buf.length ? buf : buf.subarray(0, n));
    }
    return 'sha256:' + h.digest('hex');
  } finally { fs.closeSync(fd); }
}

// -> null-prototype map { <relative path with '/' separators>: 'sha256:<hex>' | 'link:<target>' },
// keys sorted. A file named `__proto__` or `constructor` is a file like any other.
// `hash: false` lists the entries without reading contents (dry-run counting);
// `exclude` names root-level entries the current run owns and must not inventory.
function listBundle(bundleDir, { ops, hash = true, exclude = [] } = {}) {
  const files = Object.create(null);
  const skip = new Set([MANIFEST_NAME, ...exclude]);
  (function walk(dir, rel) {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const e of entries) {
      const p = path.join(dir, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (!rel && skip.has(e.name)) continue;                     // never lists itself or its own temp
      if (e.isSymbolicLink()) files[r] = 'link:' + fs.readlinkSync(p);
      else if (e.isDirectory()) walk(p, r);
      else if (e.isFile()) files[r] = hash ? hashFileSync(p, ops) : 'sha256:?';
      // sockets, fifos, devices: skipped — a bundle has no business carrying them
    }
  })(bundleDir, '');
  return files;
}

// A run-owned temporary name: unique, so no pre-existing occupant is ever opened or removed
function ownTempName() {
  return `${MANIFEST_NAME}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
}

function build(bundleDir, { change, stamp, ops, exclude } = {}) {
  return { manifest: 1, change, stamp, files: listBundle(bundleDir, { ops, hash: true, exclude }) };
}

// Publish into the bundle: EXCLUSIVE create of the run-owned temp (`wx` — an existing entry at
// that name, symlink included, fails instead of being followed or truncated), write through
// the descriptor, then rename onto the final name. rename() replaces whatever entry sits at the
// final path — a stale symlink included — with THIS regular file, and never writes through it.
// Only the temp this run created is ever removed. `ops.openSync` / `ops.writeSync` are the
// injectable seams (openSync shared with the hashing side); the rename is fs's own because the
// swap is internal to the bundle, not part of the store commit or the move.
function writeInto(bundleDir, manifest, ops, tmpName) {
  const open = (ops && ops.openSync) || fs.openSync;
  const writeSync = (ops && ops.writeSync) || fs.writeSync;
  const final = path.join(bundleDir, MANIFEST_NAME), tmp = path.join(bundleDir, tmpName || ownTempName());
  let fd = null, created = false;
  try {
    fd = open(tmp, 'wx');
    created = true;
    // every byte, or nothing published: writeSync may return a short count (a filling disk),
    // so loop until the buffer is drained and treat zero progress as a failure
    const buf = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
    for (let off = 0; off < buf.length;) {
      const n = writeSync(fd, buf, off, buf.length - off, null);
      if (!(n > 0)) throw new Error(`short write: ${off} of ${buf.length} bytes written`);
      off += n;
    }
    fs.fsyncSync(fd);
    fs.closeSync(fd); fd = null;
    fs.renameSync(tmp, final);
  } catch (e) {
    if (fd !== null) { try { fs.closeSync(fd); } catch { /* best effort */ } }
    if (created) { try { fs.rmSync(tmp, { force: true }); } catch { /* best effort */ } }
    throw e;
  }
  return final;
}

// -> { ok, manifest?, error? } — a missing manifest is `{ok:false, missing:true}`
function read(bundleDir) {
  const p = path.join(bundleDir, MANIFEST_NAME);
  if (!fs.existsSync(p)) return { ok: false, missing: true };
  try {
    const m = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!m || typeof m !== 'object' || typeof m.files !== 'object' || m.files === null || Array.isArray(m.files)) return { ok: false, error: 'no files object' };
    return { ok: true, manifest: m };
  } catch (e) { return { ok: false, error: e.message }; }
}

// -> { added: [], removed: [], modified: [] } comparing recorded vs actual listings; own
// properties only on both sides, so inherited names never masquerade as entries
function diff(recorded, actual) {
  const added = [], removed = [], modified = [];
  for (const k of Object.keys(actual)) {
    if (!hasOwn(recorded, k)) added.push(k);
    else if (recorded[k] !== actual[k]) modified.push(k);
  }
  for (const k of Object.keys(recorded)) if (!hasOwn(actual, k)) removed.push(k);
  return { added: added.sort(), removed: removed.sort(), modified: modified.sort() };
}

module.exports = { MANIFEST_NAME, hashFileSync, listBundle, build, writeInto, read, diff, ownTempName };
