<!-- apriori-base: sha256:086aa833d3bac788d0d47fec89e47f120ed9b8e0ca5717cde169ddb9aa1294c5 -->

# Delta — cli (cl21-windows-blocking-pipes)

## MODIFIED Requirements

### Requirement: the CLI exits only after its output has drained
`bin/apriori.js` SHALL end every run — the success path and the uncaught-error path alike — only after stdout and stderr have drained: when either stream still holds queued bytes (a pipe, where writes are asynchronous), the exit waits for them to be written; when neither does (a TTY, a file), it exits at once as before. The exit code SHALL be unchanged by this: the command's own code on success, 2 on an uncaught error, with the JSON envelope of the view that was asked for still printed whole. No output SHALL be lost to the exit: an envelope read through a pipe parses whole however much the reader had drained before the exit; a reader that closes early SHALL not change the exit code.

#### Scenario: CL-19 status --json through a pipe arrives whole and parses (JP-1)
- WHEN a project with enough in-flight changes that `status --json` runs to several hundred KiB (300 changes) is run with its stdout piped to a parent that reads concurrently
- THEN the envelope parses as JSON, lists all 300 changes, and the exit code is 0

#### Scenario: CL-20 the uncaught-error path drains its envelope too, and exit codes are unchanged (JP-1)
- WHEN a readable project runs `status` (text), an unknown subcommand is given, and a change view is requested while a preloaded fault makes the read of that flow-state throw an error whose message is 1,000,000 bytes — far past what the pre-fix entry point got through under any reader — in `--json` and in text
- THEN the text run exits 0, the unknown subcommand exits 2 as before, the faulted `--json` view exits 2 with an envelope that parses whole and carries the whole injected message, and the faulted text view exits 2 with the whole message on stderr

#### Scenario: CL-21 a reader that closes early never changes the exit code (JP-1)
- WHEN `status --json` is spawned with both streams queued at exit (a preload has written 300 KB to stderr; the 300-change envelope is on stdout) and its stdout piped to a parent that reads one chunk and then closes the pipe while draining stderr normally
- THEN the process exits with the command's own code, 0 — the EPIPE on the closed stream, raised while the exit still waits on the other, is not surfaced as Node's unhandled-error exit 1 — on POSIX only: on Windows a Node child sets its own stdout/stderr pipes blocking (net.Socket via libuv), so nothing is ever queued at exit (the truncation this requirement closes cannot occur there) and this choreography deadlocks — the preload's 300 KB stderr write exceeds the pipe buffer plus the paused parent's 64 KiB pre-read and blocks until the parent reads stderr, which it does only after stdout's first chunk; the test is skipped on `win32` and says why

## Notes

Found by the first GitHub CI run of the 6 line (PR #1, 2026-10-23): `test (windows-latest, 22|24)` hung in `node scripts/run-tests.mjs`; reproduced on a Windows host — CL-21 alone exceeds any timeout, every other test passes. Three instrumented variants showed the child never writes its first stdout chunk: with stdio pipes blocking on Windows, the 300 KB preload write to stderr blocks until the parent reads stderr, and the parent reads stderr only after stdout's first chunk. A variant that reads stderr from the start completes in 0.4 s, and the CLI itself exits with 0 after an early-closed stdout reader on Windows (EPIPE arrives in 5 ms). CL-19 and CL-20 pass on Windows. Nothing in `bin/` or `lib/` changes.
