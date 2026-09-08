# P1 requirement review — req-sweep (round 2)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: req-sweep-req-review-v2-raw.txt

# P1 Requirement Review — req-sweep v2

## Resolution Check

RS-2 is resolved. The redesign stages requirement files into the in-flight change dir before the atomic archive move, so there is no post-move write and no exit-0 leftover state for regular files. The rerun story is coherent for injected regular-file staging failures: stores are already committed, staged files are no longer in live `requirement/`, the failed source remains available, and the next run can complete staging plus move.

RS-3 is resolved. The three anchored basename regexes are precise enough and cover the `a` / `a-b` trap plus near-miss negatives.

RS-4 is resolved. Intent-card-only changes are explicitly bound by M4.

RS-ADV-1 is resolved. M1 names the full write command, the staged-line report wording is pinned, and PR-19 must assert absence of the old executor-copy instruction.

RS-1 is only partially resolved and should be reopened. Containment is now specified, but the matching symlink behavior is still unsafe for the requirement-history goal.

## Formal Issues

### RS-1 — Matching symlink requirement artifacts can be skipped while archive succeeds

Description: v2 says every exact-matching requirement artifact is staged, but then says a matching symlink candidate is skipped with a warning and the archive proceeds. A file named `requirement/<change>-req-v1.md` or `<change>-intent-card.md` is not just a stray path; it is the machine-attributed requirement artifact. Skipping it with exit 0 means the archive can complete while requirement history does not travel with the change.

Risk: This reintroduces the same class of executor discipline the change is meant to remove. Automation can treat archive as successful while the live requirement artifact remains behind and the archived change lacks its requirement history.

Suggested fix: For exact-matching symlink candidates, fail before the move using the M5 taxonomy: stores committed, change dir still in flight, message names the symlink and says to replace it with a regular file or remove it, then rerun. Non-matching symlinks can remain ignored. Keep the “never follow symlinks” rule.

## New Issues

No additional formal issues found.

## Ledger Delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| RS-1 | Matching symlink requirement artifacts can be skipped while archive succeeds. | Requirement history can be omitted from the archive even though archive exits successfully. | STEP0·r1 | open |
| RS-2 | Sweep-failure exit 0 had no command recovery path. | Success reported while history unpreserved; discipline reintroduced. | STEP0·r1 | verified |
| RS-3 | Filename matcher ambiguous (`req-vdraft`, `req-v1-notes` near-misses). | Over/under-sweep. | STEP0·r1 | verified |
| RS-4 | Intent-card-only changes unbound by acceptance. | Explore-track history left behind with green tests. | STEP0·r1 | verified |
| RS-ADV-1 | Advisory: explicit `--write` in M1; stable report wording; PR-19 negative anchor for the old instruction. | Low. | STEP0·r1 | verified |

VERDICT: 1 issues open
