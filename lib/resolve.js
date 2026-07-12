'use strict';
/*
 * Shared change-resolution helpers — one home so gate, status, and archive-merge
 * can all use them without a require cycle (this module requires no lib sibling).
 */
const fs = require('fs');
const path = require('path');

const CHANGE_NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;   // bare kebab-case — same rule as `apriori new`
const RESERVED_NAMES = new Set(['archive']);

// single source of name truth (resolver-trust): shape, date-prefix, reserved — callers
// keep their own per-kind messages (machine kind, human wording stays theirs)
function validateChangeName(name) {
  if (name && /^\d{4}-\d{2}/.test(name)) return { ok: false, kind: 'date-prefixed' };  // date-looking FIRST — `2026-07-10T1200-x` is date-prefixed, not merely mis-shaped
  if (!name || !CHANGE_NAME_RE.test(name)) return { ok: false, kind: 'invalid-shape' };
  if (RESERVED_NAMES.has(name)) return { ok: false, kind: 'reserved' };
  return { ok: true };
}

// archived stamp semantics: Gregorian round-trip (leap days legal, 2/31 illegal) + clock ranges
function stampValid(stamp) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})(\d{2})$/.exec(stamp);
  if (!m) return false;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  if (h > 23 || mi > 59) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

// a trust root must be a real directory reachable without links
function rootDefect(p, label) {
  let st;
  try { st = fs.lstatSync(p); } catch { return null; }      // absent roots are handled by callers
  if (st.isSymbolicLink()) return `${label} is a symlink: ${p}`;
  if (!st.isDirectory()) return `${label} is not a directory: ${p}`;
  return null;
}

// realpath containment (own copy — importing archive-merge's would create a cycle)
function containsReal(root, target) {
  let realRoot;
  try { realRoot = fs.realpathSync(root); } catch { return false; }
  let real;
  try { real = fs.realpathSync(target); } catch { return false; }
  return real === realRoot || real.startsWith(realRoot + path.sep);
}

// stage resolution: in-flight first, else newest archived (exact stamp regex, lexicographic last).
// NAME IS NOT VALIDATED HERE — callers gate on CHANGE_NAME_RE first (a raw name reaches the regex below).
function resolveChange(cwd, name) {
  const changesDir = path.join(cwd, 'apriori', 'changes');
  const archRoot = path.join(changesDir, 'archive');
  // trust roots first: symlinked/non-directory roots are structural, and the archive
  // root must realpath-contain within the changes root (resolver-trust)
  const cd = rootDefect(changesDir, 'changes root');
  if (cd) return { error: cd };
  const ad = rootDefect(archRoot, 'archive root');
  if (ad) return { error: ad };
  if (fs.existsSync(archRoot) && !containsReal(changesDir, archRoot))
    return { error: `archive root escapes ${changesDir}` };
  // active candidate: ONLY a real directory by lstat — any symlink (dangling or resolving,
  // wherever it points) is structural, never a silent fallback to the archive
  const inflight = path.join(changesDir, name);
  let ist = null;
  try { ist = fs.lstatSync(inflight); } catch { /* absent */ }
  if (ist) {
    if (ist.isSymbolicLink()) return { error: `active change entry is a symlink: ${inflight}` };
    if (!ist.isDirectory()) return { error: `active change entry is not a directory: ${inflight}` };
    if (!containsReal(changesDir, inflight)) return { error: `change path escapes ${changesDir}` };
    return { stage: 'in-flight', dir: inflight };
  }
  if (fs.existsSync(archRoot)) {
    const re = new RegExp(`^(\\d{4}-\\d{2}-\\d{2}T\\d{4})-${name}$`);
    const hits = [];
    for (const b of fs.readdirSync(archRoot)) {
      const m = re.exec(b);
      if (!m) continue;                                     // unrelated entries are doctor/check business
      const p = path.join(archRoot, b);
      let st;
      try { st = fs.lstatSync(p); } catch { continue; }
      if (st.isSymbolicLink()) return { error: `archived change entry is a symlink: ${p}` };
      if (!st.isDirectory()) continue;                      // a stray file with a stamp name is ignored
      if (!stampValid(m[1])) return { error: `archived change entry carries an illegal stamp: ${b}` };
      hits.push(b);
    }
    hits.sort();
    if (hits.length) {
      const dir = path.join(archRoot, hits[hits.length - 1]);
      if (!containsReal(archRoot, dir)) return { error: `archived change path escapes ${archRoot}` };
      return { stage: 'archived', dir };
    }
  }
  return { error: `change '${name}' found neither at ${inflight} nor under ${archRoot}` };
}

// process-config `| cas | optional |` row — the project-level twin of --no-cas (flag wins).
// Structured read (config-contract): fenced/commented rows grant nothing; a conflict is a
// consumption-time problem, never a waiver. Returns the leading value token or null;
// configCasProblem() surfaces the conflict for consumers that must fail closed on it.
function configCas(cwd) {
  const { value, problem } = require('./config').getConfig(cwd, 'cas');
  if (problem || value === null) return null;
  const tok = value.trim().split(/\s+/)[0].toLowerCase();
  return tok === 'optional' || tok === 'required' ? tok : null;   // illegal values never waive
}
function configCasProblem(cwd) {
  const { value, problem } = require('./config').getConfig(cwd, 'cas');
  if (problem) return problem;
  if (value !== null) {
    const tok = value.trim().split(/\s+/)[0].toLowerCase();
    if (tok !== 'optional' && tok !== 'required')
      return `process-config 'cas' value '${tok}' is not in {optional, required}`;
  }
  return null;
}

// pre-4.0 scattered roots — existence-level probes only (lstat, never followed or read through)
const LEGACY_ROOTS = ['requirement', 'spike', 'apriori/review', 'apriori/design', 'apriori/explore'];
function legacyRoots(root) {
  const hits = [];
  for (const rel of LEGACY_ROOTS) {
    try { fs.lstatSync(path.join(root, ...rel.split('/'))); hits.push(rel + '/'); } catch { /* absent */ }
  }
  return hits;
}

// file-level read guard: a path the tool is about to read must be a REGULAR file
// contained (realpath) within its bundle. Returns null (safe) or a STRUCTURED defect
// { kind: 'missing'|'symlink'|'not-file'|'bad-ancestor'|'escape', path } — consumers
// switch on kind, never on message prefixes (resolver-trust). A missing leaf walks
// its ancestors up to the bundle root: a symlinked/non-directory ancestor is a
// bad-ancestor defect; only a cleanly-absent chain is 'missing'.
function fileReadDefect(bundleDir, p) {
  let st;
  try { st = fs.lstatSync(p); } catch {
    let cur = path.dirname(p);
    const stop = path.resolve(bundleDir);
    while (cur.startsWith(stop)) {
      let ast = null;
      try { ast = fs.lstatSync(cur); } catch { /* keep walking */ }
      if (ast) {
        if (ast.isSymbolicLink() || !ast.isDirectory()) return { kind: 'bad-ancestor', path: cur };
        break;                                             // nearest existing ancestor is a clean dir
      }
      if (cur === stop) break;
      cur = path.dirname(cur);
    }
    return { kind: 'missing', path: p };
  }
  if (st.isSymbolicLink()) return { kind: 'symlink', path: p };
  if (!st.isFile()) return { kind: 'not-file', path: p };
  if (!containsReal(bundleDir, p)) return { kind: 'escape', path: p };
  if (!containsReal(bundleDir, p)) return { kind: 'escape', path: p };
  return null;
}

module.exports = { CHANGE_NAME_RE, containsReal, resolveChange, configCas, configCasProblem, legacyRoots, fileReadDefect, validateChangeName, stampValid };
