<!-- apriori-base: sha256:871f48992c327efd921eccf9e3202bd5a22738195be447fa0f41a9e6502a4930 -->
## RENAMED Requirements

- unstamped mutation deltas warn and reruns of applied stamps repair -> unstamped mutation deltas are denied by default and reruns of applied stamps repair

## MODIFIED Requirements

### Requirement: unstamped mutation deltas are denied by default and reruns of applied stamps repair
A delta carrying MODIFIED/REMOVED/RENAMED operations without a CAS stamp SHALL be **denied by default on every archive surface** — the high-level `archive --change` form AND the single-file `--store --delta` form: preflight-grade error (exit 1) naming the file and the cure (`apriori stamp <store-file>`), with **nothing written, staged, or moved**. A visible waiver downgrades to the former warn-and-merge behavior: the archive CLI's `--no-cas` flag or a `| cas | optional |` row in `apriori/process-config.md` (the flag wins), and the output names which waiver source applied. ADDED-only deltas stay exempt (the exemption is clobber-focused: they conflict or no-op, never silently overwrite). `verify --change` (the read-only projection) keeps warning without judging; `buildProjection` still returns `unstampedMutations: string[]`. `merge()`'s MODIFIED op SHALL report `unchanged` when the delta block trim-equals the current store block. Archive preflight SHALL classify each stamped delta per file: stamp matches → merge as today; stamp mismatches with EVERY op `unchanged` → a note (`rerun accepted`) and the run proceeds, move included; stamp mismatches with ANY real pending op → error, the whole preflight fails with nothing written or moved — divergence with pending work is never repaired, and notes stay distinct from errors in the diagnostics.

#### Scenario: AM-32 unstamped mutation deltas are denied on both archive forms
- WHEN an unstamped delta carrying a MODIFIED op is archived via --change or via --store/--delta with no waiver
- THEN each form errors (exit 1) naming the file and the stamp cure, writes/stages/moves nothing, and an unstamped ADDED-only delta merges without complaint

#### Scenario: AM-40 the waiver is visible and downgrades to warn-and-merge
- WHEN the same unstamped MODIFIED delta is archived with `--no-cas`, or with a `| cas | optional |` process-config row
- THEN the merge happens with the former warning, the output names the waiver source that applied, and with both present the flag wins

#### Scenario: AM-41 the projection surface stays informative
- WHEN `verify --change` projects a change containing an unstamped mutation delta
- THEN it warns exactly as before and never fails the run for the missing stamp — denial is an archive-surface rule

#### Scenario: AM-33 an already-applied stamped delta reruns to completion
- WHEN a stamped change whose commit already rewrote the stores reruns `archive --write --changes-dir` (an already-applied MODIFIED-only delta included)
- THEN every mismatched file reports the rerun-accepted note, stores stay byte-identical, the change dir moves, and the exit is 0

#### Scenario: AM-34 divergence with pending work never repairs
- WHEN a stamped delta's base mismatches and at least one operation is a real pending change — including the mixed case where another file is already applied
- THEN preflight fails with the mismatch error, nothing is written or moved, and the diagnostics keep already-applied notes apart from divergence errors — while the pure resumed-partial-commit mix (applied-mismatched file + matching file with real ops) completes with the note

#### Scenario: AM-35 MODIFIED speaks the idempotence vocabulary
- WHEN a MODIFIED operation's delta block trim-equals the current store block
- THEN merge reports it `unchanged` rather than `modified`, and first applications behave exactly as before
