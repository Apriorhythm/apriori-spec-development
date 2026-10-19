<!-- provenance: provider=openai model=gpt-6-astra session=01a15514-5811-7530-8c9e-eeada2d1c4d4 date=2026-10-20 -->

Round 2 review of `archive-unreviewed`, scoped to AU-1/AU-2/AU-3 and `7f6166a..cb213bd` with its impact chain.

The three original findings are addressed. Two new substantive issues remain in the four-state change. Allowing a phase-only closeout is consistent with the intended relaxation; the defects concern how its review status is classified and reported.

- **AU-1: ADDRESSED.** Unreadable-summary findings now become unconditional structural blockers, and the additional directory scan catches symlinked raws before closeout approval. AM-140 asserts refusal for the raw-link case in dry-run and write modes, and directly injects a summary-read failure into readiness.
- **AU-2: ADDRESSED.** The closeout now reads the last attributable round’s actual `ordinal`. AM-139’s mixed-attribution assertion distinguishes round 2 from the former incorrect round 1. Declaration and manifest consume the same closeout record.
- **AU-3: ADDRESSED.** The build-phase relaxation is retained as `phaseWaived` and prepended to `waived`. AM-137 asserts its presence at build and absence at review; AM-141 checks the phase-only manifest record.

1. **AU-4 — `check` falsely reports converged archives as lacking a converged review.**

   The new AM-141 path successfully archives a build-phase bundle with `review.independentReview: "converged"`. However, [check.js:295](/root/terra/asd-v62-code/lib/check.js:295) includes every manifest carrying a `review` object in the same collection, and line 306 prints `closed by the owner without a converged independent review`.

   **Risk:** the archive declaration and manifest say the review converged, while the subsequent inventory says it did not. This directly undermines the feature’s truthful closeout reporting. The unchanged check delta spec also retains that now-inaccurate assertion. CK-24 exercises only the `none` case and a normal archive.

   **Suggested fix:** make the single summary note accurately describe all included closeouts, or distinguish their recorded states within it. Synchronize the check contract and CLI references, and cover `check` after the new converged build-phase archive.

2. **AU-5 — Blocker classes do not establish whether a review converged.**

   [readiness.js:778](/root/terra/asd-v62-code/lib/readiness.js:778) infers nonconvergence solely from remaining `review`, `escalation`, or `loop` blockers. Other outstanding obligations produce `evidence incomplete`, whose contract explicitly says every family converged.

   A concrete counterexample is a valid `review-round-limit: 1`, one attributable round saying `2 issues open`, and no rulings or re-review. [review.js:615](/root/terra/asd-v62-code/lib/review.js:615) records the missing rulings in `progress`; its `onRulingPath` exemption at line 831 suppresses the review floor even while the ruling state is `owed`. Readiness consequently has only `evidence` obligations and records **`evidence incomplete` despite the unresolved revise verdict**.

   The same inference is sensitive to `--force`: an owner-authorized escalation can be removed from `owed`, allowing a build-phase closeout to say `converged` while its recorded last verdict remains `escalate`.

   **Risk:** declaration and manifest claim convergence where the independent review did not converge. Authorization to close or force an obligation does not establish that historical fact.

   **Suggested fix:** derive the review status from the actual family verdicts and ruling state, separately from the obligations waived or forced. Reserve `evidence incomplete` for genuinely converged families with incomplete supporting records. The new assertions cover accepting families, but neither counterexample.

I examined the changed structural guards, original finding regressions, phase waiver, four-state classification and formatting, ruling/escalation interactions, manifest propagation, `check` consumption, and the changed contract/RUNBOOK/CLI/CHANGELOG text. I did not repeat the original whole-change review, run builds or tests, inspect real-project bundles or raw transcripts, or independently certify the claimed 894-test result. Findings are based on static paths; no excluded files were read.

Advisory: CHANGELOG still says “a converged review refuses the flag,” contradicting the newly supported build-phase case. Qualify that statement when synchronizing the reporting text.

VERDICT: 2 issues open
