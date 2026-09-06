'use strict';
/*
 * apriori gate — aggregate the MECHANICAL exit conditions for one change into one exit code.
 * 0 = PASS · 1 = BLOCKED · 2 = the evaluation itself is untrustworthy.
 * Strictly read-only. PASS covers machine checks only — human gates remain human.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { parseFlowState } = require('./flow');
const sr = require('./spec-runner');
const { verify, configTestCmd } = sr;
const { containsFuturePath } = require('./archive-merge');
const { resolveChange, configCas, configCasProblem } = require('./resolve');
const { resolveIdPattern } = require('./config');
const { withStrict } = require('./args');
// the flow-state / open-item predicates live in ONE place; gate consumes them
const rd = require('./readiness');
const rv = require('./review');
const rk = require('./risk');
const { checkFlowState, checkEvidenceStatus, reviewDirDefect } = rd;
const CAVEAT = 'mechanical checks only; human gates remain human';

function err(res, msg) { res.errors.push(msg); res.result = 'ERROR'; res.code = 2; return res; }


// --- individual checks; each returns {id, status: 'pass'|'blocked'|'n/a', detail} ---
// C3 and C9 live in lib/readiness.js (imported above) so that `archive`'s readiness
// precondition and this gate can never judge a bundle differently.

// C2 and C4 are PLACEHOLDERS since 6.2. C2 read a 5.x task list as a diagnostic; C4 read the
// issue ledger. Both files lost their consumer — a change's unresolved items live in the
// state's `## Open` section (C9) — so neither check reads anything. The ids stay in `checks[]`
// so a `--json` consumer that indexes by id keeps working; the detail says why they are inert.
const C2_RETIRED = { id: 'C2', status: 'n/a', detail: 'retired in 6.2 — nothing is read' };
const C4_RETIRED = { id: 'C4', status: 'n/a', detail: 'ledger retired in 6.2 — open items live in ## Open' };

// C5: every verdict line has its raw archive beside it — the mechanical backstop against a
// simulated review. The DIRECTORY SCAN is lib/review.js's (one reader of review/, so C5, C8
// and status can never disagree about what is in there); the decision below is unchanged.
// An unusable review ROOT (symlink / escape / not a directory) is refused here, never read through.
function checkEvidence(facts) {
  if (facts.symlink) return { id: 'C5', status: 'blocked', detail: `evidence doc is a symlink: ${facts.symlink}` };
  if (facts.missingRaw.length)
    return { id: 'C5', status: 'blocked', detail: `verdict doc(s) without a raw archive or self-contained provenance: ${facts.missingRaw.map((s) => rv.rawLabel(facts, s)).join(', ')}` };
  // The empty set was passing VACUOUSLY — "every verdict has raw evidence" over zero verdicts
  // is true and attests nothing, and it read as a green tick on a change nobody reviewed.
  // Whether that absence is legal is the LOOP's question (C8, per mode), not this one's.
  if (!facts.verdictDocs)
    return { id: 'C5', status: 'n/a', detail: 'no review document carries a verdict — nothing to attest' };
  return { id: 'C5', status: 'pass', detail: `${facts.verdictDocs} review doc(s), every verdict has raw evidence` };
}

// C8: every review family's loop converges, or it stops. Rounds are DERIVED per family
// (review.js) — 6.0 keeps no hand-written `round:`, and it never sums families into one
// counter. The two control points are the decision card's, applied to each family on its own:
// still revising after ITS round 2, and reaching ITS round 5. The STAGE decides whether those
// two are refusals: an archived bundle is frozen history, so they report there instead of
// blocking, while evidence-integrity problems block at either stage. An unreadable review/
// draws no conclusion here: C5 already blocks on it.
function checkReviewLoop(facts, flowText, stage) {
  if (facts.symlink) return { id: 'C8', status: 'n/a', detail: 'review evidence is unreadable — see C5' };
  const l = rv.reviewLoop(facts, flowText, stage);
  return { id: 'C8', status: l.status, detail: l.detail };
}

function checkKb(cwd, dir) {
  const specsDir = path.join(dir, 'specs');
  const modules = new Set();
  const walk = (d, base) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p, base);
      else if (e.name.endsWith('.md')) modules.add(path.relative(base, p).split(path.sep)[0]);
    }
  };
  walk(specsDir, specsDir);
  if (!modules.size) return { id: 'C6', status: 'n/a', detail: 'no delta specs to map' };

  // build the module → truth index (c6-truth-binding): a truth doc binds by its
  // declared store-module (default = basename), never by a filename assumption
  const truthDir = path.join(cwd, 'apriori', 'truth');
  const index = new Map();                 // module → { text, sourceFiles, basename }
  const conflicts = new Map();             // module → "declared by A and B"
  if (fs.existsSync(truthDir)) {
    for (const e of fs.readdirSync(truthDir).sort()) {
      if (!e.endsWith('.md')) continue;
      const text = fs.readFileSync(path.join(truthDir, e), 'utf8');
      const h2 = text.search(/^##\s/m);
      const header = h2 >= 0 ? text.slice(0, h2) : text;
      const smM = header.match(/^store-module:\s*(.+)$/m);
      const sfM = header.match(/^source-files:\s*(.+)$/m);
      const mods = smM ? smM[1].trim().split(/\s+/) : [e.replace(/\.md$/, '')];
      const sourceFiles = sfM ? sfM[1].trim().split(/\s+/) : null;   // null = default lib/<module>.js
      for (const m of mods) {
        if (index.has(m)) conflicts.set(m, `${m}: declared by both ${index.get(m).basename} and ${e}`);
        else index.set(m, { text, sourceFiles, basename: e });
      }
    }
  }
  const stripFencesKb = (t) => t.replace(/```[\s\S]*?```/g, '');
  const blocked = [], notes = [];
  let checked = 0;
  for (const m of [...modules].sort()) {
    if (conflicts.has(m)) { blocked.push(conflicts.get(m)); continue; }
    const entry = index.get(m);
    if (!entry) { notes.push(`${m}: no truth doc`); continue; }
    const noFence = stripFencesKb(entry.text);
    const sc = noFence.match(/^source-commit:\s+(\S+)/m);
    if (!sc) {
      const attempt = noFence.split('\n').some((l) => l.includes('source-commit:') && !/^source-commit:\s+\S+/.test(l));
      notes.push(attempt
        ? `${m}: source-commit is not in the canonical fence-outside line-start form 'source-commit: <ref>'`
        : `${m}: truth doc has no source-commit`);
      continue;
    }
    const ref = sc[1];
    const explicit = entry.sourceFiles !== null;
    const declared = explicit ? entry.sourceFiles : [`lib/${m}.js`];
    // an explicit declaration is a complete promise: every token must be verifiable
    const usable = [];
    let tokenBad = null;
    for (const rel of declared) {
      // an explicit token is a repo-relative promise: reject absolute/backslash/empty/. or .. segments
      if (explicit && (rel === '' || path.isAbsolute(rel) || rel.includes('\\') ||
          rel.split('/').some((seg) => seg === '' || seg === '.' || seg === '..'))) {
        tokenBad = `${m}: malformed source-files token (must be a normalized repo-relative path): ${rel}`; break;
      }
      const abs = path.join(cwd, rel);
      let st = null; try { st = fs.lstatSync(abs); } catch { /* absent */ }
      if (!st) { if (explicit) { tokenBad = `${m}: declared source-files token missing: ${rel}`; break; } continue; }
      if (st.isSymbolicLink()) { if (explicit) { tokenBad = `${m}: declared source-files token is a symlink: ${rel}`; break; } continue; }
      if (!containsFuturePath(cwd, abs)) { if (explicit) { tokenBad = `${m}: declared source-files token escapes the repo: ${rel}`; break; } continue; }
      if (!st.isFile() && !st.isDirectory()) { if (explicit) { tokenBad = `${m}: declared source-files token is neither file nor directory: ${rel}`; break; } continue; }
      usable.push(rel);
    }
    if (tokenBad) { blocked.push(tokenBad); continue; }
    if (!usable.length) { notes.push(`${m}: no ${declared.join(' / ')} to compare`); continue; }
    const g = spawnSync('git', ['-C', cwd, 'log', '--oneline', `${ref}..HEAD`, '--', ...usable], { encoding: 'utf8' });
    if (g.error) { notes.push(`${m}: git unavailable (${g.error.message})`); continue; }
    if (g.status !== 0) { notes.push(`${m}: git failed (${(g.stderr || '').split('\n')[0]})`); continue; }
    const n = g.stdout.trim() ? g.stdout.trim().split('\n').length : 0;
    if (n > 0) blocked.push(`${m}: ${n} commit(s) since ${ref}`);
    else checked++;
  }
  if (blocked.length) return { id: 'C6', status: 'blocked', detail: blocked.join('; ') };
  if (checked > 0) return { id: 'C6', status: 'pass', detail: `${checked} module stamp(s) up to date${notes.length ? `; ${notes.join('; ')}` : ''}` };
  return { id: 'C6', status: 'n/a', detail: notes.join('; ') };
}

// Scenario-to-TAP binding completeness (UNBOUND / a non-failing ORPHAN / UNIDENTIFIED) is
// advisory by default, never a block: a native focused test command that succeeds and leaves
// real TAP evidence must not force a producer to write a TAP merger, scenario-ID promoter, or
// output-conversion script just to satisfy this check. `verify()`'s own `v.passes` is the ONE
// place this fact-only rule lives (spec-runner.js) — gate consumes it rather than re-deriving
// it, so `apriori verify` and `apriori gate` can never disagree about what "real evidence"
// means. What still blocks, fail-closed: a bound scenario's own test failed (boundRed), a real
// `not ok` nobody could attribute to a scenario (unattributed), a failing test bound to an ID
// no scenario declares (failing orphan, already folded into `v.orphan` for a --change run), a
// cross-boundary duplicate ID (ambiguous binding, a spec defect — not a TAP-format chore), or
// the total absence of REAL execution evidence (`run.executedPoints === 0` — every TAP point
// parsed was SKIP/TODO, or none at all: a directive marks a point never run, so it is parsed
// structure, not evidence, and an all-SKIP/all-TODO run must not pass on parsing alone).
// `run.errors` (infra: crash, non-TAP output, bailout, …) already fails closed upstream of all
// of this.
function checkBinding(cwd, name, stage, testCmd, idPattern) {
  const run = stage === 'in-flight'
    ? verify({ change: name, cwd, testCmd, idPattern })
    : verify({ specs: [path.join(cwd, 'apriori', 'specs')], cwd, testCmd, idPattern });
  if (run.errors.length) return { infra: run.errors };
  const v = run.verdict;
  const strictClean = v.clean && run.duplicates.length === 0;
  // a change whose scope is genuinely empty (removal-only / all-prose delta) owes no execution
  // evidence — `vacuousNote` is the one place that fact already lives (spec-runner's applyChangeScope)
  const hasEvidence = !!run.vacuousNote || (run.executedPoints || 0) > 0;
  const passes = v.passes && run.duplicates.length === 0 && hasEvidence;
  // in-flight runs carry the informative store summary (change-scoped verdict, GT-26/27)
  const sr2 = run.storeReport;
  const suffix = sr2
    ? `; store: ${sr2.boundRed.length} red, ${sr2.unbound.length} unbound, ${sr2.orphan.length} orphan, ${sr2.unidentified.length} unidentified, ${sr2.unattributedFailures.count} unattributed, ${sr2.duplicates.length} duplicate(s) outstanding`
    : '';
  const label0 = sr2 ? `${stage}, change-scoped` : stage;
  const advisoryParts = [];
  for (const [label, arr] of [['unbound', v.unbound], ['unidentified', v.unidentified]])
    if (arr.length) advisoryParts.push(`${arr.length} ${label}`);
  const advisory = advisoryParts.length
    ? ` (advisory, non-blocking: ${advisoryParts.join(', ')} — scenario-ID binding is a suggestion, not required)` : '';
  if (passes) {
    const detail = strictClean ? `verify GREEN (${label0})${suffix}` : `tests pass (${label0})${suffix}${advisory}`;
    return { check: { id: 'C1', status: 'pass', detail }, projection: run.projection };
  }
  const failingOrphan = v.orphan.filter((id) => (run.results.get(id) || {}).fail > 0);
  const parts = [];
  for (const [label, arr] of [['red', v.boundRed], ['failing-orphan', failingOrphan], ['unattributed-failures', v.unattributed || []], ['duplicate-IDs', run.duplicates]])
    if (arr.length) parts.push(`${arr.length} ${label}`);
  if (!hasEvidence) parts.push('0 executed test points — no evidence of tests actually running (SKIP/TODO does not count)');
  return { check: { id: 'C1', status: 'blocked', detail: `verify GAPS: ${parts.join(', ')}${suffix}${advisory}` }, projection: run.projection };
}


// The same shape as checkBinding, for the path where no test command exists. C1 cannot run,
// but everything C1 was ALSO producing for its neighbours still can: C7 needs the projection,
// and a broken id-pattern is still a broken config. Nothing here spawns a process.
function checkBindingSkipped(cwd, name, stage, idPattern) {
  // a broken pattern is a broken CONFIG, not an absent one — it stays an evaluation error
  // (GT-24 keeps holding). Compile-checking is in-process; no scenario is ever MATCHED here,
  // so no matcher child is spawned and GT-25's runtime precondition cannot arise.
  const idp = resolveIdPattern(cwd, idPattern);
  if (idp.error) return { infra: [idp.error] };
  const detail = 'skipped — no test command (pass --test-cmd or add a test-cmd row to '
    + 'apriori/process-config.md); the binding check did not run';
  const c1 = { id: 'C1', status: 'skipped', detail };
  // archived: the deltas are already merged and C7 is n/a — building a projection could only
  // manufacture a false block, so it is never built at all.
  if (stage === 'archived') return { check: c1, projection: null };
  const b = sr.currentProjectionBuilder()(name, cwd);
  if (b.errors && b.errors.length) return { infra: b.errors };
  // fail closed: no trustworthy texts is untrustworthy even when nothing said why. Reporting
  // it with an empty errors list would be an ERROR that cannot explain itself.
  if (!b.texts) return { infra: ['projection produced no trustworthy texts and reported no error — refusing to judge'] };
  return { check: c1, projection: b.projection };
}

// The test command has three fates, and "broken" is not "absent". A flag that is present but
// empty (or all whitespace) is an operator error in THIS invocation and must never fall back
// to the config; an empty config VALUE, by contrast, was already normalised to "no such row"
// by the shared reader (config.js), so gate sees an absence and treats it as one.
function resolveTestCmd(opts, cwd) {
  const flag = opts.testCmd;
  if (flag !== undefined && flag !== null) {
    if (typeof flag !== 'string') return { kind: 'error', error: `--test-cmd must be a string (got ${Array.isArray(flag) ? 'array' : typeof flag})` };
    if (flag.trim() === '') return { kind: 'error', error: 'empty --test-cmd — pass a command or omit the flag' };
    return { kind: 'ok', value: flag };
  }
  const c = configTestCmd(cwd);
  if (c && c.error) return { kind: 'error', error: `verify: ${c.error}` };
  if (c) return { kind: 'ok', value: c };
  return { kind: 'absent' };
}

// C7: unstamped mutation deltas are denied by default — a waiver is always visible (GT-16).
// Archived stage: the deltas are already merged; there is nothing left to stamp-check.
function checkCas(projection, stage, noCas, cwd) {
  if (stage === 'archived') return { id: 'C7', status: 'n/a', detail: 'deltas already merged' };
  const um = (projection && projection.unstampedMutations) || [];
  if (!um.length) return { id: 'C7', status: 'pass', detail: 'every mutation delta is stamped' };  // nothing to consult — silent pass (GT-16)
  if (noCas) return { id: 'C7', status: 'pass', detail: 'waived (--no-cas)' };
  const problem = configCasProblem(cwd);                       // consumption-time only
  if (problem) return { id: 'C7', status: 'blocked', detail: `${problem} — a broken config never equals a waiver` };
  if (configCas(cwd) === 'optional') return { id: 'C7', status: 'pass', detail: 'waived (process-config cas: optional)' };
  return { id: 'C7', status: 'blocked',
    detail: `unstamped mutation delta(s): ${um.join(', ')} — run: apriori stamp <store-file> (or waive with --no-cas / a process-config cas: optional row)` };
}

// The whole evaluation. → { code, stage, checks, result, blocked, errors }
function runGate(opts) {
  const cwd = opts.cwd || process.cwd();
  const res = { code: 0, stage: null, checks: [], result: 'PASS', blocked: 0, errors: [], change: opts.change || null };
  if (!opts.change) return err(res, USAGE);   // the ONE usage constant — every path lists the same flags
  const nameCheck = require('./resolve').validateChangeName(opts.change);
  if (!nameCheck.ok) return err(res, `invalid change name '${opts.change}' (${nameCheck.kind}) — bare kebab-case, not date-prefixed, not a reserved name`);
  const loc = resolveChange(cwd, opts.change);
  if (loc.error) return err(res, loc.error);
  res.stage = loc.stage;
  const flowPath = path.join(loc.dir, 'flow-state.md');
  // A bundle the retired lane left behind has no flow-state, so it can be neither gated nor
  // read as a change. It is named rather than reported as a generic missing file — and rather
  // than passed, which is how a leftover would ship ungated. The advice is STAGE-AWARE: an
  // archived bundle is frozen history, so it is told it is frozen, never told to migrate —
  // a write-back instruction aimed at a finished record is an instruction to rewrite history.
  // WITH a flow-state it is simply a change: the stale file is residue, not a second identity.
  if (!fs.existsSync(flowPath) && fs.existsSync(path.join(loc.dir, 'hotfix-state.md')))
    return err(res, loc.stage === 'archived'
      ? `'${opts.change}' is an archived record of the hotfix lane retired in 6.0 — frozen history, read-only: the gate does not apply to it retroactively and there is nothing to migrate`
      : `'${opts.change}' carries hotfix-state.md and no flow-state.md — the hotfix lane was removed in 6.0; convert it to a change (\`apriori new ${opts.change}\`) or finish it with apriori-cli 5.x`);
  if (!fs.existsSync(flowPath)) return err(res, `no readable flow-state.md at ${flowPath} — the state checks are impossible`);
  // the SAME trust root archive's R1 uses (BD-06): a symlinked, escaping or non-regular
  // flow-state is a structural C3 refusal, never read through — gate and archive may not hold
  // two opinions about which bytes are this bundle's state
  const flowDefect = rd.artifactDefect(loc.dir, flowPath);
  let state = null, flowText = null;
  if (!flowDefect) {
    try { flowText = fs.readFileSync(flowPath, 'utf8'); state = parseFlowState(flowText); }
    catch (e) { return err(res, `flow-state unreadable: ${e.message}`); }
  }
  res.flowText = flowText;         // the review-ready face reads the same bytes the checks did
  const tc = resolveTestCmd(opts, cwd);
  if (tc.kind === 'error') return err(res, tc.error);

  const idPattern = opts.idPattern === undefined ? null : opts.idPattern;
  const b = tc.kind === 'absent'
    ? checkBindingSkipped(cwd, opts.change, loc.stage, idPattern)
    : checkBinding(cwd, opts.change, loc.stage, tc.value, idPattern);
  if (b.infra) { for (const e of b.infra) res.errors.push(`verify: ${e}`); res.result = 'ERROR'; res.code = 2; return res; }
  res.checks.push(b.check);
  res.projection = b.projection;          // already built for C7; the review-ready face reads it
  res.checks.push({ ...C2_RETIRED });
  // C3, plus the two 6.2 MIGRATIONS an active bundle may still owe — a hand-written `escalation:`
  // with content (refused inside checkFlowState) and a legacy ledger with open rows. Both are
  // structural: C3 refuses on them (first hit alone, like R1), and review-ready reads the list.
  let c3 = flowDefect
    ? { id: 'C3', status: 'blocked', detail: rd.defectDetail('flow-state.md', flowDefect) }
    : checkFlowState(state, opts.change, flowText, { stage: loc.stage });
  res.migration = flowDefect ? [`flow-state: ${c3.detail}`] : [];
  if (!flowDefect && loc.stage !== 'archived') {
    const em = rd.escalationMigration(state);
    if (em) res.migration.push(`flow-state: ${em}`);
    const lm = rd.legacyLedgerMigration(loc.dir);
    if (lm) res.migration.push(lm);
    if (c3.status === 'pass' && lm) c3 = { id: 'C3', status: 'blocked', detail: lm };
  }
  res.checks.push(c3);
  const rdDefect = reviewDirDefect(loc.dir);
  let loopCheck = { id: 'C8', status: 'n/a', detail: 'review evidence is unreadable — see C5' };
  res.checks.push({ ...C4_RETIRED });
  if (rdDefect) {
    res.checks.push({ id: 'C5', status: 'blocked', detail: rdDefect });
  } else {
    const facts = rv.reviewFacts(loc.dir);
    res.checks.push(checkEvidence(facts));
    // Nothing softens the floor: the reviewer's latest verdict is what must close, and neither
    // an issue ledger nor a `mode:` word can stand in for it. An unread flow-state (C3
    // structural) leaves the loop without its recorded decisions: no opinion, not a second block.
    loopCheck = flowDefect
      ? { id: 'C8', status: 'n/a', detail: 'flow-state not read — see C3' }
      : checkReviewLoop(facts, flowText, loc.stage);
  }

  res.checks.push(checkKb(cwd, loc.dir));
  res.checks.push(checkCas(b.projection, loc.stage, !!opts.noCas, cwd));
  res.checks.push(loopCheck);
  // C9 — the ONE substantive state predicate. It reads the open items, the §6 signals the CLI
  // actually proved about this delta, and the state's own claims. The scan is the one input it
  // cannot derive for itself; a frozen bundle's merged delta is never re-scanned.
  res.evidenceOpts = { stage: loc.stage, riskSignals: loc.stage === 'archived' ? [] : rk.scanDeltas(loc.dir) };
  res.checks.push(flowDefect
    ? { id: 'C9', status: 'n/a', detail: 'flow-state not read — see C3' }
    : checkEvidenceStatus(flowText, res.evidenceOpts));

  // ERROR(2) > BLOCKED(1) > INCOMPLETE(3) > PASS(0). The ERROR rung is served by the early
  // returns above, so only the lower three are decided here. `blocked` counts blocked only:
  // an unrun check is not a block, and must not inflate the number a human reads.
  res.blocked = res.checks.filter((c) => c.status === 'blocked').length;
  const skipped = res.checks.some((c) => c.status === 'skipped');
  res.result = res.blocked ? 'BLOCKED' : skipped ? 'INCOMPLETE' : 'PASS';
  res.code = res.blocked ? 1 : skipped ? 3 : 0;
  return res;
}

function toJson(res) {
  return { change: res.change, stage: res.stage, checks: res.checks, result: res.result, blocked: res.blocked, errors: res.errors };
}

// REVIEW-READY — blueprint §4.3, as a TRANSIENT VIEW over facts this run already produced.
// Not a document, not a checklist anyone fills in, nothing written to disk: `--review-ready`
// re-faces the SAME evaluation and the next run recomputes it. The point is what the practices
// kept proving — a reviewer handed a half-built change spends round 1 doing the producer's
// compilation and testing, and that round is not a review.
//
// TWO items, and each is a fact this run measured: `tests` (C1 really ran) and `open` (the
// `## Open` section is readable — every item carries a stable id, no id is duplicated — and the
// state claims no unverified assumption and no kind-less Reality Check line). A PENDING item
// does not fail review-ready: it is what the review is for. Two earlier items are
// gone — `evidence` (the retired row table) and `producer-diff` (a self-certification nothing
// could observe) — and so is the fourth that once claimed the reviewer's context was
// "available". Nothing here says what a reviewer will read, because this tool cannot see that.
// -> [{ id, ok, detail }]
function reviewReadyView(res, flowText, opts = {}) {
  const by = (id) => res.checks.find((c) => c.id === id) || { status: 'n/a', detail: 'did not run' };
  const c1 = by('C1');
  const ev = rd.evidenceFindings(flowText || '', opts);
  const items = [];
  items.push({ id: 'tests', ok: c1.status === 'pass',
    detail: c1.status === 'skipped'
      ? 'no test command — the reviewer must not be the first to run the suite (pass --test-cmd or add a test-cmd config row)'
      : c1.detail });
  const pending = ev.items.filter((i) => !i.accepted).length;
  // the 6.2 migrations the run found (a hand-written `escalation:` with content, a legacy ledger
  // with open rows) are pending decisions the section cannot show — the same refusal C3/R1 make
  const defects = [...(res.migration || []), ...ev.openDefects];
  items.push({ id: 'open', ok: !defects.length,
    detail: defects.length ? defects.join('; ')
      : rd.openSummary(ev) + (pending ? ' — pending items are what the review is for' : '') });
  return items;
}

const USAGE = 'usage: apriori gate --change <name> [--test-cmd "<cmd>"] [--id-pattern <re>] [--cwd <dir>] [--json] [--no-cas] [--review-ready]';

// The two JSON envelopes of `gate`, each fixed for success AND error (JC-02/03):
//   gate            {change, stage, checks, result, blocked, errors}
//   --review-ready  {change, ready: boolean|null, items, errors}  — `ready: null` with errors[]
//                   is an evaluation OR an argument error; the judged view carries errors: []
const gateErrorJson = (m) => JSON.stringify({ change: null, stage: null, checks: [], result: 'ERROR', blocked: 0, errors: [m] }, null, 2);
const rrJson = (change, ready, items, errors) => JSON.stringify({ change, ready, items, errors }, null, 2);

function cli(argv) {
  return withStrict(argv, { sub: 'gate', usage: USAGE, positionals: 0,
    flags: { '--change': 'value', '--test-cmd': 'value', '--id-pattern': 'value', '--cwd': 'value', '--json': 'flag', '--no-cas': 'flag', '--review-ready': 'flag' },
    jsonError: (m, argv2) => (argv2.includes('--review-ready') ? rrJson(null, null, [], [m]) : gateErrorJson(m)) }, (f) => {
    const a = { change: f['--change'] || null, testCmd: ('--test-cmd' in f) ? f['--test-cmd'] : null,   // PRESENCE, not truthiness — an empty flag is an error, never a config fallback
      idPattern: ('--id-pattern' in f) ? f['--id-pattern'] : null,   // PRESENCE, not truthiness (GT-24 empty flag)
      cwd: f['--cwd'] || process.cwd(), json: !!f['--json'], noCas: !!f['--no-cas'], reviewReady: !!f['--review-ready'] };
    const res = runGate(a);
    if (a.reviewReady) {
      if (res.code === 2) {
        if (a.json) console.log(rrJson(a.change, null, [], res.errors));
        else for (const e of res.errors) console.error('gate: ' + e);
        return 2;
      }
      const items = reviewReadyView(res, res.flowText, res.evidenceOpts || {});
      const missing = items.filter((i) => !i.ok);
      if (a.json) { console.log(rrJson(res.change, !missing.length, items, [])); return missing.length ? 1 : 0; }
      console.log('review-ready — transient view of this run; nothing was written');
      for (const i of items) console.log(`${i.ok ? '✓' : '✗'} ${i.id}  ${i.detail}`);
      // A fact this run already holds, printed rather than claimed: the delta specs it projected.
      // The binding counts are already in the `tests` line above. Nothing here says what a
      // reviewer will read, because this tool cannot observe that.
      const mods = (res.projection && res.projection.modules) || [];
      if (mods.length) console.log(`delta specs: ${mods.join(', ')}`);
      console.log(missing.length
        ? `\nREVIEW-READY: NOT YET (${missing.length} item(s)) — go back to Build & Test; this is not a review round`
        : '\nREVIEW-READY: YES');
      return missing.length ? 1 : 0;
    }
    if (a.json) { console.log(JSON.stringify(toJson(res), null, 2)); return res.code; }
    for (const e of res.errors) console.error('gate: ' + e);
    const mark = { pass: '✓', blocked: '✗', 'n/a': '–', skipped: '○' };
    for (const c of res.checks) console.log(`${mark[c.status]} ${c.id} ${c.status === 'blocked' ? 'BLOCKED — ' : ''}${c.detail}`);
    if (res.code === 0) console.log(`\nGATE: PASS — ${CAVEAT}`);
    else if (res.code === 1) console.log(`\nGATE: BLOCKED (${res.blocked} item(s))`);
    else if (res.code === 3) console.log('\nGATE: INCOMPLETE — C1 did not run; PASS was not reached');
    return res.code;
  });
}

module.exports = { runGate, resolveChange, reviewReadyView, cli };
