# P1 requirement review — req-sweep (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: req-sweep-req-review-v1-raw.txt

# P1 Requirement Review — req-sweep v1

## Dimension Verdicts

1. Target state B: mostly clear, but incomplete around containment, sweep failure recovery, and exact filename matching.
2. Edge cases and exception paths: not sufficient. Symlinks/escape paths, intent-card-only changes, and failed-sweep reruns are not covered.
3. Implied side effects: the move side effect is declared, but the failure behavior leaves an undeclared manual cleanup obligation.
4. Acceptance criteria testability: mostly testable, but key edge cases are missing.
5. Conflicts with state A: no direct conflict with current archive phase ordering, but the requirement needs sharper rules to fit the existing fail-closed containment model.
6. Target lineage: declared as v3 branch and matches repo reality.

## Formal Issues

### RS-1 — Sweep containment and symlink behavior are unspecified

Description: The requirement says to move files from `<cwd>/requirement/` into `<archived-dir>/requirement/`, but does not say whether source files, the source `requirement/` directory, the archived destination, or an existing destination `requirement/` entry must pass realpath containment. Current archive paths already use `containsReal` for change dirs and archive destinations; the new sweep touches external input paths too.

Risk: A symlinked `requirement/` source or a preexisting symlinked `<change>/requirement` directory could cause archive to read/move files outside the workspace or write swept files outside the archived change. This is a correctness/security issue.

Suggested fix: Specify fail-closed containment before any sweep read/write. Require source candidates to be contained under `<cwd>/requirement/` and destination candidates under the moved archived dir; require candidates to be regular files, not symlinks. Add acceptance cases for symlinked source/destination escapes.

### RS-2 — Sweep failure exits 0 but has no command recovery path

Description: DD-2 and M4 require sweep failures to keep archive exit 0. That preserves the store commit and change-dir move, but it also means the command reports success while requirement history remains in the live `requirement/` directory. After the change dir has moved, rerunning the high-level archive against the in-flight change path is not obviously able to retry the sweep.

Risk: This reintroduces executor discipline: the command can succeed while the preservation step is incomplete, and automation/gate flows may proceed without the archived requirement history. If the command exits nonzero, the requirement still needs to define how a rerun completes the sweep after the dir has already moved.

Suggested fix: Define a durable incomplete-sweep state. Prefer a nonzero archive result after successful store/move but incomplete sweep, with a clear rerun or repair surface that locates the archived dir and retries only the sweep. Alternatively, stage requirement files into the change dir before the archive move so the move carries them atomically. Add an acceptance case for retrying after an injected sweep failure.

### RS-3 — Filename matcher is still ambiguous

Description: The requirement uses both `requirement/<change>-req-*.md` and “exact-prefix” examples like `<change>-req-v*.md`, `<change>-req-final.md`, and `<change>-intent-card.md`. It does not define exact basename regexes.

Risk: Implementers may sweep too much or too little, such as `<change>-req-vdraft.md`, `<change>-req-v1-notes.md`, or omit `.md` handling inconsistently. The `a` vs `a-b` trap is addressed directionally, but the matcher is not precise enough to hand to an implementer.

Suggested fix: Enumerate exact escaped basename patterns, for example:
`^<change>-req-v[0-9]+\.md$`, `^<change>-req-final\.md$`, `^<change>-intent-card\.md$`.
Add negative cases for same-change near misses and `a-b` files.

### RS-4 — Intent-card-only changes are not bound by acceptance

Description: The target includes `requirement/<change>-intent-card.md`, but M1 tests it only alongside req docs. Explore-track or abandoned changes can have an intent card as the only requirement-stage artifact.

Risk: An implementation could accidentally sweep the intent card only when req files are also present, leaving the intent-card-only case broken while passing the current acceptance set.

Suggested fix: Add an acceptance criterion where `requirement/<change>-intent-card.md` is the only matching file and must be moved into `<archived>/requirement/` with exit 0 and a sweep report.

## Advisories

- M1 should explicitly say `apriori archive --change <change> --write --changes-dir <dir>` so dry-run behavior is not confused with the move/sweep path.
- The report contract should define stable wording or fields for sweep success and leftovers if tests will assert it.
- Runbook/PR-19 updates should assert both the new automatic-sweep wording and the absence of the old executor-copy instruction.

## Ledger Delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| RS-1 | Sweep containment and symlink behavior are unspecified. | Source or destination symlinks could move/read/write outside the workspace. | STEP0 r1 | open |
| RS-2 | Sweep failure exits 0 but has no command recovery path. | Archive can appear successful while requirement history is not preserved, reintroducing manual discipline. | STEP0 r1 | open |
| RS-3 | Filename matcher is ambiguous. | Implementers may over-sweep or under-sweep requirement-stage files. | STEP0 r1 | open |
| RS-4 | Intent-card-only changes are not bound by acceptance. | Explore-track requirement history can be left behind despite green tests. | STEP0 r1 | open |
| RS-ADV-1 | Advisory clarifications for `--write`, stable report wording, and PR-19 negative anchors. | Minor implementation/test drift risk. | STEP0 r1 | open |

VERDICT: 4 issues open
