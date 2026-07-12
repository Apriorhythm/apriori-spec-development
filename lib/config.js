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
    const cells = t.split('|').map((c) => c.trim());
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
  if (!fs.existsSync(p)) return { values: new Map(), conflicts: new Set() };
  return parseConfig(fs.readFileSync(p, 'utf8'));
}

// one key → { value: string|null, problem: string|null } (problem only when consumed)
function getConfig(cwd, key) {
  const { values, conflicts } = readConfig(cwd);
  if (conflicts.has(key)) return { value: null, problem: `process-config carries conflicting '${key}' rows — resolve the conflict (one live row per key)` };
  return { value: values.has(key) ? values.get(key) : null, problem: null };
}

module.exports = { parseConfig, readConfig, getConfig };
