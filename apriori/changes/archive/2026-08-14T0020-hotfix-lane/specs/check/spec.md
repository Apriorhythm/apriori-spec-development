<!-- apriori-base: sha256:6f057871b5f24a5b1dc18ff5f25c4df1a7c60f0d89ffa2af2d87c51bcbede347 -->

## ADDED Requirements

### Requirement: the phrase table admits the hotfix lane's verdict phrases
The canonical verdict phrase table SHALL carry the lane's two new passing phrases (`VERDICT: no findings` for the `inspection` role) and its new failing phrase (`VERDICT: gaps found` for the `p8` role) alongside the existing entries, and both runbooks SHALL contain every canonical phrase as before. A lane verdict line is recognized by the SAME prefix rule as every other: the mandatory `role=` / `digest=` trailers and the conditional `boundary=` trailer follow the phrase, so a real line still starts with a table entry and the existing consumers are unaffected. A `VERDICT:` string appearing anywhere in the scanned docs that does not start with a table entry stays a failure.

#### Scenario: CK-17 the lane's phrases are table entries and its trailers do not break recognition
- WHEN the runbooks carry the lane's phrase-table rows, and separately when a documented line reads `VERDICT: no findings role=inspection digest=<64 hex> boundary=within`
- THEN the phrase-table check passes and the trailered line is recognized as its table entry — while an unregistered phrase such as `VERDICT: looks fine to me` still fails, naming the file and line
