'use strict';
/*
 * apriori readiness — the flow-state / tasks / ledger predicates, in two layers.
 *
 * BASE layer: the gate's state-A code, moved here verbatim. Same results, same detail
 * strings, same bare reads. `gate` consumes it instead of keeping its own copy, so the
 * two can never drift.
 *
 * ARCHIVE layer (below the base): a SEPARATE set of functions for a caller that performs
 * an irreversible write. They classify lstat/realpath failures by e.code in a single pass
 * and never call a helper that swallows exceptions.
 *
 * Why two: state A's fileReadDefect, reviewDirDefect and containsReal all swallow errors
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
const { containsReal } = require('./resolve');

// The four phases of the minimal flow, plus the two exits. 5.x numbered seven STEPs and hung a
// fixed artifact on each; 6.0 keeps the phases and drops the numbering, so a bundle still parked
// on `current-step: STEP<n>` is REFUSED by C3 rather than read — the old path does not survive
// as a synonym.
const PHASE_ENUM = ['ground', 'specify', 'build', 'review', 'done', 'abandoned'];
const MODE_ENUM = ['fast', 'standard'];

// The 5.x identity keys. 6.0 replaced `tier`/`track`/`track-rationale` with `mode`, derives the
// round from the review evidence, and replaced `current-step` with `phase`. A bundle that still
// spells any of them is REFUSED rather than read: accepting both would keep the old path alive
// beside the new one. This constant is the only place in lib/ that says these words, and it says
// them to diagnose, never to decide.
const LEGACY_IDENTITY = ['tier', 'track', 'track-rationale', 'round', 'current-step'];
const legacyIdentity = (flowText) =>
  (flowText ? LEGACY_IDENTITY.filter((k) => new RegExp(`^${k}:`, 'm').test(flowText)) : []);

// ---------------------------------------------------------------------------
// BASE LAYER — byte-identical to state-A gate. Do not add guards here: a guard
// would change gate's behaviour and contradict RY-02/RY-06.
// ---------------------------------------------------------------------------

// `em` is lib/risk's effectiveMode result, optional: C3 is where the mode is announced, so a
// risk-driven upgrade is announced there too rather than in a check of its own.
function checkFlowState(state, name, flowText, em) {
  // A 5.x key refuses UNCONDITIONALLY — a legal `mode` beside it is not a cure. Reading the
  // new spelling and ignoring the stale one is exactly how a dead field rides along into a
  // bundle that looks migrated; and 'required key mode missing' on its own would send the
  // reader hunting for a key they already wrote under its old name.
  const legacy = legacyIdentity(flowText);
  if (legacy.length) return { id: 'C3', status: 'blocked',
    detail: `flow-state: 5.x identity key(s) present (${legacy.join(', ')}) — 6.0 carries 'mode' and 'phase': delete them and set 'mode: fast|standard' plus 'phase: ${PHASE_ENUM.join('|')}' (see MIGRATING.md)` };
  for (const key of ['change', 'mode', 'lineage', 'phase']) {
    const v = state[key];
    if (v === undefined || v === '') return { id: 'C3', status: 'blocked', detail: `flow-state: required key '${key}' missing` };
    if (v.includes('<') || v.includes('>')) return { id: 'C3', status: 'blocked', detail: `flow-state: '${key}' is an unfilled placeholder (${v})` };
  }
  if (state.change !== name) return { id: 'C3', status: 'blocked', detail: `flow-state: 'change' is '${state.change}', expected '${name}'` };
  if (!PHASE_ENUM.includes(state.phase)) return { id: 'C3', status: 'blocked', detail: `flow-state: 'phase' '${state.phase}' not in the legal vocabulary` };
  if (!MODE_ENUM.includes(state.mode)) return { id: 'C3', status: 'blocked', detail: `flow-state: 'mode' '${state.mode}' not in {fast, standard}` };
  const shown = em && em.upgraded ? `${state.mode} → ${em.mode} (${em.reason})` : state.mode;
  return { id: 'C3', status: 'pass', detail: `legal (mode ${shown}, ${state.phase})` };
}

// C2 — the hand-written task list. 6.0 does not ask for one: a checklist is bookkeeping, and
// bookkeeping never decided whether the product was correct. A tasks.md a 5.x bundle already
// carries is still READ, so its unchecked boxes are visible — but it is a DIAGNOSTIC, never a
// refusal. `n/a` is the only status this check can return; a change that ships without one is
// not incomplete, it is simply a 6.0 change.
function checkTasks(dir) {
  const p = path.join(dir, 'tasks.md');
  if (!fs.existsSync(p)) return { id: 'C2', status: 'n/a', detail: 'no tasks.md — 6.0 requires none' };
  let open;
  try { open = (fs.readFileSync(p, 'utf8').match(/^\s*-\s\[\s\]/gm) || []).length; }
  catch (e) { return { id: 'C2', status: 'n/a', detail: `legacy tasks.md unreadable (${e.code || e.message}) — diagnostic only` }; }
  return { id: 'C2', status: 'n/a',
    detail: open
      ? `legacy tasks.md: ${open} unchecked box(es) — diagnostic only, 6.0 does not require a task list`
      : 'legacy tasks.md: all boxes checked — diagnostic only, 6.0 does not require a task list' };
}

// the ledger vocabulary, one classifier shared by C4 and the corpus test (GT-15).
// leading token, case-insensitive; rejected-verified BEFORE rejected (alternation order).
const STATUS_RE = /^(open|fixed|verified|rejected-verified|rejected|advisory-acked|waived)\b/i;
function classifyStatus(status) {
  const m = STATUS_RE.exec(status);
  if (!m) return { legal: false, terminal: false, needsReason: false, hasReason: false, isWaived: false };
  const tok = m[1].toLowerCase();
  const needsReason = tok === 'rejected' || tok === 'rejected-verified' || tok === 'waived';
  return {
    legal: true,
    terminal: tok === 'verified' || tok === 'rejected-verified' || tok === 'waived' || tok === 'advisory-acked',
    needsReason,
    hasReason: !needsReason || /\w/.test(status.slice(m[0].length)),
    isWaived: tok === 'waived',
    token: tok,
  };
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The `gates:` block ends at the next unindented top-level key OR at the next markdown heading:
// 6.0's state carries `## Reality Check` / `## Evidence` sections, and a section swallowed into
// the gates block would read its `- ` lines as human decisions.
const BLOCK_END = /^(?:[A-Za-z][\w-]*:|#)/m;

// gates: entries from a flow-state text — the block runs from the unindented `gates:` line
// to the next unindented top-level key; entries start `- `, continuation lines attach.
function gatesEntries(flowText) {
  const start = flowText.search(/^gates:/m);
  if (start < 0) return [];
  const rest = flowText.slice(start + 'gates:'.length);
  const end = rest.search(BLOCK_END);
  const block = end < 0 ? rest : rest.slice(0, end);
  const entries = [];
  for (const line of block.split('\n')) {
    if (/^\s*-\s/.test(line)) entries.push(line.trim());
    else if (entries.length && line.trim()) entries[entries.length - 1] += ' ' + line.trim();
  }
  return entries;
}

// a waive is a HUMAN act: one single gates: entry must carry the row ID as an exact token
// (LS-1 never matches inside LS-10) AND the word waive/waived. (An owner's EVIDENCE acceptance
// is a different, closed grammar — see `evidenceAcceptances`; it deliberately does not reuse
// this looser shape, because a substring-and-a-verb rule let a producer self-authorize.)
function waiveEvidence(flowText, id) {
  const idRe = new RegExp(`(^|[^A-Za-z0-9-])${escapeRe(id)}([^A-Za-z0-9-]|$)`);
  return gatesEntries(flowText).some((e) => idRe.test(e) && /waiv/i.test(e));
}

// The per-row ledger findings, as STRUCTURE rather than a joined string. One implementation
// serves both gate's C4 (which formats it) and archive's readiness (which maps each kind to
// forceable / not) — a second walk over the rows is how the two drift apart.
// Pure: it reads nothing; callers hand it parsed rows and the flow-state text.
// Only ONE finding kind is a product fact: a row a reviewer opened and nobody closed. The rest
// — an unknown status token, a missing rejection reason, a `fixed` that was never flipped to
// `verified` at archive time — are RECORD-KEEPING. 5.x refused an archive over them, which is
// exactly the "台账终态和格式" round the blueprint deletes: the product was already green.
// They stay in the report as notes so nothing is hidden; they no longer stop a delivery.
const SUBSTANTIVE_LEDGER = new Set(['open']);

function ledgerFindings(rows, flowText, stage) {
  const bad = [];
  for (const r of rows) {
    const c = classifyStatus(r.status);
    if (!c.legal) { bad.push({ id: r.id, kind: 'illegal', detail: `${r.id}: '${r.status}' is not in the ledger vocabulary` }); continue; }
    if (c.needsReason && !c.hasReason) { bad.push({ id: r.id, kind: 'no-reason', detail: `${r.id} is ${c.token} without a reason` }); continue; }
    if (c.isWaived && !waiveEvidence(flowText, r.id)) {
      bad.push({ id: r.id, kind: 'no-waive-evidence', detail: `${r.id} is waived without a gates: entry recording the human decision` }); continue;
    }
    if (c.token === 'open') { bad.push({ id: r.id, kind: 'open', detail: `${r.id} is open` }); continue; }
    if (stage === 'archived' && !c.terminal) {
      bad.push(c.token === 'fixed'
        ? { id: r.id, kind: 'fixed', detail: `${r.id} is fixed but never verified — reviewer must verify, or the human waives it` }
        : { id: r.id, kind: 'rejected-unconcurred', detail: `${r.id} is rejected without reviewer concurrence — flip to rejected-verified, or the human waives it` });
    }
  }
  return bad;
}

// C4 — the issue ledger, when a change keeps one. 6.0 asks for none: absence is `n/a` in EVERY
// mode. What survives is the substantive half — an open finding still blocks, because a
// reviewer found something and nobody closed it.
function checkLedger(stage, dir) {
  const p = path.join(dir, 'review', 'issues.md');
  if (!fs.existsSync(p)) return { id: 'C4', status: 'n/a', detail: 'no ledger — 6.0 requires none' };
  const { parseLedger } = require('./status');
  const rows = parseLedger(fs.readFileSync(p, 'utf8'));
  const fsPath = dir ? path.join(dir, 'flow-state.md') : null;
  const flowText = fsPath && fs.existsSync(fsPath) ? fs.readFileSync(fsPath, 'utf8') : '';
  const bad = ledgerFindings(rows, flowText, stage);
  const blocking = bad.filter((b) => SUBSTANTIVE_LEDGER.has(b.kind));
  const notes = bad.filter((b) => !SUBSTANTIVE_LEDGER.has(b.kind));
  const tail = notes.length ? `; bookkeeping (not blocking): ${notes.map((b) => b.detail).join('; ')}` : '';
  return blocking.length
    ? { id: 'C4', status: 'blocked', detail: `${blocking.map((b) => b.detail).join('; ')}${tail}` }
    : { id: 'C4', status: 'pass', detail: `${rows.length} row(s), none open${tail}` };
}

// the bundle review/ dir is the shared evidence root for C4 and C5 — when present it must be
// a REAL contained directory (symlinked/escaping/non-dir entries block, never read through)
function reviewDirDefect(dir) {
  const rd = path.join(dir, 'review');
  let st;
  try { st = fs.lstatSync(rd); } catch { return null; }  // lstat, not exists: a dangling symlink is a defect, not absence
  if (st.isSymbolicLink()) return `review is a symlink: ${rd}`;
  if (!st.isDirectory()) return `review is not a directory: ${rd}`;
  if (!containsReal(dir, rd)) return `review escapes the change dir: ${rd}`;
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
// THE ONE SUBSTANTIVE STATE PREDICATE (blueprint §4.1/§6/§7) — C9 at the gate, R5 at archive.
//
// One check, and it asks one question: does the change's own state still owe something real?
// Three kinds of debt count, and none of them is paperwork:
//
//   EVIDENCE. Each `## Evidence` row says, per risk, whether the real evidence was RUN —
//   `done`, `blocked`, `owner-accepted`, `n/a`. `blocked` without a recorded owner acceptance is
//   the one gap no extra review and no extra document can fill. Silence is NOT an answer: a
//   change with no rows has not answered the question, so an absent section owes the answer too.
//
//   KNOWN MACHINE RISK. What the CLI can PROVE about the delta must be answered by name.
//   `unreadable-delta` is fail-closed and structural — a scan that could not rule the risk out
//   may never read as "no risk found", and no evidence row cures it. `contract-mutation` demands
//   a row called exactly `contract-mutation`, `done` or `owner-accepted`: the tool proved a
//   published requirement is being changed, so `n/a` is a contradiction of a fact, not a
//   judgement call. A change judged `standard` owes at least ONE substantive row that is not
//   `producer-diff` — reading your own diff is hygiene, not evidence about the product.
//
//   THE STATE'S OWN CLAIMS. An `## Open` substantive issue nobody closed, a Reality Check
//   `assumption` still standing, or a Reality Check line naming no kind, each says in the
//   producer's own words that the work is not finished, and each is read verbatim. This is what
//   makes the ONE state load-bearing rather than decorative.
//
// `owner-accepted` is a HUMAN act with a CLOSED grammar (see `evidenceAcceptances`). A row that
// declares its own acceptance is not an acceptance — that is how a producer grants itself the
// §6 exit. This predicate NEVER changes the mode: an accepted risk is still standard (§3).
// ---------------------------------------------------------------------------
const EVIDENCE_STATUS = ['done', 'blocked', 'owner-accepted', 'n/a'];
// sectionItems has already stripped the `- ` marker, so the row starts at its name.
const EVIDENCE_ROW = /^([^:]+?)\s*:\s*([a-z][a-z/-]*)\s*(?:[—–-]\s*)?(.*)$/;
const PRODUCER_DIFF = 'producer-diff';          // hygiene, reserved, never counts as risk evidence
const MUTATION_ROW = 'contract-mutation';       // the one risk the CLI proves, answered by name
// An unfilled scaffold ROW claims nothing — but the test is on the FIELD, not on the line.
// `<…>` anywhere in the text was a heuristic over prose, and prose contains angle brackets:
// `Map<Key>` and `List<T>` are what a real open issue and a real assumption look like, and the
// broad rule deleted exactly those claims silently. A row is unfilled when one of its two
// FIELDS is still literally the scaffold's own token — `- <risk>: done — …` (nobody named the
// risk) or `- producer-diff: <done | blocked | …> — …` (nobody answered it). Nothing else is
// filtered anywhere: an `## Open` item, an `assumption`, and a Reality Check line naming no
// kind are the producer's own words and are read verbatim.
const SCAFFOLD_FIELD = /^<[^>]*>$/;
const scaffoldRow = (line) => {
  const m = /^([^:]+?)\s*:\s*([\s\S]*)$/.exec(line);
  return !!m && (SCAFFOLD_FIELD.test(m[1].trim()) || /^<[^>]*>/.test(m[2]));
};

// THE CANONICAL OWNER ENTRY — one parser, and every authorization in this tool reads through it.
//
// `gates:` carries exactly three decisions a human can make, and all three let a change ship
// with something a check would otherwise refuse:
//
//   - <YYYY-MM-DDTHH:MM> owner: evidence-accept[-revoke] <exact-row-id> — <reason>       (§6 exit)
//   - <YYYY-MM-DDTHH:MM> owner: archive-force[-revoke] ledger — <reason>                 (progress)
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
//   · the TARGET is matched whole (`ledger`, never `ledger2`; row `LS-1`, never from an entry
//     about `LS-10`; family and round together, so a reframe answers one round of one family);
//   · the EM DASH separates target from reason, so the target token cannot absorb prose;
//   · the REASON must carry a letter or digit in ANY script — `— ——` is not a reason, and a
//     Chinese reason is.
// `gates:` is append-only, so the LAST decision for a target wins: a revoke is an appended entry.
const EM = '\u2014';
const OWNER_ENTRY_RE = /^-[ \t]+(\d{4})-(\d{2})-(\d{2})T(\d{2}):?(\d{2})[ \t]+owner:[ \t]+([\s\S]*)$/;
const ACCEPT_RE = /^evidence-accept(-revoke)?[ \t]+(\S+)[ \t]+\u2014[ \t]*([\s\S]*)$/;
const ACCEPT_TEMPLATE = (id) =>
  `  - <YYYY-MM-DDTHH:MM> owner: evidence-accept ${id} ${EM} <the human's reason, verbatim>`;

// The owner-decision payload of one raw gates: entry, or null when the entry is not an owner
// decision at all. A shape-only timestamp would let `9999-99-99T99:99` pass for a date, so the
// fields are range-checked; the day is not calendar-checked (a 31st of February is a typo, not
// an authorization forgery).
function ownerPayload(entry) {
  const m = OWNER_ENTRY_RE.exec(entry);
  if (!m) return null;
  const [, , mo, d, h, mi] = m;
  if (+mo < 1 || +mo > 12 || +d < 1 || +d > 31 || +h > 23 || +mi > 59) return null;
  return m[6];
}

// -> Map<id, {granted, firstLine}>
function evidenceAcceptances(flowText) {
  const out = new Map();
  for (const e of gatesEntriesRaw(flowText || '')) {
    if (e.payload === null) continue;                       // not an owner decision at all
    const m = ACCEPT_RE.exec(e.payload);
    if (m && HAS_REASON.test(m[3])) out.set(m[2], { granted: !m[1], firstLine: e.firstLine });
  }
  return out;
}
const ownerAccepted = (flowText, id) => {
  const g = evidenceAcceptances(flowText).get(id);
  return !!g && g.granted;
};

// `opts.riskSignals` are lib/risk's mechanical §6 signals for this bundle, and `opts.mode` the
// EFFECTIVE mode. Both are passed in rather than derived here: readiness must not depend on
// archive-merge at load time, and the caller already holds them.
// -> { rows:[{name,status,detail,settled}], blockers:[string], notes:[string], claims:{…} }
// `settled` is the one word this predicate exports about a row: the evidence was RUN (`done`),
// or the owner really accepted the risk in the canonical entry. `n/a` and `blocked` are not
// settled, and neither is a row that declares its own acceptance. Every consumer — review-ready,
// the standard-mode demand, the contract-mutation demand, the archive declaration — reads THIS
// flag rather than re-deciding from `status`, which is how `n/a` came to clear review-ready and
// how an all-`n/a` bundle came to be declared "critical evidence: complete".
function evidenceFindings(flowText, opts = {}) {
  const rows = [], blockers = [], notes = [];
  const st = require('./status');
  const signals = opts.riskSignals || [];
  // one parse of the append-only log, and it is what `settled` means below: a row whose status
  // says `owner-accepted` is settled only when the owner's canonical entry actually grants it.
  // Reading `r.status` alone would let the row that claims the exit BE the exit.
  const grants = evidenceAcceptances(flowText || '');
  const settled = (r) => !!r && (r.status === 'done'
    || (r.status === 'owner-accepted' && !!grants.get(r.name) && grants.get(r.name).granted));
  for (const line of st.sectionItems(flowText || '', 'Evidence')) {
    if (scaffoldRow(line)) continue;                         // an unfilled scaffold row claims nothing
    const m = EVIDENCE_ROW.exec(line);
    if (!m) {
      blockers.push(`evidence row is unreadable: '${line.slice(0, 60)}' — write '- <risk>: ${EVIDENCE_STATUS.join('|')} — <detail>'`);
      continue;
    }
    const [, name, status, detail] = m;
    if (!EVIDENCE_STATUS.includes(status)) {
      blockers.push(`evidence '${name}' carries status '${status}', which is not one of {${EVIDENCE_STATUS.join(', ')}}`);
      continue;
    }
    rows.push({ name, status, detail: detail.trim(), settled: settled({ name, status }) });
    if (status === 'blocked') {
      blockers.push(`critical evidence '${name}' is blocked and the owner has not accepted it — make the evidence cheaper, split the change, or record the owner's decision: ${ACCEPT_TEMPLATE(name)}`);
    } else if (status === 'owner-accepted' && !ownerAccepted(flowText, name)) {
      blockers.push(`evidence '${name}' claims owner acceptance with no canonical gates: entry — record: ${ACCEPT_TEMPLATE(name)}`);
    } else if (status === 'n/a') {
      notes.push(`evidence '${name}': not applicable${detail ? ` — ${detail.trim()}` : ''}`);
    }
  }

  // --- what the CLI already PROVED must be answered by name ---
  const byName = new Map(rows.map((r) => [r.name, r]));
  // the signal NAMES, spelled here rather than imported: lib/risk requires archive-merge at load
  // time, and readiness must never close that cycle. lib/risk exports them; RY-22 pins the match.
  for (const s of signals) {
    if (s.signal === 'unreadable-delta') {
      blockers.push(`the delta scan could not rule out a §6 risk (${s.detail}) — an unreadable delta is fail-closed and no evidence row cures it; fix the file`);
    }
  }
  if (signals.some((s) => s.signal === 'contract-mutation')) {
    const r = byName.get(MUTATION_ROW);
    if (!(r && r.settled)) {
      const why = !r ? ' — no such evidence row'
        : r.status === 'owner-accepted' ? ' — the row claims owner acceptance with no canonical gates: entry, and a row cannot accept itself'
          : ` — the row says '${r.status}', and a proven fact cannot be waved off`;
      blockers.push(`this change's delta mutates a published requirement, so '${MUTATION_ROW}' owes an answer`
        + why
        + `; write '- ${MUTATION_ROW}: done — <what you ran>' or record the owner's acceptance`);
    }
  }
  // --- and what the change's own weight demands ---
  const substantive = rows.filter((r) => r.name !== PRODUCER_DIFF && r.settled);
  if (opts.mode === 'standard' && !substantive.length) {
    blockers.push("a standard change owes at least one substantive evidence row that is not "
      + `'${PRODUCER_DIFF}' — silence is not evidence; name the §6 risk it hits and what you ran`);
  }
  if (!rows.length) {
    blockers.push(`no ## Evidence row answers anything — at minimum declare '- ${PRODUCER_DIFF}: done — <what you checked>'`);
  }

  // --- the state's own claims: the producer saying, in its own words, that work remains ---
  const open = st.sectionItems(flowText || '', 'Open');
  for (const o of open) blockers.push(`open substantive issue: ${o.slice(0, 90)} — close it, or move it to a new change`);
  const rc = st.realityCheck(flowText || '');
  for (const a of rc.assumption)
    blockers.push(`unverified assumption: ${a.slice(0, 90)} — verify it, or promote it to an ## Evidence row`);
  for (const bad of rc.malformed)
    blockers.push(`Reality Check entry names no kind: '${bad.slice(0, 60)}' — write observed/decision/assumption`);

  // The claims, as STRUCTURE. `archive`'s declaration counts them from here rather than walking
  // the state a second time — a second count is how the declaration and R5 came to disagree
  // about whether the same bundle was finished.
  return { rows, blockers, notes, claims: { open, assumption: rc.assumption, malformed: rc.malformed } };
}

// The gate face of the same predicate. `stage` is the resolver's: an ARCHIVED bundle is frozen
// history and is reported, never re-judged — the same rule C8 applies to a frozen review loop.
function checkEvidenceStatus(flowText, opts = {}) {
  const e = evidenceFindings(flowText, opts);
  const by = (s) => e.rows.filter((r) => r.status === s).length;
  const summary = `${e.rows.length} evidence row(s): ${by('done')} done, ${by('owner-accepted')} owner-accepted, ${by('n/a')} n/a`;
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
// State A's fileReadDefect / reviewDirDefect / containsReal all funnel every exception
// into a default (missing / null / false). That is right for gate, status and resolve,
// which only report. It is unsound here: an EACCES reported as "missing" becomes `n/a`
// in fast mode and the archive proceeds.
//
// So these do their own classification, in a SINGLE pass. "Outer lstat, then call the
// helper" does not work — the helper lstats again and swallows again.
// They must never call fileReadDefect, the base reviewDirDefect, or containsReal (RY-10).
// ---------------------------------------------------------------------------

const DEFAULT_OPS = { lstatSync: fs.lstatSync.bind(fs), realpathSync: fs.realpathSync.bind(fs) };

// Two codes mean "this path does not resolve", and the ancestor walk can say something
// precise about both: ENOENT (nothing there) and ENOTDIR (a component is not a directory —
// which IS the bad-ancestor condition, and what lstat raises for `<a-file>/child`).
// Everything else — EACCES, EPERM, EIO, ELOOP, ENAMETOOLONG — means the check could not be
// made, and a check that could not be made must never read as "absent".
const UNRESOLVED = new Set(['ENOENT', 'ENOTDIR']);

// Containment with the error semantics containsReal cannot express.
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

// A file artifact inside the bundle: flow-state.md, tasks.md, review/issues.md.
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
// it and lets the ledger leaf apply the mode rule, and this change introduces no new class.
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
// The readiness entry point. It owns guard → read → parse for all three artifacts:
// nothing is handed in, because "the file we guarded" and "the text we judged" must be
// the same bytes, and mode must come from the flow-state we actually read.
// ---------------------------------------------------------------------------

// gates: entries with their RAW first line kept alongside the continuation-joined form.
// The joined form is what the base layer matches on; the raw first line is what gets
// printed, so a forced run quotes the file rather than a normalised reconstruction.
// `payload` is the OWNER-decision payload or null — every consumer of this function is asking
// whether a human authorized something, so the actor test belongs here rather than three times
// over. A `note:` line still travels (it is history); it simply carries no payload.
function gatesEntriesRaw(flowText) {
  const start = flowText.search(/^gates:/m);
  if (start < 0) return [];
  const rest = flowText.slice(start + 'gates:'.length);
  const end = rest.search(BLOCK_END);
  const block = end < 0 ? rest : rest.slice(0, end);
  const out = [];
  for (const line of block.split('\n')) {
    if (/^\s*-\s/.test(line)) out.push({ firstLine: line.replace(/\s+$/, ''), joined: line.trim() });
    else if (out.length && line.trim()) out[out.length - 1].joined += ' ' + line.trim();
  }
  for (const e of out) e.payload = ownerPayload(e.joined);
  return out;
}

// 6.0 asks for no task list, so `tasks` is no longer a class anything can be forced past: the
// ledger's open rows are the one progress blocker left, and `ledger` is the whole grammar.
// A reason must carry a letter or a digit IN ANY SCRIPT — `\w` is ASCII-only and would make
// every Chinese reason illegal in a log that is written in Chinese.
const FORCE_RE = /^archive-force(-revoke)?[ \t]+ledger[ \t]+\u2014[ \t]*([\s\S]*)$/;
const HAS_REASON = /[\p{L}\p{N}]/u;

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

const FORCE_TEMPLATE = "  - <YYYY-MM-DDTHH:MM> owner: archive-force ledger — <the human's reason, verbatim>";

function structural(rule, artifact, d) {
  const where = d.code ? `${d.kind} (${d.code})` : d.kind;
  return { rule, class: 'structural', forceable: false, detail: `${artifact}: ${where} at ${d.path}` };
}

// → {ready, blockers:[{rule,class,forceable,detail}], forced:[{rule,detail,entry}], na:[], notes:[], grant}
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
  try { state = require('./status').parseFlowState(flowText); }
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
  // No mode branch DECIDES anything here any more. R2 and R3 used to waive their artifacts for
  // `fast` and demand them for `standard`; 6.0 demands neither artifact of either mode, so the
  // effective mode has nothing left to decide at archive time. It is still REPORTED, from the
  // same derivation gate and status use: a contract-mutating delta closed the fast lane, and an
  // irreversible write that stayed silent about it would be the only surface that did.
  const em = require('./risk').effectiveMode(bundleDir, state.mode, 'in-flight');
  if (em.upgraded) notes.push(`mode: ${em.declared} → ${em.mode} — fast was upgraded to standard (${em.reason})`);

  // ---- R2 is GONE. It demanded tasks.md and refused an archive over unchecked boxes; 6.0
  // scaffolds no task list and asks for none, so there is nothing here to guard. A tasks.md a
  // 5.x bundle still carries is reported by gate's C2 as a diagnostic and never read here: an
  // irreversible write must not be stopped by a checklist that proves nothing about the product.

  // ---- R3: the ledger, when the change kept one ----
  const take = (rule, b) => {
    if (b.forceable && force && grant && grant.granted) forced.push({ rule, detail: b.detail, entry: grant.firstLine });
    else blockers.push(b);
  };

  const rrd = reviewRootDefect(bundleDir, ops);
  if (rrd) blockers.push(structural('R3', 'review/', rrd));
  else {
    const ledgerPath = path.join(bundleDir, 'review', 'issues.md');
    const ld = artifactDefect(bundleDir, ledgerPath, ops);
    if (ld && ld.kind !== 'missing') blockers.push(structural('R3', 'review/issues.md', ld));
    else if (ld) na.push('R3');                    // no ledger is no defect, in either mode
    else {
      let text;
      try { text = fsImpl.readFileSync(ledgerPath, 'utf8'); }
      catch (e) { blockers.push({ rule: 'R3', class: 'structural', forceable: false, detail: `review/issues.md: unreadable (${e.code || e.message})` }); text = null; }
      if (text !== null) {
        const rows = require('./status').parseLedger(text);
        // ONE finding kind is a product fact and blocks; the rest are bookkeeping and are
        // reported as notes. Refusing an irreversible write over a `fixed` that was never
        // flipped to `verified` is the archive-time round the blueprint deletes.
        for (const f of ledgerFindings(rows, flowText, 'archived')) {
          if (SUBSTANTIVE_LEDGER.has(f.kind)) take('R3', { rule: 'R3', class: 'progress', forceable: true, detail: f.detail });
          else notes.push(`R3 bookkeeping (not blocking): ${f.detail}`);
        }
      }
    }
  }

  // ---- R4: the review loop, through the SAME derivation gate's C8 reads ----
  // archive writes irreversibly, so it may not hold a softer opinion than the check that only
  // reports. It consumes lib/review.js rather than parsing review/ again: a second parser is
  // how `gate` and `archive` come to disagree about whether a change converged.
  // An unusable review root is R3's finding already — R4 stays silent rather than repeat it.
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
          detail: `verdict doc without a raw archive or self-contained provenance: ${stem}.md` });
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
  // reads at C9 — evidence rows, the §6 signals the CLI proved about this delta, and the state's
  // own open claims. Never forceable: `--force` overrides progress, and neither missing reality
  // nor an unclosed issue is progress. Owner acceptance is the §6 exit and is spent in the state.
  for (const b of evidenceFindings(flowText,
    { mode: em.mode, riskSignals: require('./risk').scanDeltas(bundleDir) }).blockers)
    blockers.push({ rule: 'R5', class: 'evidence', forceable: false, detail: b });

  return { ready: blockers.length === 0, blockers, forced, na, notes, grant };
}

module.exports = {
  PHASE_ENUM, MODE_ENUM, LEGACY_IDENTITY, legacyIdentity,
  classifyStatus, gatesEntries, waiveEvidence, ownerAccepted, evidenceAcceptances, ownerPayload, ACCEPT_TEMPLATE,
  checkFlowState, checkTasks, checkLedger, ledgerFindings, reviewDirDefect,
  SUBSTANTIVE_LEDGER, EVIDENCE_STATUS, evidenceFindings, checkEvidenceStatus,
  phaseOverlay,
  containDefect, artifactDefect, reviewRootDefect, STRUCTURAL,
  gatesEntriesRaw, forceGrant, readinessOf, FORCE_TEMPLATE,
};
