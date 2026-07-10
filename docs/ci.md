# CI Integration

Three deterministic commands slot straight into any CI. Exit codes are the contract: 0 = go, 1 = a gap a human should look at, 2 = the run itself is untrustworthy (treat as failure, but read the message — it usually names a setup problem, not a code problem).

## check — the PR gate

Structural consistency of the spec store: every scenario carries a bindable ID. Cheap; run on every PR.

```yaml
- name: apriori check
  run: npx apriori-cli check
```

## verify — the post-merge binding gate

Every scenario in the living store has a passing test, no orphans. Runs your own test command; it must emit TAP (node: `--test-reporter=tap`).

```yaml
- name: apriori verify
  run: npx apriori-cli verify --specs apriori/specs --test-cmd "node --test --test-reporter=tap"
```

## gate — per in-flight change

One exit code over the mechanical exit conditions of a change: stage-aware binding verify, tasks all checked, legal flow-state, clean ledger, verdict↔raw evidence, KB freshness. `PASS` covers the mechanical face only — human gates remain human.

```yaml
- name: apriori gate
  run: npx apriori-cli gate --change ${{ inputs.change }} --test-cmd "node --test --test-reporter=tap" --json
```

## Exit-code cheat table

| code | check | verify | gate |
|---|---|---|---|
| 0 | PASS | GREEN | PASS (mechanical) |
| 1 | FAIL(n) | gaps: unbound/red/orphan/duplicate | BLOCKED(n) |
| 2 | store path missing | untrustworthy run (non-TAP, crash, conflict, CAS) | untrustworthy evaluation |

Onboarding a runner? `npx apriori-cli doctor --no-run` diagnoses the seam without executing your test command.
