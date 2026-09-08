<!-- apriori-base: sha256:2485bc0466e3f9079e9f204c18047adb9c9f2e1423f24375968d3c3c65810bc9 -->
## ADDED Requirements

### Requirement: doctor detects legacy 3.x layout roots
Doctor SHALL check (D8) for the five pre-4.0 scattered roots — top-level `requirement/`, top-level `spike/`, `apriori/review/`, `apriori/design/`, `apriori/explore/` — using existence-level probes only (lstat/exists, never following or reading through); any hit is a finding listing every root found, with a fix pointing at the MIGRATING.md 4.0 section. A clean 4.0 project reports D8 ok; the check performs zero writes.

#### Scenario: DR-13 mixed 3.x layouts are named, clean ones pass
- WHEN a project carries any of the five legacy roots (a directory or a symlink at that path both count), and another project carries none
- THEN doctor reports a D8 finding naming exactly the roots present with a fix pointing at the migration guidance, and the clean project's D8 is ok — with no file content read and nothing written
