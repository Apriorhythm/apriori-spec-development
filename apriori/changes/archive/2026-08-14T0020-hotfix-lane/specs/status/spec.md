<!-- apriori-base: sha256:9290e4c4138e8c6523201c6c2d5316a5083ebfe0b66dfe5a2b5b1d2d521e7a16 -->

## ADDED Requirements

### Requirement: status lists and labels hotfix bundles
`status` SHALL list a hotfix bundle alongside formal changes and label it as the hotfix lane rather than reporting a missing flow-state. `--change` on a hotfix bundle SHALL resolve and report instead of erroring on the absent `flow-state.md`, and the JSON contract SHALL carry a `hotfix` boolean for every change. A directory carrying both identities is an error naming both files.

#### Scenario: ST-10 a hotfix bundle is listed and labelled, not reported as broken
- WHEN `status` lists active changes and one of them holds `hotfix-state.md`
- THEN that row reads as the hotfix lane, and `--change` on it reports the lane instead of erroring about a missing flow-state

#### Scenario: ST-11 the JSON contract carries the hotfix flag and both identities are an error
- WHEN `--json` reports a hotfix bundle and a formal change, and separately when a directory holds both state files
- THEN the flag is true for the first and false for the second, and the both-identities case is an error naming both files
