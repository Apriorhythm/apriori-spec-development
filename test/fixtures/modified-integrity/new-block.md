### Requirement: projected verify binds against the candidate merged store
`apriori verify --change <name>` SHALL construct the projection — the store as `apriori archive` would leave it after merging every delta spec under `apriori/changes/<name>/specs/` — in memory, never writing to the living store's location, and SHALL bind scenarios against that projection using the same `merge()` semantics archive uses. Discovery maps `changes/<name>/specs/<suffix>` to `apriori/specs/<suffix>` (`.md` files only); roots resolve against `--cwd` exactly as `apriori status` resolves change dirs.

#### Scenario: SR-16 ADDED delta scenarios join the projection
- WHEN a change carries an ADDED-only delta for a module and `verify --change <name>` runs
- THEN the delta's scenarios join the projection alongside every existing store scenario — the CHANGE VERDICT demands the delta's scenarios while the untouched store scenarios' bindings report in the store report (change-scoped verify), with no duplicate-ID error from the overlay (genuinely duplicate IDs against a scoped scenario remain GAPS)

#### Scenario: SR-17 MODIFIED delta replaces the demanded scenario set
- WHEN a delta MODIFIES a requirement, changing its scenario set
- THEN verification demands exactly the delta's version of that requirement's scenarios; scenarios the modification drops are not demanded

#### Scenario: SR-18 REMOVED delta scenarios are not demanded and their tests orphan
- WHEN a delta REMOVES a requirement whose scenarios have tests still tagged with their IDs
- THEN the projection deprecates the block, its scenarios are not demanded, and each lingering test is reported ORPHAN in the store report — a PASSING lingering test no longer blocks the change verdict (a FAILING one still does unless a sibling change declares its ID)

#### Scenario: SR-19 RENAMED delta demands the post-rename picture
- WHEN a delta RENAMES a requirement Old → New
- THEN verification demands exactly the projected picture — the block's scenarios under their unchanged IDs, with no demand arising from the pre-rename block

#### Scenario: SR-20 merge conflicts make the projection untrustworthy
- WHEN any module's merge reports one or more conflicts
- THEN `verify --change` prints every conflict and exits 2 — it never verifies a partial or wrong projection

#### Scenario: SR-21 projection inputs fail closed
- WHEN the change name is invalid or fails realpath containment, the change dir does not exist, zero delta files are discovered, or any delta file violates a hygiene guard (empty/whitespace-only, content with zero operations, malformed or duplicated base stamp, duplicate requirement names)
- THEN `verify --change` exits 2 with a message naming the offending path or file, and runs no tests

#### Scenario: SR-22 --specs and --change are mutually exclusive
- WHEN `apriori verify --change <name> --specs <dir>` is invoked
- THEN it exits 2 explaining the projection defines the spec set

#### Scenario: SR-23 --json carries the projection contract
- WHEN `verify --change --json` runs — success, gaps, merge conflict, or any projection failure
- THEN stdout is pure JSON in every class: the 3.0.1 fields plus `projection: {change, modules, conflicts}` where modules lists discovered store-relative suffixes (sorted) and conflicts carries merge-conflict strings verbatim; non-`--change` runs never emit a `projection` field

#### Scenario: SR-24 a diverged base stamp blocks projection
- WHEN a discovered delta file carries a base stamp that does not match the current fingerprint of its mapped store file
- THEN `verify --change` exits 2 naming the store path and the expected vs actual fingerprint, and runs no tests
