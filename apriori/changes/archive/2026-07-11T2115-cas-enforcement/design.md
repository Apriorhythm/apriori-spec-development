# Design — cas-enforcement

**lib/archive-merge.js**
- `merge()` MODIFIED branch (DD-5/AM-35): before replacing, `if (store.get(name).trim() === block.trim()) { unchanged.push(name); continue; }` — mirrors the ADDED no-op comparison rule (trim equality), first applications untouched.
- `mutationOpCount(delta)` helper (or inline): `delta.MODIFIED.size + delta.REMOVED.size + delta.RENAMED.length` — the warn/deny predicate is `mutationOpCount > 0 && stamp === null`.
- `buildProjection`: new `unstampedMutations` array (suffix strings, the same `suffix` each file already carries); push when the predicate holds; return it alongside conflicts/casMismatches. WARN text composed by CALLERS (one message class): `unstamped mutation delta <suffix> — divergence undetectable; run: apriori stamp <store-file> (stamps become mandatory in 4.0)`.
- Preflight rerun repair (AM-33/34): where casMismatches currently pushes, first run the merge against the CURRENT store; if `merged.length + modified.length + deprecated.length + renamed.length === 0 && conflicts.length === 0` (all ops landed in `unchanged`) → push a NOTE (`out[]`: `<suffix>: stamp mismatch but the delta is already fully applied — rerun accepted`) and mark the file as contributing no writes; else push the casMismatches error as today. The mixed matrix falls out per file; any error still fails the whole preflight before writes/move (existing all-or-nothing plumbing).
- Single-file `cli` form (AM-32): same predicate on its one delta → same warning line on stdout before RESULT.
- `archiveChange` report: warnings appended to `out` before the RESULT line.

**lib/spec-runner.js (SR-32)**
- `verifyChange` already consumes buildProjection: attach `b.unstampedMutations` to the run/projection; `verify --change`'s cli prints each warning to stderr; `verifyJson`: `json.projection.unstampedMutations = run.projection.unstampedMutations || []`.

**lib/gate.js (GT-16)**
- C7 after C6: in-flight stage → read the projection's `unstampedMutations` (checkBinding already builds the projection for C1 — thread the field through rather than re-projecting; if C1's run object carries `projection`, reuse). Archived stage → `{ id: 'C7', status: 'n/a', detail: 'deltas already merged' }`.
- Escapes: `--no-cas` flag (withStrict flags gains `'--no-cas': 'flag'`); config row via a `configCas(cwd)` reader modeled on `configTestCmd` (`| cas | <value> |`, leading token, case-insensitive). Precedence: flag first. Waived detail strings: `waived (--no-cas)` / `waived (process-config cas: optional)`, status 'pass' with the waiver in detail (blocked-count unaffected) — visible, machine-greppable.
- gate `--json`/output rows include C7 like any check.

**Docs (K5)**
- truth/archive-merge.md: the opt-in pitfall paragraph → graded reality (warn now, C7 default-deny, rerun repair, 4.0 trajectory); merge() MODIFIED bullet gains the trim-equality unchanged note.
- truth/gate.md: C7 added to "the checks" line (+ escapes).
- truth/spec-runner.md: verifyChange/projection JSON field.
- RUNBOOK EN/CN: one sentence in the §4.11/serial-rule vicinity (graded enforcement + 4.0). NOT a new PR scenario — K5 binds via the three module deltas; the runbook sentence is prose (P8 checks the pair).

**Tests**: AM-32..35 (test/archive-change.test.js), SR-32 (test/spec-runner.test.js), GT-16 (test/gate.test.js). Fixture notes: AM-33 rerun fixture = archive once with --write, restore the change dir copy (the move relocated it) or pre-merge the store manually + stamped delta; simpler: write the store ALREADY containing the merged content + a stamped-with-OLD-fingerprint delta whose ops all trim-equal → mismatch+all-unchanged. GT-16 uses the gate-test mkProject with an unstamped MODIFIED delta (store must contain the target block so the op is real-but-unstamped).
Tasks: T1 red AM-32..35 + SR-32 + GT-16; T2 archive-merge (merge/projection/preflight/cli); T3 spec-runner + gate (+ configCas); T4 docs/truth; T5 gates + post-archive gate.
