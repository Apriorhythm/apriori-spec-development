<!-- provenance: provider=anthropic model=claude-opus-5-5 session=unknown date=2026-10-23 -->

# code-review v1: status-last-gate-order

Reviewed `git diff v6-dev...HEAD` in `/root/terra/wt-lg1` (a086686 on top of d44a0c2) against `apriori/changes/status-last-gate-order/specs/status/spec.md`, the change's `flow-state.md` (`## Open` is empty) and `apriori gate --change status-last-gate-order --json`. I worked read-only.

## What I ran and observed

- **Full suite.** `node scripts/run-tests.mjs` passed 900 of 900. That includes `json-contracts` (`lastGate: 'string|null'`), `accept-r1-contracts` (`STATUS_VIEW_KEYS` still lists `lastGate`), `status.test.js` (`last decision:.*owner: approved`), `flow-corpus` FC-21, `status-last-recorded` and the new `status-last-gate-order`.
- **Gate.** `gate --json` returned BLOCKED on C8 only, because no review round has landed yet. C1 was skipped (no test-cmd). C3, C7 and C9 passed.
- **Archive dry-run.** `archive --change status-last-gate-order` showed `merged (ADDED)` and `modified (MODIFIED)` and no DROPPED. It was NOT READY only on R4, the missing review. The base hash `882735da…` equals the sha256 of the current `apriori/specs/status/spec.md`.
- **MODIFIED requirement against the base.** I diffed the requirement text with Python. Only two things changed: the last sentence of the requirement body (`keep their meaning` became `are the latest owner decision (the requirement below), not this time`) and ST-42's title and THEN. ST-41 and ST-43 are byte-identical to the base. ST-44 already exists in the base, so the new IDs ST-45 and ST-46 do not collide with it.
- **Edge probes of `parseFlowState(...).lastGate`** (node one-liner, read-only). All matched the contract:
  - compact `T0930` against colon `T09:15` on the same day: the compact later stamp wins, so normalization works.
  - `T09:15` followed by `T0915`: the tie goes to the later line.
  - a day-only owner stamp gives `null`, because the owner-entry rule requires the minute.
  - a `*` bullet gives `null`, because gatesEntries only reads `- `.
  - an owner line inside an HTML comment is inert.
  - `note: owner: …` is not an owner entry.
  - CRLF input is read correctly.
  - with two `gates:` blocks, the stamp wins across blocks.
  - a payload written on the continuation line (`- 2026-09-27T11:00` then `owner: …`) is selected, because selection reads `ownerEntry(e.joined)` exactly as `evidenceAcceptances` and the other owner-decision readers do. It is rendered as the bare first line `2026-09-27T11:00` (see the second advisory).
- **Consumers of `lastGate`.** Searched `lib/`, `scripts/`, `templates/`, `docs/`, `guides/`, `RUNBOOK.md`, `MIGRATING.md` and `bin/`. The only consumers are `lib/status.js:172` (the text line, printed only when the value is truthy, so `null` means no line), `lib/status.js:268` (the JSON view) and `lib/status.js:311` (the error view, `null`). Nothing in gate, doctor, archive, hooks or the operator recipes reads it or relied on the old "textually last, notes included" meaning. The change only alters what is displayed. No decision path changes.
- **Old owner replaced.** The fixtures fail if the old rule were still live:
  - `latestowner`: the textually last line is a note.
  - `twoowners`: the textually last owner line is not the latest stamp.
  - FC-21: a note-only log now asserts `null`.
  - `tie`: catches a `>` bug, though it cannot tell the old rule apart because both rules pick the later line.
- **The three updated old assertions did not get weaker.** In `status-last-recorded` ST-42 and ST-43 the expected value is the same string as before; only the labels and comments changed. FC-21 kept the "a dated line outside the gates block never counts" guarantee (now with an owner-shaped line outside the block). It also gained a stronger expected value and a new `null` assertion.
- **Docs.** The sentence in `docs/cli.md` and `docs/cli_cn.md` ("latest **owner** entry by stamp, never a `note:`, tie to the later line, `null` without one") matches the code.

## New substantive issues

None.

## Risk surfaces examined

- Contract against code for every clause of the ADDED requirement and the modified ST-42: owner-entry rule, minute required, range check, fenced and commented lines inert, stamp order regardless of line order, tie to the later line, first line without its bullet, notes never shown, dated lines outside `gates:` never counted, `null` with no text line, `lastRecorded` unchanged.
- That the MODIFIED requirement keeps ST-41 and ST-43 identical, and that the archive dry-run drops nothing.
- Whether the entry selection agrees with the gatesEntries `joined` owner-decision readers, including continuation lines.
- `THHMM` normalization and the lexicographic comparison.
- Out-of-range or forged stamps.
- The JSON key and type contract, the list view and the error view.
- Every consumer that could have relied on the old meaning.
- Whether the rewritten tests still hold the guarantees they held before.
- The CN and EN docs against the code.

## Risk surfaces not examined

- The real-corpus claim ("4 of 20 in-flight changes") was not re-measured. That corpus is not in this worktree, and the in-repo bundles have no owner entries (`status --json` shows `lastGate: null` for all four).
- Archived bundles' `lastGate`: I did not check their rendering separately beyond the shared code path.
- No external input, permissions, secrets or injection surface is touched. The change is a pure read and display path.

## Advisories

- **Two meanings of "last decision".** The governance readers (`evidenceAcceptances` and FORCE in `lib/readiness.js`, the "last decision wins" wording in `docs/cli.md` §125/§165 and `MIGRATING.md:317`) resolve by append order, that is the textually last entry per target. `last decision:` now resolves by stamp across all owner entries. Take an owner whose `evidence-accept-revoke R-1` is appended later but stamped earlier than the accept. The item is then pending in force, but `last decision:` shows the accept. Nothing acts on `lastGate`, and the authoritative `open: [pending]` line prints beside it, so this is a display wording question, not a defect. One clause in the docs would remove the ambiguity: "the latest owner entry by stamp — not which decision is in force; per-item state is the `open:` lines".
- **Continuation-form owner entries show no decision text.** For `- <stamp>` followed by `owner: …` on the next line, `last decision:` prints only the stamp. This is what the contract pins ("rendered as the entry's first line"), and no such entry exists in the in-repo corpus. Rendering from the joined form would show the payload; it needs a contract edit if wanted.
- **Normalization has no test.** No ST-45 fixture mixes `THHMM` with `THH:MM`. My probe shows the normalization works, but nothing would fail if it regressed. Without normalization, `T0930` sorts before `T09:15`.
- **Stale comment and dead code in `lib/flow.js`.** The header comment at line 24 still says "`lastGate` is the last dated entry OF THE BLOCK". `DATED_RE` (line 38) is now unused.
- **Test comment mismatch.** In `test/status-last-gate-order.test.js` the comment above the `tie` fixture describes a day-only owner stamp, but the fixture contains none.
- **Duplicate `ownerEntry` call.** `lastDecision` calls `ownerEntry` again although `gatesEntries` already sets `e.stamp`. It is harmless, and `e.stamp` could be reused.

VERDICT: no spec-vs-code gaps
