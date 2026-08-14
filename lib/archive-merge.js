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
const { configCas, configCasProblem } = require('./resolve');

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
const NOTES_LINE_RE = /^##\s+Notes\s*$/;   // the one h2 the parser is allowed to ignore
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

  let state = 'FILE_PREAMBLE';          // | 'IN_SECTION' | 'IN_REQUIREMENT' | 'SKIP_UNRECOGNIZED' | 'IN_NOTES'
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
    // `## Notes` is commentary, not an instruction: authors need somewhere to say WHY a block
    // changed, and without a legal home they wrote headings the parser read as structure.
    if (NOTES_LINE_RE.test(line)) { flush(); state = 'IN_NOTES'; kind = null; continue; }
    if (H2_LINE_RE.test(line)) {        // one problem per unrecognized heading; its lines are skipped, not re-homed
      flush();
      problems.push(`line ${n}: unrecognized section heading '${line.trim()}'`);
      state = 'SKIP_UNRECOGNIZED'; kind = null;
      continue;
    }
    if (state === 'SKIP_UNRECOGNIZED') continue;   // covered by the heading's problem — no flood, no attribution (stamps included)
    if (state === 'IN_NOTES') continue;           // opaque: requirements, scenarios and stamps inside Notes are commentary
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
    // A non-`Requirement` h3 inside a block used to be absorbed as body text and written
    // verbatim into the store — loud on a MODIFIED operation (the integrity report shows it)
    // but silent on an ADDED one. `blockDiscard` outranks this check so an already-void block
    // does not report twice, and so RENAMED's existing void-block behaviour is untouched.
    if (state === 'IN_REQUIREMENT' && !blockDiscard && /^###\s/.test(line)) {
      problems.push(`line ${n}: '${line.trim()}' is not a requirement heading — put explanatory content in a '## Notes' section`);
      blockDiscard = true;
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
// 4.0: unstamped mutation deltas are DENIED by default; --no-cas or the config row waives visibly
// waiver source, or {problem} when the config itself is broken (deny + name it) — the
// explicit flag stays supreme even over a broken config (the flag is a human's will)
function casWaiver(cwd, noCas) {
  if (noCas) return { waiver: '--no-cas' };
  const problem = configCasProblem(cwd);
  if (problem) return { problem };
  if (configCas(cwd) === 'optional') return { waiver: 'process-config cas: optional' };
  return {};
}

function unstampedWarning(suffix) {
  return `unstamped mutation delta ${suffix} — divergence undetectable; run: apriori stamp <store-file>`;
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
  const vName = require('./resolve').validateChangeName(name);
  if (!vName.ok) return { files: [], errors: [`invalid change name '${name}' (${vName.kind}) — bare kebab-case, not date-prefixed, not a reserved name`] };
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
  // per-suffix operation buckets captured at THIS parse — the one delta snapshot
  // (change-scope provenance must never come from a second read of the file)
  const deltaOps = new Map();
  // per-suffix raw old/new block text pairs for every MODIFIED operation (rename-then-modify
  // baselines the COMPLETE pre-rename block) — the integrity engine's single-snapshot input
  const modifiedBlocks = new Map();
  const captureModified = (suffix, storeText, delta) => {
    if (!delta.MODIFIED.size) return;
    const storeBlocks = parseRequirementsStrict(storeText).map;
    const renamedTo = new Map(delta.RENAMED.map(([o, n]) => [n, o]));
    const pairs = [];
    for (const [name, newBlock] of delta.MODIFIED) {
      const oldName = renamedTo.get(name) || name;
      // repaired rename-then-modify rerun: the pre-rename source is gone, the store already
      // holds the post-rename block — fall back to it so the operation still owes its pair
      const oldBlock = storeBlocks.get(oldName) !== undefined ? storeBlocks.get(oldName) : storeBlocks.get(name);
      if (oldBlock === undefined) continue;               // missing target → the merge conflict path reports it
      pairs.push({ name, oldBlock, newBlock });
    }
    if (pairs.length) modifiedBlocks.set(suffix, pairs);
  };
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
    deltaOps.set(suffix, Object.freeze({
      added: [...delta.ADDED.keys()], modified: [...delta.MODIFIED.keys()],
      renamedPairs: delta.RENAMED.map((p) => [...p]), removed: [...delta.REMOVED.keys()],
    }));
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
          captureModified(suffix, storeText, delta);         // a repaired module still owes its pairs
          continue;                                          // contributes no writes
        }
        casMismatches.push(`base mismatch for ${target}: delta expects ${stamp}, store is ${actual}`); continue;
      }
    }
    const r = merge(storeText, delta, change);
    perModule.set(suffix, r);
    captureModified(suffix, storeText, delta);
    if (r.conflicts.length) { conflicts.push(...r.conflicts.map((c) => `${suffix}: ${c}`)); continue; }
    texts.set(suffix, renderStore(storeText, r.store));
  }
  modules.sort();
  return { texts, modules, perModule, deltaOps, modifiedBlocks, conflicts, casMismatches, hygiene, validation, unstampedMutations, notes, repaired };
}


// ---- modified-block integrity engine (pure; zero fs, zero matcher) ---------------------
// Compares a MODIFIED operation's old store block against its replacement and reports
// structural fidelity. INFORMATIVE by contract: callers never let it change a verdict,
// an exit code or write semantics.

const norml = (l) => l.replace(/\s+$/, '').replace(/^\s+/, '');

// closed-fence spans exactly like stripFences (an unclosed opener is ordinary text)
function closedFenceSpans(text) {
  const spans = [];
  const re = /```[\s\S]*?```/g;
  let m;
  while ((m = re.exec(text)) !== null) spans.push([m.index, m.index + m[0].length]);
  return spans;
}

// block text → { prose: [items], scenarios: [{title, body: [items]}] } — the requirement
// heading line never participates. Scenario DELIMITERS are found exactly the state-A way:
// scan the fence-STRIPPED view (stripFences removes closed pairs, which can expose a heading
// that shares its raw line with an inline closed fence), then map each heading back to its
// raw position; body lines come from the RAW text between consecutive heading lines (fenced
// content therefore participates in comparison, per the engine contract).
function scanBlockStructure(text) {
  const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const spans = closedFenceSpans(clean);
  const stripped = clean.replace(/```[\s\S]*?```/g, '');
  // stripped offset → raw offset (piecewise: add back the lengths of spans passed)
  const toRaw = (sOff) => {
    let removed = 0;
    for (const [a, b] of spans) {
      if (sOff + removed >= a) removed += b - a;
      else break;
    }
    return sOff + removed;
  };
  const lines = clean.split('\n');
  const lineStart = [];
  { let off = 0; for (const l of lines) { lineStart.push(off); off += l.length + 1; } }
  const rawLineOf = (rawOff) => {
    let lo = 0, hi = lineStart.length - 1, ans = 0;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (lineStart[mid] <= rawOff) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return ans;
  };
  // headings in the state-A view — the ACTUAL state-A regex (\s+ may cross newlines:
  // '####\nScenario: …' is a valid delimiter there, so it is one here too)
  const headRe = /^####\s+Scenario:\s+(.*)$/gm;
  const heads = [];
  let hm;
  while ((hm = headRe.exec(stripped)) !== null)
    heads.push({ title: hm[1], rawLine: rawLineOf(toRaw(hm.index)),
      endLine: rawLineOf(toRaw(hm.index + hm[0].length)) });
  const startLine = /^###\s+Requirement:/.test(lines[0] || '') ? 1 : 0;   // heading never compared
  const collect = (from, to) => {
    const items = [];
    for (let i = from; i < to; i++) {
      const n = norml(lines[i]);
      if (n) items.push({ raw: lines[i], norm: n });
    }
    return items;
  };
  const firstHead = heads.length ? heads[0].rawLine : lines.length;
  const prose = collect(startLine, firstHead);
  // a raw line that lies ENTIRELY inside a closed fence span still participates in
  // comparison even when it falls within a cross-line delimiter's raw range — such
  // fenced content is prepended to that scenario's body (the delimiter fragments
  // around it belong to the heading and stay excluded)
  const fencedLinesIn = (from, to) => {
    const items = [];
    for (let i = from; i <= to && i < lines.length; i++) {
      const a = lineStart[i], b = a + lines[i].length;
      if (spans.some(([sa, sb]) => a >= sa && b <= sb)) {
        const n = norml(lines[i]);
        if (n) items.push({ raw: lines[i], norm: n });
      }
    }
    return items;
  };
  const scenarios = heads.map((h, i) => ({
    title: h.title,
    body: [...fencedLinesIn(h.rawLine, h.endLine),
      ...collect(h.endLine + 1, i + 1 < heads.length ? heads[i + 1].rawLine : lines.length)],
  }));
  return { prose, scenarios };
}

// order-preserving greedy subsequence over {raw, norm} items: matching uses the normalized
// text, the report keeps the ORIGINAL old line verbatim
function missingFrom(oldItems, newItems) {
  const missing = [];
  let j = 0;
  for (const o of oldItems) {
    let found = -1;
    for (let k = j; k < newItems.length; k++) if (newItems[k].norm === o.norm) { found = k; break; }
    if (found === -1) missing.push(o.raw);
    else j = found + 1;
  }
  return missing;
}

// → { retained, titleChanged, dropped, added, ambiguous, missingLines } (req B4 shapes/order)
function compareModifiedBlock(oldBlock, newBlock, idOf) {
  const empty = { retained: [], titleChanged: [], dropped: [], added: [], ambiguous: [], missingLines: [] };
  if (oldBlock.trim() === newBlock.trim()) return { ...empty };   // idempotent fast path — no scan, no idOf
  const o = scanBlockStructure(oldBlock);
  const n = scanBlockStructure(newBlock);
  const keyOf = (title) => { const id = idOf(title); return id !== null ? { key: id, id } : { key: norml(title), id: null }; };
  const group = (list) => {
    const m = new Map();
    list.forEach((sc, idx) => {
      const { key, id } = keyOf(sc.title);
      if (!m.has(key)) m.set(key, { id, occ: [] });
      m.get(key).occ.push({ ...sc, idx });
    });
    return m;
  };
  const om = group(o.scenarios), nm = group(n.scenarios);
  const res = { retained: [], titleChanged: [], dropped: [], added: [], ambiguous: [], missingLines: [] };
  // requirement prose first
  for (const line of missingFrom(o.prose, n.prose)) res.missingLines.push({ scenario: null, line });
  const ambON = [], ambNewOnly = [];
  for (const [key, og] of om) {
    const ng = nm.get(key);
    const oc = og.occ.length, nc = ng ? ng.occ.length : 0;
    if (oc === 1 && nc === 1) {
      const oldSc = og.occ[0], newSc = ng.occ[0];
      const entry = { id: og.id, title: newSc.title };
      if (norml(oldSc.title) === norml(newSc.title)) res.retained.push(entry);
      else res.titleChanged.push({ id: og.id, oldTitle: oldSc.title, newTitle: newSc.title });
      const scenLabel = og.id !== null ? og.id : oldSc.title;
      for (const line of missingFrom(oldSc.body, newSc.body)) res.missingLines.push({ scenario: scenLabel, line });
    } else if (oc >= 1 && nc === 0) {
      if (oc === 1) res.dropped.push({ id: og.id, title: og.occ[0].title });
      else ambON.push({ key, side: 'old', oldCount: oc, newCount: 0, idx: og.occ[0].idx });
    } else {
      // any side > 1 with the other >= 1
      const side = oc > 1 && nc > 1 ? 'both' : (oc > 1 ? 'old' : 'new');
      ambON.push({ key, side, oldCount: oc, newCount: nc, idx: og.occ[0].idx });
    }
  }
  for (const [key, ng] of nm) {
    if (om.has(key)) continue;
    const nc = ng.occ.length;
    if (nc === 1) res.added.push({ id: ng.id, title: ng.occ[0].title });
    else ambNewOnly.push({ key, side: 'new', oldCount: 0, newCount: nc, idx: ng.occ[0].idx });
  }
  ambON.sort((a, b) => a.idx - b.idx);
  ambNewOnly.sort((a, b) => a.idx - b.idx);
  res.ambiguous = [...ambON, ...ambNewOnly].map(({ key, side, oldCount, newCount }) => ({ key, side, oldCount, newCount }));
  return res;
}

// safe rendering: C0/DEL control characters become the middle dot BEFORE the 119+ellipsis cut
function sanField(s) {
  const clean = String(s).replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '·').replace(/[\n\t]/g, '·');
  return clean.length > 120 ? clean.slice(0, 119) + '…' : clean;
}

// human section shared by verify and archive; '' when every entry's four classes are empty
function formatIntegrityHuman(entries) {
  const printable = entries.filter((e) =>
    e.dropped.length || e.missingLines.length || e.ambiguous.length || e.titleChanged.length);
  if (!printable.length) return '';
  // fields are sanitized (C0/DEL → ·) then the ASSEMBLED line takes the state-A cut:
  // whole line ≤ 120 UTF-16 units via slice(0,119)+'…'
  const cap = (l) => (l.length > 120 ? l.slice(0, 119) + '…' : l);
  const lines = ['— MODIFIED INTEGRITY —'];
  for (const e of printable) {
    lines.push(cap(`  ${sanField(e.file)} · ${sanField(e.name)}: retained ${e.retained.length}, added ${e.added.length}`));
    for (const t of e.titleChanged) lines.push(cap(`    titleChanged: ${sanField(t.oldTitle)} -> ${sanField(t.newTitle)}`));
    for (const d of e.dropped) lines.push(cap(`    ! dropped: ${sanField(d.title)}`));
    for (const a of e.ambiguous) lines.push(cap(`    ! ambiguous: ${sanField(a.key)} (${a.side}; old ${a.oldCount}/new ${a.newCount})`));
    for (const ml of e.missingLines) lines.push(cap(`    ! missing (${ml.scenario === null ? 'prose' : sanField(ml.scenario)}): ${sanField(ml.line)}`));
  }
  return lines.join('\n');
}


// The archive-side integrity section. The matcher factory is INJECTED at the bin seam
// ((cwd) => matcher | {error}) so this module never requires spec-runner; a missing factory
// degrades exactly like a factory error — one bounded stderr warning, report skipped,
// every other archive output/exit/write unchanged.
function pushIntegritySection(out, err, modifiedBlocks, idMatcherFactory, cwd) {
  if (!modifiedBlocks || modifiedBlocks.size === 0) return;
  const sanitizeMsg = require('./config').sanitizeMsg;
  const warn = (reason) => err.push(sanitizeMsg('warning: modified-integrity ' + reason));
  if (!idMatcherFactory) { warn('id matcher unavailable (no factory injected)'); return; }
  let matcher;
  try { matcher = idMatcherFactory(cwd); } catch (e) { warn('id-pattern resolution failed: ' + String(e.message || e)); return; }
  if (!matcher || matcher.error) { warn('id-pattern resolution failed: ' + String(matcher && matcher.error)); return; }
  // one batch over every old+new block scenario title — discovered the SAME state-A way
  // the engine does (fence-STRIPPED view: an inline closed fence can expose a heading)
  const titles = [];
  const collect = (text) => {
    const stripped = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/```[\s\S]*?```/g, '');
    let m;
    const re = /^####\s+Scenario:\s+(.*)$/gm;                 // the state-A regex, verbatim
    while ((m = re.exec(stripped)) !== null) titles.push(m[1]);
  };
  for (const list of modifiedBlocks.values()) for (const { oldBlock, newBlock } of list) { collect(oldBlock); collect(newBlock); }
  const res = matcher.batch(titles);
  if (res.failure) { warn('matcher failure: ' + res.failure); return; }
  const titleId = new Map();
  titles.forEach((t, i) => { if (!titleId.has(t)) titleId.set(t, res.ids[i]); });
  const idOf = (t) => { const v = titleId.get(t); return v === undefined ? null : v; };
  const entries = [];
  for (const [file, list] of modifiedBlocks)
    for (const { name, oldBlock, newBlock } of list)
      entries.push({ file, name, ...compareModifiedBlock(oldBlock, newBlock, idOf) });
  entries.sort((a, b) => (a.file === b.file ? (a.name < b.name ? -1 : 1) : (a.file < b.file ? -1 : 1)));
  const seg = formatIntegrityHuman(entries);
  if (seg) out.push('\n' + seg);
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
  const casDenials = [];
  if (p.unstampedMutations.length) {
    const w = casWaiver(cwd, o.noCas);
    if (w.problem) {
      casDenials.push(`${w.problem} — a broken config never equals a waiver (denied)`);
    } else if (!w.waiver) {
      for (const sfx of p.unstampedMutations)
        casDenials.push(`${unstampedWarning(sfx)} — denied by default; waive with --no-cas or a | cas | optional | config row`);
    } else {
      for (const sfx of p.unstampedMutations) out.push(`warning: ${unstampedWarning(sfx)}`);
      out.push(`note: cas waived by ${w.waiver}`);
    }
  }
  for (const n of p.notes) out.push(`note: ${n}`);
  // CAS denial joins the preflight failure set — every diagnosis stays visible in one report
  const preflightFailures = [...casDenials, ...p.hygiene, ...p.casMismatches, ...p.conflicts];
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
  // the modified-block integrity section: AFTER every preflight guard (incl. the --write
  // temp/containment checks above), BEFORE any write-result line — informative only
  pushIntegritySection(out, err, p.modifiedBlocks, o.idMatcherFactory, cwd);
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

const USAGE = 'usage: apriori archive --store <f> --delta <f> --change <name> [--write] [--changes-dir <dir>] [--no-cas]\n   or: apriori archive --change <name> [--write] [--changes-dir <dir>] [--no-cas]';

function cli(argv, deps = {}) {
  return withStrict(argv, { sub: 'archive', usage: USAGE, positionals: 0,
    flags: { '--store': 'value', '--delta': 'value', '--change': 'value', '--write': 'flag', '--changes-dir': 'value', '--no-cas': 'flag' } }, (f) => {
    const a = { store: f['--store'] || null, delta: f['--delta'] || null, change: f['--change'] || null,
      write: !!f['--write'], changesDir: f['--changes-dir'] || null, noCas: !!f['--no-cas'] };
  // high-level form: --change alone (no --store/--delta) drives the whole change
    if (a.change && !a.store && !a.delta) {
      const r = archiveChange({ cwd: process.cwd(), change: a.change, write: a.write,
        changesDir: a.changesDir || undefined, changesDirExplicit: !!a.changesDir, noCas: a.noCas,
        idMatcherFactory: deps.idMatcherFactory });
      for (const l of r.out) console.log(l);
      for (const l of r.err) console.error(l);
      return r.code;
    }
    if (a.change && (a.store || a.delta) && !(a.store && a.delta)) {
      console.error('usage: apriori archive --change <name> [--write] [--changes-dir <dir>]  (high-level form)\n   or: apriori archive --store <f> --delta <f> --change <name> [--write] [--changes-dir <dir>]  (single-file form)\n(--change cannot be combined with only one of --store/--delta)');
      return 2;
    }
    if (!a.store || !a.delta || !a.change) { console.error(USAGE); return 2; }
    const vEarly = require('./resolve').validateChangeName(a.change);
    if (!vEarly.ok) { console.error(`archive: invalid change name '${a.change}' (${vEarly.kind}) — bare kebab-case, not date-prefixed, not a reserved name`); return 2; }
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
    // AM-32 (4.0): mutation ops without a stamp are denied unless visibly waived
    if (!stamp && mutationOpCount(delta) > 0) {
      const w = casWaiver(process.cwd(), a.noCas);
      if (w.problem || !w.waiver) {
        console.error(`archive: ${w.problem ? w.problem + ' — a broken config never equals a waiver (denied)' : unstampedWarning(a.delta) + ' — denied by default; waive with --no-cas or a | cas | optional | config row'}`);
        console.log('\nRESULT: FAILED PREFLIGHT — nothing written');
        return 1;
      }
      console.log(`warning: ${unstampedWarning(a.delta)}`);
      console.log(`note: cas waived by ${w.waiver}`);
    }
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
  compareModifiedBlock, formatIntegrityHuman,
  merge, renderStore, archiveStamp, archiveChangeDir, archiveChange, CHANGE_NAME_RE,
  fingerprint, parseStamp, containsReal, discoverDeltas, buildProjection,
  DEPRECATED_RE, stripDeprecatedBlocks, stampCli, cli };
