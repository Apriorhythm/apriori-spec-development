'use strict';
/*
 * apriori risk — the §6 risk signals this CLI can derive MECHANICALLY.
 *
 * The 6.0 blueprint's §6 table lists six risk rows (UI/prototype, cross-process, data/
 * transaction, config/deploy/environment, permission/security, migration/compatibility) and
 * §9 says the mechanical protections come from that table's "CLI-checkable signal" column and
 * from NO second risk word list. Held against what this tool actually reads, exactly ONE of
 * those signals is a fact rather than a guess:
 *
 *   The change's own delta declares a MUTATION of an already-published requirement —
 *   `## MODIFIED`, `## REMOVED` or `## RENAMED Requirements`.
 *
 * That is not a heuristic over prose: the delta grammar states it, `archive` already merges on
 * it, and `mutationOpCount` has named it since 4.0. An ADDED-only delta touches no published
 * behaviour; a mutating one changes or withdraws a contract that is already in the store —
 * §6's "public interface changed" and "historical format changed", in the one place where this
 * tool holds ground truth.
 *
 * The other five rows need the product's routes, schema, auth, startup config or source diff.
 * This tool reads none of those. Deriving them would mean a keyword taxonomy over spec prose —
 * the "另一份风险词表" §9 forbids and §11 rules out. They stay UNIMPLEMENTED, on purpose.
 *
 * What a signal DOES (6.2): it is information. `gate`, `archive` and `status` report it — as a
 * C9/R5 note and as `status --json`'s `risk[]` — and none of them derives a mode, a reserved
 * row or any other demand from it. `unreadable-delta` is the one exception, and it is not a
 * risk: it is a scan that could not be made, and it is fail-closed in the state predicate.
 * Frozen history is never re-scanned: an archived bundle's merged delta raises no signal.
 */
const fs = require('fs');
const path = require('path');
const am = require('./archive-merge');

// The signal names. `unreadable-delta` is NOT a §6 risk — it is what happens when the scan
// cannot rule the risk out, and "cannot rule out" may never read as "no risk found".
const CONTRACT_MUTATION = 'contract-mutation';
const UNREADABLE_DELTA = 'unreadable-delta';

const MUTATION_OPS = ['MODIFIED', 'REMOVED', 'RENAMED'];
const MAX_OPS = 2;          // the reason is a reason, not a report — the checks print the rest

// Every delta file in a bundle, judged for mutation operations. Pure of policy: it says what
// the deltas declare, and nothing about what that should imply. Reuses archive-merge's walker, containment
// and parser — a second delta parser is how `gate` and `archive` come to disagree.
// -> [{ signal, detail }] sorted by file
function scanDeltas(bundleDir) {
  const specsDir = path.join(bundleDir, 'specs');
  const out = [];
  // lstat first, and it decides only ABSENCE: no entry at all means the change ships no delta,
  // which is genuinely no signal. Everything else must RESOLVE — a dangling symlink or a file
  // named `specs` would otherwise reach mdFilesUnder's existsSync and come back as an empty
  // listing, i.e. "no deltas, no risk", which is fail-open on the one input shaped to look
  // like nothing. A symlinked specs/ that does resolve stays legal, as `discoverDeltas` has it.
  try { fs.lstatSync(specsDir); } catch { return out; }
  let resolved = null;
  try { resolved = fs.statSync(specsDir); } catch { /* dangling */ }
  if (!resolved || !resolved.isDirectory())
    return [{ signal: UNREADABLE_DELTA, detail: 'specs/ does not resolve to a readable directory — the risk cannot be ruled out' }];
  // and a specs/ that resolves OUTSIDE the bundle is not this scan's to read through
  if (!am.containsFuturePath(bundleDir, specsDir))
    return [{ signal: UNREADABLE_DELTA, detail: 'specs/ does not resolve inside the change bundle — the risk cannot be ruled out' }];
  let files;
  try { files = am.mdFilesUnder(specsDir); }
  catch (e) { return [{ signal: UNREADABLE_DELTA, detail: `specs/ cannot be listed (${e.code || e.message})` }]; }
  for (const abs of files) {
    const suffix = path.relative(specsDir, abs).split(path.sep).join('/');   // POSIX on every platform
    if (!am.containsFuturePath(specsDir, abs)) {
      out.push({ signal: UNREADABLE_DELTA, detail: `${suffix}: escapes the change bundle` });
      continue;
    }
    let raw;
    try { raw = fs.readFileSync(abs, 'utf8'); }
    catch (e) { out.push({ signal: UNREADABLE_DELTA, detail: `${suffix}: unreadable (${e.code || e.message})` }); continue; }
    const { delta } = am.parseDeltaStrict(raw);
    if (!am.mutationOpCount(delta)) continue;
    const ops = [];
    for (const kind of MUTATION_OPS) {
      const names = kind === 'RENAMED' ? delta.RENAMED.map(([o, n]) => `${o} -> ${n}`) : [...delta[kind].keys()];
      for (const n of names) ops.push(`${kind} '${n}'`);
    }
    const shown = ops.slice(0, MAX_OPS).join(', ');
    out.push({ signal: CONTRACT_MUTATION,
      detail: `${suffix} ${shown}${ops.length > MAX_OPS ? ` (+${ops.length - MAX_OPS} more)` : ''}` });
  }
  return out;
}

module.exports = { CONTRACT_MUTATION, UNREADABLE_DELTA, scanDeltas };
