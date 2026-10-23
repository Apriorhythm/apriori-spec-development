<!-- provenance: provider=anthropic model=claude-opus-5-5 session=unknown date=2026-10-23 -->

# code-review v3 — cli-json-pipe-flush

**Scope (RUNBOOK §4, round 3):**
- the open finding JP-R1;
- the fix diff `git diff 1a91910..311f27e`, which touches the test, the delta spec and `flow-state.md`;
- the producer's account of why CL-21 cannot tell whether the A1 listener is there.

`bin/apriori.js` is unchanged since 1a91910.

**Gate at 311f27e:** BLOCKED only on C8, because no review round has completed yet. C3, C5, C7 and C9 pass. Full suite `node scripts/run-tests.mjs`: 901/901 as root.

**How I ran it:** read-only. I made three `git archive 311f27e` copies under /tmp:
- as committed (`new`);
- with `bin/apriori.js` replaced by the v6-dev version (`pre`);
- as committed with the A1 `stream.on('error', () => {})` removed (`nolis`).

The repository working tree was not modified. I did not swap `bin/apriori.js` in place.

## JP-R1 — ADDRESSED

| copy | root (3 runs) | nobody |
|---|---|---|
| `new` (311f27e) | CL-19 pass, CL-20 pass, CL-21 pass | CL-19 pass, CL-20 pass, CL-21 pass |
| `pre` (v6-dev bin) | CL-19 **fail**, CL-20 **fail**, CL-21 pass | CL-19 **fail**, CL-20 **fail**, CL-21 pass |
| `nolis` (listener removed) | CL-19 pass, CL-20 pass, CL-21 pass | CL-19 pass, CL-20 pass, CL-21 pass |

Why it is now addressed:
- **CL-20 can now fail on the pre-fix code.** It fails on the pre-fix bin whatever the uid. The 1,000,000-byte marker is far past the ~146 KiB the pre-fix entry got through under a concurrently reading `spawnSync` (round 2). Both the `--json` check and the text twin require the **whole** marker, so no byte-count guard is left that could pass on truncated output.
- **The uid dependence is gone.** The root early-return and the `chmod` step were removed.
- **Exit codes are asserted exactly:** `=== 2` for the uncaught error, 0 for text, 2 for the unknown subcommand.
- **The scenario's THEN matches the test.**
- **CL-19 is robust now.** The 300-change fixture gives 920,438 bytes of `status --json`, about 6× the observed ceiling. CL-19 fails on the pre-fix bin, and `changes.length === 300` checks completeness, not just that the JSON parses.

## The producer's account of CL-21 and the A1 listener: confirmed

I tested it with a probe script that copies `exitWhenDrained` exactly. Each run queued 300 KB on both streams, and the stdout reader closed after 10 bytes while stderr was read late. Five runs per cell:

| writes via | with listener | without listener |
|---|---|---|
| `console.log` / `console.error` | exit 5, stderr whole (300,001 bytes) | exit 5, stderr whole (300,001 bytes) |
| raw `process.stdout.write` / `process.stderr.write` | exit 5, stderr whole (300,000 bytes) | **exit 1**, stderr cut at 65,536 bytes |

So Node's Console does swallow an asynchronous EPIPE on its own writes. The round-1 A1 failure only happens with raw writes.

That was my round-1 synthetic: I wrote A1 from a raw-write probe, and apriori itself was never exposed to it. apriori prints only through console in-process. The only raw `process.stdout.write` in `lib/` is `lib/id-match-child.js`, which runs as a separate child process and exits naturally.

CL-21 does reach the condition it describes. I ran a CL-21-equivalent harness with an extra preload that turns `console.log` into a raw `process.stdout.write`:
- with the listener removed, it exits **1**;
- with the listener, it exits 0;
- with the plain console path, it exits 0 with or without the listener.

So CL-21 is a real end-to-end guard of the exit-code guarantee. It would catch a later change to raw writes combined with removing the listener. It does not distinguish the listener line today, and it is green on the pre-fix bin. The delta's Notes say both of these. The account is accurate and honest.

**Is the contract wording honest?** Yes. "A reader that closes early SHALL not change the exit code" holds on the code and is shown end-to-end by CL-21 (exit 0). The Notes correctly mark the listener as a guard for future direct writes, not as the mechanism that matters today, and they record which tests go red on the pre-fix bin, which matches my table.

## New substantive issues

None.

## Risk surfaces examined

- CL-19, CL-20 and CL-21 on the committed bin, the pre-fix bin and the no-listener bin, as root (3 runs each) and as `nobody`.
- Console vs raw writes, with and without the listener: the 2×2 probe above, 5 runs per cell.
- Whether CL-21 reaches the both-streams-queued EPIPE condition: the raw-console harness.
- Whether apriori writes anything raw in-process: the only raw write is `lib/id-match-child.js`, out of process.
- The CL-19 fixture size.
- The flow-state repair (B3): one `## Open` heading; `status --json` shows 5 observed and 6 decision lines, 0 malformed, 0 open items. The reproduction, approach and Build lines are back in the reality view.
- Whether the requirement, scenario and Notes texts match the code and the tests.
- The gate and the full suite.

## Risk surfaces not examined

- Windows and macOS runtime (no hosts).
- Node versions other than v24.13.0. The Console behavior that swallows EPIPE belongs to Node internals, so the fact that the listener cannot be told apart today may differ on other versions. The listener covers that either way.

## Advisories

- **C1 (advisory) — CL-19 wording.** The CL-19 scenario title still says "past 64 KiB", while its body and the requirement no longer frame the limit that way. Consider retitling it "arrives whole and parses".
- **C2 (advisory) — numbers in a SHALL sentence.** The requirement's parenthetical "(65,536 bytes through `| cat`, more under a concurrently reading parent)" puts byte counts specific to this host inside a SHALL sentence. They read better in the Notes.
- **C3 (advisory, paperwork) — round-1 decision line in `flow-state.md`.** It still records "证据：换回 v6-dev 的 bin 时 CL-20 变红" ("evidence: CL-20 turns red with the v6-dev bin swapped in") for the 70,000-byte version, which round 2 showed does not reproduce. The round-2 observed line records the miss. A short note on the round-1 line would stop a later reader taking it at face value.

VERDICT: no spec-vs-code gaps
