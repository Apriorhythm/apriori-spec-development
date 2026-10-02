<!-- provenance: provider=codex model=gpt-6-astra session=01a0fd3f-14d0-7460-8c18-7a0bdbb927db date=2026-10-02 -->
# code-review — batch-review-fixes (round 1)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript (the final message, after `tokens used`), except one placeholder provenance line the reviewer printed at its top (`provider=openai model=unknown session=unknown`), omitted so it cannot be read as this document's provenance; it remains in code-review-v1-raw.txt.


Intended path: `apriori/changes/batch-review-fixes/review/code-review-v1.md`. Not written: this sandbox is read-only. Per RUNBOOK R2, the producer can land this report verbatim.

Three substantive issues remain. They concern implementation details; the batch does not require a different approach or a split.

1. **BRF-R1 — P2: guide adoption can overwrite an external file through a raced symlink.**

   The new adoption branch in [lib/update.js](/root/terra/wt-fix/lib/update.js:95) checks the guide’s hash and calls `refresh`. That function independently reads the pathname and then opens it for an ordinary truncating write at [line 27](/root/terra/wt-fix/lib/update.js:27).

   Repeatable interleaving: an unlisted guide contains an earlier recognized shipped edition; obstruction and hash checks succeed; after `refresh` reads the target, another process replaces it with a symlink to a writable external file; `writeFileSync(target, want)` follows that symlink and overwrites its target.

   This is the same adversarial condition behind **guide-1**, now reachable through the newly added **guide-2** adoption path. Exclusive first creation fixes the original installation race, but does not protect adoption. The documented residual—creating a new external file after a parent-directory swap—does not cover this existing-file overwrite.

   **Suggested fix:** preserve validated file identity through ownership verification and writing, rejecting symlink substitution rather than reopening the checked pathname normally. Add an adoption regression that injects substitution immediately before writing and asserts the victim remains unchanged. PW-01’s injection covers first creation; PW-02 does not cover this branch.

2. **BRF-R2 — P2: init’s early manifest can strand command files created later in the same failed run.**

   [lib/init.js](/root/terra/wt-fix/lib/init.js:140) now writes the manifest before installing tool commands. Command entries still wait for the final manifest write.

   Concrete entry-point scenario:

   - Start without an `apriori/` scaffold, with a regular file obstructing `.cursor`.
   - Run `apriori init --tools claude,cursor --yes`. Preview succeeds because creating absent pointer paths is simulated.
   - The real run installs and records the runbook and guide, then creates both Claude command files.
   - Creating Cursor’s rules directory fails. The final manifest write never runs.
   - Repair the obstruction and retry init, then update.

   Init skips the existing Claude commands and does not record them. Update sees an existing manifest, so its command-adoption condition (`manifest === null`, [lib/update.js:67](/root/terra/wt-fix/lib/update.js:67)) rejects them as unmanaged. Ordinary retries therefore leave tool-created commands outside managed updates.

   Before this change, that fresh-project failure left no manifest, allowing update’s shipped-generation adoption to recover those commands. The new early write removes that recovery.

   **Suggested fix:** retain ownership records for command files created after the early manifest when a subsequent step fails. Cover a failure after one selected tool’s commands have been installed, then assert that retries retain their managed ownership. PW-01’s new failure assertion stops before command creation and misses this regression.

3. **BRF-R3 — P2: CK-11’s fence reader mistakes quoted content for a closing delimiter.**

   [lib/check.js](/root/terra/wt-fix/lib/check.js:261) strips blockquote markers from every line, including lines already inside a top-level fenced block. For package version `6.2`, this header incorrectly satisfies CK-11:

   ```markdown
   # Runbook
   ~~~
   > ~~~
   > `runbook-version: 6.2`
   ~~~
   ```

   The second line opens a top-level fence. Within it, `> ~~~` is literal code content, not a closing delimiter. The implementation removes `> `, closes its fence state, and admits the following fenced version entry.

   This leaves **check-self-4** incomplete within CK-11 itself; it is not the shared-reader work deferred to FU-1. The new tests cover a fence inside a blockquote, but not blockquote-looking content inside a top-level fence.

   **Suggested fix:** track the opening fence’s container context and recognize its closing delimiter in that context. Add the example above as a missing-version case. The CHANGELOG’s “every CommonMark fence” claim should match the corrected behavior.

**Coverage and disposition.** I read the required report’s table and all 19 failure scenarios, the five delta specs, changed implementation and tests, relevant callers, shipping documentation, and this change’s flow-state.

| Original findings | Review assessment |
|---|---|
| check-self-1, check-self-2 | Contract now states major.minor and whole-verdict recognition. |
| check-self-3 | Presence check fixes empty mirrors; CK-08 asserts failure. |
| check-self-4 | Original simple tilde case addressed; BRF-R3 remains. |
| guide-1 | Exclusive creation protects the original leaf-substitution case; the broader adoption surface has BRF-R1. |
| guide-2 | Exact-byte guide recovery is implemented; early init persistence introduces BRF-R2. |
| guide-3, guide-4 | Missing/obstructed guide summary and shared doctor/update obstruction judgment address the reported cases. |
| goal-1, shipping-docs-1, shipping-docs-2 | Recipe bounds, terminal outcomes, and escalation definitions are aligned in both languages. |
| PW-1, PW-2 | Owner precedence and standalone-walk registration are explicit; unsettled rows remain listed by ID without creating a change. |
| SST-1 | Rewritten protocol scenarios agree with the inspected runbook and tests. |
| SST-2, SST-3, SST-4, SST-5, SST-6 | Added assertions directly guard the previously omitted procedure, safety instructions, installed bytes, open-item handoff, and doctor outcomes. |

All replaced requirement blocks preserve their store scenario IDs; the CK-11 requirement rename maps correctly. Operator EN/CN recipe blocks are byte-identical. UP-09’s guide-adoption expectation and operator-move’s revised launch sentence follow the intended contract. Successful init’s final merge and dry-run behavior remain intact by inspection.

The requested `gate --change batch-review-fixes --json` reports C7 and C9 passing, C1 skipped without a test command, and C8 blocked pending this review document. These are not additional product findings.

**Limits.** Findings rest on static entry-point/control-flow evidence. I did not rerun the reported 883 tests or mutation checks, perform filesystem race experiments, or execute a live prototype walk. Credentials, human-note files, raw review transcripts, and other changes’ documents were not read. FU-1 remains an acceptable separate boundary; it does not excuse BRF-R3.

**Advisories:** none.

VERDICT: 3 issues open
