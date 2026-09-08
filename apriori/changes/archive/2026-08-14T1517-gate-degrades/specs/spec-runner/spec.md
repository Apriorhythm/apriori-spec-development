<!-- apriori-base: sha256:25a0038c11edef9c6135685783551449d4f6dda182e23deb3be0e744f16a4555 -->

## ADDED Requirements

### Requirement: the change projection is one shared implementation, reachable without running tests
The delta-to-store projection SHALL be built by exactly ONE implementation, reachable by every consumer through a single replaceable reference. `spec-runner` SHALL export that reference resolver alongside the builder, and `verify` SHALL itself go through it — so that a consumer which needs the projection WITHOUT executing a test command (gate's skipped-C1 path) provably shares `verify`'s code, its inputs, and its failure classes. Two test-only injection seams SHALL exist: one over the projection builder and one over the test-command runner. Each SHALL default to the real function, and installing an override and clearing it SHALL leave a configured run's complete public results structurally identical — the claim is that observable three-state equality, NOT byte-identity against any earlier implementation, which no test inside this repo can observe.

#### Scenario: SR-73 both consumers pass through the same replaceable builder
- WHEN a test wraps the projection builder through its seam and then runs BOTH `verify --change` (with a test command) AND the projection-only path (without one)
- THEN both calls pass through the SAME wrapper — the reference is read at call time, never captured at module load — and the wrapper observes identical `{projection: {modules, conflicts, unstampedMutations, notes}, errors}` for the same change, across clean, unstamped-mutation, malformed-delta, diverged-CAS-base, merge-conflict, and no-delta-files inputs alike; and no consumer reassembles a projection from the underlying delta-discovery primitives instead of going through the shared reference — statically checkable in the consumer's own source

#### Scenario: SR-74 the projection-only path spawns no test process
- WHEN the projection is built through the projection-only path
- THEN the test-command runner seam records ZERO calls — the projection is produced before, and independently of, any test execution; the id-matcher child seam is a different seam and proves nothing about this

#### Scenario: SR-75 the seams are inert by default
- WHEN no seam override is installed
- THEN the exported projection resolver returns the real builder itself (directly assertable), the private test-command resolver defaults to the real runner (statically assertable in `spec-runner`'s own source, since it is not exported), and the COMPLETE public results of a configured `verify --change` and a configured `gate` are identical in three states observed in ONE process: before any override exists, after a projection override is installed and cleared, and after a test-runner override is installed and cleared — and while a runner override IS installed the configured result must differ, so the after-clear comparison can never be vacuous. Identity against the PRE-seam implementation is deliberately NOT claimed here: no test inside this repo can observe it, and the pre-existing suite passing unchanged is regression EVIDENCE, not a byte-identity proof.
