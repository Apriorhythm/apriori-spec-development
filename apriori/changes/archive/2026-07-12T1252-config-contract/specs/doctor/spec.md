<!-- apriori-base: sha256:b9fdb5f55a262bc2f8cf000768337527afa082eed7ef827effb80a7329cc312b -->
## ADDED Requirements

### Requirement: doctor reads config through the structured reader
Doctor's config consumption (the D5 probe's test-cmd fallback) SHALL use the shared structured reader; a `test-cmd` CONFLICT is a D5 finding naming the config problem rather than a probe run over an arbitrary row.

#### Scenario: DR-15 doctor refuses to probe on conflicted config
- WHEN doctor runs (no explicit test command) in a project whose process-config carries two live conflicting `test-cmd` rows
- THEN D5 is a finding naming the config conflict and no probe command executes
