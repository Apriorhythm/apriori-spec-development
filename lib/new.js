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
tier: <trivial | medium | large>          # size it per runbook §2
track: <harden | explore>                 # certainty axis, §2 (unsure: harden)
track-rationale: <one line — reported at the next human gate>
lineage: <target branch/line + merge taboo — copy from the requirement>
current-step: STEP0
round: 0
reviewer-session: n/a                     # record the reviewer's resumable session id the moment round 1 prints it (R2)
next-action: draft apriori/changes/${name}/requirement/req-v1.md (or the intent card on the explore track)
artifact-root: .                          # optional; root for process artifacts (runbook §3) — default project root
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
  // the bundle skeleton: specs/ for deltas, requirement/ for the req history, review/ for evidence
  for (const sub of ['specs', 'requirement', 'review']) fs.mkdirSync(path.join(dir, sub), { recursive: true });
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
    console.log(`\n  Next: fill in tier/track/lineage, then kick off:\n    /apriori ${name}   (or the runbook §0 kickoff prompt)`);
    return 0;
  });
}

module.exports = { NAME_RE, flowStateSkeleton, scaffoldChange, cli };
