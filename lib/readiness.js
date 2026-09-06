'use strict';
/*
 * apriori readiness — the flow-state and open-item predicates, in two layers.
 *
 * BASE layer: the gate's state-A code, moved here verbatim. Same results, same detail
 * strings, same bare reads. `gate` consumes it instead of keeping its own copy, so the
 * two can never drift.
 *
 * ARCHIVE layer (below the base): a SEPARATE set of functions for a caller that performs
 * an irreversible write. They classify lstat/realpath failures by e.code in a single pass
 * and never call a helper that swallows exceptions.
 *
 * Why two: state A's fileReadDefect, reviewDirDefect and containsExistingPath all swallow errors
 * into a default — right for callers that only REPORT (gate, status, resolve), unsound for
 * one that WRITES. Same rules, two levels of responsibility, two implementations. The duplication is
 * deliberate and is locked down by the RY-08/09/10 differentials.
 *
 * This module must not depend on archive-merge AT LOAD TIME (that would close the cycle
 * archive-merge → readiness → archive-merge). Containment comes from resolve. The same rule
 * covers lib/risk.js, which reads archive-merge's delta parser: readinessOf requires it
 * lazily, exactly as it already does for status and review.
 */
const fs = require('fs');
const path = require('path');
const { containsExistingPath } = require('./resolve');
const { HAS_REASON } = require('./text');
const flow = require('./flow');          // the ONE flow-state reader (a leaf)

// The four phases of the minimal flow, plus the two exits. 5.x numbered seven STEPs and hung a
// fixed artifact on each; 6.0 keeps the phases and drops the numbering, so a bundle still parked
// on `current-step: STEP<n>` is REFUSED by C3 rather than read — the old path does not survive
// as a synonym. MODE_ENUM is the legal vocabulary of the OPTIONAL, INERT `mode:` key (6.2): a
// value outside it is still refused, but nothing decides anything by it.
const PHASE_ENUM = ['ground', 'specify', 'build', 'review', 'done', 'abandoned'];
const MODE_ENUM = ['fast', 'standard'];

// The 5.x identity keys. 6.0 replaced `tier`/`track`/`track-rationale` with `mode`, derives the
// round from the review evidence, and replaced `current-step` with `phase`. A bundle that still
// spells any of them is REFUSED rather than read: accepting both would keep the old path alive
// beside the new one. This constant is the only place in lib/ that says these words, and it says
// them to diagnose, never to decide.
const LEGACY_IDENTITY = flow.LEGACY_IDENTITY;
// read through the flow reader (F6): a fenced or commented `round: 1` is an example, not a key
const legacyIdentity = (flowText) => (flowText ? flow.legacyKeys(flowText) : []);

// ---------------------------------------------------------------------------
// BASE LAYER — byte-identical to state-A gate. Do not add guards here: a guard
// would change gate's behaviour and contradict RY-02/RY-06.
// ---------------------------------------------------------------------------

// The retired hand-written `escalation:` scalar (6.2). Absent, `none` or `n/a` is fine. Any other
// content is a PENDING DECISION the machine has no reading for — it used to be the one hard-stop
// signal a bundle with no review family had, so it may neither be echoed as decoration nor dropped:
// in an ACTIVE bundle it is a structural migration refusal (C3/R1, review-ready, and `status
// --escalation` exits 3) until it is moved to `## Open` as an item — or answered by the owner's
// reframe, when it restated a review round — and the field deleted. In an archived bundle it is
// history. -> the refusal text, or null
const ESCALATION_INERT = /^(none|n\/a)$/i;
function escalationMigration(state) {
  const v = state && state.escalation;
  if (!v || ESCALATION_INERT.test(v)) return null;
  const shown = v.length > 60 ? v.slice(0, 59) + '…' : v;
  return `escalation: carries a pending decision ('${shown}') — move it to ## Open as \`- <ID>: ${shown}\` (or record the owner's reframe if it answers a review round), then delete the field`;
}

// ---------------------------------------------------------------------------
// The legacy issue ledger — a MIGRATION helper, not a runtime consumer (6.2). Nothing judges a
// change by review/issues.md any more; what this does is refuse to let a 6.0 bundle's still-open
// rows vanish behind "the ledger is never read". ACTIVE bundles only, and one-shot by
// construction: the refusal names every row whose status is `open` under the OLD table contract
// (first cell id, last cell status, `open` as the leading token, case-insensitive — the old
// classifyStatus vocabulary; `fixed`, `verified`, `rejected*`, `advisory-acked`, `waived` and
// anything else are not open), and it stops the moment no such row remains — move each row into
// ## Open and delete it from the ledger, or delete the file. MOVE, not copy: a copied row is still
// an open row. Unreadable, or content with no readable row, is a structural error: a ledger that
// cannot be read cannot be proven closed. The tool never rewrites or deletes the file.
// ---------------------------------------------------------------------------
const LEDGER_OPEN_RE = /^open\b/i;
// -> [{id, text, status, line}] — the old `| ID | Issue | … | Status |` rows (>= 3 cells),
// header and separator rows skipped; fenced or commented rows are examples, not rows
function parseLegacyLedger(text) {
  const rows = [];
  let table = false;                       // a header-only table is a ledger with zero rows
  const { lines, defects } = flow.scan(text);   // the scan's own failures travel with the rows (F3)
  lines.forEach((line, i) => {
    const t = line.trim();
    if (!t.startsWith('|') || !t.endsWith('|')) return;
    const cells = t.slice(1, -1).split('|').map((c) => c.trim());
    if (cells.length < 3) return;
    table = true;
    const id = cells[0], status = cells[cells.length - 1];
    if (!id || id.toLowerCase() === 'id' || /^-+$/.test(id) || /^-+$/.test(status)) return;
    rows.push({ id, text: cells[1], status, line: i + 1 });
  });
  return { rows, table, defects };
}
const LEDGER = 'legacy ledger review/issues.md';
// -> the migration refusal text, or null when there is nothing to migrate
function legacyLedgerMigration(bundleDir, ops = DEFAULT_OPS) {
  // an unusable review ROOT is the root guard's finding (C5 / R4), not a second one here
  if (reviewRootDefect(bundleDir, ops)) return null;
  const p = path.join(bundleDir, 'review', 'issues.md');
  const d = artifactDefect(bundleDir, p, ops);
  if (d && d.kind === 'missing') return null;
  if (d) return `${LEDGER}: ${d.code ? `${d.kind} (${d.code})` : d.kind} at ${d.path} — a ledger that cannot be read cannot be proven closed; fix or delete it`;
  let text;
  try { text = fs.readFileSync(p, 'utf8'); }
  catch (e) { return `${LEDGER}: unreadable (${e.code || e.message}) — a ledger that cannot be read cannot be proven closed; fix or delete it`; }
  if (!text.trim()) return null;
  const { rows, table, defects } = parseLegacyLedger(text);
  // an unclosed fence or comment hides whatever follows it — including an open row — so the
  // scan's defect is a migration error FIRST, before any "no open rows" reading (F3)
  if (defects.length) return `${LEDGER}: ${defects[0]} — a ledger that cannot be read cannot be proven closed; fix or delete it`;
  if (!table) return `${LEDGER} has content but no readable table row (old contract: | ID | … | Status |) — migrate it by hand into ## Open and delete the file`;
  const open = rows.filter((r) => LEDGER_OPEN_RE.test(r.status));
  if (!open.length) return null;
  const list = open.map((r) => `line ${r.line}: ${/\s/.test(r.id)
    ? `'${r.id}' (re-key it — an Open id has no spaces, e.g. \`${r.id.replace(/\s+/g, '-')}\`)` : r.id}${r.text ? ` (${r.text})` : ''}`);
  return `legacy ledger has ${open.length} open row(s) — move each into ## Open as \`- <ID>: <text>\` and delete it from review/issues.md (or delete the file): ${list.join('; ')}`;
}

// C3 — the flow-state's legality. `mode:` is OPTIONAL and INERT since 6.2: absent (or empty) is
// fine, `fast` / `standard` are accepted and echoed, anything else — the unfilled scaffold
// placeholder included — is refused as before. No third mode, and nothing anywhere derives a
// decision from the word. `opts.stage` is the resolver's: only an ARCHIVED bundle keeps a
// hand-written `escalation:` as history; absent, the stage is in-flight (fail-closed).
function checkFlowState(state, name, flowText, opts = {}) {
  // A 5.x key refuses UNCONDITIONALLY — a legal `mode` beside it is not a cure. Reading the
  // new spelling and ignoring the stale one is exactly how a dead field rides along into a
  // bundle that looks migrated.
  const legacy = legacyIdentity(flowText);
  if (legacy.length) return { id: 'C3', status: 'blocked',
    detail: `flow-state: 5.x identity key(s) present (${legacy.join(', ')}) — 6.0 carries 'phase' (and, since 6.2, an optional inert 'mode'): delete them and set 'phase: ${PHASE_ENUM.join('|')}' (see MIGRATING.md)` };
  // a scalar set twice with different values has no legal reading — the first value is not
  // "the" value, and judging it would be choosing one silently (the other structural defects
  // block at C9/R5, where the sections they concern are judged)
  const conflict = (state.defects || []).find((d) => / is set twice with different values /.test(d));
  if (conflict) return { id: 'C3', status: 'blocked', detail: `flow-state: ${conflict}` };
  for (const key of ['change', 'lineage', 'phase']) {
    const v = state[key];
    if (v === undefined || v === '') return { id: 'C3', status: 'blocked', detail: `flow-state: required key '${key}' missing` };
    if (v.includes('<') || v.includes('>')) return { id: 'C3', status: 'blocked', detail: `flow-state: '${key}' is an unfilled placeholder (${v})` };
  }
  const mode = state.mode === undefined || state.mode === '' ? null : state.mode;
  if (mode !== null) {
    if (mode.includes('<') || mode.includes('>')) return { id: 'C3', status: 'blocked', detail: `flow-state: 'mode' is an unfilled placeholder (${mode})` };
    if (!MODE_ENUM.includes(mode)) return { id: 'C3', status: 'blocked', detail: `flow-state: 'mode' '${mode}' not in {fast, standard}` };
  }
  if (state.change !== name) return { id: 'C3', status: 'blocked', detail: `flow-state: 'change' is '${state.change}', expected '${name}'` };
  if (!PHASE_ENUM.includes(state.phase)) return { id: 'C3', status: 'blocked', detail: `flow-state: 'phase' '${state.phase}' not in the legal vocabulary` };
  const mig = opts.stage === 'archived' ? null : escalationMigration(state);
  if (mig) return { id: 'C3', status: 'blocked', detail: `flow-state: ${mig}` };
  return { id: 'C3', status: 'pass', detail: `legal (${mode ? `mode ${mode}, ` : ''}${state.phase})` };
}

// 6.2 retired the issue ledger CONSUMER. `gate` C4 is a placeholder and `archive` has no R3:
// a change's unresolved items live in the state's `## Open` section, read by ONE predicate below.
// The only thing in this module that opens `review/issues.md` is the migration helper above,
// and it judges nothing but whether rows still wait to be moved.

// the bundle review/ dir is the evidence root C5 and C8 read — when present it must be
// a REAL contained directory (symlinked/escaping/non-dir entries block, never read through)
function reviewDirDefect(dir) {
  const rd = path.join(dir, 'review');
  let st;
  try { st = fs.lstatSync(rd); } catch { return null; }  // lstat, not exists: a dangling symlink is a defect, not absence
  if (st.isSymbolicLink()) return `review is a symlink: ${rd}`;
  if (!st.isDirectory()) return `review is not a directory: ${rd}`;
  if (!containsExistingPath(dir, rd)) return `review escapes the change dir: ${rd}`;
  return null;
}

// Archiving happens in the delivering phase, and the demand is an OVERLAY on C3, not a
// replacement: C3 legality first, the phase demand second. A named production function so the
// acceptance that covers it cannot be satisfied by a test restating the comparison —
// readinessOf must call THIS (RY-11).
function phaseOverlay(state, name, flowText) {
  const c3 = checkFlowState(state, name, flowText);
  if (c3.status !== 'pass') return { class: 'legality', detail: c3.detail };
  const phase = state.phase;
  if (phase === 'review') return null;
  if (phase === 'abandoned') {
    return { class: 'phase', detail: 'flow-state declares abandoned — an abandoned change writes nothing to the KB or the spec store; that rule has no override here' };
  }
  if (phase === 'done') {
    return { class: 'phase', detail: "in-flight bundle declares done; archiving happens at 'phase: review'" };
  }
  return { class: 'phase', detail: `flow-state is at '${phase}'; archiving happens at 'phase: review'` };
}

// ---------------------------------------------------------------------------
// THE ONE SUBSTANTIVE STATE PREDICATE — C9 at the gate, R5 at archive, the archive declaration
// and `status` all read THIS function on the same inputs. There is no second state.
//
// One check, and it asks one question: does the change's own state still owe something real?
//
//   OPEN ITEMS. `## Open` holds the substantive unresolved items, one line each, a stable id
//   first: `- <ID>: <text>`. An item is PENDING until the owner records `evidence-accept <ID>`
//   (the closed grammar below); an accepted item does not block, but it stays present and is
//   reported as `accepted, still present` — nothing here deletes a line, the producer removes it
//   when the risk is actually resolved. A line WITHOUT an id is still an open item: it blocks,
//   and it cannot be accepted (there is nothing to name). Duplicate ids are fail-closed and both
//   lines are named. An empty or absent section owes nothing.
//
//   KNOWN MACHINE RISK. `unreadable-delta` is fail-closed and structural — a scan that could not
//   rule the risk out may never read as "no risk found", and no item or acceptance cures it.
//   `contract-mutation` — the one §6 risk the CLI PROVES — is INFORMATION: reported as a note,
//   demanding nothing by itself.
//
//   THE STATE'S OWN CLAIMS. A Reality Check `assumption` still standing, or a Reality Check line
//   naming no kind, each says in the producer's own words that the work is not finished.
//
//   LEGACY `## Evidence`. 6.0's row table has no reader any more. In an in-flight bundle a row
//   reading `blocked` is a migration refusal (move it to ## Open, or accept it by name), and so
//   is a row claiming `owner-accepted` with no valid acceptance (a self-signed claim may not make
//   a risk disappear); a row whose name carries a valid acceptance is an accepted item; every
//   other row is ignored, with one note. Archived bundles are recorded, never re-judged.
//
// Acceptance is a HUMAN act with a CLOSED grammar (see `evidenceAcceptances`). A line that
// declares its own acceptance is not an acceptance — that is how a producer grants itself the
// owner's exit. This predicate reads no mode: `mode:` is inert since 6.2.
// ---------------------------------------------------------------------------
// sectionItems has already stripped the `- ` marker, so an item starts at its id: ONE token —
// no whitespace, no colon — followed by the colon. That is the shape `evidence-accept` targets.
const OPEN_ITEM_RE = /^([^\s:]+)\s*:\s*(.*)$/;
// the legacy row, read only to migrate it: `- <name>: <status> — <detail>`
const LEGACY_EVIDENCE_ROW = /^([^:]+?)\s*:\s*([a-z][a-z/-]*)\s*(?:[—–-]\s*)?(.*)$/;

// THE CANONICAL OWNER ENTRY — one parser, and every authorization in this tool reads through it.
//
// `gates:` carries exactly three decisions a human can make:
//
//   - <YYYY-MM-DDTHH:MM> owner: evidence-accept[-revoke] <open-item-id> — <reason>          (the exit)
//   - <YYYY-MM-DDTHH:MM> owner: archive-force[-revoke] ledger — <reason>   (6.2: nothing left to force)
//   - <YYYY-MM-DDTHH:MM> owner: reframe <family> round <n> <exit> — <reason>             (the loop)
//
// They had three parsers and two strictnesses. The evidence exit read the ENTRY, anchored; the
// other two read a "payload" produced by stripping an OPTIONAL timestamp and then everything up
// to the first `': '` — which accepted any actor at all. So `- producer: archive-force ledger —
// x` and `- note: reframe code-review round 5 accept-risk — x` authorized the two exits the
// closed grammar was written to deny, one door over. There is one parser now, and the strict
// prefix belongs to it rather than to any single verb.
//
// Every part of the line is load-bearing, and each is a way an agent could self-authorize:
//   · the TIMESTAMP must be a real one, range-checked — an undated line is nobody's decision;
//   · the ACTOR must be exactly `owner` — `producer:`, `note:`, `agent:` and the retired
//     `gate⑤ (owner):` prefix authorize NOTHING;
//   · the VERB is lowercase-exact and OPENS the payload, so `do not archive-force ledger` and
//     `we should evidence-accept x` grant nothing;
//   · the TARGET is matched whole (`ledger`, never `ledger2`; item `LS-1`, never from an entry
//     about `LS-10`; family and round together, so a reframe answers one round of one family);
//   · the EM DASH separates target from reason, so the target token cannot absorb prose;
//   · the REASON must carry a letter or digit in ANY script — `— ——` is not a reason, and a
//     Chinese reason is.
// `gates:` is append-only, so the LAST decision for a target wins: a revoke is an appended entry.
const EM = '—';
const ACCEPT_RE = /^evidence-accept(-revoke)?[ \t]+(\S+)[ \t]+—[ \t]*([\s\S]*)$/;
const ACCEPT_TEMPLATE = (id) =>
  `  - <YYYY-MM-DDTHH:MM> owner: evidence-accept ${id} ${EM} <the human's reason, verbatim>`;

// The owner decision of one raw gates: entry — `{stamp, payload}` — or null. The parser lives
// in lib/flow.js beside the block it reads; the stamp is RANGE-checked, never calendar-checked
// (a 31st of February is a typo, not an authorization forgery — documented in the RUNBOOK).
const ownerEntry = flow.ownerEntry;
const ownerPayload = (entry) => { const e = ownerEntry(entry); return e ? e.payload : null; };

// -> Map<id, {granted, firstLine, at}> — the LAST decision per id (append-only log)
function evidenceAcceptances(flowText) {
  const out = new Map();
  for (const e of gatesEntriesRaw(flowText || '')) {
    if (e.payload === null) continue;                       // not an owner decision at all
    const m = ACCEPT_RE.exec(e.payload);
    if (m && HAS_REASON.test(m[3])) out.set(m[2], { granted: !m[1], firstLine: e.firstLine, at: e.stamp });
  }
  return out;
}
const ownerAccepted = (flowText, id) => {
  const g = evidenceAcceptances(flowText).get(id);
  return !!g && g.granted;
};

// `opts.riskSignals` are lib/risk's mechanical §6 signals for this bundle, passed in rather than
// derived here: readiness must not depend on archive-merge at load time, and the caller already
// holds them. `opts.stage` is not read here — the gate face (checkEvidenceStatus) applies it.
// -> { items:[{id,text,accepted,acceptedAt}], openDefects:[string], legacy:{rows,blockers,notes},
//      blockers:[string], notes:[string], claims:{open,assumption,malformed} }
// `blockers` is everything C9/R5 refuse on, in order: the open items, the legacy rows, the
// signals, the Reality Check. `openDefects` is the subset review-ready reads — an Open section
// the review cannot read (an item without an id, a duplicated id) and the state's other claims
// about itself (a standing assumption, a Reality Check line naming no kind: Ground's exit is
// "nothing the work depends on is still an assumption", and a review of that wastes the
// round); a PENDING item is not a defect, it is what the review is for.
function evidenceFindings(flowText, opts = {}) {
  const text = flowText || '';
  const items = [], openDefects = [], blockers = [], notes = [];
  const legacy = { rows: [], blockers: [], notes: [] };
  const grants = evidenceAcceptances(text);
  const accepted = (id) => { const g = grants.get(id); return !!g && g.granted; };
  const named = new Set();

  // --- the file's structure, before its content: an unreadable section is never "nothing owed" ---
  // (a numbered or bare line where a `- ` item belongs, a section written twice, a scalar set
  // twice, an unclosed fence or comment — each names its line; the reader rewrites nothing)
  for (const d of flow.structuralDefects(text)) {
    const m = `flow-state structural defect: ${d}`;
    openDefects.push(m); blockers.push(m);
  }

  // --- the open items ---
  const open = flow.sectionItems(text, 'Open');
  const seen = new Map();
  for (const line of open) {
    const m = OPEN_ITEM_RE.exec(line);
    if (!m) {
      items.push({ id: null, text: line, accepted: false, acceptedAt: null });
      const d = `open item has no id: '${line.slice(0, 60)}' — give it a stable id to accept it, or close it`;
      openDefects.push(d); blockers.push(d);
      continue;
    }
    const [, id, body] = m;
    const textOf = body.trim();
    if (seen.has(id)) {
      const d = `open item id '${id}' is duplicated: '${seen.get(id).slice(0, 60)}' and '${line.slice(0, 60)}' — one line per id`;
      openDefects.push(d); blockers.push(d);
    } else seen.set(id, line);
    named.add(id);
    const ok = accepted(id);
    items.push({ id, text: textOf, accepted: ok, acceptedAt: ok ? grants.get(id).at : null });
    if (!ok) blockers.push(`open item ${id} is pending: ${textOf.slice(0, 90)} — close it (delete the line), move it to a new change, or record the owner's decision: ${ACCEPT_TEMPLATE(id)}`);
  }

  // --- the legacy `## Evidence` section, migrated by rule (in-flight; archived is recorded) ---
  let ignored = 0;
  for (const line of flow.sectionItems(text, 'Evidence')) {
    const m = LEGACY_EVIDENCE_ROW.exec(line);
    if (!m) { ignored++; continue; }
    const [, rawName, status, detail] = m;
    const name = rawName.trim();
    legacy.rows.push({ name, status, detail: detail.trim() });
    if (accepted(name)) {
      // a valid acceptance for the row's name: it is an accepted open item, reported as such
      named.add(name);
      items.push({ id: name, text: detail.trim(), accepted: true, acceptedAt: grants.get(name).at });
    } else if (status === 'blocked') {
      legacy.blockers.push(`legacy Evidence row '${name}' is blocked — move it to ## Open as an item (or accept it via evidence-accept ${name})`);
    } else if (status === 'owner-accepted') {
      // a self-signed claim: ignoring it would let the claim make the risk disappear
      legacy.blockers.push(`legacy Evidence row '${name}' claims owner acceptance with no canonical gates: entry — move it to ## Open, or record: ${ACCEPT_TEMPLATE(name)}`);
    } else ignored++;
  }
  if (ignored) legacy.notes.push('legacy ## Evidence section ignored (6.2: risks live in ## Open)');
  blockers.push(...legacy.blockers);
  notes.push(...legacy.notes);

  // --- an acceptance that names nothing is a note, not a block and not an error ---
  for (const [id, g] of grants) if (g.granted && !named.has(id)) notes.push(`acceptance ${id} matches no open item`);

  // --- what the CLI already PROVED about the delta ---
  // the signal NAMES, spelled here rather than imported: lib/risk requires archive-merge at load
  // time, and readiness must never close that cycle. lib/risk exports them; the tests pin the match.
  for (const s of opts.riskSignals || []) {
    if (s.signal === 'unreadable-delta') {
      blockers.push(`the delta scan could not rule out a contract risk (${s.detail}) — an unreadable delta is fail-closed and no open item or acceptance cures it; fix the file`);
    } else notes.push(`risk: ${s.signal}: ${s.detail}`);
  }

  // --- the state's own claims: the producer saying, in its own words, that work remains ---
  const rc = flow.realityCheck(text);
  // the assumption LIFECYCLE, in the message: verified → it becomes an `observed` line; carried
  // forward unverified → it becomes an ## Open item (and the assumption line goes) — the two
  // states never coexist, so an accepted item does not cure a standing assumption for the same fact
  for (const a of rc.assumption) {
    const d = `unverified assumption: ${a.slice(0, 90)} — verified? rewrite it as \`- observed: …\`; carried forward unverified? move it to ## Open as \`- <ID>: ${a.slice(0, 90)}\` and delete this line (an accepted item and a standing assumption for the same fact must not coexist)`;
    openDefects.push(d); blockers.push(d);
  }
  for (const bad of rc.malformed) {
    const d = `Reality Check entry names no kind: '${bad.slice(0, 60)}' — write observed/decision/assumption`;
    openDefects.push(d); blockers.push(d);
  }

  return { items, openDefects, legacy, blockers, notes, claims: { open, assumption: rc.assumption, malformed: rc.malformed } };
}

// one line every surface prints about the items
function openSummary(e) {
  if (!e.items.length) return 'no open items';
  const acc = e.items.filter((i) => i.accepted);
  const pending = e.items.length - acc.length;
  const shown = acc.length ? `${acc.length} accepted, still present (${acc.map((i) => i.id).join(', ')})` : '0 accepted';
  return `${e.items.length} open item(s): ${shown}, ${pending} pending`;
}

// The gate face of the same predicate. `stage` is the resolver's: an ARCHIVED bundle is frozen
// history and is reported, never re-judged — the same rule C8 applies to a frozen review loop.
function checkEvidenceStatus(flowText, opts = {}) {
  const e = evidenceFindings(flowText, opts);
  const summary = openSummary(e) + (e.notes.length ? `; ${e.notes.join('; ')}` : '');
  if (opts.stage === 'archived') {
    return { id: 'C9', status: 'n/a',
      detail: `archived: the state predicate does not apply retroactively — ${summary}${e.blockers.length ? `; recorded: ${e.blockers.join('; ')}` : ''}` };
  }
  if (e.blockers.length) return { id: 'C9', status: 'blocked', detail: e.blockers.join('; ') };
  return { id: 'C9', status: 'pass', detail: summary };
}


// ---------------------------------------------------------------------------
// ARCHIVE LAYER — for a caller that performs an IRREVERSIBLE write.
//
// State A's fileReadDefect / reviewDirDefect / containsExistingPath all funnel every exception
// into a default (missing / null / false). That is right for gate, status and resolve,
// which only report. It is unsound here: an EACCES reported as "missing" becomes `n/a`
// in fast mode and the archive proceeds.
//
// So these do their own classification, in a SINGLE pass. "Outer lstat, then call the
// helper" does not work — the helper lstats again and swallows again.
// They must never call fileReadDefect, the base reviewDirDefect, or containsExistingPath (RY-10).
// ---------------------------------------------------------------------------

const DEFAULT_OPS = { lstatSync: fs.lstatSync.bind(fs), realpathSync: fs.realpathSync.bind(fs) };

// Two codes mean "this path does not resolve", and the ancestor walk can say something
// precise about both: ENOENT (nothing there) and ENOTDIR (a component is not a directory —
// which IS the bad-ancestor condition, and what lstat raises for `<a-file>/child`).
// Everything else — EACCES, EPERM, EIO, ELOOP, ENAMETOOLONG — means the check could not be
// made, and a check that could not be made must never read as "absent".
const UNRESOLVED = new Set(['ENOENT', 'ENOTDIR']);

// Containment with the error semantics containsExistingPath cannot express.
// Both realpaths are attempted — no short circuit — so a mixed failure is classified by
// the STRICTER outcome: any non-ENOENT is an io-error. Taking `enoent` while an EACCES was
// also in play would let the permission failure hide behind the absence and pass as `n/a`.
function containDefect(root, target, ops = DEFAULT_OPS) {
  let realRoot = null, real = null, sawOther = null, sawEnoent = false;
  for (const [p, set] of [[root, (v) => { realRoot = v; }], [target, (v) => { real = v; }]]) {
    try { set(ops.realpathSync(p)); }
    catch (e) { if (UNRESOLVED.has(e.code)) sawEnoent = true; else sawOther = sawOther || e.code || 'EUNKNOWN'; }
  }
  if (sawOther) return { kind: 'io-error', code: sawOther, path: target };
  if (sawEnoent) return { kind: 'enoent', path: target };
  return (real === realRoot || real.startsWith(realRoot + path.sep))
    ? null : { kind: 'escape', path: target };
}

// The nearest existing ancestor decides whether an absent path is merely absent or sits
// under something that should never have been followed. Unlike state A, a non-ENOENT here
// stops the walk instead of being swallowed as "keep walking".
function ancestorDefect(bundleDir, p, ops) {
  const stop = path.resolve(bundleDir);
  let cur = path.dirname(p);
  while (cur.startsWith(stop)) {
    let st = null;
    try { st = ops.lstatSync(cur); }
    catch (e) { if (!UNRESOLVED.has(e.code)) return { kind: 'io-error', code: e.code, path: cur }; }
    if (st) {
      if (st.isSymbolicLink() || !st.isDirectory()) return { kind: 'bad-ancestor', path: cur };
      break;
    }
    if (cur === stop) break;
    cur = path.dirname(cur);
  }
  return { kind: 'missing', path: p };
}

// A file artifact inside the bundle — in 6.2 the flow-state is the only one readiness reads.
// → null | missing | io-error | symlink | not-file | escape | bad-ancestor
function artifactDefect(bundleDir, p, ops = DEFAULT_OPS) {
  let st;
  try { st = ops.lstatSync(p); }
  catch (e) {
    if (!UNRESOLVED.has(e.code)) return { kind: 'io-error', code: e.code, path: p };
    return ancestorDefect(bundleDir, p, ops);
  }
  if (st.isSymbolicLink()) return { kind: 'symlink', path: p };
  if (!st.isFile()) return { kind: 'not-file', path: p };
  const c = containDefect(bundleDir, p, ops);
  if (!c) return null;
  if (c.kind === 'enoent') return ancestorDefect(bundleDir, p, ops);   // vanished between the two calls
  return c;
}

// The review/ directory. Absence is NOT a defect: state A's reviewDirDefect returns null for
// it and R4 then reports the missing round, and this introduces no new class.
// The type rule is isDirectory() — applying the file rule here would fail every well-formed
// bundle.
// → null | io-error | symlink | not-dir | escape
function reviewRootDefect(bundleDir, ops = DEFAULT_OPS) {
  const rd = path.join(bundleDir, 'review');
  let st;
  try { st = ops.lstatSync(rd); }
  catch (e) { return UNRESOLVED.has(e.code) ? null : { kind: 'io-error', code: e.code, path: rd }; }
  if (st.isSymbolicLink()) return { kind: 'symlink', path: rd };
  if (!st.isDirectory()) return { kind: 'not-dir', path: rd };
  const c = containDefect(bundleDir, rd, ops);
  if (!c) return null;
  if (c.kind === 'enoent') return null;                                 // same rule as an absent dir
  return c;
}

// every kind except `missing` refuses outright and is never forceable
const STRUCTURAL = new Set(['io-error', 'symlink', 'not-file', 'not-dir', 'escape', 'bad-ancestor']);


// ---------------------------------------------------------------------------
// The readiness entry point. It owns guard → read → parse for the flow-state: nothing is handed
// in, because "the file we guarded" and "the text we judged" must be the same bytes.
// ---------------------------------------------------------------------------

// gates: entries with their RAW first line kept alongside the continuation-joined form, and the
// owner-decision `payload` (null for a `note:` line and every near miss). lib/flow.js reads the
// block: a fenced or commented entry is inert there, so it never reaches an authorization.
const gatesEntriesRaw = flow.gatesEntries;

// The `archive-force` grammar. 6.0 dropped `tasks`; 6.2 retired the ledger consumer, so the one
// class the grammar still spells, `ledger`, has nothing left to force. The PARSER stays — the
// owner-entry shape is shared with `evidence-accept` and `reframe`, and a record already in a
// bundle must still be recognised — but a grant is reported as a note and overrides nothing.
const FORCE_RE = /^archive-force(-revoke)?[ \t]+ledger[ \t]+\u2014[ \t]*([\s\S]*)$/;

// → {granted, firstLine} | null. One scan decides authorization AND keeps the winning record:
// deriving the record separately means implementing last-decision twice. `gates:` is
// append-only, so a revoke is an appended entry, and the last one wins.
function forceGrant(flowText) {
  let out = null;
  for (const e of gatesEntriesRaw(flowText)) {
    if (e.payload === null) continue;                       // not an owner decision at all
    const m = FORCE_RE.exec(e.payload);
    if (m && HAS_REASON.test(m[2])) out = { granted: !m[1], firstLine: e.firstLine };
  }
  return out;
}

// one wording for a structural defect, wherever it is reported (R1, C3, the ledger probe)
const defectDetail = (artifact, d) => `${artifact}: ${d.code ? `${d.kind} (${d.code})` : d.kind} at ${d.path}`;
function structural(rule, artifact, d) {
  return { rule, class: 'structural', forceable: false, detail: defectDetail(artifact, d) };
}

// → {ready, blockers:[{rule,class,forceable,detail}], forced:[{rule,detail,entry}], na:[], notes:[], grant}
// `na` stays in the shape for callers; since 6.2 no rule is left that could be n/a, so it is [].
function readinessOf({ bundleDir, name, force = false, ops = DEFAULT_OPS, fsImpl = fs }) {
  const blockers = [], forced = [], na = [], notes = [];
  const flowPath = path.join(bundleDir, 'flow-state.md');

  // ---- R1: the flow-state, then its legality, then the archiving step ----
  const fd = artifactDefect(bundleDir, flowPath, ops);
  if (fd) {
    // an unreadable flow-state cannot rule out ABANDONED, so absence is structural here too
    return { ready: false, blockers: [structural('R1', 'flow-state.md', fd)], forced, na, notes, grant: null };
  }
  let flowText;
  try { flowText = fsImpl.readFileSync(flowPath, 'utf8'); }
  catch (e) {
    return { ready: false, forced, na, notes, grant: null,
      blockers: [{ rule: 'R1', class: 'structural', forceable: false, detail: `flow-state.md: unreadable (${e.code || e.message})` }] };
  }
  let state;
  try { state = flow.parseFlowState(flowText); }
  catch (e) {
    return { ready: false, forced, na, notes, grant: null,
      blockers: [{ rule: 'R1', class: 'structural', forceable: false, detail: `flow-state.md: unparseable (${e.message})` }] };
  }
  const grant = forceGrant(flowText);
  const overlay = phaseOverlay(state, name, flowText);
  if (overlay) {
    return { ready: false, forced, na, notes, grant,
      blockers: [{ rule: 'R1', class: overlay.class, forceable: false, detail: overlay.detail }] };
  }
  // the legacy ledger's open rows (6.2 migration): structural, never forceable, first hit alone
  const ledger = legacyLedgerMigration(bundleDir, ops);
  if (ledger) {
    return { ready: false, forced, na, notes, grant,
      blockers: [{ rule: 'R1', class: 'structural', forceable: false, detail: ledger }] };
  }
  // No mode branch DECIDES or REPORTS anything here: `mode:` is inert since 6.2. What the delta
  // scan proves is carried by R5's findings as a note, from the same predicate gate reads.

  // ---- R2 and R3 are GONE. R2 demanded tasks.md (deleted in 6.0); R3 read the issue ledger
  // (deleted in 6.2 — the ledger has no consumer, and an archive-force record therefore has
  // nothing left to force: it is reported, never applied). An irreversible write must not be
  // stopped, or opened, by a file nothing reads.
  if (grant && grant.granted) notes.push('archive-force has nothing left to force in 6.2');

  // the review ROOT is still guarded — R4 reads the directory, and a symlinked, escaping or
  // non-directory review/ is a structural refusal there rather than something to read through
  const rrd = reviewRootDefect(bundleDir, ops);
  if (rrd) blockers.push(structural('R4', 'review/', rrd));

  // ---- R4: the review loop, through the SAME derivation gate's C8 reads ----
  // archive writes irreversibly, so it may not hold a softer opinion than the check that only
  // reports. It consumes lib/review.js rather than parsing review/ again: a second parser is
  // how `gate` and `archive` come to disagree about whether a change converged.
  // An unusable review root was already refused above — the loop is not derived through it.
  if (!rrd) {
    const rv = require('./review');
    let facts = null, loop = null;
    try { facts = rv.reviewFacts(bundleDir); }
    catch (e) {
      blockers.push({ rule: 'R4', class: 'structural', forceable: false,
        detail: `review evidence unreadable (${e.code || e.message})` });
    }
    // The COMPLETENESS facts, which gate refuses on at C5 and archive used to be blind to: a
    // symlinked summary aborts the scan, and a verdict with no raw archive is unattributable.
    // Reading them off the SAME reviewFacts gate reads is the whole point — an irreversible
    // write may not hold a softer opinion than the check that only reports. Never forceable:
    // `--force` overrides progress, and evidence that cannot be read is not progress.
    if (facts && facts.symlink) {
      blockers.push({ rule: 'R4', class: 'evidence', forceable: false,
        detail: `review evidence doc is a symlink: ${facts.symlink} — evidence that is not a real file cannot be judged` });
      facts = null;                       // the scan aborted; drawing a loop verdict from it would be invention
    }
    if (facts) {
      for (const stem of facts.missingRaw) {
        blockers.push({ rule: 'R4', class: 'evidence', forceable: false,
          detail: `verdict doc without a raw archive or self-contained provenance: ${rv.rawLabel(facts, stem)}` });
      }
      loop = rv.reviewLoop(facts, flowText, 'in-flight');
    }
    if (loop) {
      for (const p of loop.problems) blockers.push({ rule: 'R4', class: 'evidence', forceable: false, detail: p });
      // Not forceable either: §7 lists a missing independent review as blocking, and a review
      // that never closed is not something after-the-fact authorization can close for it.
      if (loop.reviewFloor)
        blockers.push({ rule: 'R4', class: 'review', forceable: false, detail: loop.reviewFloor });
      for (const f of loop.families) {
        if (f.escalating) {
          // The stop-loss keeps archive's existing DOUBLE authorization: the human decision
          // already recorded in gates:, AND an explicit --force at the command line. One
          // gates: line is a line an agent can append on its own — never enough to archive.
          const b = { rule: 'R4', class: 'escalation', forceable: true,
            detail: `${f.family} round ${f.round} (verdict ${f.verdict}) escalated — the answer is the owner's`,
            cure: rv.reframeLine(f.family, f.round, rv.ESCALATION_EXITS) };
          if (force && f.reframe) forced.push({ rule: 'R4', detail: b.detail, entry: f.reframe.entry });
          else blockers.push(b);
        } else if (f.stopped) {
          // Not forceable, on purpose: after round 2 the answer is to change how the work is
          // done. `--force` would turn that judgement back into a progress override.
          blockers.push({ rule: 'R4', class: 'loop', forceable: false,
            detail: `${f.family} round ${f.round} is still revising — record the reframe first: ${rv.reframeLine(f.family, f.round, rv.REFRAME_EXITS)}` });
        }
      }
    }
  }

  // ---- R5: the ONE substantive state predicate, made once and read from the same state gate
  // reads at C9 — the open items, the §6 signals the CLI proved about this delta, and the state's
  // own claims. Never forceable: `--force` overrides progress, and neither missing reality nor an
  // unaccepted item is progress. Owner acceptance is the exit and is spent in the state.
  const found = evidenceFindings(flowText, { riskSignals: require('./risk').scanDeltas(bundleDir) });
  for (const b of found.blockers) blockers.push({ rule: 'R5', class: 'evidence', forceable: false, detail: b });
  // what the predicate merely REPORTS travels as notes — an accepted item is named here too
  if (found.items.length) notes.push(openSummary(found));
  notes.push(...found.notes);

  return { ready: blockers.length === 0, blockers, forced, na, notes, grant };
}

module.exports = {
  PHASE_ENUM, MODE_ENUM, LEGACY_IDENTITY, legacyIdentity,
  ownerAccepted, ownerPayload, checkFlowState, escalationMigration, legacyLedgerMigration, reviewDirDefect,
  evidenceFindings, checkEvidenceStatus, openSummary,
  phaseOverlay,
  containDefect, artifactDefect, reviewRootDefect, STRUCTURAL, defectDetail,
  gatesEntriesRaw, forceGrant, readinessOf,
};
