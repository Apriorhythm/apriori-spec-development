<!-- provenance: provider=codex model=gpt-6-astra session=01a0fd3f-14d0-7460-8c18-7a0bdbb927db date=2026-10-02 -->
# code-review — batch-review-fixes (round 4)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript (the final message, after `tokens used`), except one placeholder provenance line the reviewer printed at its top (`provider=openai model=unknown session=unknown`), omitted so it cannot be read as this document's provenance; it remains in code-review-v4-raw.txt.


Review body for `apriori/changes/batch-review-fixes/review/code-review-v4.md`.

**BRF-R4 — ADDRESSED.**

The pathname fallback no longer authorizes a write. In `lib/managed.js`, `writePlain` opens without truncation and requires a regular file, matching device/inode, exactly one hard link, and descriptor-derived containment. Missing descriptor location returns `unconfirmed` before truncation or writing. Restoring an internal pathname after opening an external file therefore cannot authorize the external overwrite reported in round three.

`lib/update.js` maps refused writes to `CHANGED`, `LINKED`, or `UNCONFIRMED`. The adoption branch records none of those outcomes, and listed-guide entries remain unchanged. Dry-run predicts the hard-link and unavailable-location refusals; the summary includes `not refreshed` among blocked actions, preventing an “everything already matches” conclusion over those skips.

PW-02 now exercises the decisive interleaving: redirect the parent around each open and restore it immediately afterward. It covers both available and unavailable descriptor location, asserting unchanged external bytes and no adoption. These assertions distinguish the corrected implementation from the former pathname-authorized write. Additional cases cover:

- Matching dry-run and real-run refusals without descriptor location, preserving guide bytes and manifest entry.
- An already-current guide remaining `up-to-date`.
- Delete-and-init recreating and recording the guide.
- Hard-linked guides being refused in dry and real runs, preserving the other link’s bytes.

The updated delta explicitly states the platform cost: without descriptor location, an outdated guide requires delete-and-init instead of an in-place refresh. MIGRATING, CHANGELOG, and both CLI editions disclose that behavior. This fulfills the requested fail-closed correction rather than leaving the overwrite vulnerability as a documented residual. The separately stated exclusive-create residual remains unchanged.

**New substantive findings:** none within the round-four scope.

**Scope and limits.** Reviewed the revised helpers, update branches and summary, new PW-02 assertions, update delta, shipping documentation, and disposition/progress entries. Conclusions rest on static control-flow and assertion review; I did not independently rerun the reported suite or mutation checks. No files were modified, and credentials, human notes, and raw review transcripts were not read.

**Advisories:** none.

VERDICT: no spec-vs-code gaps
