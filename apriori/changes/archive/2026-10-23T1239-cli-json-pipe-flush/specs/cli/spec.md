<!-- apriori-base: sha256:058a257b605ea6fd4b46779cf5ccbe52812e5018f4b098f1bcd515ce50e9e14b -->

# Delta — cli (cli-json-pipe-flush)

## ADDED Requirements

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
- THEN the process exits with the command's own code, 0 — the EPIPE on the closed stream, raised while the exit still waits on the other, is not surfaced as Node's unhandled-error exit 1

## Notes

Follow-up JP-1, registered by status-last-recorded (archived 2026-09-27T0704): the entry point called `process.exit(code)` right after `console.log`; real corpus — agent-work's 146 KiB `status --json` arrived as 65536 bytes. Reproduced on v6-dev@d44a0c2 with the test's 90-change fixture (276,158 bytes to a file; 65,536 through `| cat`; ~146 KiB under a concurrently reading `spawnSync` — how much gets through before the exit depends on the reader) before the fix; whole after it. The committed CL-19 fixture is 300 changes, about 920 KB. The uncaught-error path is evidenced by a preloaded fault with a 1,000,000-byte message (review rounds 1–2: 70,000 bytes was still inside what a concurrently reading parent lets the pre-fix entry point write — ~146 KiB — so it did not discriminate), not by file modes, which root ignores. Red-on-pre-fix check: `git show v6-dev:bin/apriori.js > bin/apriori.js && node --test test/cli-json-pipe-flush.test.js` turns CL-19 and CL-20 red (CL-21 stays green there — the pre-fix entry exits before any EPIPE can happen). CL-21 does not turn red when the `'error'` listener in `exitWhenDrained` is removed either: every byte apriori prints goes through `console.log` / `console.error`, and Node's Console already swallows an asynchronous EPIPE on its stream (its write callback adds a once-`'error'` no-op), so the exit code was never at risk through console; the listener is a belt-and-braces guard for any direct stream write added later, and CL-21 guards the end-to-end guarantee (early-closing reader, both streams queued, exit code unchanged) rather than that line. A raw-write reproduction of the exit-1 failure, with and without the listener, is in the change's own trial record, not in the suite. Restore with `git checkout bin/apriori.js`. The fix waits on `writableLength` and an empty write's callback per stream, so a synchronous destination is unaffected.
