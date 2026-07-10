### Requirement: archive-merge applies delta specs to the living store
`apriori archive` SHALL merge a change's delta requirements into the living spec store by stable Requirement ID, consuming the same `## ADDED/MODIFIED/REMOVED/RENAMED Requirements` delta format the OpenSpec adapter used, so it is the adapter-free native implementation of §4's archive action.

#### Scenario: AM-01 ADDED appends a new requirement
- WHEN the delta has an ADDED requirement whose ID is absent from the store
- THEN it is appended and the ID is listed as merged

#### Scenario: AM-02 MODIFIED replaces the existing block
- WHEN the delta has a MODIFIED requirement whose ID exists in the store
- THEN the whole store block is replaced and the ID is listed as modified

#### Scenario: AM-03 REMOVED marks the block deprecated, not deleted
- WHEN the delta has a REMOVED requirement present in the store
- THEN the store block is kept and marked `deprecated (superseded by <change>)`, listed as deprecated

#### Scenario: AM-04 same-ID conflict stops without writing
- WHEN an ADDED ID already exists, or a MODIFIED/REMOVED target is missing
- THEN the merge reports the conflict, writes nothing, and exits 1 (a human opens a ledger issue)

#### Scenario: AM-05 the action lists every merged/modified/deprecated ID
- WHEN a merge succeeds
- THEN every affected Requirement ID is printed by category (§4 requires the action list them)

#### Scenario: AM-06 archive moves the in-flight change under a dated archive dir
- WHEN archive completes on change `<name>`
- THEN the in-flight `apriori/changes/<name>/` (bare name, no prefix) is moved to `apriori/changes/archive/<YYYY-MM-DDThhmm>-<name>/` — a colon-free date-time stamped by the CLI's own clock (never an agent guess); e.g. `archive/2026-07-06T0657-add-playback/`

#### Scenario: AM-07 RENAMED renames a requirement in place, preserving content
- WHEN the delta has a `## RENAMED Requirements` entry `- Old Name -> New Name` and `Old Name` exists while `New Name` does not
- THEN the store block keeps its content but its heading ID becomes `New Name`, listed as renamed; a missing source (with no existing target) or a colliding target is a conflict (stop, exit 1, nothing written) — the source-gone-AND-target-present rerun case is AM-10's no-op, not a conflict

#### Scenario: AM-08 a content-bearing delta that parses to zero operations is a hard error
- WHEN `apriori archive` reads a delta file that has non-whitespace content but matches no recognized section (e.g. wrong heading level or keyword, so 0 delta operations parse)
- THEN it writes nothing, prints an error naming the expected `## ADDED|MODIFIED|REMOVED|RENAMED Requirements` + `### Requirement:` format, and exits non-zero — never reporting MERGED for a delta the parser did not understand

#### Scenario: AM-09 the first archive in a repo creates the store file
- WHEN `apriori archive --write` targets a store file that does not exist yet
- THEN it notes the store will be created, starts from an empty store, and writes the merged result — no ENOENT

#### Scenario: AM-10 re-running an already-merged delta is an idempotent no-op
- WHEN an ADDED requirement in the delta already exists in the store with byte-identical (trimmed) content, or a RENAMED entry's source is gone while its target is present — both the signature of a rerun after a partial archive
- THEN each is reported as already merged / already renamed (no-op), not a conflict, and the run can proceed to move the change dir; but an ADDED whose name was created by THIS run's own RENAMED is a same-delta collision and still conflicts even with identical content

#### Scenario: AM-11 change names are validated and the dir move cannot escape
- WHEN `--change` is not bare kebab-case (e.g. `../victim`), or `--changes-dir` is given but the change dir does not exist
- THEN archive exits 2 before writing anything; the move helper independently rejects any source that resolves outside the changes dir

#### Scenario: AM-12 the store commit and the dir move are one transaction
- WHEN `--write --changes-dir` runs and the change-dir move fails
- THEN the store on disk stays byte-for-byte untouched (staged to a temp file, committed by rename only after the move succeeds) and no temp residue remains
