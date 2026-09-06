'use strict';
/*
 * apriori new — scaffold an in-flight change directory with a flow-state skeleton.
 * Zero deps — pure Node stdlib. In-flight names are BARE (no date prefix, §4);
 * archive stamps dates at archive time.
 */
const fs = require('fs');
const path = require('path');
const { withStrict } = require('./args');

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;   // bare kebab-case: no empty segments, no trailing hyphen

function flowStateSkeleton(name, now) {
  const p = (n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}T${p(now.getHours())}:${p(now.getMinutes())}`;
  return `change: ${name}
lineage: <target branch/line + merge taboo>
phase: ground                             # ground | specify | build | review | done | abandoned
reviewer-session: n/a                     # the reviewer's resumable session id, the moment round 1 prints it
delivery: pending-external-acceptance     # or: released — what archive reports as the third state
escalation: none                          # anything a human must decide; \`apriori status --escalation\` exits 3
artifact-root: .                          # optional; root for process artifacts (runbook §3) — default project root

## Reality Check         # observed / decision / assumption — one line each, as you find them

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point

gates:
  - ${stamp} note: change scaffolded by \`apriori new\`
`;
}

// Scaffold apriori/changes/<name>/flow-state.md. Returns {ok, path?|error?}.
function scaffoldChange(root, name, now) {
  const v = require('./resolve').validateChangeName(name);   // single source of name truth
  if (!v.ok) {
    if (v.kind === 'invalid-shape') return { ok: false, error: `invalid change name '${name}' — use bare kebab-case (e.g. add-playback); dates are stamped at archive time, not here` };
    if (v.kind === 'date-prefixed') return { ok: false, error: `'${name}' looks date-prefixed — in-flight names are bare; dates are stamped at archive time, not here` };
    return { ok: false, error: `'archive' is reserved for apriori/changes/archive/` };
  }
  const dir = path.join(root, 'apriori', 'changes', name);
  if (fs.existsSync(dir)) return { ok: false, error: `change '${name}' already exists at ${path.relative(root, dir)}` };
  // The bundle skeleton, and it is two directories: `specs/` for the delta contract and
  // `review/` for the review evidence. 5.x also created `requirement/` and taught the agent to
  // fill a fixed set of documents into it; 6.0 scaffolds no document at all — what a change
  // needs, it writes when it needs it.
  for (const sub of ['specs', 'review']) fs.mkdirSync(path.join(dir, sub), { recursive: true });
  const flow = path.join(dir, 'flow-state.md');
  fs.writeFileSync(flow, flowStateSkeleton(name, now));
  return { ok: true, path: path.relative(root, flow) };
}

const USAGE = 'usage: apriori new <change-name>   (bare kebab-case, e.g. add-playback)';

function cli(argv) {
  return withStrict(argv, { sub: 'new', usage: USAGE, positionals: 1, flags: {} }, (f, pos) => {
    const name = pos[0];
    const r = scaffoldChange(process.cwd(), name, new Date());
    if (!r.ok) { console.error(`  ✗ ${r.error}`); return 1; }
    console.log(`  ✓ ${r.path}`);
    console.log('\n  Next: fill in lineage, then Ground — read the real code, schema, interfaces, config'
      + '\n  and deploy topology, and record what you find under ## Reality Check.'
      + '\n  Before you specify: one change carries ONE main result and ONE evidence chain — if one clear,'
      + '\n  repeatable chain cannot prove it, split it first (runbook §4 Specify).');
    console.log(`\n    /apriori ${name}   (or the runbook §0 kickoff prompt)`);
    return 0;
  });
}

module.exports = { NAME_RE, flowStateSkeleton, scaffoldChange, cli };
