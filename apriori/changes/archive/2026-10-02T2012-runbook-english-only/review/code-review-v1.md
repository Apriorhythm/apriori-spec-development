<!-- provenance: provider=codex model=gpt-6-astra session=01a0fc7d-066c-7e11-adfa-c0235c81ce5d date=2026-10-02 -->
# code-review — runbook-english-only (round 1)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript, except two placeholder provenance lines the reviewer printed at its top (`provider=openai model=unknown session=unknown`), omitted so they cannot be read as this document's provenance; they remain in code-review-v1-raw.txt.


Review destination: `apriori/changes/runbook-english-only/review/code-review-v1.md`. Not written: this session is read-only. Under RUNBOOK §1 R2, the producer should land this body verbatim, recorded on behalf of the reviewer.

Two substantive issues remain.

1. **CA-01 — Both delta stamps are unusable; closeout is blocked.**  
   Line 1 of both [check/spec.md](/root/terra/wt-ca/apriori/changes/runbook-english-only/specs/check/spec.md:1) and [protocol/spec.md](/root/terra/wt-ca/apriori/changes/runbook-english-only/specs/protocol/spec.md:1) nests a complete stamp inside another comment:
   `<!-- apriori-base: <!-- apriori-base: sha256:… --> -->`

   The parser recognizes neither as a stamp. Direct parsing returns `stamp: null` for both; the requested `gate --change runbook-english-only --json` reports C7 blocked for both unstamped mutation deltas. This follows from the file contents and parser, not a sandbox failure. The change cannot complete its required closeout with these artifacts.

   **Fix:** replace each nested line with the complete output of `apriori stamp <corresponding-store-file>`, exactly once, then verify C7 passes without a waiver. C8’s missing review summary is expected during this review and is not a separate finding.

2. **CA-02 — The effective contract still requires the deleted Chinese runbook.**  
   The migration of assertions is not fully reflected in the contract:
   
   - [PR-51](/root/terra/wt-ca/apriori/changes/runbook-english-only/specs/protocol/spec.md:155) still requires the **CN** kickoff, R3, Reality Check and follow-up text, while its replacement test checks English.
   - The source-intake requirement still says “Both editions’ Ground”; PR-60 still requires “both P3 blocks.” Other runbook scenarios retain “either language.”
   - The live [CK-17 requirement](/root/terra/wt-ca/apriori/specs/check/spec.md:88) says “Both runbooks SHALL contain every canonical phrase.” Its test was narrowed to English, but its requirement block is omitted from the check delta.

   These are acceptance obligations targeting a file PR-63 now forbids. Passing tests therefore do not establish the contract as written.

   **Fix:** finish the runbook-edition substitutions, including a MODIFIED block for CK-17. Preserve scenario IDs, semantic obligations, bilingual operator/concepts requirements, and deprecated blocks.

Examined surfaces:

- Reviewed all 23 edited test-file diffs against `v6-dev`, including the six inventory exceptions. PR-51 and PR-09 receive English assertions; the other four exceptions retain equivalent English coverage. Spot-checked mirrored assertions and meaning tables. Found no additional lost English obligation or emptied test.
- Traced verdict phrases, `< /dev/null`, codex forms, links/fragments and CK-11 through `lib/check.js`. English enforcement remains connected; missing RUNBOOK.md still fails CK-11 when package version metadata is available. CK-23 is inside `if (self)` and does not run in consumer mode.
- Confirmed P3 bytes match the baseline; SHA-256 begins `97a85ca560d41c70`.
- Confirmed scenario IDs survive the supplied MODIFIED blocks. Other Chinese documentation checks remain. The live-document scan found no remaining link to the deleted runbook; MIGRATING’s retirement reference is appropriate. Historical records and deprecated blocks are unchanged.

Not examined: full-suite execution, package installation at runtime, agent execution quality, credentials, human-note files, or other changes’ review transcripts. The reported 872/872 result is producer evidence, not independently reproduced here.

Advisory: CHANGELOG’s “agents never read the Chinese edition” exceeds the evidence. Previously, README_cn explicitly directed agents there. “The Chinese runbook was never installed by init/update” accurately states the verified boundary.

VERDICT: 2 issues open
