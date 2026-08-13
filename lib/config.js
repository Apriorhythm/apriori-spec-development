'use strict';
/*
 * process-config parses as structure, never as full-text regex (config-contract).
 * One shared reader for every consumer: fenced code blocks and HTML comments are
 * non-content (unterminated blocks make the rest of the file inert — naturally
 * fail-closed for waiver keys); a config row is any |-leading table row, first
 * cell key, second cell value, extra columns ignored; same-key same-value
 * duplicates are tolerated, different values are a CONFLICT problem. Problems
 * surface only when the key is actually consumed.
 */
const fs = require('fs');
const path = require('path');

// The built-in scenario-ID pattern. Lives here (zero-dep module) so every consumer —
// spec-runner, gate, check, doctor — resolves through one place; spec-runner re-exports it.
const DEFAULT_ID = '[A-Z]+-\\d+';

// Cell splitting honors the markdown pipe escape by backslash parity (CF-08/CF-09):
// an odd run of backslashes before a pipe escapes it (the escaping backslash is removed,
// the pipe joins the value); an even run keeps the pipe a separator, backslashes literal.
// No other backslash sequence is ever unescaped — this is not a markdown renderer.
function splitCells(line) {
  const cells = [];
  let cur = '', run = 0;
  for (const ch of line) {
    if (ch === '\\') { run++; cur += ch; continue; }
    if (ch === '|') {
      if (run % 2 === 1) { cur = cur.slice(0, -1) + '|'; }   // drop the escaping backslash, keep the pipe
      else { cells.push(cur); cur = ''; }
      run = 0;
      continue;
    }
    run = 0;
    cur += ch;
  }
  cells.push(cur);
  return cells;
}

// parse the raw text → { values: Map<key,value>, conflicts: Set<key> }
function parseConfig(text) {
  const values = new Map();
  const conflicts = new Set();
  let fence = false, comment = false;
  for (const raw of (text || '').split('\n')) {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    let t = line;
    if (comment) {
      const close = t.indexOf('-->');
      if (close < 0) continue;
      comment = false;
      t = t.slice(close + 3);
    }
    if (fence) { if (/^\s*```/.test(t)) fence = false; continue; }
    if (/^\s*```/.test(t)) { fence = true; continue; }
    // strip inline comment SPANS — content before the opener stays live
    while (t.includes('<!--')) {
      const open = t.indexOf('<!--');
      const close = t.indexOf('-->', open + 4);
      if (close < 0) { t = t.slice(0, open); comment = true; break; }
      t = t.slice(0, open) + t.slice(close + 3);
    }
    if (!t.trimStart().startsWith('|')) continue;
    const cells = splitCells(t).map((c) => c.trim());
    // cells[0] is the empty prefix before the leading pipe
    const key = cells[1], value = cells[2];
    if (!key || value === undefined || value === '') continue;
    if (key.toLowerCase() === 'key' || /^-+$/.test(key)) continue;      // header / separator
    if (/^-+$/.test(value)) continue;
    if (values.has(key) && values.get(key) !== value) { conflicts.add(key); continue; }
    values.set(key, value);
  }
  return { values, conflicts };
}

function readConfig(cwd) {
  const p = path.join(cwd || '.', 'apriori', 'process-config.md');
  // read first, classify after: ONLY a definite ENOENT is absence — every other failure
  // (directory, permissions, unreachable ancestor, …) is an unreadable-config problem,
  // never a silent fall-through to defaults (an existsSync pre-check would misreport a
  // permission-blocked file as absent)
  let text;
  try { text = fs.readFileSync(p, 'utf8'); }
  catch (e) {
    if (e.code === 'ENOENT') {
      // ENOENT alone does not prove absence: a dangling symlink stats as an existing
      // directory ENTRY whose read fails — that is present-but-unreadable, never absent
      let present = false;
      try { fs.lstatSync(p); present = true; } catch { /* truly absent */ }
      if (!present) return { values: new Map(), conflicts: new Set() };
    }
    return { values: new Map(), conflicts: new Set(), unreadable: String(e.code || e.message) };
  }
  return parseConfig(text);
}

// one key → { value: string|null, problem: string|null } (problem only when consumed)
function getConfig(cwd, key) {
  const { values, conflicts, unreadable } = readConfig(cwd);
  if (unreadable) return { value: null, problem: `apriori/process-config.md exists but cannot be read (${unreadable}) — fix the file` };
  if (conflicts.has(key)) return { value: null, problem: `process-config carries conflicting '${key}' rows — resolve the conflict (one live row per key)` };
  return { value: values.has(key) ? values.get(key) : null, problem: null };
}

// Message sanitization is the single exit for pattern errors: control chars stripped,
// total length capped INCLUDING the ellipsis; the engine's e.message is never concatenated.
function sanitizeMsg(msg) {
  const clean = msg.replace(/[\x00-\x1f\x7f]/g, '·');
  return clean.length > 200 ? clean.slice(0, 199) + '…' : clean;
}
function boundedSource(s) {
  const clean = String(s).replace(/[\x00-\x1f\x7f]/g, '·');
  return clean.length > 80 ? clean.slice(0, 79) + '…' : clean;
}

// Effective id-pattern: flag (by PRESENCE — an empty flag is a flag-origin error, never a
// config fallback) > config `id-pattern` row > DEFAULT_ID.
// → { source, origin: 'flag'|'config'|'default' } | { error }
function resolveIdPattern(cwd, flagValue) {
  if (flagValue !== null && flagValue !== undefined) {
    if (flagValue === '') return { error: 'empty --id-pattern' };
    try { new RegExp(flagValue); } catch { return { error: sanitizeMsg(`invalid --id-pattern '${boundedSource(flagValue)}' (regex does not compile)`) }; }
    return { source: flagValue, origin: 'flag' };
  }
  const { value, problem } = getConfig(cwd, 'id-pattern');
  if (problem) return { error: problem };
  if (value !== null) {
    try { new RegExp(value); } catch { return { error: sanitizeMsg(`process-config id-pattern row is invalid: '${boundedSource(value)}' (regex does not compile)`) }; }
    return { source: value, origin: 'config' };
  }
  return { source: DEFAULT_ID, origin: 'default' };
}

module.exports = { parseConfig, readConfig, getConfig, splitCells, DEFAULT_ID, resolveIdPattern, sanitizeMsg, boundedSource };
