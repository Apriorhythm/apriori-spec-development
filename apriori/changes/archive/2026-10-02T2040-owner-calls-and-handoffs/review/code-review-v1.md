<!-- provenance: provider=codex model=gpt-6-astra session=01a0fc96-2243-7100-a502-a4aa1324d226 date=2026-10-02 -->
# code-review — owner-calls-and-handoffs (round 1)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript, except one placeholder provenance line the reviewer printed at its top (`provider=openai model=unknown session=unknown`), omitted so it cannot be read as this document's provenance; it remains in code-review-v1-raw.txt.


Review for `apriori/changes/owner-calls-and-handoffs/review/code-review-v1.md`. Read-only sandbox: this body is provided for the producer to land verbatim.

**Substantive findings**

- **OC-01 — The combined recipe’s termination condition omits its Build & Test bound.**  
  [operator.md:35](/root/terra/wt-cc/docs/operator.md:35) allows termination after archive or a listed §1 R1 human stop. Its body separately imposes the 25-turn Build & Test bound and says reaching it requires human judgment. Consider turn 25 with failing tests, further repairs still within delegation, and no escalation, blocked evidence or other R1 stop: neither stated alternative holds. This preserves the condition/body conflict R2 is intended to remove and can cause repeated reporting after the required stop. The standalone Build & Test recipe explicitly includes this alternative; the combined recipe does not. PR-66’s generic OR-expression assertion misses the distinction, and the behavioral run tested escalation only.  
  **Suggested fix:** explicitly include reaching the Build & Test stage’s 25-turn bound in the combined recipe’s termination alternative, requiring the unmet conditions and failing evidence in the report, still never a pass or delivery. Mirror it in Chinese and pin that distinction.

- **OC-02 — The corrected `--force` sentence still does not describe the code’s predicate accurately.**  
  [RUNBOOK.md:82](/root/terra/wt-cc/RUNBOOK.md:82) names an `escalate` verdict or being past the automatic re-review as requiring a recorded decision plus `--force`. But [review.js:791](/root/terra/wt-cc/lib/review.js:791) also derives escalation when the owner has taken the limit round through a reframe and the current verdict remains REVISE. For example, a limit-round `accept-risk` decision still requires archive’s `--force`, without either named condition occurring. Conversely, a later ACCEPT after a valid release can be past the re-review without requiring force. [readiness.js:689](/root/terra/wt-cc/lib/readiness.js:689) keys this requirement to `f.escalating`, not merely the round’s position. This fails PR-64’s stated alignment with enforcement and can misdirect closeout.  
  **Suggested fix:** describe archive’s requirement in terms of the current derived escalation, including the owner-reframe path, while preserving the distinction between ordinary convergence and explicit risk acceptance. Update PR-64 and the changelog accordingly; no CLI change is needed.

**Risk surfaces examined**

Checked the complete tracked/untracked change, delta contract, flow-state, gate output, R1/R4 and disposition interactions, carried-dependency grammar and C9/R5 handling, recipe parity, OPM assertions, P3 freeze, release notes, and the three supplied R2 transcripts.

The disclosure paragraph retains the verbatim requirement and expressly denies turning agent interpretation into owner authorization. The batch-confirmation example identifies the owner-item set; a bare “do whatever you recommend” does not. The handoff addition preserves pending dependencies and the existing prohibition against using follow-up syntax for them.

P3 is byte-identical to `v6-dev`; its SHA-256 begins `97a85ca560d41c70`. All four recipe blocks match between languages. The gate reports C9 clear and C8 blocked awaiting this review; C1 was skipped without a test command. I did not independently rerun the reported 875 tests, packaging, or live `/goal` trials.

The transcripts confirm nine `met:false` evaluations in run 001 and a single `met:true` evaluation in each new-recipe run. Post-escalation commands show no product-code changes, owner gate entries, archive execution or second review round. Other stop classes, the turn bound, and the other recipes remain behaviorally untested. Credentials and prohibited human-note files were not read.

**Advisories**

The evaluator explanation should distinguish an explicit alternative outcome from a technical first-line/body boundary. The recorded condition contains the entire recipe, and the old evaluator’s reasons acknowledge its stop clause while still requiring archive. The [official documentation](https://code.claude.com/docs/en/goal) describes evaluating the supplied condition against the conversation. The trials support the observed improvement, but neither universal elimination of repetition nor the report’s causal assertion that run 003’s differing Build behavior was unrelated to the goal text.

The approach remains within scope; these are repairable details, not grounds for SPLIT or escalation.

VERDICT: 2 issues open
