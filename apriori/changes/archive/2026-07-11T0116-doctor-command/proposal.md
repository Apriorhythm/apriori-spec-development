# Proposal — doctor-command

**WHY.** Onboarding failures surface piecemeal — each command reports only the corner it sees (zero-TAP inside verify, missing store inside check, stale runbook as a warn line, vanished tool pointers not at all, Node floor nowhere). The legacy-project lab logged this friction class repeatedly. Roadmap item 4, owner-ordered ("先5后4"), following gate-command.

**WHAT.** `apriori doctor` — seven diagnosis checks with one exit code (0 HEALTHY · 1 FINDINGS · 2 UNUSABLE): D1 Node floor, D2 init-state scaffold (incl. missing specs/ and the .gitignore/tmp gap update can't repair), D3 runbook freshness, D4 tool pointers for detected tools, D5 TAP plumbing probe (the ONE declared side effect — runs the test command once, every TAP edge classified, test failures explicitly NOT findings; `--no-run` skips), D6 store health (ID-less/duplicate scenarios), D7 changes overview (flow-state validity; gate-④-pending info). Every finding names its fixer (`apriori init`/`apriori update`/the human); doctor never repairs, never writes. `--json` with a fixed shape for all outcome classes.

**OUT OF SCOPE.** Auto-fix, gate-style per-change verdicts (ledger/verify/evidence = `apriori gate`), check's `--self` handbook checks, Node-floor enforcement in bin, `--id-pattern`, CI wiring, package.json engines.

Full requirement: `requirement/req-final.md` (3 P1 rounds → VERDICT: no major issues; ledger 6 verified / 0 open / 2 advisory batches).
