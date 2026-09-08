<!-- apriori-base: sha256:3118efc6365b9daaa3a33f2b6c4048af9fd0d7f893b7c7ca356596c4d32c83a6 -->
## ADDED Requirements

### Requirement: the CAS promise speaks the present tense and the release surface points at v4
Both runbook editions SHALL state the CAS rule in the present tense — unstamped mutation deltas are denied by archive by default, naming the two visible waivers (`--no-cas`, `| cas | optional |`) — with no future-tense "mandatory in 4.0 / 4.0 起强制" phrasing left; MIGRATING.md SHALL carry a 4.0 section with the legacy-root detection guidance and the manual migration mapping; `package.json`'s homepage SHALL point at the v4 tree.

#### Scenario: PR-22 the promise and the pointers are current
- WHEN the two runbook editions, MIGRATING.md, and package.json are read
- THEN the runbooks state archive's default denial in the present tense with both waivers named and carry no future-tense mandatory-in-4.0 phrasing; MIGRATING.md has a 4.0 section naming the five legacy roots; the homepage field ends in `tree/v4#readme`
