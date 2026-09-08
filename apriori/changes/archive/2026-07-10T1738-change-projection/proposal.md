# Proposal — change-projection

**WHY.** STEP5's deterministic gate can't see what a change will do to the spec store until after archive: scanning the store misses new scenarios, scanning store+change double-counts MODIFIED and miscounts REMOVED/RENAMED. Archive itself is a per-file primitive with no cross-module dry-run, no atomicity, and no defense against a store that changed since the delta was authored (§4.11 has no tooling). External review (GPT-5.6, 2026-07-10) ranked fixing this verification-target misalignment as the top post-3.0.1 item; the owner ratified it as the 3.1 opener.

**WHAT.** Three consumer surfaces of the same `merge()` pure function, shipping as apriori-cli 3.1.0:

1. `apriori verify --change <name>` — verify against the in-memory projected (post-merge) store; what verify proves is exactly what archive will produce.
2. `apriori archive --change <name>` — whole-change discovery, dry-run by default, four-phase failure-atomic `--write` (preflight → stage → commit → move).
3. CAS base stamps (`<!-- apriori-base: sha256:… | new -->`) + `apriori stamp <store-file>` — opt-in divergence detection at both verify and archive time.

Plus one declared behavior change: **deprecated blocks** (the marker REMOVED injects) are excluded from scenario collection in ALL verify forms — without this, every post-REMOVED store would demand tests for removed behavior forever.

**OUT OF SCOPE.** `doctor`, `gate`, global `--help`/unknown-flag strictness, Change Bundle layout, non-reusable change IDs, executable state machine, any behavior change to `check`/`init`/`new`/`status`/`update`, auto-stamping deltas, crash-durability (fsync) claims.

Full requirement: `requirement/req-final.md` (3 P1 rounds, VERDICT: no major issues). Gap analysis: `apriori/explore/change-projection-gap-report.md`.
