# Tasks — readme-split

- [x] T1. Failing tests CK-08/CK-09 (test/check.test.js) — red run.
- [x] T2. check.js self-mode: docs PAIRS + one-sided-pair failure + per-file link base + fragment validation.
- [x] T3. docs/cli.md + docs/ci.md + docs/troubleshooting.md (EN).
- [x] T4. docs/concepts.md + docs/legacy.md (EN, migration per map).
- [x] T5. README.md rewrite (≤200, Quickstart contract).
- [x] T6. CN mirrors: README_cn + five docs/_cn (headings 1:1).
- [x] T7. Hand-run DONE 2026-07-11: the Quickstart's ```shell blocks extracted verbatim and executed in sequence — exit codes: init=0, doctor=0, new=0, verify(red)=1, verify(green)=0, gate=0, archive=0, verify(store)=0, check=0. Two doc fixes came out of the run: mkdir -p for the delta path, and a filled flow-state step (gate C3 correctly blocks the unfilled skeleton).
- [x] T8. Suite green; verify --change readme-split GREEN; check --self PASS (now covering docs); gate PASS.

DEVIATION NOTE (X3-class, recorded): test/protocol.test.js PR-10's README-mirror assertions retargeted to docs/concepts*.md — the store scenario text names no file; the mirror guard follows the moved content. No spec delta needed.
