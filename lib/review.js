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
  'VERDICT: no findings',
  'VERDICT: gaps found',
  'VERDICT: extraction accepted',
  'VERDICT: extraction rejected',
  COUNT_ENTRY,
];

// The comparison key: case-folded, whitespace-collapsed, terminal punctuation dropped.
// Dashes are NOT terminal punctuation — `no findings — except the 4 P0s above` must keep its
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
  'no findings',
  'extraction accepted',
]);
const REVISE_FORMS = new Set([
  'gaps found',
  'extraction rejected',
]);

// The one open-ended form, and it is safe precisely because it carries its own number:
// `N issue(s) open|found`. Zero means the review closed with nothing outstanding — an accept
// however it was phrased. Anchored at both ends: a trailing clause is not a count.
const COUNT_RE = /^(\d+) issues? (?:open|found)$/;
const PLACEHOLDER_KEY = verdictKey(COUNT_ENTRY);

// The hotfix lane appends machine trailers to its verdict line — `role=`, `digest=<64 hex>`
// and the conditional `boundary=` (RUNBOOK §5). That is a CLOSED key=value grammar, not free
// prose, so removing it before matching is not the prefix rule coming back: a tail that is not
// one of these three tokens survives and the line stays unclassified.
const TRAILER_RE = /\s+(?:role|digest|boundary)=\S+$/;
function stripTrailers(k) {
  let out = k;
  while (TRAILER_RE.test(out)) out = out.replace(TRAILER_RE, '');
  return out;
}

// One verdict line -> { cls: 'accept'|'revise', issuesOpen: number|null } | null.
// null = "not machine-readable", which is fail-closed everywhere downstream.
function classifyVerdict(line) {
  const k = stripTrailers(verdictKey(line));
  const m = COUNT_RE.exec(k);
  if (m) { const n = Number(m[1]); return { cls: n > 0 ? 'revise' : 'accept', issuesOpen: n }; }
  if (ACCEPT_FORMS.has(k)) return { cls: 'accept', issuesOpen: null };
  if (REVISE_FORMS.has(k)) return { cls: 'revise', issuesOpen: null };
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
  let symlink = null;
  if (fs.existsSync(dir)) {
    for (const name of fs.readdirSync(dir).sort(byName)) {
      const p = path.join(dir, name);
      const st = fs.lstatSync(p);
      if (st.isFile()) fileNames.push(name);
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
  return { dir, docs, fileNames, symlink };
}

// ===========================================================================
// PHASE 1 applied — every document's verdict lines, classified. Pure.
// -> [{ stem, name, readError, lines, results, unclassified }]
// ===========================================================================
function classifyDocs(docs) {
  return docs.map((d) => {
    const lines = d.text === null ? [] : (d.text.match(/^VERDICT:.*$/gm) || []).map((l) => l.trim());
    const classified = lines.map((l) => ({ line: l, result: classifyVerdict(l) }));
    return {
      stem: d.stem, name: d.name, readError: d.readError, lines,
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
    if (!d.lines.length) continue;                 // not a verdict document — C5 ignores it too
    verdictDocs++;
    verdictStems.add(d.stem);
    const { family, ordinal } = familyOf(d.stem);
    note(family, ordinal);

    if (!fileNames.some((n) => n.startsWith(d.stem + '-raw'))) { missingRaw.push(d.stem); continue; }

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
    claims.get(key).push({ stem: d.stem, family, ordinal, verdict: distinct[0].cls, issuesOpen: distinct[0].issuesOpen });
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

const EMPTY = () => ({ symlink: null, verdictDocs: 0, missingRaw: [], families: [], problems: [], advisories: [] });

// scan -> classify -> validate.
function reviewFacts(bundleDir) {
  const { docs, fileNames, symlink } = readReviewDir(bundleDir);
  if (symlink) return { ...EMPTY(), symlink };
  return { symlink: null, ...validateEvidence(classifyDocs(docs), fileNames) };
}

// ===========================================================================
// PHASE 3 — the loop. Two control points, applied per family.
// 5 is only the stop-loss; the real one is 2.
// ===========================================================================
const STOP_AFTER = 2;
const ESCALATE_AT = 5;

// The three ways out of a stalled loop (decision card §5). `accept-risk` is NOT among them:
// at round 2 the answer is to change how the work is done, not to ship the disagreement.
const REFRAME_EXITS = ['split', 'tests', 'redo'];
const ESCALATION_EXITS = [...REFRAME_EXITS, 'accept-risk'];

const REFRAME_RE = new RegExp(
  '^reframe[ \\t]+(\\S+)[ \\t]+round[ \\t]+([1-9][0-9]*)[ \\t]+('
  + ESCALATION_EXITS.join('|') + ')[ \\t]+([\\s\\S]*)$');
const HAS_REASON = /[\p{L}\p{N}]/u;   // any script — a Chinese reason is a reason

const reframeLine = (family, round, exits) =>
  `reframe ${family} round ${round} <${exits.join('|')}> — <reason>`;

// gates: entries that answer a stalled loop -> Map<`family#round`, {…}>. Same grammar family
// and last-one-wins rule as readiness.forceGrants. The entry names BOTH the family and the
// round it answers, so it authorizes nothing else.
function reframeDecisions(flowText) {
  const out = new Map();
  for (const e of gatesEntriesRaw(flowText || '')) {
    const m = REFRAME_RE.exec(e.payload);
    if (!m) continue;
    if (!HAS_REASON.test(m[4])) continue;
    out.set(`${m[1]}#${Number(m[2])}`,
      { family: m[1], round: Number(m[2]), decision: m[3], entry: e.firstLine });
  }
  return out;
}

// THE REVIEW FLOOR. Blueprint §7 lists "the required independent review is missing" as a
// blocking condition and says nothing about mode, so neither does this: leaving standard exempt
// would mean one edited word of flow-state buys the exemption fast was just denied. A round
// counts when slice 2's scanner already counts it as a family — a summary carrying a
// classifiable verdict AND its `-raw` transcript, which is the attribution. No second counter,
// no review matrix, no receipt field.
const FLOOR_NONE = 'no completed independent review round — land `review/<family>-v1.md` with '
  + 'its VERDICT line and the `<family>-v1-raw.*` transcript beside it';

// The second half, and it is `fast`'s alone. Standard's unresolved findings live in the ledger,
// which C4/R3 already drive to terminal states; fast keeps no ledger, so for fast the review
// itself is the only thing that can close. The LATEST round of each family decides — a round-1
// revise answered by a round-2 accept has converged. Standard's loop governance (the round-2
// control point) is untouched by this.
const floorUnresolved = (fams) =>
  `the independent review has not resolved (${fams.join('; ')}) — fast keeps no ledger, so the `
  + 'review itself is what must close before the change ships';

// facts + the flow-state's recorded decisions -> the loop's verdict.
// `stage` is the resolver's: 'archived' means a FROZEN snapshot. The stop and escalation rules
// exist to change what a producer does next, and a frozen change has no next — applying them
// there would refuse history for having been written before the rule existed. So on an archived
// bundle they report and stop blocking. Evidence integrity is a different claim: a bundle whose
// evidence does not add up is misreporting its own past, and that blocks at every stage.
// `mode` is the DECLARED mode: the fast floor follows the declaration, so a change that a risk
// signal upgraded to standard still owes the review its declaration promised.
// -> { families, escalation, problems, advisories, missingReview, status, detail }
function reviewLoop(facts, flowText, stage, mode) {
  // A symlinked summary aborts the scan (readReviewDir), so `facts` carries nothing to reason
  // about. Gate has always answered `n/a` here and pointed at C5; saying it once means `status`
  // and archive readiness cannot invent a different answer from the same empty facts.
  if (facts.symlink) {
    return { families: [], escalation: null, problems: [], advisories: [], reviewFloor: null,
      status: 'n/a', detail: `review evidence is unreadable — '${facts.symlink}' is a symlink` };
  }
  const frozen = stage === 'archived';
  const decisions = reframeDecisions(flowText);
  const problems = facts.problems.map((p) => p.detail);
  const advisories = facts.advisories.map((a) => a.detail);
  const families = [], escalation = [], notes = [];

  // `wouldStop` is the rule's opinion; `stopped` is whether it is IN FORCE. On a frozen bundle
  // the two diverge: the history still reads "this loop stalled", but there is no next round
  // for a stop to govern — and a structured `stopped: true` beside a detail line saying the
  // rule does not apply retroactively is the same claim told two contradictory ways.
  let wouldStopAny = false;
  for (const f of facts.families) {
    const d = decisions.get(`${f.family}#${f.round}`) || null;
    let wouldStop = false, reframe = null;
    if (f.round >= ESCALATE_AT) {
      // Reaching the stop-loss escalates whatever the verdict says: spending the whole budget
      // is itself the thing a human has to hear about. An owner decision lets the work go on;
      // it can never take this line out of the report.
      const ack = !!d;
      reframe = d; wouldStop = !ack;
      escalation.push({ family: f.family, round: f.round, verdict: f.verdict,
        acknowledged: ack, decision: ack ? d.decision : null });
      notes.push(ack
        ? `ESCALATION ${f.family} round ${f.round} (verdict ${f.verdict}) — owner decision on record: ${d.decision}`
        : `ESCALATION ${f.family} round ${f.round} (verdict ${f.verdict}) — a human decides; record in gates: \`${reframeLine(f.family, f.round, ESCALATION_EXITS)}\``);
    } else if (f.round >= STOP_AFTER && f.verdict === 'revise') {
      const ok = !!d && REFRAME_EXITS.includes(d.decision);
      reframe = ok ? d : null; wouldStop = !ok;
      if (!ok) notes.push(`${f.family} round ${f.round}, verdict revise — this review loop stops here; record in gates: \`${reframeLine(f.family, f.round, REFRAME_EXITS)}\``);
    }
    if (wouldStop) wouldStopAny = true;
    families.push({ family: f.family, round: f.round, verdict: f.verdict,
      issuesOpen: f.issuesOpen, stopped: wouldStop && !frozen, reframe });
  }

  // Only PROBLEMS, stopped families and an unmet fast floor block — and the last two only
  // while the change is still in flight. Advisories are reported and stay out of the way:
  // refusing an archive over a duplicated paragraph is what "format pedantry" means.
  const controlStops = families.some((f) => f.stopped);
  // The floor, in its two halves — both in force only while the change is still in flight.
  //
  // One family is exempt from the unresolved half: a round-5 escalation the owner ANSWERED with
  // `accept-risk`. That is the blueprint's single Owner exit (§6), it already costs a double
  // authorization — the `gates:` decision AND an explicit `--force` — and a round-5 revise is
  // precisely the state it exists for. Letting the floor outrank it would leave `fast` without
  // the one way out `standard` keeps. The family drops back to the escalation branch below,
  // which reports it either way and only merges when both halves are present. Nothing else is
  // exempt: no decision, a decision that is not `accept-risk`, or any round below 5 all stay.
  const ownerAcceptedRisk = (f) =>
    f.round >= ESCALATE_AT && f.reframe && f.reframe.decision === 'accept-risk';
  const unresolved = mode === 'fast'
    ? families.filter((f) => !ownerAcceptedRisk(f)
      && (f.verdict === 'revise' || (f.issuesOpen !== null && f.issuesOpen > 0)))
    : [];
  let reviewFloor = null;
  if (!frozen) {
    if (!families.length) reviewFloor = FLOOR_NONE;
    else if (unresolved.length) reviewFloor = floorUnresolved(unresolved.map((f) =>
      `${f.family} round ${f.round}${f.issuesOpen !== null ? `, ${f.issuesOpen} open` : ', revise'}`));
  }
  const blocked = problems.length > 0 || controlStops || !!reviewFloor;
  const summary = families.map((f) =>
    `${f.family} round ${f.round} (${f.verdict}${f.issuesOpen !== null ? `, ${f.issuesOpen} open` : ''})`).join('; ');
  // the history stays in the report either way — a frozen change that burned five rounds still
  // says so; the line only stops being a refusal
  const frozenNote = frozen && (wouldStopAny || escalation.length)
    ? 'archived: the stop and escalation rules do not apply retroactively to a frozen change'
    : null;
  const detail = [summary, reviewFloor, ...notes, ...problems, ...advisories.map((a) => `advisory: ${a}`), frozenNote]
    .filter(Boolean).join('; ');
  return {
    families,
    escalation: escalation.length ? escalation : null,
    problems, advisories, reviewFloor,
    status: blocked ? 'blocked' : ((frozen || !families.length) ? 'n/a' : 'pass'),
    detail: detail || 'no completed review round yet',
  };
}

module.exports = {
  // phase 1
  VERDICT_PHRASES, COUNT_ENTRY, ACCEPT_FORMS, REVISE_FORMS,
  verdictKey, stripTrailers, classifyVerdict, isKnownVerdict, classifyDocs,
  // phase 2
  familyOf, isRoundName, readReviewDir, validateEvidence, reviewFacts,
  // phase 3
  reframeDecisions, reframeLine, reviewLoop,
  STOP_AFTER, ESCALATE_AT, REFRAME_EXITS, ESCALATION_EXITS, FLOOR_NONE, floorUnresolved,
};
