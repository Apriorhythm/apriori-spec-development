# Proposal — gate-command

**WHY.** The runbook's machine-checkable exit conditions (verify GREEN, tasks done, legal flow-state, clean ledger, verdict↔raw evidence, fresh KB) live in five artifact formats and zero commands. Agents aggregate them by hand; CI can't enforce them; the anti-simulated-review backstop (§1 enforcement layer ①) is prose only. Roadmap item 5, ordered by the owner ("先5后4") right after 3.1.0 shipped the projected verify this command consumes.

**WHAT.** `apriori gate --change <name>` — one read-only command, one exit code (0 PASS · 1 BLOCKED · 2 untrustworthy), six checks: C1 binding gate (projected verify in-flight / plain verify archived — stage-aware), C2 tasks all checked, C3 flow-state legality, C4 ledger clean (open rows block; reasonless rejections block), C5 verdict↔raw evidence (the backstop, now mechanical), C6 KB freshness (git-based, degrades to n/a, never false-blocks). Tier-aware (trivial changes aren't asked for artifacts their tier never produces); resolves archived changes (the gate-④-pending window); `--json` for CI. Output states plainly: PASS covers the mechanical face only — human gates remain human.

**OUT OF SCOPE.** CI workflow wiring, raw-content authenticity judgment, environment checks (doctor, item 4), any write/auto-fix, multi-change invocation, `--id-pattern` passthrough (documented limitation).

Full requirement: `requirement/req-final.md` (3 P1 rounds → VERDICT: no major issues; ledger 8 verified / 0 open).
