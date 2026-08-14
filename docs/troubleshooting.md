# Troubleshooting

Run `apriori doctor` first — most entries below are its findings, keyed by the finding text.

## Doctor findings

### D1 — Node below the supported floor
apriori-cli needs Node ≥ 22. Upgrade Node; nothing else will behave until you do.

### D2 — no apriori/ here / scaffold gaps
Not initialized (or half-initialized: missing `runbook.md`, `specs/`, `.gitignore` `tmp/` line, or the `tmp/` dir). Fix: `apriori init` (missing scaffold) or `apriori update` (gitignore/tmp gaps). A FILE sitting where a directory should be is reported the same way — replace it.

### D3 — runbook copy differs from the installed CLI
Your `apriori/runbook.md` is stale (or locally edited — it is tool-owned). Fix: `apriori update`.

### D4 — tool pointer lost / command file missing
A detected AI tool's rules file no longer points at `apriori/runbook.md`, or its command file vanished. Fix: re-run `apriori init` (additive, never overwrites your content).

### D5 — test command findings
- *failed to spawn / killed by signal*: the command line itself is broken; run it by hand.
- *produced no output / not TAP*: your runner uses a human reporter. Node: add `--test-reporter=tap`; pytest: `pytest --tap-stream` (plugin `pytest-tap`).
- *TAP stream truncated or malformed*: a version/plan line appeared but zero result lines — the run died mid-stream.
- *exit N unexplained by TAP*: the command failed without a corresponding `not ok` — often a crashing test file or a misconfigured runner.
- *no test command configured*: this is a FINDING, not a neutral note — without one, `apriori gate` cannot run C1 (its binding check) at all, and gate reports `GATE: INCOMPLETE` (exit 3) whenever every other applicable check passes — a real block still wins (`BLOCKED`, exit 1), and an untrustworthy evaluation still wins over both (exit 2). Fix: add a `test-cmd` row to `apriori/process-config.md` (that file is yours — the agent only reads it), or pass `--test-cmd` per invocation. An explicit `--no-run` stays not-applicable: a deliberate skip is not a defect.
- Red tests are NOT doctor findings — that is `verify`'s business.

### D6 — scenario without a bindable ID / duplicate IDs
Every `#### Scenario:` heading must start with an ID like `KV-03`, unique across the store. Fix the spec files; `check` enforces the same rule in CI.

### D7 — flow-state problems / "gate ④ possibly pending"
An active change dir without a parseable `flow-state.md` (or whose `change:` mismatches the dir name) needs manual repair. The "gate ④ possibly pending" line is information, not a problem: an archived change awaiting its human KB sign-off is the designed sequence.

## Classic traps

### verify says GAPS with everything UNBOUND, plus a reporter hint
Your test command is not emitting TAP. Same fix as D5.

### ORPHAN tests after removing a requirement
When a REMOVED delta archives, its scenarios stop being demanded — but your old tests still carry their IDs. Delete the tests; ORPHAN is the reminder.

### archive/verify refuses with "base mismatch … expects sha256:…"
The CAS stamp in a delta no longer matches the store — someone merged since the delta was authored. Re-read the store, update the delta, restamp with `apriori stamp <store-file>`. Never hand-edit the digest.

### verify GREEN locally, ORPHAN in CI
Usually a test-name/ID drift: the ID in the test title must match the scenario ID at a word boundary (`XX-01b` never binds to `XX-01`).

### `unknown flag` after upgrading
Since the strict-parsing release, typos fail loudly instead of being ignored — that error is the feature. `apriori <sub> --help` prints the accepted flags.
