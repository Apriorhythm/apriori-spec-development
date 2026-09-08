<!-- apriori-base: sha256:fe3d3a7e24171763ae5453f7a09a79a4a0bfddd03922b5b5d3f7752669c13257 -->

## ADDED Requirements

### Requirement: verification-profile is a human-owned project declaration
`lib/config.js` SHALL expose `resolveVerificationProfile(cwd)` as the single reader for the `verification-profile` row: the value set is exactly `ui | backend | fullstack | docs | none`, where `none` is the explicitly-declared undeclared state. An absent row and a `none` row BOTH resolve to no profile (`{ profile: null }`, origins `absent` and `none` respectively) under which NOTHING escalates — today's honor-system behavior is preserved byte for byte. An empty value cell is indistinguishable from an absent row: `parseConfig` skips empty-valued rows for EVERY key, and that shared behavior is not special-cased here. A present row with a non-empty value outside the set is a consumption-time problem naming the row, the offending value (bounded, control-chars sanitized) and the legal set — never a thrown exception and never a silent fallback to a default. Surrounding whitespace is trimmed; the comparison is exact and case-sensitive (`UI` is not `ui`). A config-level problem (unreadable file, conflicting rows) surfaces through the same problem channel. `templates/process-config.md` SHALL ship the row with the value `none` — a template copied verbatim must never escalate anything — plus a legal range listing all five values and a default cell stating that absent and `none` both mean nothing escalates.

#### Scenario: CF-13 absent, empty and `none` all mean nothing escalates
- WHEN `process-config.md` carries no `verification-profile` row, or no config file exists at all, or the row's value cell is empty, or the row reads `none`
- THEN `resolveVerificationProfile` returns no profile and no problem in every case — origin `absent` for the first three (an empty cell is skipped by the shared parser) and origin `none` for the explicit declaration; callers escalate nothing

#### Scenario: CF-14 the four declared values resolve with config origin
- WHEN the row reads `ui`, `backend`, `fullstack` or `docs` (with incidental surrounding spaces)
- THEN each resolves to that exact profile with origin `config` and no problem

#### Scenario: CF-15 an unknown non-empty value is a consumption-time problem
- WHEN the row reads `UI` (wrong case) or `mobile`, or an over-long value
- THEN the result carries a problem naming `verification-profile`, the offending value (bounded and control-char sanitized) and the legal set — no exception is thrown and no profile is returned

#### Scenario: CF-16 config-level failures surface through the same channel
- WHEN `process-config.md` is unreadable, or carries two `verification-profile` rows with different values
- THEN the resolver returns that problem (unreadable / conflicting rows) rather than a profile

#### Scenario: CF-17 the template ships the row as `none`, never as an escalating value
- WHEN `templates/process-config.md` is read AND parsed by `parseConfig` AND resolved by `resolveVerificationProfile`
- THEN it carries a `verification-profile` row whose parsed value is exactly `none` (a verbatim copy escalates nothing — resolving it yields no profile and no problem), whose legal-range cell lists all five values, and whose default cell states that absent and `none` both escalate nothing; the whole table still parses end-to-end
