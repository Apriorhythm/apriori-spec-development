<!-- provenance: provider=codex model=gpt-6-astra session=01a0fcbe-eb66-7a00-bdb0-d2de4f02bccc date=2026-10-02 -->
# code-review — prototype-walk-guide (round 2)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript (resumed session).

Round-2 review for `apriori/changes/prototype-walk-guide/review/code-review-v2.md`. Read-only: the producer must land this body under RUNBOOK §1 R2.

Re-read `git diff v6-dev...HEAD`, `git status`, and `git diff`.

| Finding | Disposition | Basis |
|---|---|---|
| PW-R1 | **ADDRESSED** | `guideObstruction` guards installation and every update branch before guide hashing/writing. PW-02 asserts matching-hash symlink targets remain unchanged, symlinked directories are rejected, directory obstruction permits runbook/manifest refresh to finish, and dangling links are reported. |
| PW-R2 | **ADDRESSED** | Scope and ruling are separate. Corrected defects remain `in` and require reconciliation against their ruling, including implementation and verification evidence. |
| PW-R3 | **ADDRESSED** | Cited screenshots must remain under archived `OUT/evidence/`; the entry, evidence field, screenshot procedure, and completion criteria agree. |
| PW-R4 | **ADDRESSED** | Same-version evidence is reused only for covered scope. Authorized continuation now includes uncovered/blocked paths, newly included pages, and previously unavailable runtime phases without another offer. |

**One substantive issue in the fix: PW-R5 — Continuing “the same checklist” conflicts with frozen archives.**

[Guide §9](/root/terra/wt-cb/guides/prototype-walk.md:147) directs a later change to continue by “adding rows to the same checklist.” Its [default output location](/root/terra/wt-cb/guides/prototype-walk.md:14) is inside the original change bundle. [RUNBOOK §4](/root/terra/wt-cb/RUNBOOK.md:321) expressly forbids writing anything back to an archived bundle.

A concrete sequence exposes the conflict: change A completes a walk covering page A and archives; change B adds page B to scope at the same prototype version and receives authorization to continue. Following the new continuation instruction modifies A’s frozen checklist. Preserving A leaves no specified writable continuation location, while the guide prohibits a second progress ledger.

**Risk:** the newly supported cross-change continuation either changes historical evidence or requires the agent to invent an exception to the guide.

**Suggested fix:** define continuation after archival explicitly. For example, create a successor checklist in the current change, preserve stable IDs and source/evidence references, identify it as the sole current progress source, and leave the archived predecessor immutable. Apply the same distinction when later reconciliation fills implementation and verification fields. No new CLI mechanism is needed.

**Examined:** shared obstruction handling and its init/update callers, manifest and dry-run interactions, new adversarial assertions, revised guide/contract/test wording, and the continuation rule’s interaction with archive immutability. No additional substantive issue found in those fixes.

**Limits:** no mutating reproductions, full-suite rerun, or new behavioral runs. The reported 881/881 and revert-to-failure result remain producer evidence. Earlier behavioral runs support the unchanged offer/read behavior, not the revised checklist lifecycle. Gate remains blocked pending the resolving review.

**Advisories:** none additional. The approach remains appropriate; PW-R5 is a lifecycle detail requiring correction, not escalation.

VERDICT: 1 issues open
