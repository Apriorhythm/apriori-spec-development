<!-- apriori-base: sha256:b3c554630b1f02f4663a9a5a6e56cecfb82ef33c45c470b11d3c645d0ae833c1 -->

# Delta — cli (windows-ci-portability)

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

#### Scenario: CL-22 an early-closed stdout reader leaves the exit code alone on every platform
- WHEN `status --json` is spawned on the 300-change fixture with stderr read from the start, and the parent destroys its stdout pipe after the first chunk
- THEN the process exits with the command's own code, 0, on POSIX and Windows alike — the Windows-safe companion of CL-21, whose paused-stderr premise is POSIX-only

## Notes

CL-22 is review advisory A1 of cl21-windows-blocking-pipes: with CL-21 POSIX-only, Windows had no automated check that an early-closed reader leaves the exit code alone. CL-22 reads stderr from the start, so it cannot deadlock on blocking stdio pipes, and asserts only the exit code. The requirement text and CL-19/20/21 are unchanged.
