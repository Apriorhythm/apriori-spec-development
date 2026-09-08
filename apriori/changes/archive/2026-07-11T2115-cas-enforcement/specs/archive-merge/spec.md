<!-- apriori-base: sha256:286da5e560eb41c29e85f61af84f87c7957074bb7276eeeecec49e80f83f60bc -->
# Delta — archive-merge (cas-enforcement)

## ADDED Requirements

### Requirement: unstamped mutation deltas warn and reruns of applied stamps repair
A delta carrying MODIFIED/REMOVED/RENAMED operations without a CAS stamp SHALL produce one warning naming the file and the cure (run `apriori stamp`, mandatory in 4.0) on every mutation surface — the high-level `archive --change` report AND the single-file `--store --delta` form — while still merging (WARN grade this minor); ADDED-only deltas are exempt (the exemption is clobber-focused: they conflict or no-op, never silently overwrite). `buildProjection` SHALL return `unstampedMutations: string[]` (store-suffix-relative paths, `[]` when none). `merge()`'s MODIFIED op SHALL report `unchanged` when the delta block trim-equals the current store block (the already-applied signature the other ops have). Archive preflight SHALL classify each stamped delta per file: stamp matches → merge as today; stamp mismatches with EVERY op `unchanged` → a note (`rerun accepted`) and the run proceeds, move included; stamp mismatches with ANY real pending op → error, the whole preflight fails with nothing written or moved — divergence with pending work is never repaired, and notes stay distinct from errors in the diagnostics.

#### Scenario: AM-32 unstamped mutation deltas warn on both archive forms
- WHEN an unstamped delta carrying a MODIFIED op is archived via --change or via --store/--delta
- THEN one warning names the file and the stamp cure, the merge still happens, and an unstamped ADDED-only delta warns nowhere

#### Scenario: AM-33 an already-applied stamped delta reruns to completion
- WHEN a stamped change whose commit already rewrote the stores reruns `archive --write --changes-dir` (an already-applied MODIFIED-only delta included)
- THEN every mismatched file reports the rerun-accepted note, stores stay byte-identical, the change dir moves, and the exit is 0

#### Scenario: AM-34 divergence with pending work never repairs
- WHEN a stamped delta's base mismatches and at least one operation is a real pending change — including the mixed case where another file is already applied
- THEN preflight fails with the mismatch error, nothing is written or moved, and the diagnostics keep already-applied notes apart from divergence errors — while the pure resumed-partial-commit mix (applied-mismatched file + matching file with real ops) completes with the note

#### Scenario: AM-35 MODIFIED speaks the idempotence vocabulary
- WHEN a MODIFIED operation's delta block trim-equals the current store block
- THEN merge reports it `unchanged` rather than `modified`, and first applications behave exactly as before
