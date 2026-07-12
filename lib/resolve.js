'use strict';
/*
 * Shared change-resolution helpers — one home so gate, status, and archive-merge
 * can all use them without a require cycle (this module requires no lib sibling).
 */
const fs = require('fs');
const path = require('path');

const CHANGE_NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;   // bare kebab-case — same rule as `apriori new`

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
  const inflight = path.join(changesDir, name);
  if (fs.existsSync(inflight)) {
    if (!containsReal(changesDir, inflight)) return { error: `change path escapes ${changesDir}` };
    return { stage: 'in-flight', dir: inflight };
  }
  const archRoot = path.join(changesDir, 'archive');
  if (fs.existsSync(archRoot)) {
    const re = new RegExp(`^\\d{4}-\\d{2}-\\d{2}T\\d{4}-${name}$`);
    // candidates must be DIRECTORIES (following symlinks) — a stray file with a stamp name is ignored
    const hits = fs.readdirSync(archRoot).filter((b) => {
      if (!re.test(b)) return false;
      try { return fs.statSync(path.join(archRoot, b)).isDirectory(); } catch { return false; }
    }).sort();
    if (hits.length) {
      const dir = path.join(archRoot, hits[hits.length - 1]);
      // containment against the ARCHIVE root — a symlink pointing elsewhere under changes/ is still an escape
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
// contained (realpath) within its bundle — returns null when safe, else the defect
function fileReadDefect(bundleDir, p) {
  let st;
  try { st = fs.lstatSync(p); } catch { return `missing: ${p}`; }
  if (st.isSymbolicLink()) return `symlink: ${p}`;
  if (!st.isFile()) return `not a regular file: ${p}`;
  if (!containsReal(bundleDir, p)) return `escapes the change dir: ${p}`;
  return null;
}

module.exports = { CHANGE_NAME_RE, containsReal, resolveChange, configCas, configCasProblem, legacyRoots, fileReadDefect };
