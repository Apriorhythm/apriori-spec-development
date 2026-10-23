# CI Integration

Three deterministic commands slot straight into any CI. Exit codes are the contract: 0 = go, 1 = a gap a human should look at, 2 = the run itself is untrustworthy (treat as failure, but read the message — it usually names a setup problem, not a code problem).

Install it in a step before the ones below (Node ≥ 22 on the runner; pin the major so a later major cannot change the contract under you), or prefix each command with `npx apriori-cli@6`:

```yaml
- run: npm i -g apriori-cli@6
```

## check — the PR gate

Structural consistency of the spec store: every scenario carries a bindable ID. Cheap; run on every PR.

```yaml
- name: apriori check
  run: apriori check
```

## verify — the post-merge binding gate

Confirms tests actually ran with no real failure. UNBOUND, a non-failing ORPHAN, and UNIDENTIFIED are diagnostics, not gates. Runs your own test command; it must emit TAP (node: `--test-reporter=tap`).

```yaml
- name: apriori verify
  run: apriori verify --specs apriori/specs --test-cmd "node --test --test-reporter=tap"
```

## gate — per in-flight change

One exit code over the mechanical exit conditions of a change: stage-aware binding verify, legal flow-state, verdict evidence, KB freshness, review-loop convergence, and the state's open items (every `## Open` item accepted by the owner or closed). Nothing reads a task list or an issue ledger. `PASS` covers the mechanical face only — human gates remain human.

```yaml
- name: apriori gate
  run: apriori gate --change ${{ inputs.change }} --test-cmd "node --test --test-reporter=tap" --json
```

## Exit-code cheat table

| code | check | verify | gate |
|---|---|---|---|
| 0 | PASS | GREEN | PASS (mechanical) |
| 1 | FAIL(n) | gaps: red/failing-orphan/unattributed/duplicate/no execution evidence | BLOCKED(n) |
| 2 | store path missing, or an invalid/terminated `id-pattern` config row | untrustworthy run (non-TAP, crash, conflict, CAS) | untrustworthy evaluation |
| 3 | — | — | INCOMPLETE — every check that could run passed, but at least one was skipped (no test command → C1 could not run). Treat as not-passing.

Onboarding a runner? `apriori doctor --no-run` diagnoses the seam without executing your test command.
