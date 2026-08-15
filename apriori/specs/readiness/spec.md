### Requirement: one implementation of the readiness predicates, two layers of responsibility
`lib/readiness.js` SHALL hold the single implementation of the flow-state, tasks and ledger predicates. Its BASE layer is the gate's state-A code moved verbatim — same results, same detail strings, same bare reads — and the gate SHALL consume it rather than keep its own copy. Its ARCHIVE layer is a SEPARATE set of functions written for a caller that performs an irreversible write: they classify `lstat`/`realpath` failures by `e.code` in a single pass and never call a helper that swallows exceptions. The two layers exist because state A's `fileReadDefect`, `reviewDirDefect` and `containsReal` all swallow errors into a default — correct for callers that only report (gate, status, resolve), unsound for a caller that writes. The module SHALL NOT depend on `archive-merge`.

#### Scenario: RY-01 the base predicates and the gate agree item by item
- WHEN the same set of bundles is fed to the base layer and to the gate's C3, C2 and archived-C4
- THEN every `{id, status, detail}` matches, one row at a time — the agreement is asserted differentially, not restated in prose

#### Scenario: RY-02 the gate's observable behaviour does not move
- WHEN `runGate()` runs after the extraction
- THEN its return object and every detail string are byte-identical to state A; on the throwing path only the error class, code and message are compared, and the stack's file and line are excluded explicitly, because moving a function necessarily changes them

#### Scenario: RY-03 STEP6 is an overlay on C3, not a replacement
- WHEN a flow-state fails a C3 check
- THEN the C3 diagnosis is what surfaces; the STEP6 wording appears only once the rest of C3 has passed

#### Scenario: RY-04 archive readiness is strictly stronger than the gate's C3
- WHEN a bundle sits at any legal step other than STEP6
- THEN archive is not ready while the gate's C3 still passes — `archive ready` implies `gate C3 pass`, never the converse

#### Scenario: RY-05 no layer reaches back into its caller
- WHEN the modules are inspected statically
- THEN `archive-merge.js` contains no `require('./gate')`, `gate.js` does not reimplement the three predicates, and `gate.js` still exports `classifyStatus` for the corpus test that depends on it

#### Scenario: RY-06 the base layer stays bare
- WHEN the base layer is inspected
- THEN it contains no `fileReadDefect` call — adding a guard there would change the gate's behaviour and contradict RY-02

#### Scenario: RY-07 the base layer takes its containment check from resolve
- WHEN `reviewDirDefect` runs against a normal directory, a symlink, a non-directory, an escaping path and an absent path
- THEN the results match state A even though the containment helper now comes from `resolve` rather than `archive-merge` — the two differ only when target equals root, and this call site's target is always `<dir>/review`

#### Scenario: RY-08 the archive artifact check matches state A everywhere state A has an answer
- WHEN `artifactDefect` is compared against `resolve.fileReadDefect` on a clean file, a symlink, a non-file, an escaping path, a bad ancestor and a genuine absence
- THEN all six agree; `io-error` is the seventh outcome, one state A cannot produce

#### Scenario: RY-09 the archive review-root check matches the gate's, absence included
- WHEN `reviewRootDefect` is compared against the gate's `reviewDirDefect` on a clean directory, an ABSENT directory, a symlink, a non-directory and an escaping path
- THEN all five agree — the absent case returning nothing is the one that keeps a missing `review/` flowing to the tier rule instead of becoming a new failure class

#### Scenario: RY-10 the archive layer owns its error semantics end to end
- WHEN `artifactDefect`, `reviewRootDefect` and `containDefect` are inspected statically
- THEN none of them mentions `fileReadDefect`, the base `reviewDirDefect`, or `containsReal` — a second call into a swallowing helper would reopen the very window this layer exists to close

#### Scenario: RY-11 the readiness entry point reuses the overlay rather than restating it
- WHEN `readinessOf` is inspected statically
- THEN its R1 stage calls `stepOverlay` and does not restate the `current-step === 'STEP6'` comparison — a restated copy would let the STEP6 acceptance pass a batch before the production path that enforces it exists

#### Scenario: RY-12 a non-ENOENT beats a co-occurring ENOENT
- WHEN the containment check's two realpath calls fail with different codes — one absent, one denied
- THEN both calls are still attempted and the answer is the io-error, because letting the absence win would hand a permission failure to the tier rule and archive an unread bundle

#### Scenario: RY-13 the ancestor walk classifies its own failures
- WHEN a non-ENOENT error is raised while walking up from an absent artifact toward the bundle root
- THEN it surfaces as io-error with its code rather than being swallowed as "keep walking", which is what state A does and why state A ends at `missing` here

#### Scenario: RY-14 the review root's own guard failures are classified, and ENOENT stays benign
- WHEN the review root's lstat or realpath fails
- THEN a non-ENOENT is io-error while an unresolvable path answers exactly as an absent directory does — the tier rule still decides, and no new failure class is introduced

#### Scenario: RY-15 the structural set is closed and gate is untouched by it
- WHEN the kinds the archive layer can return are enumerated
- THEN every one except `missing` is structural and therefore never forceable, and none of this reaches the gate
