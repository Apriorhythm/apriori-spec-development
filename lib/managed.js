'use strict';
/*
 * managed.json — the record of which scaffolded files the tool owns, and the exact
 * bytes it last wrote there (sha256). init records what it CREATES; update refreshes
 * only what the manifest proves is tool-owned AND unmodified. Zero deps.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { containsReal } = require('./archive-merge');

const MANIFEST_REL = 'apriori/managed.json';

// sha256 of every generation of templates/command.md ever shipped, newest first.
// APPEND when the template changes — UP-11 hashes the live file and asserts membership.
const TEMPLATE_GENERATIONS = [
  'sha256:4ada03a2b8a9d6b86fd610e0f4363c31dcea2ba2460d6e96e1231004e4a9c8a0',   // 3.0 front-door
  'sha256:1dfa5eece0f3c109aae765aa52ffb89f59c0f0f3b494f9430148ac6baeeab046',   // pre-front-door
];

// exact bytes, never line-ending-normalized — we hash what we wrote
function hashBytes(buf) { return 'sha256:' + crypto.createHash('sha256').update(buf).digest('hex'); }
function hashFile(p) { return hashBytes(fs.readFileSync(p)); }

// the only paths update may ever refresh: the runbook + each tool's command file
function allowedTargets(tools) {
  const set = new Set(['apriori/runbook.md']);
  for (const k of Object.keys(tools)) if (tools[k].command) set.add(tools[k].command);
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
// the project; a missing one is judged by its nearest existing ancestor (containsReal).
// An escaping path is a hygiene error, never classified modified/up-to-date.
function assertContained(root, rel) {
  const abs = path.join(root, rel);
  if (!containsReal(root, abs)) throw new Error(`managed.json: '${rel}' escapes the project root`);
}

module.exports = { MANIFEST_REL, TEMPLATE_GENERATIONS, hashBytes, hashFile,
  allowedTargets, readManifest, writeManifest, assertContained };
