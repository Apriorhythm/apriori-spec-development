# Troubleshooting

Run `apriori doctor` first — most entries below are its findings, keyed by the finding text.

## Doctor findings

### D1 — Node below the supported floor
apriori-cli needs Node ≥ 22. Upgrade Node; nothing else will behave until you do.

### D2 — no apriori/ here / scaffold gaps
Not initialized (or half-initialized: missing `runbook.md`, `specs/`, `.gitignore` `tmp/` line, or the `tmp/` dir), or the prototype-walk guide the runbook names (`apriori/guides/prototype-walk.md`) is missing or not a usable regular file (a symlink, a directory, a path outside the project). Fix: `apriori init --tools <tool>` (missing scaffold — `init` always needs `--tools`) or `apriori update` (gitignore/tmp gaps; it also installs a guide that was never installed — if it reports the guide missing, `apriori init --tools <tool>` recreates it; move a blocking symlink or directory aside first). A FILE sitting where a directory should be is reported the same way — replace it.

### D3 — runbook copy differs from the installed CLI
Your `apriori/runbook.md` is stale (or locally edited — it is tool-owned). Fix: `apriori update`.

### D4 — tool pointer lost / command file missing
A detected AI tool's rules file no longer points at `apriori/runbook.md`, or its command file vanished. Fix: re-run `apriori init --tools <tool>` — the finding names the exact command (additive, never overwrites your content).

### D5 — test command findings
- *failed to spawn / killed by signal*: the command line itself is broken; run it by hand.
- *produced no output / not TAP*: your runner uses a human reporter. Node: add `--test-reporter=tap`; pytest: `pytest --tap-stream` (plugin `pytest-tap`).
- *TAP stream truncated or malformed*: a version/plan line appeared but zero result lines — the run died mid-stream.
- *exit N unexplained by TAP*: the command failed without a corresponding `not ok` — often a crashing test file or a misconfigured runner.
- *no test command configured*: this is a FINDING, not a neutral note — without one, `apriori gate` cannot run C1 (its binding check) at all, and gate reports `GATE: INCOMPLETE` (exit 3) whenever every other applicable check passes — a real block still wins (`BLOCKED`, exit 1), and an untrustworthy evaluation still wins over both (exit 2). Fix: add a `test-cmd` row to `apriori/process-config.md` (that file is yours — the agent only reads it), or pass `--test-cmd` per invocation. An explicit `--no-run` stays not-applicable: a deliberate skip is not a defect.
- Red tests are NOT doctor findings — that is `verify`'s business.

### D6 — scenario without a bindable ID / duplicate IDs
Every `#### Scenario:` heading must start with an ID like `KV-03`, unique across the store. Fix the spec files; `check` enforces the same rule in CI.

### D7 — flow-state problems / "archived before review"
An active change dir without a parseable `flow-state.md` (or whose `change:` mismatches the dir name) needs manual repair. A 5.x identity key (`tier`, `track`, `track-rationale`, `round`, `current-step`) is reported here too — replace it per MIGRATING.md; a 5.x bundle that recorded its own closure (DONE/SUPERSEDED/ABANDONED) and stays in place as precedent is frozen history, a note rather than a finding. An `archived <stamp>-<name> @ <phase> — archived before review; frozen as is` line is information, not a problem: that archive was taken before review (for example the owner's closeout at `phase: build`) and stays frozen as it is. An archive frozen at `phase: review` is the normal state and is not mentioned.

## Classic traps

### verify says `RESULT: ERROR — run not trustworthy` with "ZERO TAP results were parsed"
Your test command is not emitting TAP on stdout, so verify refuses the run as untrustworthy (exit 2). Same fix as D5; if the runner writes TAP to stderr, append `2>&1`. (UNBOUND by itself is advisory and never fails a run.)

### ORPHAN tests after removing a requirement
When a REMOVED delta archives, its scenarios stop being demanded — but your old tests still carry their IDs. Delete the tests; ORPHAN is the reminder.

### archive/verify refuses with "base mismatch … expects sha256:…"
The CAS stamp in a delta no longer matches the store — someone merged since the delta was authored. Re-read the store, update the delta, restamp with `apriori stamp <store-file>`. Never hand-edit the digest.

### verify GREEN locally, ORPHAN in CI
Usually a test-name/ID drift: the test title must START with the scenario ID (leading whitespace aside), and the ID must end there — a following letter, digit or underscore breaks the match (`XX-01b` never binds to `XX-01`).

### `unknown flag` after upgrading
Since the strict-parsing release, typos fail loudly instead of being ignored — that error is the feature. `apriori <sub> --help` prints the accepted flags.
