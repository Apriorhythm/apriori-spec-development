<!-- apriori-base: sha256:f1b39d057f8ff41ff7ebb9d726bf1b159c5e320241cb470f83328bf320ef5c6b -->
# Delta — protocol (change-bundle)

## REMOVED Requirements

### Requirement: requirement-stage paths carry the change name

### Requirement: the preservation of requirement history is command behavior

## ADDED Requirements

### Requirement: per-change artifacts live in the change bundle
The runbook (both editions) and the concepts handbook (both languages) SHALL define the bundle as the ONLY layout: everything a change owns lives in `apriori/changes/<name>/` — `flow-state.md`; `requirement/` holding `req-v{N}.md`/`req-final.md`/`intent-card.md` under PLAIN names (the directory is the identity); `gap-report.md`; `proposal.md`/`design.md`/`tasks.md`; `specs/<module>/`; `review/` holding the ledger `issues.md`, every review doc (`req-review-v{N}.md`, `spec-review-v{N}.md`, `step5-review-v{N}.md`, `extraction-review-v{N}.md`) and each doc's raw beside it under the unchanged `<stem>-raw.*` rule; and `spike/` on the explore track, which the EXECUTOR deletes or quarantines BEFORE the archive action (the command never deletes anything). The five legacy roots (`requirement/`, `spike/`, `apriori/review/`, `apriori/design/`, `apriori/explore/`) appear nowhere as standalone paths: after stripping every `changes/<…>/` bundle form from the four live docs, zero occurrences of those roots remain. The archive action carries the whole bundle in its one atomic move; STEP6 carries no preservation or staging text. The v4 stability sentence states its promise over the CLI surface & flags, `--json` shapes, the delta format, and the flow-state schema — without a layout clause.

#### Scenario: PR-21 the bundle layout binds and the legacy roots are gone
- WHEN the four live docs (runbook EN/CN, concepts EN/CN) are scanned
- THEN the artifact table names the bundle paths (requirement/, review/ with the ledger and docs+raws, gap-report.md, spike/ under changes/<name>/), the STEP6 text says the move carries the bundle with no staging/copy instruction, the spike disposition is the executor's pre-archive duty, and the strip-scan finds zero standalone occurrences of the five legacy roots — while the stability sentence carries no layout clause
