<!-- provenance: provider=openai model=unknown session=unknown date=2026-10-20 -->

Independent review of `archive-unreviewed`, `c843e53...7f6166a`.

Intended landing: `apriori/changes/archive-unreviewed/review/code-review-v1.md`. Not written because the sandbox is read-only. [RUNBOOK §1 R2](/root/terra/asd-v62-code/RUNBOOK.md:120) permits the producer to land the reviewer’s output verbatim.

Three substantive issues remain. The approach fits the owner’s goal; these are implementation defects, not grounds for escalation.

1. **AU-1 — Structural evidence failures enter the waivable set.**  
   [readiness.js:709](/root/terra/asd-v62-code/lib/readiness.js:709) moves every `loop.problems` entry into `owed`. However, [review.js:199](/root/terra/asd-v62-code/lib/review.js:199) catches summary-read failures internally, and line 248 classifies them as `unreadable-doc`. They never reach readiness’s exception guard. Consequently, an unreadable summary can pass readiness and produce a successful dry-run under `--unreviewed`.

   A second concrete path permits writing: with a regular verdict summary and a symlink at its `-raw.txt` path, [review.js:194](/root/terra/asd-v62-code/lib/review.js:194) skips the raw before checking for symlinks. It becomes “missing raw,” which readiness waives. [manifest.js:48](/root/terra/asd-v62-code/lib/manifest.js:48) inventories that link without refusing it, so the archive can merge and move despite symlinked review evidence.

   **Risk:** this violates the owner’s explicit structural boundary and the delta contract. A persistently unreadable regular file may still fail manifest hashing during `--write`; that later failure does not repair readiness or the successful dry-run, and does not prevent the raw-symlink case.

   **Suggested fix:** preserve typed structural findings as unconditional blockers, including summary-read errors and symlinked raw evidence. Waive only the intended review obligations. AM-140 tests a symlinked review root, but neither of these evidence-file paths.

2. **AU-2 — The frozen record can attribute the last verdict to the wrong round.**  
   Consider regular `code-review-v1.md` without attribution, followed by an attributable `code-review-v2.md` saying `2 issues open`. Missing attribution is explicitly waivable. The review reader records both ordinal claims but includes only round 2 in the validated rounds. [review.js:350](/root/terra/asd-v62-code/lib/review.js:350) sets `family.round` to `rounds.length`, yielding **1**. The new formatter at [readiness.js:752](/root/terra/asd-v62-code/lib/readiness.js:752) therefore records `code-review round 1 (revise, 2 open)` in both declaration and manifest.

   **Risk:** the durable closeout misidentifies the attributable review carrying the last conclusion—the very history this feature promises to preserve.

   **Suggested fix:** retain and use the last attributable round’s actual ordinal when constructing the closeout record. AM-139 covers an attributable round 1 and an entirely unattributable review separately; it misses mixed attribution within one family.

3. **AU-3 — The build-phase waiver is omitted from the waiver record.**  
   [readiness.js:645](/root/terra/asd-v62-code/lib/readiness.js:645) clears the R1 phase blocker for `build`, but does not retain it. The closeout’s `waived` array is subsequently populated only from R4’s `owed` list.

   **Risk:** a successful build-phase closeout omits one of its two waived demands from both declaration notes and manifest, contrary to the contract’s requirement to identify every waived demand.

   **Suggested fix:** record the actual R1 phase relaxation alongside the waived R4 demands. AM-137 exercises both phases but only asserts an R4 waiver.

I examined the canonical owner parser, double-action routing, C3/phase checks, review-root and evidence handling, R5 pending items/assumptions/legacy rows, convergence/progress/ruling derivation, CAS/conflict and drop-guard ordering, declaration and manifest construction, CK-24, all new tests, both delta specs including the three MODIFIED blocks, and the changed RUNBOOK/docs/CHANGELOG passages. The ordinary declaration and manifest construction remain unchanged when no closeout applies.

The requested gate command reported C3/C7/C9 passing, C8 blocked solely by the missing review round, and C1 skipped without a test command. The findings above follow from static code paths, not sandbox failures. I did not run builds, add tests, reproduce filesystem faults dynamically, or independently verify the reported 894-test result. No excluded files or other changes’ documents were read.

Advisories: none.

VERDICT: 3 issues open
