<!-- apriori-base: sha256:505d4e725902e639347c1eb7ce81f2e9d10748f4c453467afeaf76b184128c57 -->
## MODIFIED Requirements

### Requirement: CAS base stamps detect store divergence
A delta file MAY carry exactly one base stamp `<!-- apriori-base: sha256:<64 lowercase hex> -->` or `<!-- apriori-base: new -->` before its first `## <OP> Requirements` section, declaring the fingerprint of the store file it was authored against. The fingerprint SHALL be SHA-256 over the store file's content with line endings normalized (`\r\n` and lone `\r` → `\n`). `apriori verify --change`, `apriori archive --change`, and single-file `apriori archive` SHALL check present stamps; an absent stamp means no check. `apriori stamp <store-file>` SHALL print the stamp line matching the file's current content.

#### Scenario: AM-23 malformed or duplicated stamps are hygiene errors
- WHEN a delta file carries more than one stamp line, a stamp after the first section heading, or a malformed digest
- THEN the file is rejected by the hygiene guard (nothing projected or written) naming the file

#### Scenario: AM-24 a diverged stamp stops archive before any write, on both surfaces
- WHEN a stamped delta's store file fingerprint no longer matches (including a `new` stamp whose store now exists) — whether archive is invoked as `--change <name>` or as single-file `--store <f> --delta <f>`
- THEN each form reports the store path with expected vs actual fingerprint, writes nothing, and exits 1 — the §4.11 serialize rule made mechanical; both surfaces are exercised, not just one

#### Scenario: AM-25 stamp-free ADDED-only deltas keep the pre-3.1 behavior
- WHEN a delta carries no base stamp — in the high-level `--change` form and in the single-file form alike
- THEN no CAS divergence check runs for that file; an ADDED-only delta merges exactly as pre-3.1, while a stamp-free MUTATION delta falls to the deny-by-default rule (its own requirement) — "no stamp, no check" never means "no stamp, no rules"

#### Scenario: AM-26 the new sentinel matches only an absent store
- WHEN a delta is stamped `<!-- apriori-base: new -->`
- THEN the check passes while the mapped store file does not exist and fails as a mismatch once it does

#### Scenario: AM-27 apriori stamp prints the current stamp line
- WHEN `apriori stamp <store-file>` runs on an existing readable file, an absent path, a directory, or with a wrong argument count
- THEN it prints the exact matching stamp line (absent path → the `new` form) and exits 0; a directory or unreadable file → error naming the path, exit 2; zero or multiple arguments → usage, exit 2
