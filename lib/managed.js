'use strict';
/*
 * managed.json — the record of which scaffolded files the tool owns, and the exact
 * bytes it last wrote there (sha256). init records what it CREATES; update refreshes
 * only what the manifest proves is tool-owned AND unmodified. Zero deps.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { containsFuturePath } = require('./archive-merge');

const MANIFEST_REL = 'apriori/managed.json';

// sha256 of every shipped generation, **indexed by template id**, newest first.
// APPEND when a template changes — UP-11 hashes each live template and asserts membership
// in ITS OWN table. Cross-template content must never be adopted (MC-04).
const TEMPLATE_GENERATIONS = {
  // S2 P3: the discuss shell ships its own table — a body that is a legal generation of a
  // DIFFERENT template stays unmanaged in either direction (MC-04).
  discuss: [
    'sha256:2f6680fb48beab9a9384c9f9f1cad26e15024ce15d44767397ca9d76e33313a5',   // S2 P3: /apriori-discuss thin shell, first generation
    'sha256:5187d8853422d78e2120578e3c5b573abf748db508390ddd328f6305e8d8eb75',   // S2 A≥1 fix: a scope stated in the request is an approval already held
    'sha256:ee004fb3179df3c5ea75e622342c43f54e32854b638a58a81691e591cb48589d',   // discuss-save-fidelity: a save is a faithful record of the discussion, nothing more
    'sha256:81de0ca483c5c5fd103c479027eea6d1d431379fdce3d010353745d800c8d317',   // discuss-save-inference: only as far as they said it; silence is not a decision; write once settled
    'sha256:bc5b641e632097b7ae50449e6bd6f273a45800eda630a390e4b1b3c60505b38d',   // source-intake: the shell points at saving from a document discussed elsewhere
  ],
  apriori: [
    'sha256:b4c8398b0f75fa8c954fc3df06775f9ad5152e400c68d9c9bc37b1e94cb2c3d2',   // S2 P0: R1's five, stalled-review class restored
    'sha256:b3306395331a075448d0715f8904354436cec2f91af393a1ea0da0e2bc43423d',   // 6.2 intent-first routing
    'sha256:26a0aa9eef6681288c8ddda55d5261761591d3627af1f58216ce82ac556be406',   // 6.2 open-item stop
    'sha256:26ede9b6f095e03b58b88e83bff1ec706aa5d1ca362ead1dec8bb336518fe04f',   // 6.0 status-first JIT
    'sha256:ce21ebe7635eccf468614b2e0dfe6196bc390383f76322a46ad4554dcf12b9a2',   // 6.0 minimal-context
    'sha256:f4555198e6a1f3d5054f8b976fd317293e20d6bed519f6737b5cea4aea8b704d',   // 6.0 four-decisions
    'sha256:4ada03a2b8a9d6b86fd610e0f4363c31dcea2ba2460d6e96e1231004e4a9c8a0',   // 3.0 front-door
    'sha256:1dfa5eece0f3c109aae765aa52ffb89f59c0f0f3b494f9430148ac6baeeab046',   // pre-front-door
    'sha256:d4cbe8f2366643ba3df930d7b09cf14b75a57007a4698b2e0fd7b0504c8b8fae',   // S2 G: delegation routing and triggered reading
    'sha256:ae5d6b8b9c320a218b96bf0b2ab9a1ad1d855e7aa0445ff0f3bb19ef10e946bf',   // review-round-limit: the R1 stop class names the limit, not round 2
    'sha256:97e1b5ae5856027d07c503e6cf1cfc87159c9658c2d38e5fbf8b16334e42b641',   // source-intake: a design concluded elsewhere identifies the work
  ],
};

// exact bytes, never line-ending-normalized — we hash what we wrote
function hashBytes(buf) { return 'sha256:' + crypto.createHash('sha256').update(buf).digest('hex'); }
function hashFile(p) { return hashBytes(fs.readFileSync(p)); }

// the only paths update may ever refresh: the runbook + each tool's command file
function allowedTargets(tools) {
  const set = new Set(['apriori/runbook.md']);
  for (const k of Object.keys(tools)) for (const rel of Object.values(tools[k].commands || {})) set.add(rel);
  return set;
}

const HASH_RE = /^sha256:[0-9a-f]{64}$/;

// → { files } | null (absent). Throws 'managed.json: <defect>' on anything untrustworthy —
// hygiene runs on READ, so init and update both fail closed before touching any target.
function readManifest(root, tools) {
  const p = path.join(root, MANIFEST_REL);
  if (!fs.existsSync(p)) return null;
  let raw;
  try { raw = fs.readFileSync(p, 'utf8'); }
  catch (e) { throw new Error(`managed.json: unreadable (${e.message})`); }
  let doc;
  try { doc = JSON.parse(raw); }
  catch (e) { throw new Error(`managed.json: invalid JSON (${e.message})`); }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw new Error('managed.json: not an object');
  if (doc.version !== 1) throw new Error(`managed.json: unsupported version ${JSON.stringify(doc.version)} (expected 1)`);
  if (!doc.files || typeof doc.files !== 'object' || Array.isArray(doc.files)) throw new Error('managed.json: missing files object');
  const allowed = allowedTargets(tools);
  for (const [rel, hash] of Object.entries(doc.files)) {
    if (rel.includes('\\')) throw new Error(`managed.json: non-canonical key '${rel}' (keys use forward slashes)`);
    if (path.isAbsolute(rel) || /^[a-zA-Z]:/.test(rel)) throw new Error(`managed.json: absolute path entry '${rel}'`);
    if (rel.split('/').includes('..')) throw new Error(`managed.json: path escape in entry '${rel}'`);
    if (!allowed.has(rel)) throw new Error(`managed.json: '${rel}' is not a refresh target`);
    if (typeof hash !== 'string' || !HASH_RE.test(hash)) throw new Error(`managed.json: malformed hash for '${rel}'`);
  }
  return { files: { ...doc.files } };
}

function writeManifest(root, files) {
  const sorted = {};
  for (const k of Object.keys(files).sort()) sorted[k] = files[k];
  const p = path.join(root, MANIFEST_REL);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify({ version: 1, files: sorted }, null, 2) + '\n');
}

// containment before ANY read or hash: an existing target must realpath-resolve inside
// the project; a missing one is judged by its nearest existing ancestor (containsFuturePath).
// An escaping path is a hygiene error, never classified modified/up-to-date.
function assertContained(root, rel) {
  const abs = path.join(root, rel);
  if (!containsFuturePath(root, abs)) throw new Error(`managed.json: '${rel}' escapes the project root`);
}

module.exports = { TEMPLATE_GENERATIONS, allowedTargets, hashBytes, hashFile,
  readManifest, writeManifest, assertContained };
