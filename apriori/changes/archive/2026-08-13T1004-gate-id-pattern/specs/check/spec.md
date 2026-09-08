<!-- apriori-base: sha256:3ec799066b7f432bbd026ba75e5a17f0f174bafd13462813dd4969f4ea17b3a0 -->

## ADDED Requirements

### Requirement: CK-04 recognizes IDs through the shared contract
`check`'s CK-04 SHALL resolve its id-pattern from the config `id-pattern` row (else `DEFAULT_ID`; check gains NO CLI flag — a CI gate consumes the project constant) and SHALL recognize scenario IDs through the same `leadId` semantics as verify — replacing its private `^(…)\b` anchoring — so the four consumers can never disagree on the same title. An invalid config row is `RESULT: ERROR`, exit 2, through check's existing error channel.

#### Scenario: CK-13 CK-04 honors the config id-pattern row
- WHEN the config carries `| id-pattern | [A-Z]+(-[A-Z]+)*-\d+[a-z]* |` and the store contains scenarios `AC-08a` and `AC-BIS-01`
- THEN `apriori check` reports no CK-04 failure for them (without the row, both fail CK-04)

#### Scenario: CK-14 check and verify judge identically at the edges
- WHEN the same title set (letter suffix, multi-segment, trailing `_`, adjacent alphanumeric, a pattern ending in a non-word char, a source carrying its own `^`, an alternation source) is judged by CK-04 and by verify's scenario collection under the same pattern
- THEN the identified/rejected split is identical — no title is bindable to one consumer and unbindable to the other

#### Scenario: CK-15 an invalid config id-pattern is a check ERROR
- WHEN the config `id-pattern` row does not compile and `apriori check` runs
- THEN check prints an error naming `process-config` and `RESULT: ERROR`, exit 2 — CK-04 never silently falls back to the default

#### Scenario: CK-16 a terminated config-pattern match is a check ERROR
- WHEN the config pattern is catastrophic against the store's own titles (both repository inputs) and `apriori check` runs
- THEN the child is killed within its budget and check prints a sanitized error naming `process-config` with `RESULT: ERROR`, exit 2 — CI cannot be hung by a config row
