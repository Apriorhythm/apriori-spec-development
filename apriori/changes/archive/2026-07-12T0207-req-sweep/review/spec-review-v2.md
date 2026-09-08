# P5 design review — req-sweep (round 2)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: req-sweep-review-v2-raw.txt

# P5 Design Review — req-sweep v2

## Resolution Check

RSSPEC-1 is resolved. The design now mandates a local dependency-free `escapeRe` inside `archive-merge.js` and explicitly avoids importing `managed.js`, which would create a `managed -> archive-merge -> managed` cycle.

RSSPEC-2 is resolved. AM-38 now binds all stop-before-move classes: DI rename failure, matching symlink candidate, destination escape via symlinked `changes/<name>/requirement`, and source `requirement/` escaping `cwd`. Its THEN also asserts nothing is read or written outside the workspace.

RSSPEC-ADV-1 is resolved. The test plan now targets staging failure by path/class instead of raw rename ordinal, so AM-15 and AM-18 rename-counter injections remain stable.

## New Issues

No new issues found.

## Notes

AM-36..39 still cover M1-M6 and non-staging paths. PR-20 covers M7, with PR-19 anchor adjustment called out. T3/T4 cover M8. Scenario ranges remain clean: AM-36..39 after AM-35 and PR-20 after PR-19.

## Ledger Delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| RSSPEC-1 | Design pointed `escapeRe` reuse at `managed.js`, which is non-exported and would create a require cycle. | Module-load breakage or rework. | STEP2·r1 | verified |
| RSSPEC-2 | Containment escapes were specified but not scenario-bound. | Path-escape bug could pass the scenario set. | STEP2·r1 | verified |
| RSSPEC-ADV-1 | Advisory: AM-38 should inject by path/class, not ordinal, so AM-15/AM-18 counters stay untouched; win32 guard acceptable with regular-path coverage. | Low. | STEP2·r1 | verified |

VERDICT: no major issues, ready to proceed to execution