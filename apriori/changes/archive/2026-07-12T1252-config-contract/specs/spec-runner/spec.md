<!-- apriori-base: sha256:7e1587708cf4b88f429ea53a08f323c19e0632f386132192be5800d449255669 -->
## ADDED Requirements

### Requirement: the configured test command parses as structure
`configTestCmd` SHALL read through the shared structured reader: fenced/commented `test-cmd` rows never take effect, and a `test-cmd` CONFLICT (two live rows, different values) is an infra ERROR (exit 2) naming the conflict — verify never silently picks a row; a missing row keeps today's usage-error path; gate inherits through verify.

#### Scenario: SR-49 a conflicted test-cmd refuses to run
- WHEN process-config carries two live `test-cmd` rows with different values (and, separately, only a fenced `test-cmd` row) and verify runs without --test-cmd
- THEN the conflicted run is RESULT: ERROR (exit 2) naming the config conflict, and the fenced-only run behaves as if no test-cmd were configured (usage error) — never executing the fenced example
