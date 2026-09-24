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
// Multi-segment (`AC-BIS-01`) and lowercase-suffixed (`AC-30f`) IDs are what real projects
// write; the historical `[A-Z]+-\\d+` left them permanently unbindable, and the 4.1 escape
// hatch (a config row) lives in a human-owned file nobody edits, so the fix never landed.
// Compatibility is a leadId-level property, not a raw-regex one: for every title the old
// pattern BOUND, this one binds the byte-identical ID (the raw match can differ — `AC-30f`
// yielded `AC-30` before — but that was never a binding, since leadId rejects a trailing
// word character).
// The quantifiers are spelled `{0,}` rather than `*` on purpose, and the two forms are
// exactly equivalent: the pattern is shipped inside a markdown TABLE CELL (templates/
// process-config.md), where a pair of bare `*` reads as emphasis — markdown formatters and
// lint --fix rewrite `*...*` to `_..._`, silently corrupting a scaffolded project's config
// row into an uncompilable or wrong regex. `{0,}` has no markdown meaning, so the row
// survives whatever formatter the host project runs.
const DEFAULT_ID = '[A-Z]+(?:-[A-Z]+){0,}-\\d+[a-z]{0,}';

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

// The SERIALIZER twin of splitCells (6.2): a value → one table cell that splitCells decodes
// back byte-for-byte. `|` is written `\|`; every backslash stays literal, because the parser
// decodes no other sequence. Two shapes are REFUSED rather than mangled: a newline (a row is
// one line), and an odd run of backslashes right before a pipe — escaping the pipe would make
// the run even and the pipe a separator, and no spelling in this grammar means "that many
// backslashes, then a literal pipe". -> { cell } | { error }
function encodeCell(value) {
  const s = String(value);
  if (/[\r\n]/.test(s)) return { error: 'cannot contain a newline — a config row is one line; wrap the command in a script and name that' };
  // what the READER does to a cell decides what the writer may accept (F4): cells are trimmed,
  // and HTML comment spans are stripped — neither can be carried, so both are refused up front
  if (s !== s.trim()) return { error: 'leading or trailing whitespace is trimmed by the config reader — it would change the command; put it in a script file and name that' };
  if (s.includes('<!--') || s.includes('-->')) return { error: 'cannot carry an HTML comment marker (<!-- or -->) — the config reader strips comments; put the command in a script file and name that' };
  let out = '', run = 0;
  for (const ch of s) {
    if (ch === '\\') { run++; out += ch; continue; }
    if (ch === '|') {
      if (run % 2 === 1) return { error: 'a backslash directly before a pipe cannot be represented in a config table cell — quote the command differently, or put it in a script and name that' };
      out += '\\|'; run = 0; continue;
    }
    run = 0; out += ch;
  }
  // and the proof, through the real reader: encode → parseConfig must give the value back
  const back = parseConfig(`| k | ${out} |`).values.get('k');
  if (back !== s) return { error: `cannot be represented in a config table cell losslessly (the reader would give back ${JSON.stringify(back)}); put the command in a script file and name that` };
  return { cell: out };
}

// parse the raw text → { values: Map<key,value>, conflicts: Set<key> }
function parseConfig(text) {
  const values = new Map();
  const blanks = new Set(), conflictValues = new Map();
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
    if (!key || value === undefined) continue;
    if (key.toLowerCase() === 'key' || /^-+$/.test(key)) continue;      // header / separator
    // a row whose value cell is empty or all hyphens is PRESENT but says nothing: it never
    // supplies a value, and consumers that must not default silently can see it in `blanks`
    if (value === '' || /^-+$/.test(value)) { blanks.add(key); continue; }
    if (values.has(key) && values.get(key) !== value) {
      conflicts.add(key);
      if (!conflictValues.has(key)) conflictValues.set(key, [values.get(key)]);
      conflictValues.get(key).push(value);
      continue;
    }
    values.set(key, value);
  }
  return { values, conflicts, blanks, conflictValues };
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
      if (!present) return { values: new Map(), conflicts: new Set(), blanks: new Set(), conflictValues: new Map() };
    }
    return { values: new Map(), conflicts: new Set(), blanks: new Set(), conflictValues: new Map(), unreadable: String(e.code || e.message) };
  }
  return parseConfig(text);
}

// one key → { value: string|null, problem: string|null, blank: boolean, conflicting: string[]|null }
// (problem only when consumed; `blank` = a row for the key exists but its cell is empty/hyphens;
// `conflicting` = the differing cells when the problem is a conflict)
function getConfig(cwd, key) {
  const { values, conflicts, unreadable, blanks, conflictValues } = readConfig(cwd);
  if (unreadable) return { value: null, problem: `apriori/process-config.md exists but cannot be read (${unreadable}) — fix the file`, blank: false, conflicting: null };
  if (conflicts.has(key)) {
    return { value: null, problem: `process-config carries conflicting '${key}' rows — resolve the conflict (one live row per key)`,
      blank: false, conflicting: conflictValues.get(key) || null };
  }
  return { value: values.has(key) ? values.get(key) : null, problem: null, blank: !!(blanks && blanks.has(key)), conflicting: null };
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

// The review-round limit (review-round-limit): the ONE configured number that governs how long a
// review family may keep revising before the owner is asked. Missing row (or missing file) → 7.
// An explicit cell must be a decimal integer >= 1 (and a safe integer — a cell long enough to
// overflow to Infinity would switch the count off, which is not a limit); anything else, a blank
// or all-hyphen cell, a conflicting pair of rows or an unreadable file is a consumption-time
// error that itself names the key, the offending cell(s) and the legal range — never a silent
// fallback (a human who wrote `0`, or emptied the cell, meant something; substituting 7 would
// change it behind their back).
const ROUND_LIMIT_KEY = 'review-round-limit';
const DEFAULT_ROUND_LIMIT = 7;
const ROUND_LIMIT_RANGE = `an integer >= 1 (missing row = ${DEFAULT_ROUND_LIMIT})`;
const shortCell = (s) => { const c = String(s).replace(/[\x00-\x1f\x7f]/g, '·'); return c.length > 20 ? c.slice(0, 19) + '…' : c; };
// the error is `<key>: <body> — must be <range>`, capped at sanitizeMsg's 200 characters — and
// the cap is spent on the BODY, so the key and the range survive whatever the cells contain
function resolveReviewRoundLimit(cwd) {
  const head = `${ROUND_LIMIT_KEY}: `, tail = ` — must be ${ROUND_LIMIT_RANGE}`;
  const fail = (msg) => {
    const room = 200 - head.length - tail.length;
    const body = msg.replace(/[\x00-\x1f\x7f]/g, '·');
    return { error: `${head}${body.length > room ? body.slice(0, room - 1) + '…' : body}${tail}` };
  };
  const { value, problem, blank, conflicting } = getConfig(cwd, ROUND_LIMIT_KEY);
  if (problem) {
    if (!conflicting) return fail(problem);
    const shown = conflicting.slice(0, 3).map((v) => `'${shortCell(v)}'`).join(' vs ');
    const more = conflicting.length > 3 ? ` and ${conflicting.length - 3} more` : '';
    return fail(`process-config carries conflicting rows (${shown}${more}) — keep one live row`);
  }
  // a present row with an empty / all-hyphen cell is an explicit non-value: it fails whether or
  // not another row for the key carries a number — two rows are one row too many either way
  if (blank) {
    return fail(`process-config ${ROUND_LIMIT_KEY} row has an empty value cell${value !== null ? ` (beside a row reading '${shortCell(value)}')` : ''} — number it or delete it`);
  }
  if (value === null) return { value: DEFAULT_ROUND_LIMIT, origin: 'default' };
  const cell = value.trim();
  const n = /^[0-9]+$/.test(cell) ? Number(cell) : NaN;
  if (!Number.isSafeInteger(n) || n < 1) return fail(`process-config ${ROUND_LIMIT_KEY} row is invalid: '${boundedSource(value)}'`);
  return { value: n, origin: 'config' };
}

module.exports = { parseConfig, getConfig, splitCells, encodeCell, DEFAULT_ID, resolveIdPattern, sanitizeMsg, boundedSource,
  resolveReviewRoundLimit, DEFAULT_ROUND_LIMIT, ROUND_LIMIT_RANGE, ROUND_LIMIT_KEY };
