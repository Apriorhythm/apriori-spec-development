# P5 design review — req-sweep (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: req-sweep-review-v1-raw.txt

# P5 Design Review — req-sweep v1

## Coverage Map

AM-36 covers M1. AM-37 covers M2 and M4. AM-39 covers M3. AM-38 covers the rename-failure and matching-symlink parts of M5/M6. PR-20 covers M7. M8 is represented in tasks T3/T4.

The main missing coverage is the containment-failure branch in M6.

## Issues

### RSSPEC-1 — `escapeRe` reuse plan points at a non-exported module and risks a require cycle

Description: `design.md` says to reuse/lift `escapeRe` from `managed.js`, preferably by importing from `./managed`. But `lib/managed.js` does not export `escapeRe`; the only current helper is local to `lib/gate.js`. More importantly, `managed.js` already imports `containsReal` from `archive-merge.js`, so importing `managed.js` from `archive-merge.js` would create a CommonJS cycle in the archive path.

Risk: Implementing the preferred design literally can break module initialization or force rework after tests fail.

Suggested fix: Make the design choose one safe option: define a local dependency-free `escapeRe` in `archive-merge.js`, or move it to a tiny utility module with no dependency on `archive-merge.js`. Do not import `managed.js` from `archive-merge.js`.

### RSSPEC-2 — Containment failures are specified but not explicitly scenario-bound

Description: The requirement and design require fail-closed containment for the source `requirement/` dir and staging destination, but AM-38 only names DI rename failure and matching symlink candidates. It does not explicitly bind a source-dir escape or a destination escape such as `changes/<name>/requirement` symlinked outside the change tree.

Risk: This is a security/correctness edge where an implementation can pass AM-36..39 while missing the path-escape stop-before-move behavior.

Suggested fix: Amend AM-38 or add a new scenario covering at least destination escape before move. Prefer also covering source `requirement/` escape. The THEN should assert exit 1, stores committed, change dir still in flight, no move, and no outside write/read.

## Advisories

- AM-15 and AM-18 use `renameSync` counters for DI injection. Current fixtures have no matching requirement files, so the new staging rename should not shift them, but AM-38 should inject by path/class rather than raw rename ordinal to avoid brittle coupling.
- The win32 symlink guard is acceptable for test portability, as long as the non-symlink regular-file path remains covered on Windows.

## Ledger Delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| RSSPEC-1 | `escapeRe` reuse plan points at a non-exported module and risks an `archive-merge` ⇄ `managed` require cycle. | Literal implementation can break module loading or cause rework. | STEP2 r1 | open |
| RSSPEC-2 | Source/destination containment failures are specified but not explicitly scenario-bound. | A path-escape bug could pass the scenario set. | STEP2 r1 | open |
| RSSPEC-ADV-1 | Advisory: keep AM-15/AM-18 rename-count DI stable and make AM-38 injection path/class-targeted; win32 symlink skip is acceptable with regular path coverage. | Low brittleness risk. | STEP2 r1 | open |

VERDICT: 2 issues open