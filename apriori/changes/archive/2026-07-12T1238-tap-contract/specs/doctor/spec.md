<!-- apriori-base: sha256:7d33504fd853a368423b10948a67fcbc3c7292f4a69c92671bfbae4f8dfd8c9d -->
## ADDED Requirements

### Requirement: the probe speaks the same TAP as verify
`classifyProbe` SHALL consume the shared version-aware lexer and judge by the D5 matrix: probe TAP containing failures (any shape, unattributed included) is D5 **ok** with a detail noting the failures are verify's business and the TAP channel itself is healthy; an unsupported TAP version is D5 **finding** naming the version and the supported matrix; a stdout-empty probe whose stderr carries TAP-shaped output is D5 **finding** with a `2>&1` fix; every other classification and doctor's exit taxonomy stay unchanged.

#### Scenario: DR-14 the D5 matrix follows the lexer
- WHEN probes emit: a failing `not ok` with exit 0; a `TAP version 99` stream; TAP on stderr with empty stdout; and a healthy TAP-13 stream
- THEN D5 reports ok (failures noted as verify's business), finding (version named), finding (`2>&1` fix), and ok respectively — with doctor's exit taxonomy unchanged
