'use strict';
/*
 * apriori review — the review loop, DERIVED from review evidence, PER FAMILY.
 *
 * A FAMILY is one review track: `req-review`, `spec-review`, `step5-review`, … Each family
 * runs its own loop and owns its own round number. Rounds are never summed across families:
 * a change that ran two healthy 2-round loops did not reach round 5.
 *
 * The rules come in TWO PHASES, and keeping them apart is the whole design:
 *
 *   PHASE 1 — SEMANTIC CLASSIFICATION (`classifyVerdict`). What does this verdict line MEAN?
 *   Tolerant about wording: counts in either vocabulary, singular/plural, case, a trailing
 *   period, and the accept phrasings reviewers actually write. Strictly CLOSED, never a
 *   prefix rule — "no major issues, but 3 blockers remain" opens with an accept and is not
 *   one, so an open-ended prefix matcher is a correctness bug, not a convenience.
 *
 *   PHASE 2 — EVIDENCE INTEGRITY (`validateEvidence`). Is the evidence COMPLETE? Strict about
 *   what a round needs — a summary, its verdict, its transcript, and ordinals that run 1..N
 *   without a hole — and quiet about what merely sits in the directory. A document whose body
 *   was pasted twice still declares one verdict; a transcript that was never a review round is
 *   not a missing round. Those are advisories, not refusals.
 *
 * Phase 1 lenient is what stops format pedantry. Phase 2 strict is what stops a round from
 * being deleted. Mixing the two is what made the earlier versions both too loose and too tight.
 *
 * This module is the ONE reader of `review/` and the ONE verdict classifier: gate's C5 and C8,
 * `status`, archive readiness R4 and check's CK-03 all come through here.
 */
const fs = require('fs');
const path = require('path');
const { gatesEntriesRaw } = require('./readiness');
const { stripFences, HAS_REASON } = require('./text');
const { stampInRange } = require('./flow');

// ===========================================================================
// SELF-CONTAINED EVIDENCE (6.0 slice B) — a doc that IS its own raw transcript.
//
// Legal only when a provenance comment is the very FIRST non-blank line and carries all four
// required fields (`unknown` is a legal value for any of them). A header that merely LOOKS like
// provenance — missing a field, an empty value, or sitting after other text — buys nothing: the
// document still needs its `-raw` sibling, exactly as before this slice existed.
// ===========================================================================
const PROVENANCE_LINE_RE = /^<!--\s*provenance:\s*([\s\S]*?)\s*-->$/;
const PROVENANCE_FIELDS = ['provider', 'model', 'session', 'date'];
// `date` is a SHAPE check, not a calendar: `unknown`, or four digits - two - two, nothing more.
// No month/day range checking — that would be a date subsystem this slice does not need; the
// shape alone already refuses `notadate`, `13/45/2026` and `yesterday`.
const LEGAL_DATE_RE = /^(?:unknown|\d{4}-\d{2}-\d{2})$/;

function parseProvenance(text) {
  if (!text) return null;
  const firstLine = text.split('\n').find((l) => l.trim() !== '');
  if (firstLine === undefined) return null;
  const m = PROVENANCE_LINE_RE.exec(firstLine.trim());
  if (!m) return null;
  const fields = {};
  for (const tok of m[1].split(/\s+/)) {
    const kv = /^([a-z]+)=(\S+)$/.exec(tok);
    if (kv) fields[kv[1]] = kv[2];
  }
  if (!PROVENANCE_FIELDS.every((k) => fields[k])) return null;
  if (!LEGAL_DATE_RE.test(fields.date)) return null;
  return fields;
}
const hasLegalProvenance = (text) => parseProvenance(text) !== null;

// Fenced code IS documentation, never the outcome — the same rule CK-04 already applies to spec
// scenarios. A reviewer's raw output may quote example VERDICT lines to explain the vocabulary;
// stripping fences before matching keeps a quoted example from reading as a second, conflicting
// verdict. Scoped to SELF-CONTAINED docs only (legal provenance) — a legacy summary's verdict
// extraction must stay byte-for-byte what it was before this slice, fences and all.

// ===========================================================================
// PHASE 1 — semantic classification
// ===========================================================================

// The canonical table CK-03 polices in the handbooks. `<N>` is a prose placeholder: legal to
// print, never an outcome.
const COUNT_ENTRY = 'VERDICT: <N> issues open';
const VERDICT_PHRASES = [
  'VERDICT: no major issues, ready to proceed to execution',
  'VERDICT: no major issues',
  'VERDICT: no spec-vs-code gaps',
  'VERDICT: gaps found',
  'VERDICT: escalate',
  COUNT_ENTRY,
  // the canonical single-file forms (6.0 slice B) — documented in full uppercase so CK-03
  // enforces their presence in the handbooks
  'VERDICT: ACCEPT',
  'VERDICT: REVISE',
  'VERDICT: ESCALATE',
];

// The comparison key: case-folded, whitespace-collapsed, terminal punctuation dropped.
// Dashes are NOT terminal punctuation — `no major issues — except the 4 P0s above` must keep its
// tail so it fails to match, which is the entire point of a closed set.
function verdictKey(line) {
  return String(line)
    .replace(/^\s*VERDICT:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.。;；,，:：)）]+$/, '')
    .trim()
    .toLowerCase();
}

// The closed sets. Every member is a COMPLETE verdict — matched whole, never as a prefix.
// The `ready to proceed` short form is here because 24 documents in the real corpus use it.
const ACCEPT_FORMS = new Set([
  'no major issues',
  'no major issues, ready to proceed',
  'no major issues, ready to proceed to execution',
  'no spec-vs-code gaps',
]);
const REVISE_FORMS = new Set([
  'gaps found',
]);
// The third outcome (blueprint §5: ACCEPT | REVISE | ESCALATE). A reviewer that finds the
// APPROACH wrong — not a list of fixes — says so instead of opening another patching round, and
// the answer is the owner's. Closed like the other two: the reason belongs in the document body
// and in the state, never in the machine-read line.
const ESCALATE_FORMS = new Set([
  'escalate',
]);
// The canonical single-file forms (6.0 slice B): `ACCEPT` and `REVISE` join the existing accept
// and revise phrasings — same closed-set, whole-line, case-insensitive rule as everything else
// here. `escalate` already matched case-insensitively, so ESCALATE_FORMS needs no new entry.
ACCEPT_FORMS.add('accept');
REVISE_FORMS.add('revise');

// The one open-ended form, and it is safe precisely because it carries its own number:
// `N issue(s) open|found`. Zero means the review closed with nothing outstanding — an accept
// however it was phrased. Anchored at both ends: a trailing clause is not a count.
const COUNT_RE = /^(\d+) issues? (?:open|found)$/;
const PLACEHOLDER_KEY = verdictKey(COUNT_ENTRY);

// One verdict line -> { cls: 'accept'|'revise'|'escalate', issuesOpen: number|null } | null.
// null = "not machine-readable", which is fail-closed everywhere downstream.
function classifyVerdict(line) {
  const k = verdictKey(line);
  const m = COUNT_RE.exec(k);
  if (m) { const n = Number(m[1]); return { cls: n > 0 ? 'revise' : 'accept', issuesOpen: n }; }
  if (ACCEPT_FORMS.has(k)) return { cls: 'accept', issuesOpen: null };
  if (REVISE_FORMS.has(k)) return { cls: 'revise', issuesOpen: null };
  if (ESCALATE_FORMS.has(k)) return { cls: 'escalate', issuesOpen: null };
  return null;
}

// Is this string legal verdict VOCABULARY anywhere — a review summary or handbook prose?
// CK-03's question. Same classifier, plus the `<N>` placeholder the runbook has to print.
function isKnownVerdict(line) {
  return verdictKey(line) === PLACEHOLDER_KEY || classifyVerdict(line) !== null;
}

// two classified results are the SAME result when class and count agree; `2 issues open` and
// `2 issues found` are one verdict written twice, not a contradiction
const sameResult = (a, b) => a.cls === b.cls && a.issuesOpen === b.issuesOpen;
const resultKey = (r) => `${r.cls}#${r.issuesOpen}`;

// ===========================================================================
// The fs boundary — one listing, sorted, so nothing depends on readdir order
// ===========================================================================

// Family and ordinal come from the naming rule the runbook mandates (`<stage>-review-v{N}.md`).
// The ordinal orders rounds INSIDE a family — the only place an order is derivable.
const V_SUFFIX = /-v([1-9][0-9]*)$/;
function familyOf(stem) {
  const m = V_SUFFIX.exec(stem);
  return m ? { family: stem.slice(0, -m[0].length), ordinal: Number(m[1]), explicit: true }
    : { family: stem, ordinal: 1, explicit: false };
}
// "named as a formal round" — the filename itself claims a family and a round number
const isRoundName = (stem) => V_SUFFIX.test(stem);

const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// State-A's exact doc-selection rule: `.md`, not the ledger, not a raw, not a symlink (a
// symlinked evidence doc aborts the scan — a defect, not a doc). `fileNames` is every real
// file, so raw lookup uses the same startsWith rule C5 has always used.
function readReviewDir(bundleDir) {
  const dir = path.join(bundleDir, 'review');
  const docs = [];
  const fileNames = [];
  const emptyRaw = [];                   // 0-byte `-raw` files: a transcript with nothing in it is no transcript (BD-09)
  let symlink = null;
  if (fs.existsSync(dir)) {
    for (const name of fs.readdirSync(dir).sort(byName)) {
      const p = path.join(dir, name);
      const st = fs.lstatSync(p);
      if (st.isFile()) {
        if (st.size === 0 && name.includes('-raw')) { emptyRaw.push(name); continue; }
        fileNames.push(name);
      }
      if (!name.endsWith('.md') || name === 'issues.md' || /-raw(\.|$)/.test(name.replace(/\.md$/, ''))) continue;
      if (name.includes('-raw')) continue;
      if (st.isSymbolicLink()) { symlink = name; break; }
      if (!st.isFile()) continue;
      const entry = { name, stem: name.replace(/\.md$/, ''), text: null, readError: null };
      try { entry.text = fs.readFileSync(p, 'utf8'); }
      catch (e) { entry.readError = e.code || e.message; }
      docs.push(entry);
    }
  }
  return { dir, docs, fileNames, emptyRaw, symlink };
}

// ===========================================================================
// PHASE 1 applied — every document's verdict lines, classified. Pure.
// -> [{ stem, name, readError, lines, results, unclassified }]
// ===========================================================================
function classifyDocs(docs) {
  return docs.map((d) => {
    const provenance = hasLegalProvenance(d.text);
    // Only a document that has ALREADY proven itself self-contained (legal provenance) gets
    // fences stripped before matching. A legacy (no-provenance) summary is read exactly as
    // before this slice — its conflict/advisory verdict must not change underneath it.
    const lines = d.text === null ? [] :
      ((provenance ? stripFences(d.text) : d.text).match(/^VERDICT:.*$/gm) || []).map((l) => l.trim());
    const classified = lines.map((l) => ({ line: l, result: classifyVerdict(l) }));
    return {
      stem: d.stem, name: d.name, readError: d.readError, lines, provenance, text: d.text,
      unclassified: classified.filter((c) => c.result === null).map((c) => c.line),
      results: classified.filter((c) => c.result !== null).map((c) => c.result),
    };
  });
}

// ===========================================================================
// PHASE 2 — evidence integrity. Pure: it takes the classified documents and the directory
// listing and decides what is a round, what is broken, and what is merely worth mentioning.
// -> { verdictDocs, missingRaw, families, problems, advisories }
// ===========================================================================
function validateEvidence(classified, fileNames) {
  const problems = [], advisories = [], missingRaw = [];
  const claims = new Map();          // `family ordinal` -> [round…]  (>1 = a collision)
  const present = new Map();         // family -> Set(ordinal) proven to have happened
  const docStems = new Set(classified.map((d) => d.stem));
  const verdictStems = new Set();
  let verdictDocs = 0;

  const note = (family, ordinal) => {
    if (!present.has(family)) present.set(family, new Set());
    present.get(family).add(ordinal);
  };

  for (const d of classified) {
    if (d.readError) {
      problems.push({ kind: 'unreadable-doc', detail: `review summary '${d.name}' cannot be read (${d.readError})` });
      continue;
    }
    if (!d.lines.length) {
      // A doc whose provenance already declares it a review round must not vanish without a
      // trace just because it carries no separate `-raw` file to notice the gap — the same
      // protection `verdict-deleted` gives a two-file round, extended to a one-file round.
      if (d.provenance) {
        const { family, ordinal } = familyOf(d.stem);
        note(family, ordinal);
        problems.push({ kind: 'provenance-verdict-missing',
          detail: `review summary '${d.name}' carries reviewer provenance declaring a review round, but no VERDICT line — a round's verdict cannot be removed to erase the round` });
      }
      continue;                                     // not a verdict document — C5 ignores it too
    }
    verdictDocs++;
    verdictStems.add(d.stem);
    const { family, ordinal } = familyOf(d.stem);
    note(family, ordinal);

    // Self-contained: legal provenance plus its own verdict line IS the raw evidence — no
    // sibling `-raw.*` is demanded. Anything else (no provenance, or provenance that is merely
    // format-similar) keeps the original rule exactly.
    const selfContained = d.provenance;
    if (!selfContained && !fileNames.some((n) => n.startsWith(d.stem + '-raw'))) { missingRaw.push(d.stem); continue; }

    if (d.unclassified.length) {
      problems.push({ kind: 'unclassified',
        detail: `review summary '${d.name}' carries a verdict line outside the known vocabulary: '${d.unclassified[0].slice(0, 80)}' — normalize the summary line (the review itself does not need repeating)` });
      continue;
    }
    // A document whose body was pasted twice declares ONE verdict. Only a real disagreement —
    // a different class, or a different count — is a problem.
    const distinct = [];
    for (const r of d.results) if (!distinct.some((x) => sameResult(x, r))) distinct.push(r);
    if (distinct.length > 1) {
      problems.push({ kind: 'conflicting-verdict',
        detail: `review summary '${d.name}' declares ${distinct.length} different outcomes (${distinct.map(resultKey).join(' vs ')}) — one document, one verdict` });
      continue;
    }
    if (d.results.length > 1) {
      advisories.push({ kind: 'repeated-verdict',
        detail: `review summary '${d.name}' repeats the same verdict ${d.results.length} times — harmless, but the body looks duplicated` });
    }
    const key = `${family} ${ordinal}`;
    if (!claims.has(key)) claims.set(key, []);
    claims.get(key).push({ stem: d.stem, family, ordinal, verdict: distinct[0].cls, issuesOpen: distinct[0].issuesOpen,
      summaryText: typeof d.text === 'string' ? d.text : '' });
  }

  // What a raw transcript is, and is not. A transcript only speaks for a ROUND when a summary
  // claims it, or when its own name claims a family and a round number. Anything else is a
  // file in a directory — `kb-check-raw.txt` is not a missing review round.
  for (const n of fileNames) {
    const i = n.indexOf('-raw');
    if (i <= 0) continue;
    const stem = n.slice(0, i);
    if (verdictStems.has(stem)) continue;
    if (docStems.has(stem)) {
      problems.push({ kind: 'verdict-deleted',
        detail: `'${stem}.md' has a transcript '${n}' but carries no verdict line — a round's verdict cannot be removed to lower the round` });
      if (isRoundName(stem)) { const f = familyOf(stem); note(f.family, f.ordinal); }
    } else if (isRoundName(stem)) {
      problems.push({ kind: 'orphan-round-raw',
        detail: `transcript '${n}' names a review round whose summary '${stem}.md' is missing` });
      const f = familyOf(stem);
      note(f.family, f.ordinal);
    } else {
      advisories.push({ kind: 'unrelated-raw',
        detail: `'${n}' is not a review round's transcript (no '${stem}.md' summary, and the name claims no round)` });
    }
  }

  for (const key of [...claims.keys()].sort(byName)) {
    const arr = claims.get(key);
    if (arr.length > 1) {
      problems.push({ kind: 'duplicate-ordinal',
        detail: `${arr.map((r) => `'${r.stem}.md'`).join(' and ')} both claim ${arr[0].family} round ${arr[0].ordinal} — rename one; neither is counted` });
      claims.delete(key);
    }
  }

  // A family's rounds run 1..N with no hole. This is integrity, not tidiness: without it,
  // deleting round 1 turns a stalled round-2 loop back into an unstalled round-1 loop.
  for (const family of [...present.keys()].sort(byName)) {
    const ords = [...present.get(family)].sort((a, b) => a - b);
    const want = ords.map((_, i) => i + 1);
    if (ords.length !== want.length || ords.some((v, i) => v !== want[i])) {
      problems.push({ kind: 'ordinal-gap',
        detail: `${family} has rounds ${ords.join(', ')} — a family's rounds run 1..N with no gap; a missing round cannot be deleted away` });
    }
  }

  const byFamily = new Map();
  for (const arr of claims.values()) {
    const r = arr[0];
    if (!byFamily.has(r.family)) byFamily.set(r.family, []);
    byFamily.get(r.family).push(r);
  }
  const families = [...byFamily.keys()].sort(byName).map((family) => {
    const rounds = byFamily.get(family).sort((a, b) => a.ordinal - b.ordinal);
    const last = rounds[rounds.length - 1];
    return { family, round: rounds.length, verdict: last.verdict, issuesOpen: last.issuesOpen, rounds };
  });

  problems.sort((a, b) => byName(a.detail, b.detail));
  advisories.sort((a, b) => byName(a.detail, b.detail));
  return { verdictDocs, missingRaw, families, problems, advisories };
}

const EMPTY = () => ({ symlink: null, verdictDocs: 0, missingRaw: [], emptyRaw: [], families: [], problems: [], advisories: [] });

// scan -> classify -> validate. `emptyRaw` travels beside `missingRaw` so a consumer can say
// WHY the raw is missing when a 0-byte file sits where the transcript should be.
function reviewFacts(bundleDir) {
  const { docs, fileNames, emptyRaw, symlink } = readReviewDir(bundleDir);
  if (symlink) return { ...EMPTY(), symlink };
  return { symlink: null, emptyRaw, ...validateEvidence(classifyDocs(docs), fileNames) };
}
// the label every surface prints for a verdict doc with no usable raw: `<stem>.md`, and the
// empty sibling named when that is the reason
function rawLabel(facts, stem) {
  const empty = (facts.emptyRaw || []).find((n) => n.startsWith(stem + '-raw'));
  return `${stem}.md${empty ? ` (${empty} is empty)` : ''}`;
}

// ONE judgment of the completeness facts (batch C row 10) — gate C5 and archive R4 both read
// THIS, so the two surfaces can never classify the same review/ differently; each renders the
// findings in its own words and nothing more. -> {
//   symlink      the aborting symlink path, or null. When set, the scan aborted: deriving a
//                loop verdict — or anything else — from these facts would be invention.
//   missing      one rawLabel() per verdict doc with no usable raw archive (order preserved) —
//                each is a refusal on every surface, never forceable
//   verdictDocs  how many docs carry a verdict at all (0 attests nothing — the LOOP's question) }
function completenessFindings(facts) {
  if (facts.symlink) return { symlink: facts.symlink, missing: [], verdictDocs: 0 };
  return { symlink: null, missing: facts.missingRaw.map((s) => rawLabel(facts, s)), verdictDocs: facts.verdictDocs };
}

// ===========================================================================
// PHASE 3 — the loop. ONE human-held number, no fixed control points.
// ===========================================================================
// The owner's `review-round-limit` (process-config; missing = 8) is the only number that governs
// how long a family may keep revising. `revise` below the limit never stops the loop by itself,
// and since limit-ruling neither does a `revise` AT the limit: the producer rules on every open
// finding and ONE re-review follows (rulingPath). The loop stops for the owner on exactly two
// things — an `escalate` verdict at any round, or a round past that one re-review without an owner
// release (`accept` at the limit proceeds). Both are one escalation, answered by one recorded
// owner `reframe`. The fixed round-2 stop and round-5 stop-loss of 6.0 are gone:
// in practice (37 families, 24% still revising at round 2, every one converging by round 4 once
// allowed to continue) the round-2 stop was not a rare escape hatch but a standing blocker that
// only a human could release.
const { resolveReviewRoundLimit, DEFAULT_ROUND_LIMIT, ROUND_LIMIT_RANGE } = require('./config');

// The four ways out of a stop. `accept-risk` records a risk the owner takes — it is never a PASS.
const REFRAME_EXITS = ['split', 'tests', 'redo'];
const ESCALATION_EXITS = [...REFRAME_EXITS, 'accept-risk'];

// The reframe verb, inside the canonical owner entry (readiness.gatesEntriesRaw supplies the
// payload and has already required a real timestamp and the actor `owner`). Its TARGET is the
// family and the round together, so one entry answers one round of one family and nothing else;
// the em dash separates that target from the reason, exactly as the other two verbs do.
const REFRAME_RE = new RegExp(
  '^reframe[ \\t]+(\\S+)[ \\t]+round[ \\t]+([1-9][0-9]*)[ \\t]+('
  + ESCALATION_EXITS.join('|') + ')[ \\t]+\\u2014[ \\t]*([\\s\\S]*)$');

// The line a human is told to append — the WHOLE line, prefix included. Printing only the verb
// would hand someone a string that no longer authorizes anything once they pasted it.
const reframeLine = (family, round, exits) =>
  `  - <YYYY-MM-DDTHH:MM> owner: reframe ${family} round ${round} <${exits.join('|')}> — <reason>`;

// gates: entries that answer a stop -> Map<`family#round`, {…}>. It reads the SAME canonical
// owner entry readiness parses for the other two decisions, and keeps the same last-one-wins
// rule. The entry names BOTH the family and the round it answers, so it authorizes nothing else.
function reframeDecisions(flowText) {
  const out = new Map();
  for (const e of gatesEntriesRaw(flowText || '')) {
    if (e.payload === null) continue;                       // not an owner decision at all
    const m = REFRAME_RE.exec(e.payload);
    if (!m) continue;
    if (!HAS_REASON.test(m[4])) continue;
    out.set(`${m[1]}#${Number(m[2])}`,
      { family: m[1], round: Number(m[2]), decision: m[3], entry: e.firstLine });
  }
  return out;
}

// ---- the review-progress record (rounds >= 3) ----
// Before round n >= 3 opens, the PRODUCER logs what it did about the previous round — a `note:`
// entry (the producer's vocabulary; an `owner:` actor is accepted as the record too, but records
// authorize nothing either way): `- <YYYY-MM-DDTHH:MM> note: review-progress <family> round <n> —
// issues: <ID[, ID…]|none>; actions: <text>; evidence: <path or ref>[, …]; approach: <kept|changed>
// — <reason>`. The grammar is exact: a real timestamp (range-checked by the SAME rule as the
// owner entry, lib/flow.js) and the actor are REQUIRED (a bare or mis-dated `review-progress …`
// line is not a record), the four labels are recognised only where a part
// begins (the start of the payload or right after a `;`), so `transactions:` supplies no
// `actions:`, and `approach:` must read `kept — <reason>` or `changed — <reason>`. C8 checks the
// record STRUCTURALLY — family and round match, four labelled parts present and non-empty,
// `issues:` covers every ID that opens a list item or table row of the previous round's summary,
// every `evidence:` path is an existing regular file INSIDE the project — and never judges
// substance: that is the reviewer's job. A missing or failing record is the producer's to
// repair; it is not an owner gate and prints no owner line.
const PROGRESS_START = /^(\d{4}-\d{2}-\d{2}T\d{2}:?\d{2})[ \t]+(?:note|owner)[ \t]*:[ \t]*review-progress[ \t]+(\S+)[ \t]+round[ \t]+([1-9][0-9]*)[ \t]+—[ \t]*([\s\S]*)$/;
const PART_RE = /(?:^|;)[ \t]*(issues|actions|evidence|approach)[ \t]*:[ \t]*/g;
const APPROACH_RE = /^(kept|changed)[ \t]+—[ \t]*\S/;
// an issue id: an upper-case tag, a hyphen, a number, an optional lower-case suffix — `R-02`,
// `GT-54`, `RRL-01a`; nothing else is read as an id
const ISSUE_ID = /^[A-Z][A-Z0-9]*-[0-9]+[a-z]?$/;
// …when it OPENS a Markdown list item (`-`, `*`, `+`, or an ordered `1.` / `1)`) or a table row
const OPENING_ID_RE = /^\s*(?:[-*+]\s+|\d+[.)]\s+|\|\s*)\**`?([A-Z][A-Z0-9]*-[0-9]+[a-z]?)\b/;

function parseProgressPayload(rest) {
  const parts = {}; let m; const found = [];
  PART_RE.lastIndex = 0;
  while ((m = PART_RE.exec(rest)) !== null) found.push({ name: m[1], at: m.index, end: m.index + m[0].length });
  for (let k = 0; k < found.length; k++) {
    const to = k + 1 < found.length ? found[k + 1].at : rest.length;
    parts[found[k].name] = rest.slice(found[k].end, to).replace(/[;\s]+$/, '').trim();
  }
  return parts;
}

// -> Map<`family#round`, { family, round, parts, entry }> (last one wins)
function progressRecords(flowText) {
  const out = new Map();
  for (const e of gatesEntriesRaw(flowText || '')) {
    const body = e.joined.replace(/^\s*-\s*/, '');
    const m = PROGRESS_START.exec(body);
    if (!m || !stampInRange(m[1])) continue;                 // `2026-99-99T99:99` dates nothing
    out.set(`${m[2]}#${Number(m[3])}`, { family: m[2], round: Number(m[3]), stamp: m[1], parts: parseProgressPayload(m[4]), entry: e.firstLine });
  }
  return out;
}

// an evidence reference is satisfied by an existing REGULAR FILE INSIDE the project: relative
// to the project root, never absolute, never escaping by `..`, and never a symlink whose target
// lies outside (the real path is confined too). The file is stat'ed, never read.
function evidenceFileInside(cwd, ref) {
  if (path.isAbsolute(ref)) return false;
  const root = path.resolve(cwd);
  const outside = (rel) => rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel);
  const abs = path.resolve(root, ref);
  if (outside(path.relative(root, abs)) || abs === root) return false;
  try {
    const realRoot = fs.realpathSync(root);
    const real = fs.realpathSync(abs);
    if (outside(path.relative(realRoot, real)) || real === realRoot) return false;
    return fs.statSync(real).isFile();
  } catch { return false; }
}

// the ids the previous round's summary OPENS a list item or table row with — the mechanical
// reading of "the prior unresolved issues"; quoted scenario ids inside prose never count
function openingIds(summaryText) {
  const ids = new Set();
  for (const line of stripFences(summaryText || '').split('\n')) {
    const m = OPENING_ID_RE.exec(line);
    if (m && ISSUE_ID.test(m[1])) ids.add(m[1]);
  }
  return ids;
}

const progressLine = (family, round) =>
  `  - <YYYY-MM-DDTHH:MM> note: review-progress ${family} round ${round} — issues: <ID[, ID…]|none>; actions: <what changed>; evidence: <path or ref>; approach: <kept|changed> — <reason>`;

// one family's progress findings -> [problem strings] (empty = satisfied)
function progressProblems(f, records, cwd, exempt = new Set()) {
  const out = [];
  for (let n = 3; n <= f.round; n++) {
    // the re-review that follows rulings at the limit: its rulings are its record (limit-ruling).
    // Only an identified re-review is exempt — the current automatic one, or an established one
    // whose rulings and per-id conclusions all passed — never a round a stray ruling note precedes.
    if (exempt.has(n)) continue;
    const rec = records.get(`${f.family}#${n}`);
    const head = `review-progress ${f.family} round ${n}`;
    if (!rec) { out.push(`${head} — missing before round ${n}; the producer records it: \`${progressLine(f.family, n)}\``); continue; }
    const missing = ['issues', 'actions', 'evidence', 'approach'].filter((k) => !rec.parts[k]);
    if (missing.length) { out.push(`${head} — incomplete: ${missing.join(', ')} missing (all four parts are required)`); continue; }
    if (!APPROACH_RE.test(rec.parts.approach)) out.push(`${head} — approach must read \`kept — <reason>\` or \`changed — <reason>\` (the reason is required)`);
    const prev = f.rounds.find((r) => r.ordinal === n - 1);
    const prevIds = prev && prev.summaryText !== undefined ? openingIds(prev.summaryText) : new Set();
    const listed = new Set(rec.parts.issues.split(/[,\s]+/).map((t) => t.replace(/[`*]/g, '')).filter(Boolean));
    const uncovered = [...prevIds].filter((id) => !listed.has(id));
    if (uncovered.length) out.push(`${head} — issues: does not cover ${uncovered.join(', ')} from round ${n - 1}'s summary`);
    if (cwd) {
      for (const ref of rec.parts.evidence.split(/[,\s]+/).map((t) => t.replace(/[`*]/g, '')).filter(Boolean)) {
        if (!/[\/.]/.test(ref) || /^[0-9a-f]{7,40}$/.test(ref)) continue;                  // a commit or a bare word is not a path
        if (!evidenceFileInside(cwd, ref)) out.push(`${head} — evidence: '${ref}' is not an existing regular file inside the project`);
      }
    }
  }
  return out;
}

// ---- the ruling at the limit, and the one re-review (limit-ruling) ----
// At the owner's limit a still-revising family does not stop for the owner (human-approved
// DA-CONSENSUS §三, 2026-09-27). The PRODUCER rules on every finding still open in that round's
// summary, one `gates:` entry each —
//   `- <YYYY-MM-DDTHH:MM> note: ruling <family> round <n> — <ID>: <fixed|rejected|follow-up|owner> — <basis>`
// — and exactly ONE independent re-review follows as round n+1, answering each ruled id on its
// own line: `- <ID>: ADDRESSED — <basis>` or `- <ID>: NOT ADDRESSED — <basis>`. A ruling is the
// producer's word, so only the `note:` actor writes one: an `owner:` ruling would look like the
// owner's decision, and is not a ruling at all. The checks are structural; whether a ruling is
// RIGHT is the re-review's to judge, and what it leaves unresolved goes to the owner as a pending
// `## Open` item (R5 holds it). None of these findings is an owner gate or an escalation.
const RULING_KINDS = ['fixed', 'rejected', 'follow-up', 'owner'];
const RULING_START = /^(\d{4}-\d{2}-\d{2}T\d{2}:?\d{2})[ \t]+note[ \t]*:[ \t]*ruling[ \t]+(\S+)[ \t]+round[ \t]+([1-9][0-9]*)[ \t]+—[ \t]*([\s\S]*)$/;
const RULING_BODY = /^([A-Z][A-Z0-9]*-[0-9]+[a-z]?)[ \t]*:[ \t]*(\S+)[ \t]+—([\s\S]*)$/;
const rulingLine = (family, round) =>
  `  - <YYYY-MM-DDTHH:MM> note: ruling ${family} round ${round} — <ID>: <${RULING_KINDS.join('|')}> — <basis>`;

// -> Map<`family#round`, { rulings: [{id, kind, basis, entry}], unreadable: [string] }> in entry order
function rulingRecords(flowText) {
  const out = new Map();
  for (const e of gatesEntriesRaw(flowText || '')) {
    const m = RULING_START.exec(e.joined.replace(/^\s*-\s*/, ''));
    if (!m || !stampInRange(m[1])) continue;
    const key = `${m[2]}#${Number(m[3])}`;
    if (!out.has(key)) out.set(key, { family: m[2], round: Number(m[3]), rulings: [], unreadable: [] });
    const b = RULING_BODY.exec(m[4].trim());
    if (!b) { out.get(key).unreadable.push(m[4].trim().slice(0, 60)); continue; }
    out.get(key).rulings.push({ id: b[1], kind: b[2], basis: b[3].trim(), entry: e.firstLine });
  }
  return out;
}

// the re-review's per-id conclusions: `- <ID>: ADDRESSED — <basis>` / `- <ID>: NOT ADDRESSED — …`.
// The id and the status may be wrapped in `**` or backticks; the id, the status (upper case) and
// the em dash match exactly. -> Map<id, Set<'ADDRESSED'|'NOT ADDRESSED'>>
const CONCLUSION_RE = /^\s*-\s+[*`]*([A-Z][A-Z0-9]*-[0-9]+[a-z]?)[*`]*\s*:[*`]*\s*[*`]*(ADDRESSED|NOT ADDRESSED)[*`]*\s+—\s*\S/;
function reReviewConclusions(summaryText) {
  const out = new Map();
  for (const line of stripFences(summaryText || '').split('\n')) {
    const m = CONCLUSION_RE.exec(line);
    if (!m) continue;
    if (!out.has(m[1])) out.set(m[1], new Set());
    out.get(m[1]).add(m[2]);
  }
  return out;
}

// the session a round's summary names in its provenance header — null when absent or `unknown`
function roundSession(round) {
  const p = round ? parseProvenance(round.summaryText || '') : null;
  return p && p.session && p.session !== 'unknown' ? p.session : null;
}

// the `## Open` items by id, read by the ONE state predicate (lazy: readiness requires this module)
function openItemsById(flowText) {
  const byId = new Map();
  try {
    for (const i of require('./readiness').evidenceFindings(flowText || '').items) if (i.id) byId.set(i.id, i);
  } catch { /* an unreadable state is C3's finding; nothing here is pending then */ }
  return byId;
}

// One family's ruling path at the limit -> { state, problems, notes, rulings, R, pending }.
//   state: 'owed' (no valid rulings) | 're-review' (rulings pass, round R+1 not landed) |
//          'closed' (the re-review landed and every check passes) | 'open' (the re-review landed, checks fail)
function rulingPath(f, R, flowText, records) {
  const problems = [], notes = [];
  const head = `ruling ${f.family} round ${R}`;
  const rec = records.get(`${f.family}#${R}`) || { rulings: [], unreadable: [] };
  const roundR = f.rounds.find((r) => r.ordinal === R);
  const want = roundR ? openingIds(roundR.summaryText) : new Set();
  for (const u of rec.unreadable) problems.push(`${head} — unreadable ruling line: '${u}' — write \`<ID>: <kind> — <basis>\``);
  if (!rec.rulings.length) {
    problems.push(`${head} — the round is at the review-round limit (${f.limit}) and still revising: record one ruling per open finding, `
      + `\`${rulingLine(f.family, R)}\` (the producer's to write, never an owner gate; then one independent re-review follows as round ${R + 1})`);
    return { state: 'owed', problems, notes, rulings: [], R, pending: 0 };
  }
  const kinds = new Map();
  for (const r of rec.rulings) {
    if (!RULING_KINDS.includes(r.kind)) problems.push(`${head} — ${r.id}: '${r.kind}' is not a ruling kind (${RULING_KINDS.join(', ')})`);
    if (!HAS_REASON.test(r.basis)) problems.push(`${head} — ${r.id}: the basis is missing`);
    if (!kinds.has(r.id)) kinds.set(r.id, new Set());
    kinds.get(r.id).add(r.kind);
  }
  for (const [id, ks] of kinds) if (ks.size > 1) problems.push(`${head} — ${id} carries two different rulings (${[...ks].join(', ')})`);
  const uncovered = [...want].filter((id) => !kinds.has(id));
  if (uncovered.length) problems.push(`${head} — does not cover ${uncovered.join(', ')} from round ${R}'s summary`);
  const ruled = [...kinds].map(([id, ks]) => ({ id, kind: [...ks][0], basis: rec.rulings.find((r) => r.id === id).basis }));
  const reReview = f.rounds.find((r) => r.ordinal === R + 1);
  if (problems.length) return { state: 'owed', problems, notes, rulings: ruled, R, pending: 0 };
  if (!reReview) {
    problems.push(`${head} — rulings recorded; one independent re-review is owed as round ${R + 1} (resume the round-${R} reviewer session; `
      + 'each ruled id answered `- <ID>: ADDRESSED — <basis>` or `- <ID>: NOT ADDRESSED — <basis>`)');
    return { state: 're-review', problems, notes, rulings: ruled, R, pending: 0 };
  }
  // an escalated re-review is the owner's to answer (R1): the rulings' validity stands checked above,
  // the per-id conclusions are not asked of it
  if (reReview.verdict === 'escalate') return { state: 'escalated', problems, notes, rulings: ruled, R, pending: 0 };
  // ---- the one re-review, judged per ruled id ----
  const rhead = `re-review ${f.family} round ${R + 1}`;
  const concl = reReviewConclusions(reReview.summaryText);
  const open = openItemsById(flowText);
  const isPending = (id) => open.has(id) && !open.get(id).followUp;
  // a residual is discharged by a LATER review round answering that id `ADDRESSED` in the same fixed
  // form — the latest later round that answers it decides (review round 2, LR-04). A later round the
  // owner did not release is an escalation of its own, so accepting its answer here waives nothing.
  // Ruling validity and conflicting conclusions in the re-review are evidence integrity: they endure.
  const laterRounds = f.rounds.filter((r) => r.ordinal > R + 1).sort((x, y) => y.ordinal - x.ordinal);
  const laterOk = (id) => {
    for (const r of laterRounds) {
      const c = reReviewConclusions(r.summaryText).get(id);
      if (c) return c.size === 1 && c.has('ADDRESSED');
    }
    return false;
  };
  const s1 = roundSession(roundR), s2 = roundSession(reReview);
  const sameSession = !!(s1 && s2 && s1 === s2);
  if (!sameSession) notes.push(`${rhead} — the re-review is not proven to run in round ${R}'s reviewer session (${s2 || 'no session'} vs ${s1 || 'no session'})`);
  let addressed = 0, pending = 0;
  for (const r of ruled) {
    const c = concl.get(r.id) || new Set();
    if (c.size > 1) { problems.push(`${rhead} — ${r.id} carries both ADDRESSED and NOT ADDRESSED`); r.conclusion = 'conflict'; continue; }
    r.conclusion = c.size ? [...c][0] : null;
    const ok = r.conclusion === 'ADDRESSED';
    if (r.kind === 'owner') {
      if (isPending(r.id)) pending++;
      else problems.push(`${rhead} — ${r.id} was ruled owner: it must be a pending ## Open item whatever the re-review says`);
    } else if (!sameSession && (r.kind === 'rejected' || r.kind === 'follow-up')) {
      if (isPending(r.id)) pending++;
      else if (laterOk(r.id)) addressed++;
      else problems.push(`${rhead} — the re-review is not proven to run in round ${R}'s reviewer session: ${r.id} (${r.kind}) must be a pending ## Open item for the owner`);
    } else if (ok) {
      if (r.kind === 'follow-up' && !(open.has(r.id) && open.get(r.id).followUp) && !isPending(r.id))
        problems.push(`${rhead} — ${r.id} was ruled follow-up: register it in ## Open as \`- ${r.id}: follow-up → <new-change-name> — <text>\`, or hand it to the owner as a pending item`);
      else if (isPending(r.id)) pending++;
      else addressed++;
    } else if (isPending(r.id)) pending++;
    else if (laterOk(r.id)) addressed++;
    else problems.push(`${rhead} — ${r.id} (${r.kind}) has no ADDRESSED line and is not a pending ## Open item — record it in ## Open as \`- ${r.id}: <text>\` for the owner`);
  }
  // a new finding the re-review opens with an id (not an accept) is the owner's too
  if (reReview.verdict !== 'accept') {
    for (const id of openingIds(reReview.summaryText)) {
      if (kinds.has(id)) continue;
      if (isPending(id)) pending++;
      else if (laterOk(id)) addressed++;
      else problems.push(`${rhead} — ${id} is a new finding of the re-review: it must be a pending ## Open item`);
    }
  }
  if (problems.length) return { state: 'open', problems, notes, rulings: ruled, R, pending };
  notes.push(`ruling ${f.family}: rulings at round ${R}, re-review round ${R + 1} — ${addressed} addressed, ${pending} pending for the owner`);
  return { state: 'closed', problems, notes, rulings: ruled, R, pending };
}

// THE REVIEW FLOOR. Blueprint §7 lists "the required independent review is missing" as a
// blocking condition and says nothing about mode, so neither does this: leaving standard exempt
// would mean one edited word of flow-state buys the exemption fast was just denied. A round
// counts when slice 2's scanner already counts it as a family — a summary carrying a
// classifiable verdict AND its `-raw` transcript, which is the attribution. No second counter,
// no review matrix, no receipt field.
const FLOOR_NONE = 'no completed independent review round — land `review/<family>-v1.md` with '
  + 'its VERDICT line and the `<family>-v1-raw.*` transcript beside it';

// The second half, and it belongs to EVERY change. A file the producer edits cannot overrule
// the reviewer's own last word. The LATEST round of each family decides — a round-1 revise
// answered by a round-2 accept has converged.
const floorUnresolved = (fams) =>
  `the independent review has not resolved (${fams.join('; ')}) — the reviewer's latest verdict is `
  + 'what must close before the change ships; no ledger state can stand in for it';

// facts + the flow-state's recorded decisions (+ the resolved limit) -> the loop's verdict.
// opts: { limit: {value, origin} | {error} (default: 8), cwd (for evidence paths) }.
// `stage` is the resolver's: 'archived' means a FROZEN snapshot. The stop rules exist to change
// what a producer does next, and a frozen change has no next — applying them there would refuse
// history for having been written before the rule existed. So on an archived bundle they report
// and stop blocking. Evidence integrity is a different claim: a bundle whose evidence does not
// add up is misreporting its own past, and that blocks at every stage. An invalid limit is a
// configuration error: it blocks in flight (no round may open until the owner fixes the row) and
// is reported on a frozen bundle.
// -> { families, escalation:[{family, round, verdict, reason, acknowledged, decision, state}] | null,
//      problems, advisories, reviewFloor, limit, status, detail }
function reviewLoop(facts, flowText, stage, opts = {}) {
  if (facts.symlink) {
    return { families: [], escalation: null, problems: [], advisories: [], reviewFloor: null, limit: null,
      status: 'n/a', detail: `review evidence is unreadable — '${facts.symlink}' is a symlink` };
  }
  const frozen = stage === 'archived';
  const lim = opts.limit || { value: DEFAULT_ROUND_LIMIT, origin: 'default' };
  // the resolver's error already names the key, the offending cell(s) and the legal range; a
  // caller-made error that does not is completed here so C8 always says all three
  const limitError = lim.error
    ? `${/review-round-limit/.test(lim.error) ? '' : 'review-round-limit: '}${lim.error}${/must be/.test(lim.error) ? '' : ` — must be ${ROUND_LIMIT_RANGE}`}`
    : null;
  const limit = lim.error ? null : lim.value;
  const decisions = reframeDecisions(flowText);
  const records = progressRecords(flowText);
  const rulingRecs = rulingRecords(flowText);
  const problems = facts.problems.map((p) => p.detail);
  const advisories = facts.advisories.map((a) => a.detail);
  const families = [], escalation = [], notes = [], progress = [], rulings = [];

  let wouldStopAny = false;
  for (const f of facts.families) {
    const d = decisions.get(`${f.family}#${f.round}`) || null;
    let wouldStop = false, reframe = null, ruling = null, why = null;
    // THE LIMIT (limit-ruling). R = the first round at or past the limit whose verdict is `revise`.
    // Unless the owner answered R itself with a reframe (the owner's path, as before), R does not
    // stop the loop: the producer rules and ONE re-review follows as R+1 (rulingPath). A round past
    // R+1 needs an owner release — a reframe for this family at a round from R+1 on — or it is an
    // escalation that never counts as convergence.
    const R = limit === null ? null
      : (f.rounds.find((r) => r.ordinal >= limit && r.verdict === 'revise') || {}).ordinal || null;
    const ownerPath = R !== null && decisions.has(`${f.family}#${R}`);
    const exempt = new Set();
    if (R !== null && !ownerPath) exempt.add(R + 1);
    // ESTABLISHED ruling cycles bind whatever the limit says now: rulings recorded at a round whose
    // verdict was `revise`, not answered by the owner, and the next round landed. Raising the limit
    // later permits more review; it never closes what that re-review left open (review round 1, LR-01).
    // A stray ruling note below the limit is held to the same checks and buys no exemption unless
    // they all pass (LR-02).
    if (!frozen) {
      for (const rec of rulingRecs.values()) {
        const a = rec.round;
        // the current cycle is always checked below, whatever its record holds (LR-05)
        if (rec.family !== f.family || a === R || !rec.rulings.length) continue;
        const ra = f.rounds.find((r) => r.ordinal === a);
        if (!ra || ra.verdict !== 'revise' || decisions.has(`${f.family}#${a}`) || a + 1 > f.round) continue;
        const est = rulingPath({ ...f, limit }, a, flowText, rulingRecs);
        progress.push(...est.problems);
        notes.push(...est.notes);
        rulings.push(...est.rulings.map((r) => ({ family: f.family, round: a, ...r })));
        if (est.state === 'closed') exempt.add(a + 1);
        // an escalated re-review stays the owner's and keeps the family on the floor (LR-06)
        if (f.round === a + 1 && (R === null || R > f.round) && est.state !== 'escalated' && f.verdict !== 'escalate')
          ruling = { R: a, state: est.state, pending: est.pending };
      }
    }
    const released = (from, to) => { for (let n = from; n <= to; n++) if (decisions.has(`${f.family}#${n}`)) return true; return false; };
    // THE CURRENT CYCLE is checked from R on, whatever its ruling record holds and whatever came after
    // it: missing or unreadable rulings are never waived by a later release or a later accept (LR-05)
    if (R !== null && !ownerPath && !frozen) {
      const rp = rulingPath({ ...f, limit }, R, flowText, rulingRecs);
      progress.push(...rp.problems);
      notes.push(...rp.notes);
      rulings.push(...rp.rulings.map((r) => ({ family: f.family, round: R, ...r })));
      if (f.round <= R + 1 && f.verdict !== 'escalate') ruling = rp;
    }
    if (f.verdict === 'escalate') {
      why = 'the reviewer escalated';
    } else if (R !== null && ownerPath) {
      // the owner took the limit round: every `revise` at or past the limit needs its own reframe
      if (f.verdict !== 'accept') why = `round ${f.round} reached the review-round limit (${limit})`;
    } else if (R !== null && f.round >= R + 2) {
      if (!released(R + 1, f.round)) why = `round ${f.round} opened after the one automatic re-review (round ${R + 1}) without an owner release — the one automatic re-review is spent`;
      else if (f.verdict !== 'accept') why = `round ${f.round} is past the one automatic re-review and still revising`;
    }
    const escalates = why !== null;
    if (escalates) {
      // TWO ways in, one answer. A reviewer that returned ESCALATE escalates at whatever round it
      // happened — that verdict says the APPROACH is wrong, or a decision only the owner can
      // take. A round past the one automatic re-review is the owner's budget being spent. An owner
      // decision lets the work go on; it can never take this line out of the report, and it
      // answers THIS round only — the count never resets.
      const ack = !!d;
      reframe = d; wouldStop = !ack;
      escalation.push({ family: f.family, round: f.round, verdict: f.verdict, reason: why,
        acknowledged: ack, decision: ack ? d.decision : null,
        state: frozen ? 'historical' : (ack ? 'acknowledged' : 'pending') });
      notes.push(ack
        ? `ESCALATION ${f.family} round ${f.round} (${why}) — owner decision on record: ${d.decision}`
        : `ESCALATION ${f.family} round ${f.round} (${why}) — a human decides; record in gates: \`${reframeLine(f.family, f.round, ESCALATION_EXITS)}\``);
    }
    // the automatic re-review needs no review-progress record: the rulings stand in for it
    if (!frozen) progress.push(...progressProblems(f, records, opts.cwd, exempt));
    if (wouldStop) wouldStopAny = true;
    families.push({ family: f.family, round: f.round, verdict: f.verdict, escalating: escalates,
      issuesOpen: f.issuesOpen, stopped: wouldStop && !frozen, reframe,
      ruling: ruling ? { round: ruling.R, state: ruling.state, pending: ruling.pending } : null });
  }

  const controlStops = families.some((f) => f.stopped);
  // ONE exemption exists, and it is the only one: an escalation the owner ANSWERED with
  // `accept-risk` — the blueprint's single Owner exit (§6), already costing the `gates:` decision
  // AND an explicit `--force`.
  const ownerAcceptedRisk = (f) =>
    f.escalating && f.reframe && f.reframe.decision === 'accept-risk';
  // a family on the ruling path is judged by its rulings and its one re-review (their findings are
  // in `progress` until they pass); once closed, its residuals are pending items R5 holds for the
  // owner — so it no longer counts against the floor, whatever the re-review's verdict
  const onRulingPath = (f) => !!f.ruling && f.ruling.state !== 'escalated' && f.verdict !== 'escalate';
  const unresolved = families.filter((f) => !ownerAcceptedRisk(f) && !onRulingPath(f)
    && (f.verdict === 'revise' || f.verdict === 'escalate' || (f.issuesOpen !== null && f.issuesOpen > 0)));
  let reviewFloor = null;
  if (!frozen) {
    if (!families.length) reviewFloor = FLOOR_NONE;
    else if (unresolved.length) reviewFloor = floorUnresolved(unresolved.map((f) =>
      `${f.family} round ${f.round}${f.issuesOpen !== null ? `, ${f.issuesOpen} open` : `, ${f.verdict}`}`));
  }
  const configBlock = limitError && !frozen && families.length > 0;
  const blocked = problems.length > 0 || controlStops || !!reviewFloor || configBlock || progress.length > 0;
  const summary = families.map((f) =>
    `${f.family} round ${f.round} (${f.verdict}${f.issuesOpen !== null ? `, ${f.issuesOpen} open` : ''})`).join('; ');
  const limitNote = limit !== null ? `review-round-limit ${limit} (${lim.origin})` : null;
  const frozenNote = frozen && (wouldStopAny || escalation.length)
    ? 'archived: the stop rules do not apply retroactively to a frozen change'
    : null;
  const detail = [summary, limitNote, limitError, reviewFloor, ...notes, ...progress, ...problems,
    ...advisories.map((a) => `advisory: ${a}`), frozenNote].filter(Boolean).join('; ');
  return {
    families,
    escalation: escalation.length ? escalation : null,
    problems: limitError && families.length ? [limitError, ...problems] : problems,
    advisories, reviewFloor, progress,
    // every ruling at the limit (family, round, id, kind, basis, the re-review's conclusion) — the
    // archive declaration and the final report list them; [] when none
    rulings,
    limit: limit !== null ? { value: limit, origin: lim.origin } : { error: lim.error },
    status: blocked ? 'blocked' : ((frozen || !families.length) ? 'n/a' : 'pass'),
    detail: detail || 'no completed review round yet',
  };
}

module.exports = {
  VERDICT_PHRASES, classifyVerdict, isKnownVerdict,     // phase 1
  reviewFacts, rawLabel, completenessFindings,          // phase 2
  reframeDecisions, reframeLine, reviewLoop, REFRAME_EXITS, ESCALATION_EXITS,   // phase 3
  rulingRecords, reReviewConclusions, rulingLine, RULING_KINDS,               // the ruling at the limit
  progressRecords, progressLine, openingIds, evidenceFileInside, resolveReviewRoundLimit,
};
