'use strict';
/*
 * archive-merge — plain-files native implementation of the archive action (§4).
 * Zero deps — pure Node stdlib. Consumes the same delta format the OpenSpec adapter used
 * (## ADDED/MODIFIED/REMOVED/RENAMED Requirements), so it is the adapter-free path.
 *
 * 3.1: also home of the merge-family pure helpers shared with `verify --change` —
 * delta discovery, projection building, CAS base stamps, realpath containment.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { withStrict } = require('./args');

const REQ_RE = /^###\s+Requirement:\s+(.+?)\s*$([\s\S]*?)(?=^###\s+Requirement:|$(?![\s\S]))/gm;
const SECTION_SPLIT_RE = /^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements\s*$/m;
// the exact marker merge() injects on REMOVED; heading LINE of a deprecated block
const DEPRECATED_RE = /^###\s+Requirement:.*_deprecated \(superseded by [^)]*\)_/;
// a whole deprecated block (heading line + body up to the next requirement)
const DEPRECATED_BLOCK_RE = /^###[ \t]+Requirement:[^\n]*_deprecated \(superseded by [^)]*\)_[^\n]*$[\s\S]*?(?=^###[ \t]+Requirement:|$(?![\s\S]))/gm;

function stripDeprecatedBlocks(text) { return text.replace(DEPRECATED_BLOCK_RE, ''); }

// name -> full block (heading + body), in document order; duplicates reported (first block wins)
function parseRequirementsStrict(text) {
  const map = new Map();
  const duplicates = [];
  let m;
  REQ_RE.lastIndex = 0;
  while ((m = REQ_RE.exec(text)) !== null) {
    const name = m[1].trim();
    if (map.has(name)) duplicates.push(name);
    else map.set(name, m[0].replace(/\s+$/, '') + '\n');
  }
  return { map, duplicates };
}

function parseRequirements(text) { return parseRequirementsStrict(text).map; }

// ---- CAS base stamps -------------------------------------------------------

// sha256 over content with line endings normalized — a delta authored on Windows
// must fingerprint identically to the same store checked out with LF
function fingerprint(text) {
  const norm = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return 'sha256:' + crypto.createHash('sha256').update(norm, 'utf8').digest('hex');
}

const STAMP_LINE_RE = /^<!--\s*apriori-base:\s*(\S+)\s*-->\s*$/gm;
// any standalone comment line ATTEMPTING to be a stamp — a malformed attempt must be an error,
// never silently treated as "unstamped" (that would quietly disable CAS)
const STAMP_ATTEMPT_RE = /^\s*<!--(?=[^>]*apriori-base)[^>]*-->\s*$/gm;

// → { stamp: 'sha256:<hex>' | 'new' | null, problems: [] }
// Exactly one stamp line, before the first delta section, well-formed digest.
function parseStamp(text) {
  const problems = [];
  const sectionIdx = text.search(SECTION_SPLIT_RE);
  STAMP_ATTEMPT_RE.lastIndex = 0;
  let m;
  while ((m = STAMP_ATTEMPT_RE.exec(text)) !== null) {
    STAMP_LINE_RE.lastIndex = 0;
    if (!STAMP_LINE_RE.test(m[0].trim())) problems.push(`malformed apriori-base stamp line: ${m[0].trim()}`);
  }
  const found = [];
  STAMP_LINE_RE.lastIndex = 0;
  while ((m = STAMP_LINE_RE.exec(text)) !== null) found.push({ value: m[1], index: m.index });
  if (!found.length) return { stamp: null, problems };
  if (found.length > 1) problems.push('carries more than one apriori-base stamp line');
  for (const f of found) {
    if (sectionIdx >= 0 && f.index > sectionIdx) problems.push('apriori-base stamp appears after the first delta section heading');
    if (f.value !== 'new' && !/^sha256:[0-9a-f]{64}$/.test(f.value)) problems.push(`malformed apriori-base stamp '${f.value}'`);
  }
  return { stamp: problems.length ? null : found[0].value, problems };
}

// ---- delta parsing ---------------------------------------------------------

// per-line forms of the shared regexes (no /m — the walker feeds one normalized line at a time)
const SECTION_LINE_RE = /^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements\s*$/;
const H2_LINE_RE = /^##\s/;
const REQ_LINE_RE = /^###\s+Requirement:\s+(.+?)\s*$/;
const SCENARIO_LINE_RE = /^####\s+Scenario:/;
const RENAME_LINE_RE = /^\s*-\s*(.+?)\s*->\s*(.+?)\s*$/;
const STAMP_ATTEMPT_LINE_RE = /^\s*<!--(?=[^>]*apriori-base)[^>]*-->\s*$/;
const STAMP_STRICT_LINE_RE = /^<!--\s*apriori-base:\s*(\S+)\s*-->\s*$/;
const FENCE_LINE_RE = /^\s*```/;

// strict form: a sequential, fully-consuming line walker — every line (outside
// code fences, which are opaque) belongs to exactly one legal construct, and
// anything else is a problems[] entry carrying its 1-based line number.
// Well-formed deltas parse byte-identically to the old split()-based grammar.
function parseDeltaStrict(text) {
  const problems = [];
  const buckets = { ADDED: new Map(), MODIFIED: new Map(), REMOVED: new Map(), RENAMED: [] };
  const seen = new Map();               // name -> first section carrying it
  const lines = text.split('\n').map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l));

  let state = 'FILE_PREAMBLE';          // | 'IN_SECTION' | 'IN_REQUIREMENT' | 'SKIP_UNRECOGNIZED'
  let kind = null;                      // current section kind while IN_SECTION/IN_REQUIREMENT
  let blockName = null, blockLines = null, blockDiscard = false;
  let inFence = false;
  let stamp = null, stampSeen = false, stampProblems = false, sectionSeen = false;

  const flush = () => {
    if (blockLines === null) return;
    if (!blockDiscard) buckets[kind].set(blockName, blockLines.join('\n').replace(/\s+$/, '') + '\n');
    blockName = null; blockLines = null; blockDiscard = false;
  };
  const stampProblem = (msg) => { problems.push(msg); stampProblems = true; };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i], n = i + 1;
    if (inFence) {                      // opaque: never structure, never a problem
      if (blockLines !== null) blockLines.push(line);
      if (FENCE_LINE_RE.test(line)) inFence = false;
      continue;
    }
    if (FENCE_LINE_RE.test(line)) {
      inFence = true;
      if (blockLines !== null) blockLines.push(line);
      continue;
    }
    const sec = SECTION_LINE_RE.exec(line);
    if (sec) { flush(); state = 'IN_SECTION'; kind = sec[1]; sectionSeen = true; continue; }
    if (H2_LINE_RE.test(line)) {        // one problem per unrecognized heading; its lines are skipped, not re-homed
      flush();
      problems.push(`line ${n}: unrecognized section heading '${line.trim()}'`);
      state = 'SKIP_UNRECOGNIZED'; kind = null;
      continue;
    }
    if (state === 'SKIP_UNRECOGNIZED') continue;   // covered by the heading's problem — no flood, no attribution (stamps included)
    // stamps are matched in every remaining state so a stray one is never absorbed as body text
    if (STAMP_ATTEMPT_LINE_RE.test(line)) {
      const m = STAMP_STRICT_LINE_RE.exec(line.trim());
      if (!m) { stampProblem(`line ${n}: malformed apriori-base stamp line: ${line.trim()}`); continue; }
      if (stampSeen) { stampProblem(`line ${n}: carries more than one apriori-base stamp line`); continue; }
      stampSeen = true;
      if (sectionSeen) { stampProblem(`line ${n}: apriori-base stamp appears after the first delta section heading`); continue; }
      if (m[1] !== 'new' && !/^sha256:[0-9a-f]{64}$/.test(m[1])) { stampProblem(`line ${n}: malformed apriori-base stamp '${m[1]}'`); continue; }
      stamp = m[1];
      continue;
    }
    const req = REQ_LINE_RE.exec(line);
    if (req) {
      if (state === 'FILE_PREAMBLE') { problems.push(`line ${n}: requirement block before any section heading`); continue; }
      if (kind === 'RENAMED') {
        // the whole illegal block is discarded — its body must not be reinterpreted as rename lines
        problems.push(`line ${n}: requirement block inside the RENAMED section`);
        flush();
        state = 'IN_REQUIREMENT'; blockName = null; blockLines = []; blockDiscard = true;
        continue;
      }
      flush();
      state = 'IN_REQUIREMENT';
      blockName = req[1].trim(); blockLines = [line]; blockDiscard = false;
      if (buckets[kind].has(blockName)) {          // first block wins, as before
        problems.push(`line ${n}: duplicate requirement '${blockName}' in the ${kind} section`);
        blockDiscard = true;
      } else if (seen.has(blockName)) {
        problems.push(`line ${n}: duplicate requirement '${blockName}' appears in both ${seen.get(blockName)} and ${kind}`);
      } else seen.set(blockName, kind);
      continue;
    }
    if (state === 'IN_REQUIREMENT') { blockLines.push(line); continue; }   // scenarios and prose are body
    if (SCENARIO_LINE_RE.test(line)) { problems.push(`line ${n}: scenario outside any requirement block`); continue; }
    if (state === 'IN_SECTION' && kind === 'RENAMED') {
      const rn = RENAME_LINE_RE.exec(line);
      if (rn) buckets.RENAMED.push([rn[1].trim(), rn[2].trim()]);
      continue;                          // other lines are free text
    }
    // FILE_PREAMBLE / section preamble free text and blanks are legal
  }
  flush();
  return { delta: buckets, stamp: stampProblems ? null : stamp, problems };
}

function parseDelta(text) { return parseDeltaStrict(text).delta; }

// total number of operations a parsed delta carries (0 = nothing recognized/parseable)
function deltaOpCount(delta) {
  return delta.ADDED.size + delta.MODIFIED.size + delta.REMOVED.size + delta.RENAMED.length;
}

// mutation ops can silently clobber concurrent edits; ADDED-only deltas conflict or no-op instead
function mutationOpCount(delta) {
  return delta.MODIFIED.size + delta.REMOVED.size + delta.RENAMED.length;
}

// the one warning text every surface shares (WARN grade this minor; 4.0 makes stamps mandatory)
function unstampedWarning(suffix) {
  return `unstamped mutation delta ${suffix} — divergence undetectable; run: apriori stamp <store-file> (stamps become mandatory in 4.0)`;
}

// ---- merge (pure) ----------------------------------------------------------

// Pure merge. Returns { store: Map, merged, modified, deprecated, renamed, conflicts, unchanged }
function merge(storeText, delta, change) {
  const parsed = parseRequirementsStrict(storeText);
  const store = parsed.map;
  const merged = [], modified = [], deprecated = [], renamed = [], conflicts = [], unchanged = [];
  // a corrupt store (same requirement name twice) must never be silently collapsed
  for (const d of parsed.duplicates) conflicts.push(`duplicate requirement '${d}' in the store (corrupt store)`);
  const renamedTargets = new Set();   // names created by THIS run's renames — an ADDED hitting one is a same-delta collision, never a rerun no-op
  // RENAMED first: rename the store block's ID, preserving its content
  for (const [oldName, newName] of (delta.RENAMED || [])) {
    if (!store.has(oldName)) {
      // rerun signature: source already gone AND target present → this rename already happened
      if (store.has(newName)) { unchanged.push(`${oldName} -> ${newName} (already renamed)`); continue; }
      conflicts.push(`RENAMED '${oldName}' has no target in store`); continue;
    }
    if (store.has(newName)) { conflicts.push(`RENAMED target '${newName}' already exists in store`); continue; }
    const block = store.get(oldName);
    const renamedBlock = block.replace(/^###\s+Requirement:\s+.+$/m, `### Requirement: ${newName}`);
    // rebuild the map preserving order, swapping the key at the old position
    const rebuilt = new Map();
    for (const [k, v] of store) rebuilt.set(k === oldName ? newName : k, k === oldName ? renamedBlock : v);
    store.clear();
    for (const [k, v] of rebuilt) store.set(k, v);
    renamed.push(`${oldName} -> ${newName}`);
    renamedTargets.add(newName);
  }
  for (const [name, block] of delta.ADDED) {
    if (store.has(name)) {
      // idempotent rerun: identical content means this delta already merged — a no-op, not a collision.
      // But a name just created by THIS run's RENAMED is a same-delta collision, never a rerun.
      if (!renamedTargets.has(name) && store.get(name).trim() === block.trim()) unchanged.push(name);
      else conflicts.push(`ADDED '${name}' already exists in store`);
    } else { store.set(name, block); merged.push(name); }
  }
  for (const [name, block] of delta.MODIFIED) {
    if (!store.has(name)) conflicts.push(`MODIFIED '${name}' has no target in store`);
    // already applied (rerun signature) — same trim comparison the ADDED no-op uses
    else if (store.get(name).trim() === block.trim()) unchanged.push(name);
    else { store.set(name, block); modified.push(name); }
  }
  for (const name of delta.REMOVED.keys()) {
    if (!store.has(name)) {
      // rerun signature: already deprecated BY THIS CHANGE → no-op; by another change → real collision
      const depByThis = `${name}  _deprecated (superseded by ${change})_`;
      if (store.has(depByThis)) { unchanged.push(`${name} (already deprecated)`); continue; }
      const depOther = [...store.keys()].find((k) => k.startsWith(`${name}  _deprecated (superseded by `));
      if (depOther) { conflicts.push(`REMOVED '${name}' was already deprecated by a different change ('${depOther}')`); continue; }
      conflicts.push(`REMOVED '${name}' has no target in store`);
    } else {
      const block = store.get(name);
      const nl = block.indexOf('\n');
      store.set(name, block.slice(0, nl) + `  _deprecated (superseded by ${change})_` + block.slice(nl));
      deprecated.push(name);
    }
  }
  return { store, merged, modified, deprecated, renamed, conflicts, unchanged };
}

function renderStore(storeText, store) {
  const idx = storeText.indexOf('### Requirement:');
  const header = idx >= 0 ? storeText.slice(0, idx) : '';
  return header + [...store.values()].join('\n');
}

// ---- paths and discovery ---------------------------------------------------

// Realpath containment: target (followed through symlinks; not-yet-existing targets judged
// by their nearest existing ancestor) must resolve STRICTLY inside root. Fail-closed.
function containsReal(root, target) {
  let realRoot;
  try { realRoot = fs.realpathSync(root); } catch { return false; }
  let cur = path.resolve(target);
  const rest = [];
  while (!fs.existsSync(cur)) {
    const parent = path.dirname(cur);
    if (parent === cur) return false;
    rest.unshift(path.basename(cur));
    cur = parent;
  }
  let realCur;
  try { realCur = fs.realpathSync(cur); } catch { return false; }
  const full = rest.length ? path.join(realCur, ...rest) : realCur;
  return full !== realRoot && (full + path.sep).startsWith(realRoot + path.sep);
}

function mdFilesUnder(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      // Dirents reflect lstat: a symlink is neither file nor directory. Follow it explicitly —
      // silently skipping a symlinked dir would hide deltas (fail-open); containment judges the target.
      let isDir = e.isDirectory();
      if (e.isSymbolicLink()) {
        try { isDir = fs.statSync(p).isDirectory(); } catch { isDir = false; /* broken link: fall through, read fails loudly */ }
      }
      if (isDir) walk(p);
      else if (e.name.endsWith('.md')) out.push(p);
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return out.sort();
}

// Discover a change's delta files. → { files: [{abs, suffix}], errors: [] } — errors are
// VALIDATION class (exit 2 on both surfaces): bad name, missing dir, escape, zero files.
function discoverDeltas(changesDirAbs, name) {
  const errors = [];
  if (!name || !CHANGE_NAME_RE.test(name)) return { files: [], errors: [`invalid change name '${name}' — bare kebab-case only`] };
  const changeDir = path.join(changesDirAbs, name);
  if (!fs.existsSync(changeDir)) return { files: [], errors: [`change '${name}' not found under ${changesDirAbs}`] };
  if (!containsReal(changesDirAbs, changeDir)) return { files: [], errors: [`change path escapes ${changesDirAbs}: ${changeDir}`] };
  const specsDir = path.join(changeDir, 'specs');
  // a symlinked specs/ pointing outside would smuggle its target in as the containment ROOT —
  // require specs/ itself to really live inside the change dir before trusting it as a root
  if (fs.existsSync(specsDir) && !containsReal(changeDir, specsDir))
    return { files: [], errors: [`specs dir escapes the change dir (symlink?): ${specsDir}`] };
  const all = mdFilesUnder(specsDir);
  if (!all.length) return { files: [], errors: [`no delta spec files (*.md) found under ${specsDir}`] };
  const files = [];
  for (const abs of all) {
    if (!containsReal(specsDir, abs)) { errors.push(`delta path escapes the change root: ${abs}`); continue; }
    files.push({ abs, suffix: path.relative(specsDir, abs).split(path.sep).join('/') });
  }
  return { files, errors };
}

// Build the projection: apply every delta to its mapped store file IN MEMORY.
// → { texts: Map<suffix, projectedText>, modules, perModule, conflicts, casMismatches,
//     hygiene, validation } — texts covers ALL store files (pass-through + projected).
function buildProjection(storeRoot, deltaFiles, change) {
  const texts = new Map(), perModule = new Map(), modules = [];
  const conflicts = [], casMismatches = [], hygiene = [], validation = [];
  const unstampedMutations = [], notes = [], repaired = [];
  for (const abs of mdFilesUnder(storeRoot))
    texts.set(path.relative(storeRoot, abs).split(path.sep).join('/'), fs.readFileSync(abs, 'utf8'));
  for (const { abs, suffix } of deltaFiles) {
    modules.push(suffix);
    const target = path.join(storeRoot, ...suffix.split('/'));
    if (!containsReal(storeRoot, target)) { validation.push(`store target escapes ${storeRoot}: ${target}`); continue; }
    const raw = fs.readFileSync(abs, 'utf8');
    if (!raw.trim()) { hygiene.push(`empty delta file: ${abs}`); continue; }
    const { delta, stamp, problems } = parseDeltaStrict(raw);
    if (problems.length) { hygiene.push(...problems.map((p) => `${abs}: ${p}`)); continue; }
    if (deltaOpCount(delta) === 0) { hygiene.push(`parsed 0 delta operations from ${abs} — it has content but no recognized operations`); continue; }
    if (!stamp && mutationOpCount(delta) > 0) unstampedMutations.push(suffix);   // WARN grade (callers print)
    const storeText = texts.get(suffix) || '';
    if (stamp) {
      const actual = texts.has(suffix) ? fingerprint(storeText) : 'new';
      if (stamp !== actual) {
        // rerun repair: a mismatch whose every op is already applied is the resumed-rerun
        // signature — divergence with ANY real pending op still fails exactly as before
        const probe = merge(storeText, delta, change);
        const pending = probe.merged.length + probe.modified.length + probe.deprecated.length + probe.renamed.length;
        if (pending === 0 && probe.conflicts.length === 0) {
          notes.push(`${suffix}: stamp mismatch but the delta is already fully applied — rerun accepted`);
          perModule.set(suffix, probe);
          repaired.push(suffix);
          continue;                                          // contributes no writes
        }
        casMismatches.push(`base mismatch for ${target}: delta expects ${stamp}, store is ${actual}`); continue;
      }
    }
    const r = merge(storeText, delta, change);
    perModule.set(suffix, r);
    if (r.conflicts.length) { conflicts.push(...r.conflicts.map((c) => `${suffix}: ${c}`)); continue; }
    texts.set(suffix, renderStore(storeText, r.store));
  }
  modules.sort();
  return { texts, modules, perModule, conflicts, casMismatches, hygiene, validation, unstampedMutations, notes, repaired };
}

// ---- archive commit machinery ----------------------------------------------

// colon-free date-time stamp YYYY-MM-DDThhmm (CLI's own clock; never an agent guess)
function archiveStamp(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}`;
}

const CHANGE_NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;   // bare kebab-case — same rule as `apriori new`

// Move an in-flight change dir (bare name) → changes/archive/<stamp>-<name>/
// Fail-closed: source AND destination must resolve (realpath) strictly inside changesDir.
function archiveChangeDir(changesDir, name, now, ops) {
  const rename = (ops && ops.renameSync) || fs.renameSync;
  if (!CHANGE_NAME_RE.test(name)) throw new Error(`invalid change name '${name}' — bare kebab-case only`);
  const src = path.join(changesDir, name);
  if (!fs.existsSync(src)) return null;
  if (!containsReal(changesDir, src)) throw new Error(`change path escapes ${changesDir}`);
  const dest = path.join(changesDir, 'archive', `${archiveStamp(now)}-${name}`);
  if (!containsReal(changesDir, dest)) throw new Error(`archive destination escapes ${changesDir} (symlinked archive/?)`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  rename(src, dest);
  return dest;
}

const CATEGORY_LABELS = [['merged (ADDED)', 'merged'], ['modified (MODIFIED)', 'modified'],
  ['deprecated (REMOVED)', 'deprecated'], ['renamed (RENAMED)', 'renamed'], ['already merged (no-op)', 'unchanged']];

// High-level archive: the whole change, four phases (preflight → stage → commit → move).
// → { code, out: [], err: [] } — pure return; cli() prints. ops is the fault-injection seam.
function archiveChange(o) {
  const out = [], err = [];
  const ops = o.ops || { writeFileSync: fs.writeFileSync.bind(fs), renameSync: fs.renameSync.bind(fs), rmSync: fs.rmSync.bind(fs) };
  const cwd = o.cwd || process.cwd();
  const changesDir = path.resolve(cwd, o.changesDir || path.join('apriori', 'changes'));
  const storeRoot = path.resolve(cwd, 'apriori', 'specs');

  // --- phase 1: preflight (no writes) ---
  const d = discoverDeltas(changesDir, o.change);
  if (d.errors.length) { err.push(...d.errors.map((e) => `archive: ${e}`)); return { code: 2, out, err }; }
  const p = buildProjection(storeRoot, d.files, o.change);
  if (p.validation.length) { err.push(...p.validation.map((e) => `archive: ${e}`)); return { code: 2, out, err }; }
  // per-module report for whatever merged cleanly (dry-run info comes first, then failures)
  for (const suffix of p.modules) {
    const r = p.perModule.get(suffix);
    if (!r || r.conflicts.length) continue;
    out.push(`--- ${suffix}`);
    for (const [label, key] of CATEGORY_LABELS) if (r[key].length) out.push(`${label}: ${r[key].join(', ')}`);
  }
  for (const sfx of p.unstampedMutations) out.push(`warning: ${unstampedWarning(sfx)}`);
  for (const n of p.notes) out.push(`note: ${n}`);
  const preflightFailures = [...p.hygiene, ...p.casMismatches, ...p.conflicts];
  if (preflightFailures.length) {
    for (const f of preflightFailures) err.push(`archive: ${f}`);
    out.push('\nRESULT: FAILED PREFLIGHT — nothing written');
    return { code: 1, out, err };
  }
  const repaired = new Set(p.repaired);                     // already applied — no writes for these
  const jobs = d.files.filter(({ suffix }) => !repaired.has(suffix)).map(({ suffix }) => {
    const store = path.join(storeRoot, ...suffix.split('/'));
    return { suffix, store, tmp: store + '.tmp-archive', text: p.texts.get(suffix) };
  }).sort((a, b) => (a.store < b.store ? -1 : 1));
  if (o.write) {
    for (const j of jobs) if (fs.existsSync(j.tmp)) {
      err.push(`archive: temp file already exists: ${j.tmp} — another run in flight or a manual-recovery artifact; not touching it`);
      out.push('\nRESULT: FAILED PREFLIGHT — nothing written');
      return { code: 1, out, err };
    }
    if (o.changesDirExplicit) {
      // destination containment is checked before any write, not at move time
      const probe = path.join(changesDir, 'archive', 'probe');
      if (!containsReal(changesDir, probe)) {
        err.push(`archive: archive destination escapes ${changesDir} (symlinked archive/?)`);
        return { code: 2, out, err };
      }
    }
  }
  if (!o.write) {
    out.push(`\nRESULT: MERGED (dry-run; ${jobs.length} module(s)) — pass --write to apply`);
    return { code: 0, out, err };
  }

  // --- phase 2: stage (this run's temps only — preflight proved none pre-existed) ---
  const staged = [];
  try {
    for (const j of jobs) {
      fs.mkdirSync(path.dirname(j.store), { recursive: true });
      ops.writeFileSync(j.tmp, j.text);
      staged.push(j.tmp);
    }
  } catch (e) {
    for (const t of staged) { try { ops.rmSync(t, { force: true }); } catch { /* best effort */ } }
    err.push(`archive: staging failed (${e.message}) — stores untouched, this run's temp files removed`);
    return { code: 1, out, err };
  }

  // --- phase 3: commit (per-file atomic renames, sorted order; no rollback on mid-commit failure) ---
  const committed = [];
  for (const j of jobs) {
    try { ops.renameSync(j.tmp, j.store); committed.push(j); }
    catch (e) {
      err.push(`archive: COMMIT FAILED at ${j.suffix} (${e.message})`);
      err.push(`  committed:     ${committed.map((c) => c.suffix).join(', ') || '(none)'}`);
      const remaining = jobs.filter((x) => !committed.includes(x));
      err.push(`  NOT committed: ${remaining.map((x) => x.suffix).join(', ')}`);
      err.push(`  temp files remaining for manual completion: ${remaining.map((x) => x.tmp).join(', ')}`);
      return { code: 1, out, err };
    }
  }

  // --- phase 4: move (only with explicit --changes-dir) ---
  let moved = null;
  if (o.changesDirExplicit) {
    try { moved = archiveChangeDir(changesDir, o.change, new Date(), ops); }
    catch (e) { err.push(`archive: stores committed but the change-dir move failed: ${e.message} — rerun to complete`); return { code: 1, out, err }; }
    if (moved === null) { err.push('archive: stores committed but the change dir vanished before the move'); return { code: 1, out, err }; }
  }
  out.push(`\nRESULT: MERGED — ${jobs.length} module store(s) rewritten${moved ? `; change archived → ${moved}` : ''}`);
  return { code: 0, out, err };
}

// print the CAS stamp line for a store file's current content
const STAMP_USAGE = 'usage: apriori stamp <store-file>';
function stampCli(argv) {
  return withStrict(argv, { sub: 'stamp', usage: STAMP_USAGE, positionals: 1, flags: {} }, (f, pos) => {
    const p = pos[0];
    if (!fs.existsSync(p)) { console.log('<!-- apriori-base: new -->'); return 0; }
    if (fs.statSync(p).isDirectory()) { console.error(`stamp: ${p} is a directory, not a store file`); return 2; }
    let text;
    try { text = fs.readFileSync(p, 'utf8'); }
    catch (e) { console.error(`stamp: cannot read ${p}: ${e.message}`); return 2; }
    console.log(`<!-- apriori-base: ${fingerprint(text)} -->`);
    return 0;
  });
}

const USAGE = 'usage: apriori archive --store <f> --delta <f> --change <name> [--write] [--changes-dir <dir>]\n   or: apriori archive --change <name> [--write] [--changes-dir <dir>]';

function cli(argv) {
  return withStrict(argv, { sub: 'archive', usage: USAGE, positionals: 0,
    flags: { '--store': 'value', '--delta': 'value', '--change': 'value', '--write': 'flag', '--changes-dir': 'value' } }, (f) => {
    const a = { store: f['--store'] || null, delta: f['--delta'] || null, change: f['--change'] || null,
      write: !!f['--write'], changesDir: f['--changes-dir'] || null };
  // high-level form: --change alone (no --store/--delta) drives the whole change
    if (a.change && !a.store && !a.delta) {
      const r = archiveChange({ cwd: process.cwd(), change: a.change, write: a.write,
        changesDir: a.changesDir || undefined, changesDirExplicit: !!a.changesDir });
      for (const l of r.out) console.log(l);
      for (const l of r.err) console.error(l);
      return r.code;
    }
    if (a.change && (a.store || a.delta) && !(a.store && a.delta)) {
      console.error('usage: apriori archive --change <name> [--write] [--changes-dir <dir>]  (high-level form)\n   or: apriori archive --store <f> --delta <f> --change <name> [--write] [--changes-dir <dir>]  (single-file form)\n(--change cannot be combined with only one of --store/--delta)');
      return 2;
    }
    if (!a.store || !a.delta || !a.change) { console.error(USAGE); return 2; }
    if (!CHANGE_NAME_RE.test(a.change)) { console.error(`archive: invalid change name '${a.change}' — bare kebab-case only (path segments are not allowed)`); return 2; }
    if (a.changesDir && !fs.existsSync(path.join(a.changesDir, a.change))) {
      console.error(`archive: change '${a.change}' not found under ${a.changesDir} — nothing to move`); return 2;
    }
    // first archive in a repo: the store file may not exist yet — start from an empty store
    const storeExists = fs.existsSync(a.store);
    const storeText = storeExists ? fs.readFileSync(a.store, 'utf8') : '';
    if (!storeExists) console.log(`store ${a.store} does not exist yet — will be created${a.write ? '' : ' on --write'}`);
    const deltaText = fs.readFileSync(a.delta, 'utf8');
    const { delta, stamp, problems } = parseDeltaStrict(deltaText);
    if (problems.length) {
      for (const p of problems) console.error(`archive: ${a.delta}: ${p}`);
      console.log('\nRESULT: MALFORMED DELTA — nothing written');
      return 1;
    }
    // Guard against a silent no-op: a delta with real content that parsed to zero operations
    // is almost always a format mismatch (wrong heading level/keyword), not an empty change.
    if (deltaText.trim() && deltaOpCount(delta) === 0) {
      console.error(`archive: parsed 0 delta operations from ${a.delta} — it has content but no recognized operations.`);
      console.error('  expected `## ADDED|MODIFIED|REMOVED Requirements` (h2) with `### Requirement: <name>` (h3) blocks,');
      console.error('  or `## RENAMED Requirements` with `- Old -> New` lines. Nothing written.');
      return 1;
    }
    // WARN grade (AM-32): mutation ops without a stamp merge, but never silently
    if (!stamp && mutationOpCount(delta) > 0) console.log(`warning: ${unstampedWarning(a.delta)}`);
    // CAS: a present base stamp must match the store the delta is about to merge into (AM-24/AM-26)
    if (stamp) {
      const actual = storeExists ? fingerprint(storeText) : 'new';
      if (stamp !== actual) {
        console.error(`archive: base mismatch for ${a.store}: delta expects ${stamp}, store is ${actual} — nothing written (serialize per §4.11)`);
        return 1;
      }
    }
    const { store, merged, modified, deprecated, renamed, conflicts, unchanged } = merge(storeText, delta, a.change);

    for (const [label, ids] of [['merged (ADDED)', merged], ['modified (MODIFIED)', modified], ['deprecated (REMOVED)', deprecated], ['renamed (RENAMED)', renamed], ['already merged (no-op)', unchanged]])
      if (ids.length) console.log(`${label}: ${ids.join(', ')}`);

    if (conflicts.length) {
      console.log('\nCONFLICTS (stop — open a ledger issue, human resolves):');
      for (const c of conflicts) console.log(`  ✗ ${c}`);
      console.log('\nRESULT: CONFLICT — nothing written');
      return 1;
    }
    if (a.write) {
      // Transactional ordering: stage the store to a temp file, do the (atomic) dir move, then
      // commit the store via rename. If the move fails, the temp is discarded and the store on
      // disk stays byte-for-byte untouched — never a half-completed archive.
      fs.mkdirSync(path.dirname(a.store), { recursive: true });
      const tmp = a.store + '.tmp-archive';
      fs.writeFileSync(tmp, renderStore(storeText, store));
      let moved = null;
      if (a.changesDir) {
        try { moved = archiveChangeDir(a.changesDir, a.change, new Date()); }
        catch (e) { fs.rmSync(tmp, { force: true }); console.error(`archive: ${e.message} — store left untouched`); return 1; }
        if (moved === null) { fs.rmSync(tmp, { force: true }); console.error(`archive: change dir vanished mid-run — store left untouched`); return 1; }
      }
      fs.renameSync(tmp, a.store);
      console.log(`\nRESULT: MERGED — ${a.store} rewritten${moved ? `; change archived → ${moved}` : ''}`);
    } else {
      console.log(`\nRESULT: MERGED (dry-run; ${store.size} requirements in result) — pass --write to apply`);
    }
    return 0;
  });
}
module.exports = { parseRequirements, parseRequirementsStrict, parseDelta, parseDeltaStrict, deltaOpCount, mutationOpCount, unstampedWarning,
  merge, renderStore, archiveStamp, archiveChangeDir, archiveChange, CHANGE_NAME_RE,
  fingerprint, parseStamp, containsReal, discoverDeltas, buildProjection,
  DEPRECATED_RE, stripDeprecatedBlocks, stampCli, cli };
