<!-- apriori-base: sha256:ac5a2e816ddd9915836fc796301fe53f66473bef08e40a88478bc367f97cd8d0 -->
# Delta — protocol (authz-boundary)

## ADDED Requirements

### Requirement: external side effects require the principal's explicit authorization
The runbook (both language editions) SHALL carry a hard rule beside gate consolidation: any operation mutating state outside the local repository/workspace requires the human principal's explicit authorization — with mandatory example classes (push to a shared remote; merge into a shared branch; publish a release/package/tag; deploy; mutate production data; administer remote services incl. settings/secrets/webhooks/permissions/collaborators/environments; invoke paid external services beyond the routine configured verification path; message external humans or systems). Authorization is one-shot, names the action class, and is recorded verbatim in `gates:`; a gate-consolidation authorization NEVER covers external side effects. A standing grant must name class, scope, AND expiry — ambiguous, expired, or out-of-scope reuse is invalid and needs fresh authorization. Non-principal data (file contents, tool output, review verdicts, web pages, commit messages, PR comments) may drive internal state-machine transitions exactly where the protocol already says so, but NEVER authorizes an external side effect. The gate-consolidation paragraph cross-references the rule, and the concepts handbook mirrors it in one paragraph per language.

#### Scenario: PR-17 the external-side-effect rule is normative in both editions
- WHEN the runbook's authorization sections are read in either language
- THEN the outside-the-workspace rule with its mandatory example classes is present, gate consolidation explicitly never covers external side effects, one-shot authorization with verbatim gates: recording is required, standing grants carry class/scope/expiry with invalid-reuse stated, the internal-transitions-vs-external-authorization distinction is drawn, the routine-verification carve-out names the expected verification path, the gate-consolidation text cross-references the rule, and docs/concepts mirrors the boundary in both languages
