<!-- provenance: provider=codex model=gpt-6-astra session=01a0fcbe-eb66-7a00-bdb0-d2de4f02bccc date=2026-10-02 -->
# code-review — prototype-walk-guide (round 1)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript, except one placeholder provenance line the reviewer printed at its top (`provider=openai model=unknown session=unknown`), omitted so it cannot be read as this document's provenance; it remains in code-review-v1-raw.txt.


Independent review of `prototype-walk-guide`, including `git diff v6-dev...HEAD` and uncommitted flow-state edits.

Intended landing: `apriori/changes/prototype-walk-guide/review/code-review-v1.md`. This sandbox is read-only; RUNBOOK §1 R2 directs the producer to land this review verbatim, marked “recorded on behalf of the reviewer.”

Four substantive issues remain:

1. **PW-R1 — Update bypasses the guide’s file-type protection.**  
   [lib/update.js:83](/root/terra/wt-cb/lib/update.js:83) obtains `lstat` but sends existing or listed guide paths into `consider`, which hashes and writes through them without checking their type or the parent directory’s type. Move an installed guide to another location inside the project and replace its path—or `apriori/guides`—with a symlink: its hash still matches the manifest, containment passes, and a subsequent package refresh writes through the symlink. A directory at the guide path instead causes a read failure, potentially after the runbook was refreshed but before its new manifest hash was saved. A dangling unlisted symlink receives no guide action because `existsSync` returns false.

   **Risk:** violates the required plain-file/directory protection and CHANGELOG’s claim that these paths are skipped with a reason. PW-02 exercises none of these conditions.

   **Fix:** validate the guide and its parent before hashing or refreshing on every update branch; distinguish absent paths from dangling links and other file types. Preserve their contents and report the obstruction. Add producer-side adversarial coverage through update.

2. **PW-R2 — Corrected prototype defects fall outside mandatory reconciliation.**  
   [guides/prototype-walk.md:109](/root/terra/wt-cb/guides/prototype-walk.md:109) classifies corrected defects as `not-reproduced`, while line 118 requires implementation and verification reconciliation only for `in` rows.

   This occurs in the supplied authorized-walk artifact: `PW-modal-07` requires the PRD’s positive-amount validation, and `PW-ops-05` requires deletion only for cancelled orders with confirmation. Both are `not-reproduced`, despite requiring delivered behavior.

   **Risk:** a later check can reconcile every `in` row while leaving these required corrections without implementation or verification evidence.

   **Fix:** keep delivery scope separate from the ruling about reproducing prototype behavior, or explicitly require reconciliation of corrected `not-reproduced` rows against their ruled behavior. Preserve one checklist.

3. **PW-R3 — Permitted checklist evidence is discarded from the retained bundle.**  
   [guides/prototype-walk.md:15](/root/terra/wt-cb/guides/prototype-walk.md:15) puts screenshots and action logs in uncommitted `SCRATCH`; line 108 permits a screenshot name alone as a row’s evidence. The retained screenshot index contains references, not the screenshots.

   **Risk:** after scratch cleanup or in another checkout, the archived checklist survives but a compliant runtime-only row’s supporting evidence does not. Re-running the walk creates new evidence; it does not preserve the original observation.

   **Fix:** retain the scrubbed evidence actually cited by checklist rows in `OUT`, or reference a durable artifact location. Unreferenced bulk captures can remain disposable.

4. **PW-R4 — Same-version reuse forbids filling legitimate coverage gaps.**  
   [guides/prototype-walk.md:147](/root/terra/wt-cb/guides/prototype-walk.md:147) says a later change “does not re-walk unless the prototype’s version changed.” Ground instead conditions reuse on evidence covering the current scope.

   **Risk:** an earlier walk covering only one page—or either supplied positive run, which lacked runtime execution—can prevent completing an already-authorized walk when scope expands or browser capability becomes available, despite the prototype version remaining unchanged.

   **Fix:** reuse valid evidence for the covered scope; allow authorized continuation for uncovered, blocked, or newly included paths. Keep the once-per-requirement offer distinct from completing missing work.

**Examined:** exact managed-path allowlisting, manifest hygiene, init/update ownership and refresh branches, dry-run and summary handling, doctor’s runbook-reference condition, all changed tests, required source documents, guide semantics, packaging declarations, migration/operator text, and the supplied five behavioral transcripts and positive-run artifacts. UP-08’s adjustment preserves its protected-content and protected-hash assertions; it is not a substantive weakening. The positive transcripts support guide-reading before artifact creation.

**Limits:** no filesystem-mutating reproductions, full-suite rerun, package installation, browser traversal, concurrent filesystem-race testing, or second-change behavioral run. The reported 881/881 remains producer evidence. `check --self` returned PASS; gate’s missing-review block is expected before this review lands. Credentials, human-note files, and raw review transcripts were not read.

**Advisories:** the reported runtime and cross-change behavioral limitations should remain explicit. The overall one-guide approach fits the authorized scope; these findings do not require splitting or escalation.

VERDICT: 4 issues open
