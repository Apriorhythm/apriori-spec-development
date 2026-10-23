<!-- provenance: provider=anthropic model=claude-opus-5-5 session=unknown date=2026-10-23 -->

# code-review v1 — cli-json-pipe-flush

**Reviewed:** `git diff v6-dev...HEAD` (v6-dev@d44a0c2 → 40f89ae on `feature/cli-json-pipe-flush`). The diff touches five files: `bin/apriori.js`, `test/cli-json-pipe-flush.test.js`, the delta `specs/cli/spec.md` (CL-19, CL-20), `flow-state.md` and `CHANGELOG.md`. Gate (`apriori gate --change cli-json-pipe-flush --json`): BLOCKED only on C8, because no review round has landed yet. C7 passes (the delta stamp matches the living `apriori/specs/cli/spec.md`). C9 passes (`## Open` is empty). C1 was skipped (no test-cmd).

**Read-only checks I ran (my probes were under /tmp, the repository was not modified):**
- Full suite `node scripts/run-tests.mjs`: 900/900 as root.
- The new test file run as `nobody`, on a `git archive HEAD` copy: 2/2.
- The same test file run as `nobody` against a copy whose `bin/apriori.js` is the v6-dev version: CL-19 fails, **CL-20 passes**.
- Pre-fix vs post-fix entry point on the 90-change fixture:
  - `status --json` to a file: 276,158 bytes with both versions.
  - Through `| cat`: pre-fix gives 65,536 bytes and does not parse. Post-fix gives 276,158 bytes and parses.
- A probe that forces an uncaught error with a ~200 KB message: a `--require` preload makes `readFileSync` throw for `c000/flow-state.md`.
  - JSON on stdout through a pipe: pre-fix gives 65,536 bytes, exit 2, does not parse. Post-fix gives 200,602 bytes, exit 2, parses.
  - Text on stderr through a pipe: pre-fix 65,536 bytes, post-fix 200,015 bytes.
- Readers that close early or never read, both versions:
  - `| head -1`, `| head -c 100`, `| true`, `| sleep 2`.
  - A spawn harness with a reader that never reads, one that closes after 1 s, and one that reads one chunk then closes.

The fix is correct on both paths. The one issue below is about the evidence for CL-20, not the code.

## Substantive issues

- **JP-R1 — CL-20 cannot fail on the code it claims to evidence, and skips its uncaught-error check when run as root.**
  - **Description:** The requirement says the uncaught-error path drains too, and that an uncaught error exits 2 "with the JSON envelope of the view that was asked for still printed whole". CL-20 is titled "the uncaught-error path drains its envelope too". Its test does not show this:
    1. When run as root it restores the file mode and `return`s before it reaches the uncaught path. The producer's 900/900 and this review's run were both as root, so the error-path half has not run in the evidence cited in `flow-state.md`.
    2. Run as non-root it does reach the uncaught path (EACCES → bin's rejection handler → `jsonError` → exit 2). But the envelope is a few hundred bytes. libuv writes that in full synchronously even before the fix, so the test passes against the v6-dev `bin/apriori.js` (verified as `nobody`).
    3. It accepts exit `0` or `2`, and it passes if stdout is empty, so it is weaker than the requirement ("2 on an uncaught error, with the envelope printed whole"). The scenario's THEN was written to the same loose bar ("exits 0 or 2 with whatever JSON it prints"), so the contract weakens its own requirement.
    4. On Windows, `chmod 0o000` does not block reads, so the step passes there without reaching the error path either.
  - **What this is not:** The unknown-subcommand → 2 and text `status` → 0 checks do hold. They are success-path return codes, not the uncaught-error path.
  - **Risk:** The error-path half of the requirement has no evidence that could detect a regression. If someone later reverts the rejection handler to a bare `process.exit(2)`, or moves `exitWhenDrained` to the success path only, the whole suite stays green. "JP-1 closed by CL-19/CL-20" overstates what CL-20 shows.
  - **Suggested fix:** Make CL-20 deterministic and independent of uid, and large enough to discriminate. Spawn the child with `NODE_OPTIONS=--require <fixture>`, where the fixture makes one read throw an `Error` with a message over 64 KiB (or use any other injection that does not depend on file permissions). Then assert:
    - exit `=== 2`;
    - stdout `> 65536` bytes;
    - stdout parses;
    - `errors[0]` carries the injected message.

    Optionally add the text twin (no `--json`: stderr is complete and exit is 2). This probe fails on v6-dev and passes on 40f89ae (verified above). Tighten CL-20's THEN to "exits 2 with the envelope whole" to match the requirement. Remove the root early-return, and remove the `chmod` step or keep it only as an extra check.

## Risk surfaces examined

- **Hang on a dead or closed reader (EPIPE):**
  - When stdout is the only stream with queued bytes and the reader exits early (`head -1`, `head -c 1`, `true`, `destroy()` after one chunk or after 1 s), the empty write's callback fires with the error. `done` then calls `process.exit(code)` before the stream's `'error'` event is emitted. Exit code is unchanged (0), nothing is printed to stderr, and there is no hang.
  - A reader that holds the pipe open and never reads now blocks the CLI until it reads or closes, where before the output was silently dropped. This is ordinary pipe backpressure, and the requirement text says it ("the exit waits"). The in-repo callers (`spawnSync` in spec-runner and gate, test harnesses) read concurrently. Not a defect.
- **The `done` counter with both streams pending:** Callbacks run asynchronously, so `pending` reaches 2 before either fires, and exit happens only after both. A synthetic probe wrote 300 KB to each piped stream: both arrived complete with exit code 5. The one failure mode is in the advisories (A1).
- **`process.exitCode` plus a natural exit instead:** No timers, servers or lingering handles in `lib/`. The `readline` in `init` is closed, and the matcher child is `spawnSync`. A natural exit would probably also work, but the explicit exit after drain is the safer choice. No finding.
- **Other `process.exit` sites:** None in `lib/` except `lib/id-match-child.js`. It exits 1 only on bad input, with no output, and its success path writes and then exits naturally. `scripts/*` are dev tools. Nothing gets around the drain.
- **The 64 KiB threshold across platforms:** The fixture is ~276 KB, more than 4× the Linux default pipe buffer, and above macOS's 16–64 KiB. The `> 65536` guard keeps the test honest. The mechanism (`writableLength`) does not depend on the platform.
- **Contract vs code:**
  - The requirement text matches the code for both paths and both streams, and exit codes are unchanged.
  - CL-19's test asserts its scenario: exit 0, more than 65,536 bytes, parses. It fails before the fix and passes after.
  - CL-20: see JP-R1.
- **Scope:** One function, two call sites, one test file, one CHANGELOG entry. No promises or mechanisms beyond JP-1, and one evidence chain proves it. No SPLIT needed.
- **Safety:** No new external input, permissions, secrets or injection surface.

## Risk surfaces not examined

- Windows runtime behavior (no Windows host). Whether pipes and TTYs are synchronous or asynchronous there was not observed. The fix keys on `writableLength`, so it should cover both.
- Node versions other than v24.13.0, in particular whether older Node versions run the queued write callbacks before emitting `'error'`. The `engines` floor was not checked against this.
- macOS was not run.

## Advisories

- **A1 (advisory) — exit code when both streams are pending and one hits EPIPE.** If both stdout and stderr hold more than a pipe buffer at exit, and the stdout reader closes early while stderr is still draining, stdout's unhandled `'error'` (EPIPE) fires while `pending` is still 1. The process exits 1 instead of `code`, and stderr is cut at 65,536 bytes. Reproduced with a synthetic script. With a no-op `'error'` listener the exit code stays correct. In apriori today no path writes large output to both streams (no `process.stderr.write` and no inherited child stdio in `lib/`), so I don't think it can happen today. A one-line `stream.on('error', () => {})` inside `exitWhenDrained` would make "exit codes unchanged" hold unconditionally.
- **A2 (advisory) — the comment and CHANGELOG say "a TTY or a file writes synchronously / exits at once".** That is POSIX behavior. On Windows a TTY write is asynchronous, so the code will (correctly) wait there. Consider wording it as "when nothing is queued".
- **A3 (advisory) — the byte count in the docs does not match the fixture.** `flow-state.md` and the spec Notes give "95,780 bytes to a file" for the 90-change fixture. The committed fixture produces 276,158 bytes here. Probably a different ad-hoc probe; worth aligning so the numbers can be reproduced.
- **A4 (advisory) — weak structural assertion in CL-19.** `assert.ok(Array.isArray(parsed) || typeof parsed === 'object')` adds nothing beyond `JSON.parse` succeeding. Asserting the expected shape (for example, the change count is 90) would show that the whole envelope arrived, not just valid JSON.

VERDICT: 1 issue open
