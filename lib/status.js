'use strict';
/*
 * apriori status — answer "where am I / what's left" for a change.
 * Reads the flow-state file (and the review evidence through lib/review); zero deps, pure Node stdlib.
 * 6.2: the issue ledger is never opened — `openLedger` survives in the JSON shape as an empty list.
 */
const fs = require('fs');
const path = require('path');
const { withStrict } = require('./args');
const { resolveChange, fileReadDefect, validateChangeName } = require('./resolve');

// The state's SECTIONS. 6.0 folded the gap report, the progress list and the open items into
// the one state file, and each is a short `##` section of `- ` items — nothing nested, nothing
// tabular. One reader, so the Reality Check, the open items and the next actions can never be
// parsed three slightly different ways.
// -> [string] — each item's text, continuation lines joined, `- ` stripped.
function sectionItems(text, title) {
  // The heading may carry a trailing `# …` annotation — that is the form the RUNBOOK's own
  // state template prints (`## Open              # substantive unresolved items …`)
  // and the form `apriori new` scaffolds. Matching only the bare heading meant a state written
  // exactly as documented had its Open items and its Reality Check read as an ABSENT section:
  // the claims did not block, did not print, and did not exist. Silence, from a section the
  // producer filled in. HORIZONTAL whitespace only between the title and the annotation: `\s*`
  // crossed newlines, so an EMPTY section followed directly by the next heading swallowed that
  // heading as its annotation and read the next section's items as its own.
  const re = new RegExp('^##+[ \\t]+' + title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[ \\t]*(?:#.*)?$', 'im');
  const m = re.exec(text);
  if (!m) return [];
  const rest = text.slice(m.index + m[0].length);
  const end = rest.search(/^(?:#|[A-Za-z][\w-]*:)/m);
  const body = end < 0 ? rest : rest.slice(0, end);
  const out = [];
  for (const line of body.split('\n')) {
    if (/^\s*[-*]\s/.test(line)) out.push(line.trim().replace(/^[-*]\s+/, ''));
    else if (out.length && line.trim()) out[out.length - 1] += ' ' + line.trim();
  }
  return out;
}

// The Reality Check (blueprint §4.1) — the three kinds a Ground fact can be, and nothing else.
// It replaced gap-report.md: an `assumption` still standing at Build time is the thing the whole
// mechanism exists to make visible.
const FACT_KINDS = ['observed', 'decision', 'assumption'];
function realityCheck(text) {
  const out = { observed: [], decision: [], assumption: [], malformed: [] };
  for (const item of sectionItems(text, 'Reality Check')) {
    const m = /^([a-z]+)\s*:\s*(.*)$/i.exec(item);
    const kind = m && m[1].toLowerCase();
    if (!m || !FACT_KINDS.includes(kind)) { out.malformed.push(item); continue; }
    out[kind].push(m[2].trim());
  }
  return out;
}

const MAX_NEXT = 3;                 // blueprint §8: the state carries at most three next steps

// parse `key: value` lines from a flow-state file → object; plus the last gate line
function parseFlowState(text) {
  const out = {};
  for (const key of ['change', 'mode', 'phase', 'lineage', 'delivery', 'escalation']) {
    // horizontal whitespace only: `\s*` matched the NEWLINE, so an empty `mode:` took the
    // whole next line as its value and a blank field read as a filled one (MD-09).
    const m = text.match(new RegExp('^' + key + ':[^\\S\\r\\n]*(.+)$', 'm'));
    if (m) out[key] = m[1].replace(/\s*#.*$/, '').trim();
  }
  const gates = [...text.matchAll(/^\s*-\s*(\d{4}-\d{2}-\d{2}\S*\s+.+)$/gm)].map((m) => m[1].trim());
  out.lastGate = gates.length ? gates[gates.length - 1] : null;
  out.next = sectionItems(text, 'Next');
  out.openIssues = sectionItems(text, 'Open');
  out.reality = realityCheck(text);
  return out;
}

function activeChanges(root) {
  const dir = path.join(root, 'apriori', 'changes');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'archive')
    .map((e) => e.name).sort();
}

// dir defaults to the active path (unit-level compat); cli passes the resolved bundle
function changeStatus(root, change, dir, stage) {
  const bundle = dir || path.join(root, 'apriori', 'changes', change);
  const fsPath = path.join(bundle, 'flow-state.md');
  const flowSafe = fileReadDefect(bundle, fsPath) === null;
  const state = flowSafe ? parseFlowState(fs.readFileSync(fsPath, 'utf8')) : null;
  // residue of the lane retired in 6.0 — status still SEES it so a leftover bundle is
  // diagnosed instead of read as a change with a missing flow-state.
  const hotfix = fs.existsSync(path.join(bundle, 'hotfix-state.md'));
  // readiness and review are required lazily: readiness reads THIS module back for
  // parseFlowState, so a top-level require would close the cycle
  const flowText = flowSafe ? fs.readFileSync(fsPath, 'utf8') : null;
  const legacy = flowSafe ? require('./readiness').legacyIdentity(flowText) : [];
  // Rounds are DERIVED per review family, never read off a `round:` line — status only
  // reports what review.js computed. A leftover lane bundle has no flow-state and so no
  // review loop to report. And status crosses the SAME trust boundary gate does first: a symlinked,
  // escaping or non-directory review/ is named, never read through — an escalation
  // manufactured from a path outside the bundle would be worse than no escalation at all.
  const st = stage || 'in-flight';
  let loop = null, reviewDefect = null;
  if (flowSafe) {
    reviewDefect = require('./readiness').reviewDirDefect(bundle);
    if (!reviewDefect) {
      const rv = require('./review');
      // the STAGE goes in: `gate` stops applying the stop/escalation rules to a frozen bundle,
      // and status reporting a frozen loop as "stopped" is the same claim told two ways
      try { loop = rv.reviewLoop(rv.reviewFacts(bundle), flowText, st); }
      catch (e) { reviewDefect = `review evidence unreadable (${e.code || e.message})`; }
      // a symlinked summary aborted the scan — say so, rather than reporting the empty facts
      // it left behind as "this change never had a review"
      if (loop && loop.status === 'n/a' && /is a symlink/.test(loop.detail)) {
        reviewDefect = loop.detail; loop = null;
      }
    }
  }
  // the §6 signals the scan proved about this delta — information, shared with gate and archive.
  // Frozen history is not re-scanned, exactly as at C9.
  const signals = flowSafe && st !== 'archived' ? require('./risk').scanDeltas(bundle) : [];
  // the ONE substantive state predicate, read from the same state — status reports what gate C9
  // and archive R5 refuse on, so nobody has to run a gate to learn a delivery is stuck. The SAME
  // input goes in that gate and archive pass. Passing nothing made status quietly the most
  // permissive of the three surfaces — it would report a clean state on a bundle the gate was
  // refusing. …and the STAGE, for the same reason gate's C9 takes it: an archived bundle is
  // frozen history. Reporting its findings as live refusals told a human to go and edit a
  // finished record — the one thing §8 forbids — and made `--escalation` exit 3 on work that
  // shipped months ago. Archived findings are RECORDED (nothing is hidden), never blocking.
  const found = flowSafe ? require('./readiness').evidenceFindings(flowText, { riskSignals: signals }) : null;
  const archived = st === 'archived';
  // `evidence` carries only the LEGACY-row information (6.2): the rows, and the blockers they raise
  const evidence = !found ? { rows: [], blockers: [], recorded: [] }
    : { rows: found.legacy.rows, blockers: archived ? [] : found.legacy.blockers, recorded: archived ? found.legacy.blockers : [] };
  return { change, state, hasFlowState: !!state, hotfix, legacy, loop, reviewDefect, signals,
    items: found ? found.items : [], notes: found ? found.notes : [],
    blockers: found && !archived ? found.blockers : [], recorded: found && archived ? found.blockers : [],
    evidence, stage: st, path: path.relative(root, bundle) };
}

// cli --change guards: name validation + resolver + structured file-level defects (kinds,
// never message prefixes). The review ROOT is guarded with the same rule gate uses — a
// symlinked, escaping or non-directory review/ is named, never read through — while nothing
// under it is opened for a ledger (6.2 reads none).
function guardedResolve(root, change) {
  const v = validateChangeName(change);
  if (!v.ok) {
    const why = { 'invalid-shape': 'bare kebab-case only', 'date-prefixed': 'date-prefixed — in-flight names are bare; dates are stamped at archive time', reserved: `'${change}' is reserved` }[v.kind];
    return { error: `invalid change name '${change}' — ${why}` };
  }
  const loc = resolveChange(root, change);
  if (loc.error) return { error: loc.error };
  const flowDefect = fileReadDefect(loc.dir, path.join(loc.dir, 'flow-state.md'));
  // a leftover lane bundle still resolves — formatOne diagnoses it. Residue sitting beside a
  // readable flow-state is just residue: the change is gated and reported as the change it is.
  const leftoverLane = fs.existsSync(path.join(loc.dir, 'hotfix-state.md'));
  if (leftoverLane && flowDefect && flowDefect.kind === 'missing') return loc;
  if (flowDefect) return { error: `flow-state.md unreadable for '${change}' — ${flowDefect.kind}: ${flowDefect.path}` };
  const reviewDefect = require('./readiness').reviewDirDefect(loc.dir);
  if (reviewDefect) return { error: `review/ unsafe for '${change}' — ${reviewDefect}` };
  // identity: the parsed flow-state must speak the queried name (P2-1)
  const state = parseFlowState(fs.readFileSync(path.join(loc.dir, 'flow-state.md'), 'utf8'));
  if (state.change && state.change !== change) return { error: `identity mismatch for '${change}' — the resolved flow-state declares change: ${state.change}` };
  return loc;
}

function formatOne(s) {
  const lines = [];
  if (s.hotfix && !s.state) {
    // same stage rule as gate: an archived record is frozen history and is never handed a
    // write-back instruction; only an in-flight leftover has anything left to migrate.
    if (s.stage === 'archived') {
      lines.push(`change:       ${s.change}   (archived hotfix-lane record)`);
      lines.push('note:         frozen history from the lane retired in 6.0 — read-only, nothing to migrate');
      return lines.join('\n');
    }
    lines.push(`change:       ${s.change}   (leftover hotfix-state.md, no flow-state)`);
    lines.push('migration:    the hotfix lane was removed in 6.0 — convert this to a change');
    lines.push(`              (\`apriori new ${s.change}\`) or finish it with apriori-cli 5.x`);
    return lines.join('\n');
  }
  if (!s.state) { lines.push(`change: ${s.change} (no flow-state file found)`); }
  else {
    lines.push(`change:       ${s.state.change || s.change}` + (s.stage === 'archived' ? '   (archived)' : ''));
    // `mode:` is optional and inert (6.2): echoed when present, nothing derived from it
    lines.push(`phase:        ${s.state.phase || '?'}` + (s.state.mode ? `   (mode ${s.state.mode})` : ''));
    for (const r of s.signals) lines.push(`risk:         ${r.signal}: ${r.detail}`);
    if (s.legacy && s.legacy.length)
      lines.push(`migration:    5.x identity key(s) still present: ${s.legacy.join(', ')} — see MIGRATING.md`);
    // an `assumption` is the one Reality Check kind that owes something — a fact nobody has
    // proven yet — so it is named line by line while the other two are only counted
    const rc = s.state.reality || { observed: [], decision: [], assumption: [], malformed: [] };
    if (rc.observed.length || rc.decision.length || rc.assumption.length)
      lines.push(`reality:      ${rc.observed.length} observed, ${rc.decision.length} decision, ${rc.assumption.length} assumption`);
    for (const a of rc.assumption) lines.push(`assumption:   ${a}`);
    for (const m of rc.malformed) lines.push(`reality:      unreadable entry (want observed/decision/assumption): ${m}`);
    // every open item, with the one word that matters: accepted (still present) or pending
    for (const i of s.items)
      lines.push(`open:         [${i.accepted ? 'accepted' : 'pending'}] ${i.id ? `${i.id}: ` : ''}${i.text}`);
    const next = s.state.next || [];
    next.slice(0, MAX_NEXT).forEach((n, i) => lines.push(`next ${i + 1}:       ${n}`));
    if (next.length > MAX_NEXT) lines.push(`next:         ${next.length} actions listed — the state carries at most ${MAX_NEXT}`);
    if (s.state.lastGate) lines.push(`last decision: ${s.state.lastGate}`);
  }
  for (const r of s.evidence.rows) lines.push(`evidence:     ${r.name}: ${r.status}${r.detail ? ` — ${r.detail}` : ''}   (legacy ## Evidence, ignored)`);
  for (const n of s.notes) lines.push(`note:         ${n}`);
  // what gate C9 / archive R5 refuse on, from the same predicate — or, on a frozen bundle,
  // what they would have said: recorded, never a live refusal
  for (const b of s.blockers) lines.push(`BLOCKED:      ${b}`);
  for (const b of s.recorded) lines.push(`recorded:     not re-judged (archived) — ${b}`);
  if (s.reviewDefect) lines.push(`review:       UNREADABLE — ${s.reviewDefect}`);
  else if (s.loop) {
    if (!s.loop.families.length) lines.push('review:       no completed round yet');
    for (const f of s.loop.families)
      lines.push(`review:       ${f.family} round ${f.round}, verdict ${f.verdict}`
        + (f.issuesOpen !== null ? ` (${f.issuesOpen} open)` : '')
        + (f.stopped && !f.escalating ? '   (loop stopped)' : ''));
    if (s.loop.reviewFloor) lines.push(`review:       ${s.loop.reviewFloor}`);
    for (const p of s.loop.problems) lines.push(`review problem: ${p}`);
    for (const a of s.loop.advisories) lines.push(`review advisory: ${a}`);
    // the escalation lines are not suppressible — a recorded owner decision changes their
    // wording, never their presence (decision card: pre-authorization may not skip the report)
    for (const e of (s.loop.escalation || []))
      lines.push(`ESCALATION:   ${e.family} round ${e.round} (${e.reason})`
        + (e.acknowledged ? ` — owner decision on record: ${e.decision}` : ' — a human decides'));
  }
  // the state's OWN escalation line: a reviewer's ESCALATE, or anything else the producer must
  // hand to a human, is written here and read back here — one state, one hard stop.
  if (s.state && s.state.escalation && !/^(none|n\/a)$/i.test(s.state.escalation))
    lines.push(`ESCALATION:   ${s.state.escalation}   (declared in flow-state)`);
  return lines.join('\n');
}

// Every reason this change is waiting on a human, from the one state. `status --escalation`
// prints these and exits 3 — the minimal hard-stop signal a Stop hook or a CI step can read
// without this repo shipping a supervision system of its own.
function escalations(s) {
  const out = [];
  if (s.state && s.state.escalation && !/^(none|n\/a)$/i.test(s.state.escalation))
    out.push(`flow-state: ${s.state.escalation}`);
  for (const e of ((s.loop && s.loop.escalation) || []))
    out.push(`${e.family} round ${e.round} (${e.reason})`
      + (e.acknowledged ? ` — owner decision on record: ${e.decision}` : ' — a human decides'));
  for (const b of s.blockers) out.push(b);
  return out;
}

// machine-consumable shape for one change
function toJson(s) {
  return {
    change: s.change,
    phase: s.state ? s.state.phase || null : null,
    mode: s.state ? s.state.mode || null : null,
    // 6.2: `mode` is optional and inert, so `effectiveMode` equals it — kept for shape compatibility
    effectiveMode: s.state ? s.state.mode || null : null,
    risk: s.signals,
    legacyIdentity: s.legacy && s.legacy.length ? s.legacy : null,
    lineage: s.state ? s.state.lineage || null : null,
    // the state's own short content: the Reality Check that replaced gap-report.md, the open
    // substantive issues, and at most three next actions
    reality: s.state ? s.state.reality : null,
    openIssues: s.state ? s.state.openIssues || [] : [],      // the raw lines (compat)
    // the same lines, parsed: id (null when the line carries none), text, and the acceptance
    openItems: s.items.map((i) => ({ id: i.id, text: i.text, accepted: i.accepted, acceptedAt: i.acceptedAt })),
    next: s.state ? s.state.next || [] : [],
    delivery: s.state ? s.state.delivery || null : null,
    // legacy `## Evidence` rows only (6.2): the rows, the migration blockers they raise in flight,
    // and the same recorded on an archived bundle — `{rows:[], blocked:[], recorded:[]}` when none
    evidence: { rows: s.evidence.rows, blocked: s.evidence.blockers, recorded: s.evidence.recorded },
    lastGate: s.state ? s.state.lastGate : null,
    hasFlowState: s.hasFlowState,
    hotfix: !!s.hotfix,
    openLedger: [],                       // 6.2: the ledger is never read; the key stays for shape compatibility
    // per family; there is deliberately no global `round` — see lib/review.js
    review: (s.loop || s.reviewDefect)
      ? { families: s.loop ? s.loop.families.map((f) => ({ family: f.family, round: f.round, verdict: f.verdict, issuesOpen: f.issuesOpen, stopped: f.stopped, escalating: f.escalating })) : [],
          problems: s.loop ? s.loop.problems : [],
          advisories: s.loop ? s.loop.advisories : [],
          reviewFloor: s.loop ? s.loop.reviewFloor : null,
          defect: s.reviewDefect || null }
      : null,
    escalation: s.loop && s.loop.escalation ? s.loop.escalation : null,
    // every reason a human is being waited on, in one list — the field a Stop hook reads
    escalations: escalations(s),
    stage: s.stage,
    path: s.path,
  };
}

const USAGE = 'usage: apriori status [--change <name>] [--json] [--escalation]';

function cli(argv) {
  return withStrict(argv, { sub: 'status', usage: USAGE, positionals: 0,
    flags: { '--change': 'value', '--json': 'flag', '--escalation': 'flag' } }, (f) => {
    const root = process.cwd();
    const change = f['--change'] || null, json = !!f['--json'], esc = !!f['--escalation'];
    if (esc && !change) { console.error('status: --escalation needs --change <name>'); return 2; }
    if (change) {
      const loc = guardedResolve(root, change);
      if (loc.error) { console.error(`status: ${loc.error}`); return 2; }
      const s = changeStatus(root, change, loc.dir, loc.stage);
      if (esc) {
        // the hard stop, and nothing else: exit 3 means a human owes this change a decision
        const list = escalations(s);
        if (json) console.log(JSON.stringify({ change, escalations: list }, null, 2));
        else if (!list.length) console.log('ESCALATION: none');
        else for (const e of list) console.log(`ESCALATION: ${e}`);
        return list.length ? 3 : 0;
      }
      console.log(json ? JSON.stringify(toJson(s), null, 2) : formatOne(s));
      return 0;
    }
    const changes = activeChanges(root);
    if (json) {
      console.log(JSON.stringify({ changes: changes.map((c) => toJson(changeStatus(root, c))) }, null, 2));
      return 0;
    }
    if (!changes.length) { console.log('No active changes under apriori/changes/.'); return 0; }
    console.log(`Active changes (${changes.length}):\n`);
    for (const c of changes) {
      const s = changeStatus(root, c);
      const phase = s.hotfix && !s.state ? 'leftover lane bundle — migrate' : s.state ? s.state.phase || '?' : 'no flow-state';
      console.log(`  ${c}  —  ${phase}, ${s.items.length} open`);
    }
    console.log('\nRun `apriori status --change <name>` for detail.');
    return 0;
  });
}

module.exports = { parseFlowState, sectionItems, realityCheck, FACT_KINDS, MAX_NEXT,
  activeChanges, changeStatus, formatOne, escalations, toJson, cli };
