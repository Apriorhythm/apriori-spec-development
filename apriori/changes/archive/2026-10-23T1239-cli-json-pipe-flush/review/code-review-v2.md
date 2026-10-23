<!-- provenance: provider=anthropic model=claude-opus-5-5 session=unknown date=2026-10-23 -->

# code-review v2 — cli-json-pipe-flush

**Scope (RUNBOOK §4, round 2):**
- the open finding JP-R1;
- the fix diff `git diff 40f89ae..1a91910` (`bin/apriori.js`, `test/cli-json-pipe-flush.test.js`, delta `specs/cli/spec.md`, `CHANGELOG.md`, `flow-state.md`) and its impact chain;
- the adopted advisories A1–A4.

**Gate at 1a91910:** BLOCKED only on C8, because no review round has completed yet. C5 passes, C7 passes (the delta stamp is valid), C9 passes. Full suite `node scripts/run-tests.mjs`: 900/900 as root.

**How I re-ran CL-20:** read-only, from `git archive 1a91910` copies under /tmp.
- A copy as committed, run as root and as `nobody`.
- The same copy with `bin/apriori.js` replaced by the v6-dev version, run as root and as `nobody`.

## JP-R1 — NOT ADDRESSED

**What was done.** The new CL-20 no longer depends on uid or file modes:
- It now runs the uncaught-error path as root as well. That part of JP-R1 is fixed.
- It asserts exit `=== 2`, stdout `> 65536`, that the envelope parses, and that it carries the injected message.
- It has a text twin that checks stderr.
- The scenario's THEN was tightened to match.

**What still fails.** It still does not discriminate. The new CL-20 passes against the v6-dev `bin/apriori.js` (the pre-fix entry point):

| bin | root | nobody |
|---|---|---|
| 1a91910 | CL-19 pass, CL-20 pass | CL-19 pass, CL-20 pass |
| v6-dev `bin/apriori.js` | CL-19 **fail**, CL-20 **pass** | CL-19 **fail**, CL-20 **pass** |

**Why: the truncation point depends on the reader, and it is not 64 KiB under `spawnSync`.** A parent that reads concurrently lets libuv's write loop push past one pipe buffer before `process.exit()`. I injected an uncaught error with a message of length N into the pre-fix entry point, 20 runs per cell, under `spawnSync`:

| N (message bytes) | pre-fix `--json` stdout bytes | pre-fix text stderr bytes | post-fix |
|---|---|---|---|
| 70,000 (the test's size) | 70,601 (whole, 20/20) | 70,014 (whole, 20/20) | whole |
| 200,000 | 146,176 (truncated, 20/20) | 146,176 (truncated) | whole |
| 1,000,000 | 146,176 (truncated, 20/20) | 146,176 (truncated) | whole |

Through `| cat`, the same 70,000-byte case does truncate at 65,536. That is why the threshold looked like 64 KiB in round 1.

**Consequences:**
- The 70,000-byte marker sits between the two ceilings. The `> 65536` guard in the test does not ensure the test can fail.
- The `flow-state.md` decision line "证据：换回 v6-dev 的 bin 时 CL-20 变红" ("evidence: CL-20 turns red when the v6-dev bin is swapped in") does not reproduce on this host.
- My own round-1 suggestion ("a message over 64 KiB") was itself too low a bar. That part of the miss is mine.

**Risk (unchanged in kind).** A regression that reverts the rejection handler to a bare `process.exit(2)` still leaves CL-20 green. The error-path half of the requirement still has no test that can detect a regression.

**Suggested fix:**
1. Raise the injected message well past the reader-dependent ceiling. 1,000,000 bytes is truncated 20/20 pre-fix and whole post-fix, for both the `--json` and the text twin.
2. Change the size guard from `> 65536` to the injected size, for example that stdout contains the whole marker. The `includes(marker)` / `marker.slice(-200)` checks already do this once the marker is large enough.
3. Change the scenario THEN's "an envelope larger than 64 KiB" to a size large enough that the pre-fix entry truncates it under the test's own reader.
4. Record a red-on-v6-dev check that can actually be reproduced, with the command used.

## New substantive issues

None.

## Impact chain of the round-1 fixes

- **A1 (an empty `'error'` listener on each stream that is still queued):** Verified with the committed `exitWhenDrained`, copied byte-identical into a synthetic script. Both streams had 300 KB queued, and the stdout reader closed after 10 bytes. Before this fix the exit code was 1 and stderr was cut at 65,536 bytes. Now the exit code is 5 and stderr arrives whole (300,000 bytes). Single-stream early-close cases are unchanged: `head -1`, `head -c 1`, `true`, a destroy after 1 s, and a destroy after one chunk all exit 0 with empty stderr. A reader that reads fully receives 276,158 bytes. The listener is attached only to streams that are still queued, right before exit, so it hides no error earlier in the run.
- **A2 (comment and CHANGELOG wording):** Done. The wording now matches the code.
- **A3 (byte counts):** Done in the spec Notes (90-change fixture: 276,158 bytes to a file, 65,536 through a pipe) and in `flow-state.md`.
- **A4 (CL-19 asserts `changes.length === 90`):** Done. It still fails red on the v6-dev bin (see the table above).
- **CHANGELOG:** The new claim "exit codes are unchanged — a reader that closed early included" matches the behavior I observed. No test injects an early-closing reader (see advisory B2).

## Risk surfaces examined

- JP-R1's re-run: the committed CL-20 as root, as `nobody`, and against the v6-dev bin.
- The pre-fix truncation point under `spawnSync` vs `| cat`, at three message sizes, 20 runs per cell.
- A1 behavior when both streams are queued and the stdout reader closes early.
- Single-stream EPIPE and readers that close early.
- That the committed `exitWhenDrained` is identical to my synthetic copy.
- The CL-20 preload's path match: `path.join` is used both in the preload and in `lib/status.js`, so it should also match on Windows.
- The quoting of `NODE_OPTIONS=--require "<path>"`.
- The scenario text against the test.
- The CHANGELOG and spec Notes against what I observed.
- The full suite and the gate.

## Risk surfaces not examined

- Windows and macOS runtime (no hosts). On those platforms the reader-dependent truncation point may sit elsewhere, which is another reason to pick a large injected size.
- Node versions other than v24.13.0.

## Advisories

- **B1 (advisory) — CL-19 has a thin margin.** Its 276,158-byte fixture fails pre-fix here, but it is only about 1.9× the 146,176-byte ceiling observed under `spawnSync`, and that ceiling depends on timing and the host. A larger fixture (for example 250+ changes, or longer bodies) would make CL-19's red-on-pre-fix robust on faster readers. The same applies to the requirement's "past the kernel's 64 KiB pipe buffer" framing: through a pipe, the amount lost depends on how fast the reader drains it.
- **B2 (advisory) — the A1 exit-code guarantee has no test.** The guarantee is in the CHANGELOG and the code comment but not in the contract. I checked it by hand (above). An optional test would be a spawn whose stdout is destroyed after the first chunk, asserting the exit code.
- **B3 (advisory, paperwork) — `flow-state.md` was damaged by an edit splice.** The Reality Check "来源" (source) line is cut off after "…status-last-recorded/`（". Its tail became a stray heading, `## Open 第 23 行）；人类 2026-10-23 原话…`, so the file now has two `## Open` headings. `apriori status --json` shows that the three lines after the stray heading are no longer in the reality view: the reproduction ("复现…"), "decision: approach…" and "observed: Build…". Repair this before archive, which freezes the bundle.

VERDICT: 1 issue open
