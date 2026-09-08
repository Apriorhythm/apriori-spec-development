<!-- apriori-base: sha256:9583467a9b0a7619a9c3180180b5d9f95b5397d1867b39e928eaa5664fa59bae -->
# Delta — protocol (req-sweep)

## ADDED Requirements

### Requirement: the preservation of requirement history is command behavior
The runbook STEP6 section (both editions) SHALL state that the archive action itself stages `requirement/<change>-*` (req versions, final, intent card) into the change dir and carries them through the atomic move into `archive/<stamp>-<change>/requirement/` — the executor's residual duty is only the closeout commit; the former executor-copy instruction SHALL be absent.

#### Scenario: PR-20 the automatic carry binds and the manual instruction is gone
- WHEN the STEP6 section is read in either edition
- THEN it states the archive action carries the requirement history automatically (destination named), the executor's duty is the closeout commit alone, and the old copy-it-yourself phrasing ("copy every"/"拷入") appears nowhere in the section
