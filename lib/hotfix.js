'use strict';
/*
 * The hotfix lane: a change-external minimal write-back unit whose admission is decided
 * mechanically by blast radius (hotfix-contract).
 *
 * Three layers, run in this order and never out of it:
 *   parseState  — the state file is a FIXED shape (header block + closed section set),
 *                 never free text; every failure is a problem, nothing throws.
 *   checkFields — the declared-field contract, including the cross-field invariants.
 *                 Grading is never attempted on a contract-invalid bundle.
 *   grade       — ordered-first match to a (radius, subtype) pair. Fail-up is the rule:
 *                 what cannot be told apart mechanically grades to the stricter side, so
 *                 an unannotated MODIFIED/ADDED never reaches R2. The `blast: low` marker
 *                 is human-granted in the store — a delta may neither grant nor revoke it.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { withStrict } = require('./args');

const HEADER_KEYS = [
  'hotfix', 'date', 'kinds', 'change-kind',
  'touched-modules', 'fix-ref', 'frontend-touched', 'backend-touched', 'affected-scenario-ids',
];
const SECTIONS = { Conclusion: 'business', Bindings: 'business', Gates: 'process' };
const CHANGE_KINDS = ['no-code', 'code-trivial', 'code-behavior', 'doc-fix'];
const CODE_KINDS = ['code-trivial', 'code-behavior'];
const PLACEHOLDER = '<!-- replace me: what happened, what you concluded, what you did -->';
const DECISION_CAP = 3;

const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
const blockKey = (o) => `${o.module}::${o.title}`;

// ---- layer 1: the state file is a fixed shape --------------------------------------
function parseState(text) {
  const problems = [];
  const header = new Map();
  const sections = new Map();
  let current = null;
  let inHeader = true;

  for (const raw of String(text || '').split('\n')) {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      inHeader = false;
      const name = heading[1];
      if (!Object.prototype.hasOwnProperty.call(SECTIONS, name)) {
        problems.push(`unknown section '## ${name}' — legal sections: ${Object.keys(SECTIONS).join(', ')}`);
        current = null;
        continue;
      }
      if (sections.has(name)) problems.push(`repeated section '## ${name}'`);
      current = name;
      sections.set(name, '');
      continue;
    }
    if (/^#\s/.test(line)) continue;                       // a title line is not content
    if (inHeader) {
      if (!line.trim()) continue;
      const kv = /^([A-Za-z][A-Za-z0-9-]*)\s*:\s*(.*)$/.exec(line);
      if (!kv) { problems.push(`header line is not a 'key: value' pair: ${line.trim()}`); continue; }
      const [, key, value] = kv;
      if (!HEADER_KEYS.includes(key)) { problems.push(`unknown header key '${key}' — legal keys: ${HEADER_KEYS.join(', ')}`); continue; }
      if (header.has(key)) { problems.push(`repeated header key '${key}'`); continue; }
      header.set(key, value.trim());
      continue;
    }
    if (current) sections.set(current, `${sections.get(current)}${line}\n`);
  }

  // the conclusion is the one unconditionally required section
  if (!sections.has('Conclusion')) problems.push('missing required section: ## Conclusion');
  else {
    const body = sections.get('Conclusion').trim();
    if (!body) problems.push('## Conclusion is blank — the conclusion is the one unconditionally required content');
    else if (body === PLACEHOLDER.trim()) problems.push('## Conclusion still carries the scaffold placeholder — it was never replaced');
  }

  const businessSections = [...sections.keys()].filter((n) => SECTIONS[n] === 'business');
  return { header, sections, businessSections, problems };
}

// ---- layer 2: the declared-field contract -------------------------------------------
function checkFields(state, bundle) {
  const problems = [];
  const h = state.header;
  const kind = h.get('change-kind');
  const delta = (bundle && bundle.delta) || { ops: [], modules: [] };
  const decisions = (bundle && bundle.decisions) || [];
  const vocabulary = (bundle && bundle.vocabulary) || [];

  if (!h.has('change-kind') || !kind) { problems.push("change-kind is required (missing)"); return problems; }
  if (!CHANGE_KINDS.includes(kind)) { problems.push(`change-kind '${kind}' is not one of: ${CHANGE_KINDS.join(', ')}`); return problems; }

  const isCode = CODE_KINDS.includes(kind);
  const isDoc = kind === 'doc-fix';
  const needsLocator = isCode || isDoc;

  // locator headers travel as a pair
  const hasModules = h.has('touched-modules');
  const hasRef = h.has('fix-ref');
  if (needsLocator) {
    if (!hasModules) problems.push(`touched-modules is required for change-kind '${kind}'`);
    if (!hasRef) problems.push(`fix-ref is required for change-kind '${kind}' (locator headers travel as a pair)`);
  } else {
    if (hasModules) problems.push("touched-modules is forbidden for change-kind 'no-code'");
    if (hasRef) problems.push("fix-ref is forbidden for change-kind 'no-code'");
  }

  // touch signals are radius inputs — required for every code kind, profile-independent
  for (const key of ['frontend-touched', 'backend-touched']) {
    if (isCode) {
      if (!h.has(key)) problems.push(`${key} is required for change-kind '${kind}' (a touch signal is a radius input, independent of the verification profile)`);
      else if (!['yes', 'no'].includes(h.get(key))) problems.push(`${key} must be yes or no, got '${h.get(key)}'`);
    } else if (h.has(key)) {
      problems.push(`${key} is forbidden for change-kind '${kind}'`);
    }
  }

  // affected scenario ids
  if (isCode) {
    if (!h.has('affected-scenario-ids')) problems.push(`affected-scenario-ids is required for change-kind '${kind}'`);
    else if (!list(h.get('affected-scenario-ids')).length) problems.push('affected-scenario-ids is empty — the scope of the test proof cannot be empty');
  } else if (kind === 'no-code' && h.has('affected-scenario-ids')) {
    problems.push("affected-scenario-ids is forbidden for change-kind 'no-code'");
  }

  // kinds: non-empty subset of 1,2,3 with 1 and 2 exclusive, each implying its shape
  const kinds = list(h.get('kinds'));
  if (!kinds.length) problems.push('kinds is required (a non-empty subset of 1,2,3)');
  else {
    const bad = kinds.filter((k) => !['1', '2', '3'].includes(k));
    if (bad.length) problems.push(`kinds carries values outside 1,2,3: ${bad.join(', ')}`);
    if (kinds.includes('1') && kinds.includes('2')) problems.push('kinds 1 and 2 are mutually exclusive (an after-the-fact fix record is not a no-fix-needed conclusion)');
    if (kinds.includes('1') && !(isCode || isDoc)) problems.push(`kinds contains 1 but change-kind is '${kind}' — 1 implies a code or doc fix`);
    if (kinds.includes('2') && kind !== 'no-code') problems.push(`kinds contains 2 but change-kind is '${kind}' — 2 implies no-code`);
    if (kinds.includes('3') && !decisions.length) problems.push('kinds contains 3 but no decisions are present');
    if (!kinds.includes('3') && decisions.length) problems.push('decisions are present but kinds does not contain 3');
  }

  // touched-modules: clean list, inside the vocabulary, superset of (doc-fix: equal to) the delta
  if (hasModules) {
    const mods = list(h.get('touched-modules'));
    if (!mods.length) problems.push('touched-modules is empty');
    const dupes = mods.filter((m, i) => mods.indexOf(m) !== i);
    if (dupes.length) problems.push(`touched-modules carries duplicate entries: ${[...new Set(dupes)].join(', ')}`);
    for (const m of mods) if (!vocabulary.includes(m)) problems.push(`touched-modules names '${m}', which is not in the store/truth module vocabulary`);
    for (const m of delta.modules || []) if (!mods.includes(m)) problems.push(`touched-modules omits '${m}', which the delta touches (it must be a superset of the delta's modules)`);
    if (isDoc) for (const m of mods) if (!(delta.modules || []).includes(m)) problems.push(`touched-modules names '${m}' which the delta does not touch — for doc-fix the two sets must be equal`);
  }

  if (isDoc && !(delta.ops || []).length) problems.push('doc-fix requires a non-zero delta — the object of a docs fix is the document itself');
  if (kind === 'no-code' && (delta.ops || []).length) problems.push("change-kind 'no-code' cannot carry a delta");
  if (isDoc && bundle && bundle.profile !== undefined && bundle.profile !== 'docs') {
    problems.push(`change-kind 'doc-fix' requires the docs verification profile, not '${bundle.profile || '(none declared)'}'`);
  }

  return problems;
}

// ---- layer 2b: bindings (carrier c1' — the state file's ## Bindings section) ----------
// The target key is the scenario ID when the block carries scenarios, the requirement
// title otherwise. Under the ruled combination only a non-zero-delta code bundle declares
// bindings at all, and `no-test:` does not exist.
const BINDING_MARKER = ' tests: ';
const NO_TEST_MARKER = ' no-test: ';
function targetKeys(delta) {
  const keys = [];
  for (const o of (delta.ops || [])) {
    if (o.type === 'REMOVED' || o.type === 'RENAMED') continue;
    if ((o.scenarios || []).length) keys.push(...o.scenarios);
    else keys.push(o.title);
  }
  return keys;
}
function parseBindingLines(section) {
  const rows = [];
  for (const raw of String(section || '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const noTest = line.indexOf(NO_TEST_MARKER);
    const tests = line.indexOf(BINDING_MARKER);
    if (noTest >= 0 && (tests < 0 || noTest < tests)) { rows.push({ key: line.slice(0, noTest).replace(/:$/, '').trim(), kind: 'no-test' }); continue; }
    if (tests < 0) { rows.push({ raw: line, kind: 'malformed' }); continue; }
    const key = line.slice(0, tests).replace(/:$/, '').trim();
    const value = line.slice(tests + BINDING_MARKER.length).trim();
    rows.push({ key, value, kind: value ? 'tests' : 'empty' });
  }
  return rows;
}
function checkBindings(state, bundle) {
  const problems = [];
  const kind = state.header.get('change-kind');
  const delta = (bundle && bundle.delta) || { ops: [], modules: [] };
  const rows = parseBindingLines(state.sections.get('Bindings') || '');

  // carrier exclusivity: no declaration may live outside the ## Bindings section
  for (const o of (delta.ops || [])) {
    if (o.body && (o.body.includes(BINDING_MARKER) || o.body.includes(NO_TEST_MARKER))) {
      problems.push(`a binding declaration sits inside delta block '${o.title}' — the ruled carrier is the state file's ## Bindings section (carrier exclusivity)`);
    }
  }
  if (bundle && bundle.standaloneBindingsFile) problems.push('a standalone bindings file is present — the ruled carrier is the state file\'s ## Bindings section (carrier exclusivity)');

  for (const r of rows) {
    if (r.kind === 'no-test') problems.push(`binding line for '${r.key}' declares no-test — the ruled lane has no no-test escape (every delta target key binds a test)`);
    if (r.kind === 'malformed') problems.push(`binding line is not '<key>: tests: <value>': ${r.raw}`);
    if (r.kind === 'empty') problems.push(`binding line for '${r.key}' has an empty tests value`);
  }

  const declared = rows.filter((r) => r.kind === 'tests').map((r) => r.key);
  const mustDeclare = CODE_KINDS.includes(kind) && (delta.ops || []).length > 0;

  if (!mustDeclare) {
    if (declared.length) {
      if (kind === 'doc-fix') problems.push("bindings are forbidden for change-kind 'doc-fix' — its oracle is check plus review, not a TAP binding");
      else if (kind === 'no-code') problems.push("bindings are forbidden for change-kind 'no-code'");
      else problems.push('bindings are forbidden for a zero-delta bundle (ruling p1 — there is no delta target key to bind)');
    }
    return problems;
  }

  const keys = targetKeys(delta);
  for (const k of keys) {
    const n = declared.filter((d) => d === k).length;
    if (n === 0) problems.push(`no binding line for delta target key '${k}'`);
    if (n > 1) problems.push(`duplicate binding lines for delta target key '${k}'`);
  }
  for (const d of new Set(declared)) if (!keys.includes(d)) problems.push(`binding line names '${d}', which is not a delta target key`);
  return problems;
}

// ---- layer 2c: screenshot evidence (π1 + f1, tier-parameterized by the owner ruling) --
// The image itself stays an instrument under apriori/tmp/ (gitignored); what is recorded is
// the observation line. At the incremental tier a missing record is ADVISORY; whatever the
// tier, a record that IS present is validated in full — providing one buys no leniency.
const EVIDENCE_FIELDS = ['path', 'obs', 'time', 'baseline', 'run'];
const ISO_UTC_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

// A record line is parsed by marker position, not by regex over a value alphabet: the
// values are prose (an `obs` sentence) and prose cannot be constrained. What IS constrained
// is the markers — each may occur at most once in a line, so no value can impersonate a
// field by embedding ` run=` in its own text.
function parseEvidenceLine(line) {
  const body = ` ${line.replace(/^-\s*/, '')}`;   // leading space so `path=` uses the same marker shape
  const problems = [];
  const positions = [];
  for (const f of [...EVIDENCE_FIELDS, 'hash']) {
    const marker = ` ${f}=`;
    const first = body.indexOf(marker);
    if (first < 0) continue;
    if (body.indexOf(marker, first + 1) >= 0) {
      problems.push(`screenshot record line repeats the marker '${f}=' — a field value may not impersonate another field: ${line.slice(0, 80)}`);
    }
    positions.push({ f, at: first, marker });
  }
  positions.sort((a, b) => a.at - b.at);
  const fields = {};
  for (let i = 0; i < positions.length; i++) {
    const { f, at, marker } = positions[i];
    const end = i + 1 < positions.length ? positions[i + 1].at : body.length;
    fields[f] = body.slice(at + marker.length, end).trim();
  }
  return { fields, problems };
}

function checkEvidence(ctx) {
  const problems = [];
  const advisories = [];
  const tier = ctx.tier || 'incremental';
  const uiProfile = ctx.profile === 'ui' || ctx.profile === 'fullstack';
  const records = ctx.records;

  if (!uiProfile) return { problems, advisories };

  if (!ctx.frontendTouched) {
    if (ctx.waiver) {
      const reason = String(ctx.waiver).split('—').slice(1).join('—').trim();
      if (!reason) problems.push('the ui: not-applicable waiver carries no reason — a waiver without a reason is not a waiver');
    } else if (tier === 'full') {
      problems.push('a backend-only bundle under a ui profile must carry the ui: not-applicable waiver line (full tier)');
    }
    return { problems, advisories };
  }

  if (!records || !String(records).trim()) {
    const msg = 'no screenshot observation record for a frontend-touching bundle (evidence/screenshots.md)';
    if (tier === 'full') problems.push(`${msg} — required at the full tier`);
    else advisories.push(`${msg} — advisory at the incremental tier (owner ruling); recording one page costs a minute`);
    return { problems, advisories };
  }

  const runs = new Set();
  for (const raw of String(records).split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const { fields: f, problems: lineProblems } = parseEvidenceLine(line);
    problems.push(...lineProblems);
    for (const key of EVIDENCE_FIELDS) if (!f[key]) problems.push(`screenshot record line is missing '${key}=': ${line.slice(0, 80)}`);
    if (f.hash !== undefined) problems.push("screenshot record carries 'hash=' — refused under the ruled combination (π1 + f1: nothing consumes it and it would drag in a platform-dependent safe open)");
    if (f.path) {
      if (f.path.includes('..')) problems.push(`screenshot path contains '..': ${f.path}`);
      else if (/^([/\\]|[A-Za-z]:|[a-z][a-z0-9+.-]*:\/\/)/.test(f.path)) problems.push(`screenshot path is not repo-relative: ${f.path}`);
      else if (!f.path.startsWith('apriori/tmp/')) problems.push(`screenshot path is not under apriori/tmp/ (the instrument directory): ${f.path}`);
    }
    if (f.time && !ISO_UTC_SECONDS.test(f.time)) problems.push(`screenshot time is not ISO UTC seconds (YYYY-MM-DDThh:mm:ssZ): ${f.time}`);
    if (f.baseline && ctx.head && f.baseline !== ctx.head) problems.push(`screenshot baseline ${f.baseline.slice(0, 12)} is not the repo HEAD ${String(ctx.head).slice(0, 12)} — an old screenshot cannot be recycled`);
    if (f.run) runs.add(f.run);
  }
  if (runs.size > 1) problems.push(`screenshot records disagree on 'run' (${[...runs].join(', ')}) — one bundle records one run`);

  return { problems, advisories };
}

// ---- layer 3: the blast-radius grader ------------------------------------------------
const R = (radius, subtype, reason) => ({ radius, subtype, reason: reason || '', problems: [] });
const REJECT = 'rejected for the hotfix lane — open a formal change (the process route for this blast radius)';

function grade(state, bundle) {
  const h = state.header;
  const kind = h.get('change-kind');
  const delta = (bundle && bundle.delta) || { ops: [], modules: [] };
  const ops = delta.ops || [];
  const decisions = (bundle && bundle.decisions) || [];
  const storeBlocks = (bundle && bundle.storeBlocks) || new Map();

  // the marker is human-granted in the store: a delta may neither self-grant nor revoke it
  const markerProblems = [];
  for (const o of ops) {
    const store = storeBlocks.get(blockKey(o));
    const inStore = !!(store && store.blastLow);
    if (o.blastLow && !inStore) markerProblems.push(`delta block '${o.title}' introduces a 'blast: low' marker the store does not carry — the marker is human-granted, a delta may not self-grant it`);
    if (!o.blastLow && inStore) markerProblems.push(`delta block '${o.title}' drops the 'blast: low' marker the store carries — a delta may not revoke it (marker retention is mandatory)`);
  }
  if (markerProblems.length) return { radius: null, subtype: null, reason: '', problems: markerProblems };

  // (1) structural / cross-module / decision-shape / dual-end / scenario-less
  const moduleUnion = new Set([
    ...list(h.get('touched-modules')),
    ...(delta.modules || []),
    ...decisions.map((d) => d.module),
  ]);
  const perModule = new Map();
  for (const d of decisions) perModule.set(d.module, (perModule.get(d.module) || 0) + 1);

  if (ops.some((o) => o.type === 'REMOVED' || o.type === 'RENAMED')) return R('R3', 'n/a', `a REMOVED/RENAMED delta changes the living contract — ${REJECT}`);
  if (moduleUnion.size >= 2) return R('R3', 'n/a', `the bundle spans ${moduleUnion.size} modules — ${REJECT}`);
  if (decisions.some((d) => d.supersedes)) return R('R3', 'n/a', `a decision supersession rewrites knowledge — ${REJECT}`);
  for (const [m, n] of perModule) if (n > DECISION_CAP) return R('R3', 'n/a', `${n} decisions for '${m}' exceed the per-module cap of ${DECISION_CAP} — ${REJECT}`);
  if (h.get('frontend-touched') === 'yes' && h.get('backend-touched') === 'yes') return R('R3', 'n/a', `a dual-end touch is the defect account's front/back-end miss — ${REJECT}`);
  if (ops.some((o) => (o.type === 'MODIFIED' || o.type === 'ADDED') && !(o.scenarios || []).length)) {
    return R('R3', 'n/a', `a MODIFIED/ADDED block without a scenario has no executable test target — ${REJECT}`);
  }

  // (2) any non-zero delta is R3 by default; only a human-granted marker demotes it
  if (ops.length) {
    const allAnnotated = ops.every((o) => { const s = storeBlocks.get(blockKey(o)); return !!(s && s.blastLow); });
    if (!allAnnotated) return R('R3', 'n/a', `an unannotated delta block changes the living contract (fail-up) — ${REJECT}`);
    return R('R2', 'whitelist', 'every touched block carries a human-granted blast: low marker');
  }

  // (3)(4)(5) zero-delta kinds grade by declaration
  if (kind === 'code-behavior') return R('R2', 'behavior', 'a spec-preserving behavior fix');
  if (kind === 'code-trivial') {
    if (list(h.get('touched-modules')).length === 1) return R('R1', 'n/a', 'a single-module trivial fix with no spec change');
    return R('R3', 'n/a', `a trivial fix spanning several modules — ${REJECT}`);
  }
  if (kind === 'no-code') return R('R0', 'n/a', 'no code changed — the conclusion is the whole write-back');
  return R('R3', 'n/a', `unclassifiable bundle — ${REJECT}`);
}

// ---- layer 4: the two digest domains --------------------------------------------------
// One record encoding serves both. Each record is
//     <decimal tag byte length>\n<type-tag>\n<decimal bytes length>\n<bytes>
// — BOTH parts length-prefixed, so a tag carrying a newline still cannot forge a record
// boundary. Ordering is always UTF-8 byte order, never locale collation.
function digestRecord(tag, bytes) {
  const t = Buffer.from(String(tag), 'utf8');
  const b = Buffer.isBuffer(bytes) ? bytes : Buffer.from(String(bytes == null ? '' : bytes), 'utf8');
  return Buffer.concat([Buffer.from(`${t.length}\n`, 'utf8'), t, Buffer.from(`\n${b.length}\n`, 'utf8'), b]);
}
const byteOrder = (a, b) => Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

// canonical path — the single input to dedup and ordering. Repo/bundle-relative only:
// separators normalized to '/', repeats collapsed, '.' segments dropped, '..' refused,
// and NO case folding (a case difference is a different path, as everywhere else here).
function canonicalPath(p) {
  const raw = String(p == null ? '' : p);
  const parts = raw.replace(/\\/g, '/').split('/').filter((s) => s !== '' && s !== '.');
  if (parts.includes('..')) return { path: null, problem: `path contains '..': ${raw}` };
  return { path: parts.join('/'), problem: null };
}

// the review digest = digest-core. Business entities only; process sections are excluded.
function digestCore(bundle) {
  const recs = [];
  const deltas = [...(bundle.deltaFiles || [])].sort((a, b) => byteOrder(a.path, b.path));
  for (const f of deltas) recs.push(digestRecord(`delta:${f.path}`, f.text));
  recs.push(digestRecord('decisions', bundle.decisionsText || ''));
  recs.push(digestRecord('section:Conclusion', bundle.sections ? (bundle.sections.get('Conclusion') || '') : ''));
  recs.push(digestRecord('section:Bindings', bundle.sections ? (bundle.sections.get('Bindings') || '') : ''));
  const header = bundle.header || new Map();
  for (const key of [...header.keys()].sort(byteOrder)) recs.push(digestRecord(`field:${key}`, header.get(key)));
  recs.push(digestRecord('baseline', bundle.baseline || ''));
  return sha256(Buffer.concat(recs));
}

// the d1 signoff token = core + the store/truth baselines it was approved against.
// Domain order is fixed core → store → truth (no artifact domain: f2 was not ruled in).
const TOKEN_DOMAINS = ['store', 'truth'];
function approvalToken(coreHex, files) {
  const problems = [];
  const recs = [digestRecord('core', coreHex)];
  for (const domain of TOKEN_DOMAINS) {
    const seen = new Map();
    for (const f of (files || []).filter((x) => x.domain === domain)) {
      const c = canonicalPath(f.path);
      if (c.problem) { problems.push(`${domain} baseline ${c.problem}`); continue; }
      const prior = seen.get(c.path);
      if (prior !== undefined && prior !== f.sha) { problems.push(`${domain}:${c.path} appears twice with different content hashes`); continue; }
      seen.set(c.path, f.sha);
    }
    for (const p of [...seen.keys()].sort(byteOrder)) recs.push(digestRecord(`${domain}:${p}`, seen.get(p)));
  }
  return { token: problems.length ? null : sha256(Buffer.concat(recs)), problems };
}

// ---- layer 5: the review surface ------------------------------------------------------
// The raw transcript carries exactly one verdict zone at its end. The line keeps state A's
// `^VERDICT:` prefix so the existing parser still sees it; role= and digest= are the new
// mandatory trailers, boundary= is conditional on the γ' whitelist point-check.
const VERDICT_MARKER = '=== VERDICT ===';
const VERDICT_PHRASES = {
  inspection: [/^no findings$/, /^[1-9][0-9]* issues open$/],
  p8: [/^no spec-vs-code gaps$/, /^gaps found$/],
};
const PASSING_PHRASES = ['no findings', 'no spec-vs-code gaps'];
const HEX64 = /^[0-9a-f]{64}$/;

function parseVerdictZone(rawText) {
  const problems = [];
  const lines = String(rawText || '').split('\n').map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l));
  const marks = lines.map((l, i) => (l.trim() === VERDICT_MARKER ? i : -1)).filter((i) => i >= 0);
  if (!marks.length) return { verdicts: [], problems: [`the raw transcript carries no '${VERDICT_MARKER}' marker`] };
  if (marks.length > 1) return { verdicts: [], problems: [`the raw transcript carries ${marks.length} '${VERDICT_MARKER}' markers — the zone must be unique`] };

  const verdicts = [];
  for (const line of lines.slice(marks[0] + 1)) {
    const text = line.trim();
    if (!text) continue;
    if (!text.startsWith('VERDICT:')) { problems.push(`non-verdict line inside the verdict zone: ${text.slice(0, 80)}`); continue; }
    const v = { role: null, digest: null, boundary: null, phrase: null, raw: text };
    let body = text.slice('VERDICT:'.length);
    for (const key of ['role', 'digest', 'boundary']) {
      const hits = [...body.matchAll(new RegExp(`\\s${key}=(\\S*)`, 'g'))];
      if (hits.length > 1) { problems.push(`verdict line repeats '${key}=': ${text.slice(0, 80)}`); }
      if (hits.length) { v[key] = hits[0][1]; body = body.split(hits[0][0]).join(''); }
    }
    v.phrase = body.trim();

    if (!v.role) problems.push(`verdict line is missing 'role=': ${text.slice(0, 80)}`);
    else if (!Object.prototype.hasOwnProperty.call(VERDICT_PHRASES, v.role)) problems.push(`verdict role '${v.role}' is not one of: ${Object.keys(VERDICT_PHRASES).join(', ')}`);
    else if (!VERDICT_PHRASES[v.role].some((re) => re.test(v.phrase))) problems.push(`verdict phrase '${v.phrase}' is not legal for role=${v.role}`);
    if (!v.digest) problems.push(`verdict line is missing 'digest=': ${text.slice(0, 80)}`);
    else if (!HEX64.test(v.digest)) problems.push(`verdict digest is not 64 lowercase hex characters: ${v.digest.slice(0, 80)}`);
    if (v.boundary !== null && !['within', 'exceeds'].includes(v.boundary)) problems.push(`verdict boundary '${v.boundary}' is not within|exceeds`);
    verdicts.push(v);
  }
  return { verdicts, problems };
}

// what review the ruled projection demands of this grade
function reviewRequirement(graded, state) {
  const kind = state.header.get('change-kind');
  const decisions = (state.header.get('kinds') || '').split(',').map((s) => s.trim()).includes('3');
  if (graded.radius === 'R1') return { roles: [], boundary: false, why: 'R1 carries no point-check' };
  if (graded.radius === 'R0') {
    return decisions
      ? { roles: ['inspection'], boundary: false, why: 'R0 with decisions: the point-check reads decisions against the conclusion' }
      : { roles: [], boundary: false, why: 'a bare R0 conclusion carries no point-check' };
  }
  if (graded.radius === 'R2' && graded.subtype === 'whitelist' && kind === 'doc-fix') {
    return { roles: ['inspection', 'p8'], boundary: true, why: 'R2 × docs: two duties, two verdict lines' };
  }
  if (graded.radius === 'R2') {
    return { roles: ['inspection'], boundary: graded.subtype === 'whitelist', why: 'R2 code: one point-check round' };
  }
  return { roles: [], boundary: false, why: '' };
}

function checkReview(graded, state, review) {
  const problems = [];
  const need = reviewRequirement(graded, state);
  const verdicts = (review && review.verdicts) || [];
  if (!need.roles.length) {
    return { problems, need };
  }
  if (!review || review.missing) { problems.push(`${need.why} — no review round is present under review/`); return { problems, need }; }
  problems.push(...(review.problems || []));
  if (verdicts.length !== need.roles.length) {
    problems.push(`the review round carries ${verdicts.length} verdict line(s); this grade demands exactly ${need.roles.length} (${need.roles.join(' then ')})`);
  } else {
    need.roles.forEach((role, i) => { if (verdicts[i].role !== role) problems.push(`verdict line ${i + 1} has role=${verdicts[i].role}; the ruled order is ${need.roles.join(' then ')}`); });
  }
  for (const v of verdicts) {
    if (v.phrase && !PASSING_PHRASES.includes(v.phrase)) problems.push(`review verdict '${v.phrase}' does not pass — archiving is refused until the round closes`);
    if (v.digest && review.digest && v.digest !== review.digest) problems.push(`verdict digest ${v.digest.slice(0, 12)} does not match the recomputed review digest ${review.digest.slice(0, 12)} — the bundle changed after the review`);
    if (need.boundary && v.role === 'inspection') {
      if (v.boundary === null) problems.push("the γ' whitelist point-check must carry the boundary= trailer (it stands in for a human signoff)");
      else if (v.boundary === 'exceeds') problems.push('the point-check judged the change to EXCEED the whitelisted boundary — archiving is refused');
    } else if (v.boundary !== null) {
      problems.push('a boundary= trailer appears where the ruled projection does not ask for one');
    }
  }
  return { problems, need };
}

// review/round-<n>.md + round-<n>-raw.txt; the highest n is consumed, and every round
// must be a complete pair — a half-round anywhere is a problem, not a silent skip.
const ROUND_DOC = /^round-([1-9][0-9]*)\.md$/;
const ROUND_RAW = /^round-([1-9][0-9]*)-raw\.txt$/;
function selectRound(entries) {
  const problems = [];
  const docs = new Map();
  const raws = new Map();
  for (const name of (entries || [])) {
    const d = ROUND_DOC.exec(name);
    if (d) { docs.set(Number(d[1]), name); continue; }
    const r = ROUND_RAW.exec(name);
    if (r) { raws.set(Number(r[1]), name); continue; }
    if (/^round-/.test(name)) problems.push(`review file '${name}' does not follow round-<n>.md / round-<n>-raw.txt (n decimal, no leading zeros)`);
  }
  const rounds = [...new Set([...docs.keys(), ...raws.keys()])].sort((a, b) => a - b);
  for (const n of rounds) {
    if (!docs.has(n)) problems.push(`review round ${n} has a raw transcript but no round-${n}.md`);
    if (!raws.has(n)) problems.push(`review round ${n} has a document but no round-${n}-raw.txt`);
  }
  const latest = rounds.length ? rounds[rounds.length - 1] : null;
  return { n: latest, doc: latest ? docs.get(latest) : null, raw: latest ? raws.get(latest) : null, problems };
}

// ---- layer 6: the bundle on disk ------------------------------------------------------
const SCENARIO_RE = /^####\s+Scenario:\s*(\S+)/gm;
const BLAST_LOW_RE = /^\s*(?:-\s*)?blast:\s*low\s*$/m;
const DECISION_ID_RE = /^-\s+(D-[A-Z]+-(\d+))\s/gm;
const STATE_FILE = 'hotfix-state.md';

const readIf = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };
const listIf = (p) => { try { return fs.readdirSync(p); } catch { return []; } };
const scenariosOf = (text) => { SCENARIO_RE.lastIndex = 0; return [...String(text).matchAll(SCENARIO_RE)].map((m) => m[1]); };

const STATE_SKELETON = (name, date) => `hotfix: ${name}
date: ${date}
kinds: <1 = a fix landed | 2 = no fix needed | 3 = a business fact; comma-separated>
change-kind: <${CHANGE_KINDS.join(' | ')}>
touched-modules: <module[, module] — code and doc kinds only>
fix-ref: <the commit that carried the fix — code and doc kinds only>
frontend-touched: <yes | no — code kinds only>
backend-touched: <yes | no — code kinds only>
affected-scenario-ids: <ID[, ID] — code kinds only>

## Conclusion

${PLACEHOLDER}

## Bindings

<one line per delta target key: '<key>: tests: <the test that covers it>'; delete this line if the bundle carries no delta>
`;

// apriori hotfix new <name> — the 10-minute bundle's starting shape
function scaffoldHotfix(root, name, now) {
  const v = require('./resolve').validateChangeName(name);
  if (!v.ok) return { ok: false, error: `invalid hotfix name '${name}' — bare kebab-case, same rule as \`apriori new\`` };
  const dir = path.join(root, 'apriori', 'changes', name);
  if (fs.existsSync(dir)) return { ok: false, error: `'${name}' already exists at ${path.relative(root, dir)}` };
  for (const sub of ['specs', 'evidence', 'review']) fs.mkdirSync(path.join(dir, sub), { recursive: true });
  const p = (n) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
  const file = path.join(dir, STATE_FILE);
  fs.writeFileSync(file, STATE_SKELETON(name, date));
  return { ok: true, path: path.relative(root, file) };
}

// the module vocabulary is the union of what the store and the truth tree already know
function moduleVocabulary(cwd) {
  const specs = listIf(path.join(cwd, 'apriori', 'specs'))
    .filter((n) => { try { return fs.statSync(path.join(cwd, 'apriori', 'specs', n)).isDirectory(); } catch { return false; } });
  const truth = listIf(path.join(cwd, 'apriori', 'truth')).filter((n) => n.endsWith('.md')).map((n) => n.slice(0, -3));
  return [...new Set([...specs, ...truth])].sort();
}

// decisions.md: `## <module>` blocks holding `- (active): <text>` / `- (supersedes D-XX-n): <text>`
function parseDecisions(text) {
  const problems = [];
  const entries = [];
  let module = null;
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const h = /^##\s+(\S+)\s*$/.exec(line);
    if (h) { module = h[1]; continue; }
    const d = /^-\s*\((active|supersedes\s+(D-[A-Z]+-\d+))\)\s*:\s*(.+)$/.exec(line);
    if (!d) { problems.push(`decisions.md line is not '- (active): <text>' or '- (supersedes D-XX-n): <text>': ${line.slice(0, 80)}`); continue; }
    if (!module) { problems.push(`decision appears before any '## <module>' heading: ${line.slice(0, 80)}`); continue; }
    entries.push({ module, supersedes: d[2] || null, text: d[3].trim() });
  }
  return { entries, problems };
}

// read every artefact the checkers need, without judging any of it
function loadBundle(cwd, name) {
  const problems = [];
  const dir = path.join(cwd, 'apriori', 'changes', name);
  if (!fs.existsSync(dir)) return { problems: [`no bundle at apriori/changes/${name}`], dir };

  const stateText = readIf(path.join(dir, STATE_FILE));
  if (stateText === null) return { problems: [`apriori/changes/${name}/${STATE_FILE} is missing — this is not a hotfix bundle`], dir };
  // identity exclusivity: a directory is a formal change or a hotfix, never both
  if (fs.existsSync(path.join(dir, 'flow-state.md'))) {
    problems.push(`apriori/changes/${name} carries BOTH flow-state.md and ${STATE_FILE} — a bundle has one identity; delete the one that does not belong`);
  }
  const state = parseState(stateText);
  problems.push(...state.problems);

  // delta files: specs/<module>/<file>.md
  const deltaFiles = [];
  const ops = [];
  const modules = new Set();
  const specsRoot = path.join(dir, 'specs');
  for (const mod of listIf(specsRoot).sort()) {
    const modDir = path.join(specsRoot, mod);
    let stat; try { stat = fs.statSync(modDir); } catch { continue; }
    if (!stat.isDirectory()) { problems.push(`specs/${mod} is not a module directory`); continue; }
    for (const f of listIf(modDir).filter((n) => n.endsWith('.md')).sort()) {
      const text = readIf(path.join(modDir, f));
      if (text === null) continue;
      const parsed = require('./archive-merge').parseDeltaStrict(text);
      deltaFiles.push({
        path: `specs/${mod}/${f}`, text, module: mod, stamp: parsed.stamp,
        mutations: parsed.delta.MODIFIED.size + parsed.delta.REMOVED.size + parsed.delta.RENAMED.length,
      });
      for (const p of parsed.problems) problems.push(`specs/${mod}/${f}: ${p}`);
      for (const type of ['ADDED', 'MODIFIED', 'REMOVED']) {
        for (const [title, body] of parsed.delta[type]) {
          ops.push({ type, module: mod, title, body, scenarios: scenariosOf(body), blastLow: BLAST_LOW_RE.test(body) });
          modules.add(mod);
        }
      }
      for (const [from, to] of parsed.delta.RENAMED) { ops.push({ type: 'RENAMED', module: mod, title: from, body: '', scenarios: [], blastLow: false, renamedTo: to }); modules.add(mod); }
    }
  }

  // the store blocks the delta targets — the human-granted markers live here, not in the delta
  const storeBlocks = new Map();
  for (const mod of new Set(ops.map((o) => o.module))) {
    const storeText = readIf(path.join(cwd, 'apriori', 'specs', mod, 'spec.md'));
    if (storeText === null) continue;
    for (const [title, block] of require('./archive-merge').parseRequirements(storeText)) {
      storeBlocks.set(`${mod}::${title}`, { blastLow: BLAST_LOW_RE.test(block), block });
    }
  }

  const decisionsText = readIf(path.join(dir, 'decisions.md'));
  const decisions = parseDecisions(decisionsText || '');
  problems.push(...decisions.problems);

  return {
    problems, dir, state, stateText,
    delta: { ops, modules: [...modules].sort() }, deltaFiles,
    decisionsText: decisionsText || '', decisions: decisions.entries,
    storeBlocks, vocabulary: moduleVocabulary(cwd),
    standaloneBindingsFile: fs.existsSync(path.join(dir, 'bindings.md')),
    evidence: readIf(path.join(dir, 'evidence', 'screenshots.md')),
    reviewEntries: listIf(path.join(dir, 'review')),
  };
}

// ---- layer 7: preflight (zero writes) -------------------------------------------------
// git seams stay injectable so the tests never need a real repository
function gitHead(cwd, run) { const r = run(['rev-parse', 'HEAD'], cwd); return r.code === 0 ? r.out.trim() : null; }
function gitDirty(cwd, run) {
  const r = run(['status', '--porcelain'], cwd);
  if (r.code !== 0) return { problem: 'git status failed — the clean-tree condition cannot be judged', dirty: [] };
  const dirty = r.out.split('\n').map((l) => l.slice(3).trim()).filter(Boolean)
    .filter((p) => !p.startsWith('apriori/changes/') && !p.startsWith('apriori/tmp/'));
  return { problem: null, dirty };
}
const defaultGit = (args, cwd) => {
  const r = require('child_process').spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8' });
  return { code: r.status === null ? 1 : r.status, out: r.stdout || '' };
};

function preflight(cwd, name, o = {}) {
  const out = [], err = [], advisories = [];
  const git = o.git || defaultGit;
  const b = loadBundle(cwd, name);
  if (!b.state) return { code: 2, out, err: b.problems.map((p) => `hotfix: ${p}`), advisories };

  const problems = [...b.problems];
  const profile = o.profile !== undefined ? o.profile : require('./config').resolveVerificationProfile(cwd).profile;
  problems.push(...checkFields(b.state, { ...b, profile }));

  let graded = null;
  if (!problems.length) {
    graded = grade(b.state, b);
    problems.push(...graded.problems);
    if (graded.radius === 'R3') problems.push(`grade: (R3, n/a) — ${graded.reason}`);
  }
  if (problems.length) return { code: 1, out, err: problems.map((p) => `hotfix: ${p}`), advisories, grade: graded };

  problems.push(...checkBindings(b.state, b));

  // CAS: a delta that rewrites an existing block must be stamped against the store it read
  const am0 = require('./archive-merge');
  for (const f of b.deltaFiles) {
    if (!f.mutations) continue;
    const storeText = readIf(path.join(cwd, 'apriori', 'specs', f.module, 'spec.md'));
    const expected = storeText === null ? 'new' : am0.fingerprint(storeText);
    if (!f.stamp) problems.push(`${f.path} rewrites store blocks with no apriori-base stamp — stamp it with \`apriori stamp apriori/specs/${f.module}/spec.md\``);
    else if (f.stamp !== expected) problems.push(`${f.path} is stamped against a different baseline than the store now holds (CAS mismatch) — re-read the store and re-stamp`);
  }

  const head = gitHead(cwd, git);
  const ev = checkEvidence({
    tier: 'incremental', profile,
    frontendTouched: b.state.header.get('frontend-touched') === 'yes',
    head, records: b.evidence,
    waiver: /^ui:\s*not-applicable/m.test(b.evidence || '') ? (b.evidence || '').split('\n').find((l) => /^ui:\s*not-applicable/.test(l)) : null,
  });
  problems.push(...ev.problems);
  advisories.push(...ev.advisories);

  // t1: a clean tree outside the bundle's own directory and the instrument dir
  const tree = gitDirty(cwd, git);
  if (tree.problem) problems.push(tree.problem);
  else if (tree.dirty.length) problems.push(`the working tree carries uncommitted changes outside the bundle (${tree.dirty.slice(0, 5).join(', ')}${tree.dirty.length > 5 ? ', …' : ''}) — the fix must be committed before its record is archived`);

  // the review digest, then the review surface the ruled projection demands
  const digest = digestCore({
    deltaFiles: b.deltaFiles, decisionsText: b.decisionsText, sections: b.state.sections,
    header: b.state.header, baseline: head || b.state.header.get('fix-ref') || '',
  });
  const round = selectRound(b.reviewEntries);
  problems.push(...round.problems);
  const rawText = round.raw ? readIf(path.join(b.dir, 'review', round.raw)) : null;
  const zone = rawText === null ? null : parseVerdictZone(rawText);
  const rv = checkReview(graded, b.state, zone ? { ...zone, digest } : (round.n ? { missing: false, verdicts: [], problems: [`review round ${round.n} raw transcript is unreadable`], digest } : null));
  problems.push(...rv.problems);

  // Q-3=i: the verification proof is implicit — the scoped verdict over
  // (delta scenarios ∪ affected-scenario-ids) must be clean before anything is written
  const scope = [...new Set([
    ...b.delta.ops.flatMap((op) => op.scenarios || []),
    ...(b.state.header.get('affected-scenario-ids') || '').split(',').map((s) => s.trim()).filter(Boolean),
  ])];
  let scoped = null;
  if (scope.length && o.verify !== false) {
    scoped = (o.runScopedVerify || defaultScopedVerify)(cwd, scope, o);
    if (scoped.error) problems.push(scoped.error);
    else if (!scoped.clean) {
      const parts = [];
      if (scoped.boundRed.length) parts.push(`red: ${scoped.boundRed.join(', ')}`);
      if (scoped.unbound.length) parts.push(`unbound: ${scoped.unbound.join(', ')}`);
      if (scoped.missing.length) parts.push(`unknown to the store: ${scoped.missing.join(', ')}`);
      problems.push(`the scoped verdict is not clean (${parts.join('; ')}) — the lane's proof is the named scenario set going green`);
    }
  }

  out.push(`bundle:  apriori/changes/${name}`);
  out.push(`grade:   (${graded.radius}, ${graded.subtype}) — ${graded.reason}`);
  out.push(`scope:   ${scope.length ? scope.join(', ') : '(none — a zero-delta conclusion)'}`);
  out.push(`digest:  ${digest}`);
  out.push(`review:  ${round.n ? `round-${round.n} (${rv.need.roles.join(', ') || 'no point-check demanded'})` : rv.need.roles.length ? 'MISSING' : 'not demanded by this grade'}`);
  for (const a of advisories) out.push(`advisory: ${a}`);

  if (problems.length) { err.push(...problems.map((p) => `hotfix: ${p}`)); return { code: 1, out, err, advisories, grade: graded, digest, bundle: b }; }
  return { code: 0, out, err, advisories, grade: graded, digest, bundle: b, scope, head };
}

function defaultScopedVerify(cwd, scope, o) {
  const runner = require('./spec-runner');
  const testCmd = o.testCmd || runner.configTestCmd(cwd);
  if (!testCmd) return { error: 'no test command: pass --test-cmd or add a | test-cmd | row to process-config' };
  const run = runner.verify({ cwd, specs: [path.join(cwd, 'apriori', 'specs')], testCmd, scope });
  if (run.errors && run.errors.length) return { error: `the verify run is untrustworthy (${run.errors[0]})` };
  return run.scopedVerdict;
}

// ---- layer 8: the signoff token's baseline set ----------------------------------------
// What the token is computed over: every store file the delta rewrites and every truth doc
// the decisions append to — the exact files the write set will touch.
function baselineFiles(cwd, bundle) {
  const files = [];
  for (const mod of bundle.delta.modules) {
    const rel = `apriori/specs/${mod}/spec.md`;
    const text = readIf(path.join(cwd, rel));
    if (text !== null) files.push({ domain: 'store', path: rel, sha: sha256(Buffer.from(text, 'utf8')) });
  }
  for (const mod of new Set(bundle.decisions.map((d) => d.module))) {
    const rel = `apriori/truth/${mod}.md`;
    const text = readIf(path.join(cwd, rel));
    if (text !== null) files.push({ domain: 'truth', path: rel, sha: sha256(Buffer.from(text, 'utf8')) });
  }
  return files;
}

// ---- layer 9: the three-stage write set ----------------------------------------------
// stores → truth → bundle move. Each stage writes through a temp file and one atomic
// rename, and each stage names exactly what it did and did not do when it fails, so a
// half-finished run is completed by rerunning rather than by hand-repair.
function appendDecisions(truthText, entries, name, date) {
  const problems = [];
  DECISION_ID_RE.lastIndex = 0;
  const existing = [...String(truthText).matchAll(DECISION_ID_RE)];
  if (!existing.length) {
    problems.push('the truth doc carries no existing decision to take an ID prefix from — seed its first decision by hand before a hotfix may append one');
    return { text: truthText, problems, added: [] };
  }
  const prefix = existing[0][1].replace(/\d+$/, '');
  let next = Math.max(...existing.map((m) => Number(m[2]))) + 1;
  const known = new Set(existing.map((m) => m[1]));
  const lines = [];
  const added = [];
  for (const e of entries) {
    if (e.supersedes && !known.has(e.supersedes)) { problems.push(`decision supersedes ${e.supersedes}, which the truth doc does not carry`); continue; }
    const id = `${prefix}${next++}`;
    const tail = e.supersedes ? `(supersedes ${e.supersedes})` : '(active)';
    lines.push(`- ${id} ${tail}: ${e.text} Ratified in ${name} (${date}).`);
    added.push(id);
  }
  if (problems.length) return { text: truthText, problems, added: [] };
  const anchor = '## Decisions (doc-is-truth)\n';
  const at = truthText.indexOf(anchor);
  if (at < 0) return { text: truthText, problems: ['the truth doc has no `## Decisions (doc-is-truth)` section to append to'], added: [] };
  const cut = at + anchor.length;
  return { text: `${truthText.slice(0, cut)}\n${lines.join('\n')}\n${truthText.slice(cut).replace(/^\n+/, '')}`, problems, added };
}

function writeAtomic(file, text, ops) {
  const tmp = `${file}.tmp-hotfix`;
  if (fs.existsSync(tmp)) throw new Error(`temp file already exists: ${tmp} — another run in flight or a manual-recovery artifact; not touching it`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  ops.writeFileSync(tmp, text);
  ops.renameSync(tmp, file);
}

function archiveHotfix(o) {
  const out = [], err = [];
  const cwd = o.cwd || process.cwd();
  const ops = o.ops || { writeFileSync: fs.writeFileSync.bind(fs), renameSync: fs.renameSync.bind(fs) };
  const pre = preflight(cwd, o.name, o);
  out.push(...pre.out);
  if (pre.code !== 0) { err.push(...pre.err); out.push('\nRESULT: FAILED PREFLIGHT — nothing written'); return { code: pre.code, out, err }; }

  const b = pre.bundle;
  const date = new Date(o.now || Date.now());
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const files = baselineFiles(cwd, b);
  const tok = approvalToken(pre.digest, files);
  if (tok.problems.length) { err.push(...tok.problems.map((p) => `hotfix: ${p}`)); return { code: 1, out, err }; }

  // stage 0: the write plan, printed before anything is written, in both modes
  out.push('\nwrite set (in order):');
  for (const f of files) out.push(`  ${f.domain}: ${f.path}`);
  // the plan names the destination the move will ACTUALLY use (stamp includes the time)
  out.push(`  move:  apriori/changes/${o.name} → apriori/changes/archive/${require('./archive-merge').archiveStamp(date)}-${o.name}`);
  out.push(`\ntoken:   ${tok.token}`);

  if (!o.approve) {
    out.push(`\nRESULT: READY — review the write set, then re-run with --approve ${tok.token}`);
    return { code: 0, out, err };
  }
  if (o.approve !== tok.token) {
    err.push(`hotfix: the approval token does not match what this bundle and these baselines now hash to — the bundle or a baseline changed after the token was issued (given ${String(o.approve).slice(0, 12)}…, computed ${tok.token.slice(0, 12)}…)`);
    out.push('\nRESULT: REFUSED — nothing written');
    return { code: 1, out, err };
  }

  // stage 1: stores
  const am = require('./archive-merge');
  const written = [];
  for (const mod of b.delta.modules) {
    const rel = path.join('apriori', 'specs', mod, 'spec.md');
    const abs = path.join(cwd, rel);
    const storeText = readIf(abs) || '';
    const deltaFile = b.deltaFiles.find((f) => f.path.startsWith(`specs/${mod}/`));
    const merged = am.merge(storeText, am.parseDelta(deltaFile.text), o.name);
    if (merged.conflicts && merged.conflicts.length) {
      err.push(...merged.conflicts.map((c) => `hotfix: ${rel}: ${c}`));
      out.push(`\nRESULT: FAILED at stage 1 (stores) — written so far: ${written.join(', ') || '(none)'}`);
      return { code: 1, out, err };
    }
    try { writeAtomic(abs, am.renderStore(storeText, merged.store), ops); }
    catch (e) { err.push(`hotfix: stage 1 (stores) failed at ${rel}: ${e.message}`); out.push(`\nRESULT: FAILED at stage 1 — written so far: ${written.join(', ') || '(none)'}`); return { code: 1, out, err }; }
    written.push(rel);
  }

  // stage 2: truth decisions
  const ratified = [];
  for (const mod of [...new Set(b.decisions.map((d) => d.module))].sort()) {
    const rel = path.join('apriori', 'truth', `${mod}.md`);
    const abs = path.join(cwd, rel);
    const truthText = readIf(abs);
    if (truthText === null) { err.push(`hotfix: stage 2 (truth) has no ${rel} to append to — stage 1 already committed: ${written.join(', ')}; create the doc and rerun`); return { code: 1, out, err }; }
    const app = appendDecisions(truthText, b.decisions.filter((d) => d.module === mod), o.name, stamp);
    if (app.problems.length) {
      err.push(...app.problems.map((p) => `hotfix: ${rel}: ${p}`));
      out.push(`\nRESULT: FAILED at stage 2 (truth) — stage 1 committed: ${written.join(', ') || '(none)'}; rerun after fixing`);
      return { code: 1, out, err };
    }
    try { writeAtomic(abs, app.text, ops); }
    catch (e) { err.push(`hotfix: stage 2 (truth) failed at ${rel}: ${e.message} — stage 1 committed: ${written.join(', ')}`); return { code: 1, out, err }; }
    ratified.push(...app.added);
    written.push(rel);
  }

  // stage 3: approval record, then the bundle move
  const approval = `<!-- command-owned: written by \`apriori hotfix archive --approve\`; editing this by hand is an audit violation -->
hotfix: ${o.name}
date: ${stamp}
grade: (${pre.grade.radius}, ${pre.grade.subtype})
digest: ${pre.digest}
token: ${tok.token}
baselines:
${files.map((f) => `  - ${f.domain}: ${f.path} ${f.sha}`).join('\n') || '  (none)'}
decisions-ratified: ${ratified.join(', ') || '(none)'}
`;
  try { writeAtomic(path.join(b.dir, 'approval.md'), approval, ops); }
  catch (e) { err.push(`hotfix: stage 3 could not write approval.md: ${e.message} — stages 1-2 committed: ${written.join(', ')}`); return { code: 1, out, err }; }

  let moved = null;
  try { moved = am.archiveChangeDir(path.join(cwd, 'apriori', 'changes'), o.name, date, ops); }
  catch (e) { err.push(`hotfix: stages 1-2 committed (${written.join(', ')}) but the bundle move failed: ${e.message} — rerun to complete`); return { code: 1, out, err }; }

  out.push(`\nRESULT: ARCHIVED — ${written.length} file(s) rewritten${ratified.length ? `, decisions ${ratified.join(', ')} ratified` : ''}; bundle → ${path.relative(cwd, moved)}`);
  return { code: 0, out, err };
}

// ---- layer 10: the CLI ----------------------------------------------------------------
const USAGE = `usage: apriori hotfix new <name>
       apriori hotfix archive <name> [--approve <token>] [--test-cmd "<cmd>"] [--cwd <dir>]

The hotfix lane is the minimal write-back unit: a conclusion, an optional spec delta with
its test bindings, and a direct archive. Admission is decided mechanically by blast radius
— anything larger than the lane carries belongs in a formal change.`;

function cli(argv) {
  const sub = argv[0];
  if (sub === 'new') {
    return withStrict(argv.slice(1), { sub: 'hotfix new', usage: USAGE, positionals: 1, flags: {} }, (f, pos) => {
      const r = scaffoldHotfix(process.cwd(), pos[0], new Date());
      if (!r.ok) { console.error(`  ✗ ${r.error}`); return 1; }
      console.log(`  ✓ ${r.path}`);
      console.log('\n  Next: fill in the header, write the conclusion, then:\n    apriori hotfix archive ' + pos[0]);
      return 0;
    });
  }
  if (sub === 'archive') {
    return withStrict(argv.slice(1), {
      sub: 'hotfix archive', usage: USAGE, positionals: 1,
      flags: { '--approve': 'value', '--test-cmd': 'value', '--cwd': 'value', '--no-verify': 'flag' },
    }, (f, pos) => {
      const r = archiveHotfix({
        cwd: path.resolve(f['--cwd'] || process.cwd()), name: pos[0],
        approve: f['--approve'], testCmd: f['--test-cmd'], verify: !f['--no-verify'],
      });
      for (const line of r.out) console.log(line);
      for (const line of r.err) console.error(line);
      return r.code;
    });
  }
  if (sub === undefined || sub === '--help' || sub === '-h') { console.log(USAGE); return 0; }
  console.error(`hotfix: unknown subcommand '${sub}'\n${USAGE}`);
  return 2;
}

module.exports = {
  parseState, checkFields, checkBindings, checkEvidence, grade, targetKeys,
  digestRecord, digestCore, approvalToken, canonicalPath,
  parseVerdictZone, reviewRequirement, checkReview, selectRound,
  scaffoldHotfix, loadBundle, parseDecisions, moduleVocabulary, preflight,
  baselineFiles, appendDecisions, archiveHotfix, cli,
  HEADER_KEYS, SECTIONS, CHANGE_KINDS, PLACEHOLDER, DECISION_CAP, EVIDENCE_FIELDS, VERDICT_MARKER, STATE_FILE, USAGE,
};
