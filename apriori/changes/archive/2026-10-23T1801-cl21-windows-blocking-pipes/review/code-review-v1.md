<!-- provenance: provider=anthropic model=claude-opus-5-5 session=unknown date=2026-10-23 -->
# code-review v1: cl21-windows-blocking-pipes

## Scope

Branch `feature/cl21-windows` @ a0a0fc4, one commit on top of `v6-dev`@36e7c8c. Diff `v6-dev...HEAD`: 4 files, +59/−1.
- `test/cli-json-pipe-flush.test.js`: CL-21 gets `{ skip: WIN32_BLOCKING_PIPES }`, a comment above it, and the reason string.
- `CHANGELOG.md`: one new subsection.
- `apriori/changes/cl21-windows-blocking-pipes/specs/cli/spec.md`: a MODIFIED delta for "the CLI exits only after its output has drained".
- `apriori/changes/cl21-windows-blocking-pipes/flow-state.md`.

`bin/` and `lib/` are untouched (`git diff v6-dev...HEAD --stat -- bin lib` is empty). I read `bin/apriori.js` `exitWhenDrained` (lines 69–92) as context. I ran this review read-only on Linux (WSL2) with Node v24.13.0. No Windows host was available to me.

## What I ran and observed

1. **Delta against the store.** The delta's base stamp `sha256:086aa833…94c5` equals `sha256sum apriori/specs/cli/spec.md`. I extracted the requirement block from the store and from the delta and diffed them. They differ in exactly one line: CL-21's THEN gains the text from "— on POSIX only: …" to "…the test is skipped on `win32` and says why". The body, the CL-19 and CL-20 scenarios, and CL-21's title and WHEN are byte-identical. `verify --json` `modifiedIntegrity` agrees: retained CL-19/20/21, `titleChanged/dropped/added/ambiguous` empty, and one `missingLines` entry, which is CL-21's old THEN line. That line was replaced by its extended form, which is the intended edit.
2. **Test diff.** The CL-21 body after the `test(` line is identical to v6-dev (I diffed it with the old file: identical). `WIN32_BLOCKING_PIPES = process.platform === 'win32' && '<reason>'` evaluates to `false` everywhere except win32, so the skip is keyed only on `win32`.
   - `node --test test/cli-json-pipe-flush.test.js`: 3 tests, 3 pass, 0 skipped. CL-21 took 448 ms.
   - Simulated Windows: I ran the file with a preload that redefines `process.platform` as `'win32'` (`--test-isolation=none`). Result: 2 pass, 1 skipped. CL-21 printed `# stdio pipes are blocking on Windows: nothing is queued at exit, and the paused-stderr choreography deadlocks`. So the skip and its reason take effect on that key. This is a simulation, not a Windows run.
3. **Root cause, as far as Linux can establish it.** Node's docs are not on disk, but Node v24.13.0 embeds its `lib/` sources in the binary. I read them with `strings`:
   - `lib/internal/bootstrap/switches/is_main_thread.js` `createWritableStdioStream`: for `PIPE`/`TCP` the stream is a `net.Socket` on the fd. For `FILE` it is a `SyncWriteStream`, and for `TTY` a `tty.WriteStream`.
   - `lib/net.js` `Socket` constructor: `if ((fd === 1 || fd === 2) && (this._handle instanceof Pipe) && isWindows) { // Make stdout and stderr blocking on Windows; err = this._handle.setBlocking(true); … this._writev = null; this._write = makeSyncWrite(fd); … }`. `setBlocking` is the binding to libuv's `uv_stream_set_blocking`.
   - `makeSyncWrite(fd)` does a synchronous `writeBuffer(fd, …)` and then `cb()` or `cb(ex)`. The Writable's `length` is therefore back to 0 when `write()` returns, so `writableLength > 0` can never hold for a Windows pipe stdio stream. That is the basis for "nothing is queued at exit".
   - On Linux, the probe `node -p "process.stdout._handle.constructor.name" | cat` prints `Pipe`, and `_write` is not replaced. A child that writes 300 000 bytes to a stderr pipe the parent is not reading reports `process.stderr.writableLength` = 300000. This is the POSIX precondition CL-21 relies on, and it is absent on Windows by the code above.
   - `net.Socket` on the parent side calls `this.read(0)` at construction (`!options.manualStart`), so a paused child stream still buffers up to the default 64 KiB highWaterMark. A 300 KB synchronous child write exceeds pipe buffer + parent buffer, so it blocks until `resume()`. That is consistent with the claimed deadlock.
   - The CLI's Windows exit code after an early-closed reader: Console's `kWriteToConsole` adds a temporary `once('error', noop)` around `stream.write` and swallows a write error in its callback. A synchronous EPIPE from `console.log` therefore does not become an unhandled error. `exitWhenDrained` then sees `writableLength === 0` and calls `process.exit(code)`. This makes the "exits 0 on Windows" claim plausible from the code. `bin/` and `lib/` write the envelope via `console.log`; the only `process.stdout.write` is in `lib/id-match-child.js`, which is not on this path.
   - **Not verifiable from Linux:**
     - the actual hang on `windows-latest` and its cause;
     - the 120 s timeout on the Windows host;
     - "parent never received stdout's first chunk";
     - the 0.43 s stderr-flowing variant;
     - "EPIPE in 5 ms" and "412 ms, exit 0";
     - "CL-19/CL-20 pass on Windows".

     These come from the producer's experiments, and from my seat they are evidence by assertion. The source excerpts above are from Node 24.13.0 only. CI also runs Node 22, and I did not inspect a Node 22 binary. As far as I know this branch in `net.js` is long-standing, but I did not verify that here.
4. **Repository checks.**
   - `node scripts/run-tests.mjs`: tests 905, pass 905, fail 0, skipped 0.
   - `node bin/apriori.js check --self`: `RESULT: PASS` (one pre-existing note: 39 archived bundles without a manifest).
   - `node bin/apriori.js gate --change cl21-windows-blocking-pipes`: `GATE: BLOCKED (1 item(s))`, only C8 (no completed independent review round). C3 legal (review), C7 stamped, C9 no open items with risk contract-mutation on the MODIFIED requirement. C1 was skipped because no test command was passed.
   - `node bin/apriori.js archive --change cl21-windows-blocking-pipes` (dry run): `--- cli/spec.md / modified (MODIFIED): the CLI exits only after its output has drained`. Nothing removed or dropped. `NOT READY — nothing written`, with R4 (no review round) as the only reason.
   - `verify --change cl21-windows-blocking-pipes --test-cmd "node scripts/run-tests.mjs --test-reporter=tap" --json`: exit 0, `result: GREEN`, `clean: true`. `boundGreen` is CL-19, CL-20 and CL-21, each pass 1 / fail 0 / skip 0. `boundRed`, `unbound` and `orphan` for the change are empty, and the projection has no conflicts and no unstamped mutations. The store-wide report (unbound IN-03/SR-69..72, 298 orphans) is outside this change.
   - `git status` stayed clean throughout. I wrote nothing besides this file.
5. **Clause vs comment.** The scenario clause and the test comment say the same three things:
   - (a) on Windows a child's stdio pipes are blocking, so nothing is queued at exit;
   - (b) the truncation JP-1 closes therefore cannot occur there;
   - (c) the choreography deadlocks because the 300 KB preload stderr write blocks until the parent reads stderr, which it does only after stdout's first chunk.

   The reason string is a faithful abbreviation. The comment adds "CL-19/CL-20 pass on Windows", which is an assertion from the producer's run (see 3). Neither text claims more than the Reality Check records. "Nothing is ever queued at exit" is additionally backed by the Node source quoted above, within the stated scope of pipes. The CHANGELOG's "(EPIPE in 5 ms, verified on a Windows host)" repeats the Reality Check accurately but remains the producer's assertion.
6. **CHANGELOG.** The subsection is at line 33, inside `## 6.0.0 — 2026-10-23` (line 3), above `release-tag-6-0-0`. The file has no `Unreleased` section. Its content matches the diff: the skip with its reason, the platform scope in the spec, no `bin/`/`lib/` change, and PR #1 as the origin. The earlier `cli-json-pipe-flush` entry ("a POSIX pipe write is asynchronous") stays accurate.

## Judgement on the remedy (check 5)

On Windows, the drain requirement has three claims. The no-truncation claim stays evidenced by CL-19 and CL-20 there; on Windows they pass because writes are synchronous, which is still the observable contract. The "exit code unchanged" claim (exit 2 on uncaught error, exit 0 otherwise) is also covered by CL-20. What loses automated evidence on Windows is the last clause, "a reader that closes early SHALL not change the exit code". The failure CL-21 guards against needs an EPIPE raised while the exit waits on another queued stream, and that cannot arise on Windows, so skipping CL-21 there removes no coverage of a reachable failure of that kind. Windows still has its own early-close path: a synchronous EPIPE thrown into `console.log`'s write. It is handled by Console's error swallowing (see 3), but no test now exercises it on Windows. The spec states the scoping openly ("on POSIX only … the test is skipped on `win32` and says why"), so the store does not over-claim. I judge the skip correct and not a spec-vs-code gap. A Windows-safe companion would be a better design (Advisory A1), but the current design is not wrong.

## Issues

None.

## Advisories

- **A1 (test design: keep the early-close clause evidenced on Windows).** Add a win32-only twin of CL-21 instead of leaving the clause untested there. Use the producer's own 0.43 s variant: stderr flowing from spawn, one stdout chunk read, then `stdout.destroy()`, and assert exit 0. On POSIX that choreography would not queue stderr at exit, so it cannot replace CL-21. As a Windows companion it would exercise the synchronous-EPIPE path. It could share CL-21's scenario as a platform branch inside one test, keeping CL-21 bound on both platforms.
- **A2 (attribution precision).** "libuv makes a child's stdio pipes blocking" appears in the spec clause, the test comment and the CHANGELOG. It is Node's `net.Socket` constructor that, on Windows and for fd 1/2 `Pipe` handles, calls `setBlocking(true)` (libuv `uv_stream_set_blocking`) and swaps in a synchronous `_write`. It applies because the spawned child is a Node process, not to every child's pipes. A wording such as "Node makes its own stdout/stderr pipes blocking on Windows (via libuv)" would be exact. This does not change the conclusion.
- **A3 ("reads stderr only after stdout's first chunk").** Strictly, the parent's paused `child.stderr` socket already reads up to its 64 KiB highWaterMark at spawn (`read(0)` in the constructor). The deadlock happens because 300 KB exceeds the pipe buffer plus that buffer, and the test's `resume()` comes only after stdout's first chunk. This is minor and optional to reword.
- **A4 (pre-existing WHEN wording).** CL-21's unchanged WHEN says "reads one chunk and then closes the pipe while draining stderr normally". The test and the new THEN clause say stderr is resumed only after stdout is closed (300 ms later). The WHEN can be read consistently, but it is ambiguous next to the new THEN. A future touch could say "…closes the pipe, and only then drains stderr".
- **A5 (not yet evidenced on Windows).** That the CI hang is gone is not yet evidenced: Next item 1 ("Windows 侧验证跳过生效") is still open. I confirmed the skip only by simulating `process.platform === 'win32'` on Linux. Merge to v6-dev, re-tag and publish should wait for the PR #1 Windows jobs to go green, as the lineage decision already plans.
- **A6 (gate C8).** C8 asks for the `<family>-v1-raw.*` transcript beside this file as well as the VERDICT line. The producer must land it before the gate can pass.

VERDICT: no spec-vs-code gaps
