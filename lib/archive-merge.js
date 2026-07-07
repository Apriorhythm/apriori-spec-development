'use strict';
/*
 * archive-merge — plain-files native implementation of the archive action (§4).
 * Zero deps — pure Node stdlib. Consumes the same delta format the OpenSpec adapter used
 * (## ADDED/MODIFIED/REMOVED Requirements), so it is the adapter-free path.
 */
const fs = require('fs');
const path = require('path');

const REQ_RE = /^###\s+Requirement:\s+(.+?)\s*$([\s\S]*?)(?=^###\s+Requirement:|$(?![\s\S]))/gm;
const SECTION_SPLIT_RE = /^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements\s*$/m;

// name -> full block (heading + body), in document order
function parseRequirements(text) {
  const out = new Map();
  let m;
  REQ_RE.lastIndex = 0;
  while ((m = REQ_RE.exec(text)) !== null) out.set(m[1].trim(), m[0].replace(/\s+$/, '') + '\n');
  return out;
}

function parseDelta(text) {
  const buckets = { ADDED: new Map(), MODIFIED: new Map(), REMOVED: new Map(), RENAMED: [] };
  const parts = text.split(SECTION_SPLIT_RE);
  for (let i = 1; i < parts.length; i += 2) {
    const kind = parts[i];
    if (kind === 'RENAMED') {
      // one rename per line: `- Old Name -> New Name`
      for (const m of parts[i + 1].matchAll(/^\s*-\s*(.+?)\s*->\s*(.+?)\s*$/gm))
        buckets.RENAMED.push([m[1].trim(), m[2].trim()]);
    } else {
      for (const [name, block] of parseRequirements(parts[i + 1])) buckets[kind].set(name, block);
    }
  }
  return buckets;
}

// Pure merge. Returns { store: Map, merged, modified, deprecated, renamed, conflicts }
function merge(storeText, delta, change) {
  const store = parseRequirements(storeText);
  const merged = [], modified = [], deprecated = [], renamed = [], conflicts = [];
  // RENAMED first: rename the store block's ID, preserving its content
  for (const [oldName, newName] of (delta.RENAMED || [])) {
    if (!store.has(oldName)) { conflicts.push(`RENAMED '${oldName}' has no target in store`); continue; }
    if (store.has(newName)) { conflicts.push(`RENAMED target '${newName}' already exists in store`); continue; }
    const block = store.get(oldName);
    const renamedBlock = block.replace(/^###\s+Requirement:\s+.+$/m, `### Requirement: ${newName}`);
    // rebuild the map preserving order, swapping the key at the old position
    const rebuilt = new Map();
    for (const [k, v] of store) rebuilt.set(k === oldName ? newName : k, k === oldName ? renamedBlock : v);
    store.clear();
    for (const [k, v] of rebuilt) store.set(k, v);
    renamed.push(`${oldName} -> ${newName}`);
  }
  for (const [name, block] of delta.ADDED) {
    if (store.has(name)) conflicts.push(`ADDED '${name}' already exists in store`);
    else { store.set(name, block); merged.push(name); }
  }
  for (const [name, block] of delta.MODIFIED) {
    if (!store.has(name)) conflicts.push(`MODIFIED '${name}' has no target in store`);
    else { store.set(name, block); modified.push(name); }
  }
  for (const name of delta.REMOVED.keys()) {
    if (!store.has(name)) conflicts.push(`REMOVED '${name}' has no target in store`);
    else {
      const block = store.get(name);
      const nl = block.indexOf('\n');
      store.set(name, block.slice(0, nl) + `  _deprecated (superseded by ${change})_` + block.slice(nl));
      deprecated.push(name);
    }
  }
  return { store, merged, modified, deprecated, renamed, conflicts };
}

function renderStore(storeText, store) {
  const idx = storeText.indexOf('### Requirement:');
  const header = idx >= 0 ? storeText.slice(0, idx) : '';
  return header + [...store.values()].join('\n');
}

// colon-free date-time stamp YYYY-MM-DDThhmm (CLI's own clock; never an agent guess)
function archiveStamp(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}`;
}

// Move an in-flight change dir (bare name) → changes/archive/<stamp>-<name>/
function archiveChangeDir(changesDir, name, now) {
  const src = path.join(changesDir, name);
  if (!fs.existsSync(src)) return null;
  const dest = path.join(changesDir, 'archive', `${archiveStamp(now)}-${name}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(src, dest);
  return dest;
}

function cli(argv) {
  const a = { store: null, delta: null, change: null, write: false, changesDir: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--store') a.store = argv[++i];
    else if (k === '--delta') a.delta = argv[++i];
    else if (k === '--change') a.change = argv[++i];
    else if (k === '--write') a.write = true;
    else if (k === '--changes-dir') a.changesDir = argv[++i];
  }
  if (!a.store || !a.delta || !a.change) { console.error('usage: apriori archive --store <f> --delta <f> --change <name> [--write] [--changes-dir <dir>]'); return 2; }
  const storeText = fs.readFileSync(a.store, 'utf8');
  const delta = parseDelta(fs.readFileSync(a.delta, 'utf8'));
  const { store, merged, modified, deprecated, renamed, conflicts } = merge(storeText, delta, a.change);

  for (const [label, ids] of [['merged (ADDED)', merged], ['modified (MODIFIED)', modified], ['deprecated (REMOVED)', deprecated], ['renamed (RENAMED)', renamed]])
    if (ids.length) console.log(`${label}: ${ids.join(', ')}`);

  if (conflicts.length) {
    console.log('\nCONFLICTS (stop — open a ledger issue, human resolves):');
    for (const c of conflicts) console.log(`  ✗ ${c}`);
    console.log('\nRESULT: CONFLICT — nothing written');
    return 1;
  }
  if (a.write) {
    fs.writeFileSync(a.store, renderStore(storeText, store));
    let moved = null;
    if (a.changesDir) moved = archiveChangeDir(a.changesDir, a.change, new Date());
    console.log(`\nRESULT: MERGED — ${a.store} rewritten${moved ? `; change archived → ${moved}` : ''}`);
  } else {
    console.log(`\nRESULT: MERGED (dry-run; ${store.size} requirements in result) — pass --write to apply`);
  }
  return 0;
}

module.exports = { parseRequirements, parseDelta, merge, renderStore, archiveStamp, archiveChangeDir, cli };
