<!-- apriori-base: sha256:cc5a80149136be6907070e083a2fcdb1aa0143aaef363b408659036c0cba7cf2 -->
# Delta — archive-merge (archive-manifest)

## MODIFIED Requirements

### Requirement: an archive declares three states and nothing else
A ready `apriori archive --change <name>` SHALL print an `ARCHIVE DECLARES` block — in dry-run and with `--write` alike — carrying exactly three states derived from the bundle's own state THROUGH THE SAME readiness predicate the gate and review-ready use — never a second walk over the state, which is how the declaration and R5 came to disagree about one bundle: whether the IMPLEMENTATION is complete (the predicate's pending open items — an id-less item included — and standing assumptions make it incomplete, and are counted); whether the CRITICAL EVIDENCE is complete, which since 6.2 means no unaccepted open item — pending items counted, accepted ones named and reported as still present, a legacy `blocked` row named; and whether the change is RELEASED or still pending external acceptance (the state's `delivery:` key, defaulting to pending). It SHALL NOT introduce a new document or a fourth state, and the only file the archive adds to the bundle is its content manifest (`archive-manifest.json`, the manifest requirement) — never a declaration file. The declaration SHALL ALSO be a BACKSTOP: a run whose declaration would read `implementation: INCOMPLETE` SHALL be refused with `RESULT: NOT READY — nothing written`, whatever readiness concluded — a successful archive can never declare its own work unfinished. The block SHALL say that the bundle is frozen and that a defect found later becomes a short outcome note or a NEW change — an archive is never rewritten to claim a completeness that did not exist at the time.

#### Scenario: AM-118 the archive declaration carries exactly the three states
- WHEN a ready change is archived, first with a clean state and then with a pending open item, an unverified assumption, an accepted open item and `delivery: released` in turn
- THEN the report carries an `ARCHIVE DECLARES` block with exactly the implementation / critical-evidence / delivery lines, each reflecting the state it was given, the frozen-snapshot sentence is present, and the declaration creates no file anywhere in the tree (the bundle's `archive-manifest.json` is written by the manifest requirement, not by the declaration; a dry-run creates nothing at all)

#### Scenario: AM-119 the archived bundle is frozen
- WHEN a change is archived with `--write --changes-dir`, and the archived record is then gated again
- THEN the whole bundle travelled as one unit (flow-state, `specs/`, `review/` and its `archive-manifest.json`) with nothing left at the in-flight path, and the later run reads the frozen record without modifying a byte of it

## ADDED Requirements

### Requirement: an archive carries a content manifest, written inside the transaction
On `--write`, after every preflight, readiness, declaration and drop-guard step has passed and BEFORE the first store byte is staged, `apriori archive --change <name>` SHALL write `archive-manifest.json` into the in-flight bundle: `{ "manifest": 1, "change": <name>, "stamp": <the archive stamp the move will use>, "files": { <relative path>: "sha256:<hex>" | "link:<target>" } }`, one entry per regular file under the bundle (the manifest itself excluded; content hashed as a stream, so review raws of any size are covered) and one `link:` entry per symbolic link (never followed, never hashed); directories are traversed, anything else is skipped. The write is exclusive and atomic within the bundle: the run creates a temporary file it alone owns (`wx`, so an existing entry at that name — a symlink included — fails instead of being followed or truncated), writes every byte through the descriptor (a short write is continued, zero progress is a failure — a truncated manifest is never published) and renames it onto `archive-manifest.json`; the rename replaces any occupant of the final name (a stale symlink included) with this regular file and never writes through it, and only the run's own temporary file is ever removed — every other occupant of the bundle is inventoried. The bundle root itself must be a real directory: a symbolic link at `changes/<name>` is refused before anything is written, so no alias can rewrite the baseline of an already archived bundle. If the manifest cannot be produced or written — a file vanishes between listing and hashing, an unreadable entry, a write failure — the run fails with exit 1 and NOTHING has been written to the store, so no state exists in which stores were rewritten but the archive lacks its manifest. The manifest then travels with the bundle in the existing move; a rerun after a failed move recomputes and overwrites it. Dry-run writes no manifest and prints how many entries it would list. The manifest is never rebuilt, rewritten or deleted for a bundle that is already under `archive/`; the existing destination-conflict behaviour is unchanged. `status` is untouched.

#### Scenario: AM-128 the manifest lists the bundle and travels with it
- WHEN a ready bundle with nested review, requirement and spec files (including an empty file and a path with spaces and unicode) is archived with `--write`
- THEN `archive/<stamp>-<name>/archive-manifest.json` exists, its `stamp` equals the directory's stamp and its `change` the name, `files` carries every regular file's relative path with the sha256 of its content, excludes `archive-manifest.json` itself, and the report carries one line naming the manifest and its entry count; a dry-run of the same bundle writes no manifest and only reports the count

#### Scenario: AM-129 a manifest failure leaves the store untouched
- WHEN producing the manifest fails — the injected hash reader throws for one file, and separately the injected write of the manifest fails
- THEN the run exits 1 naming the manifest, no store file is rewritten, no temp store file remains, the bundle stays in flight and intact, and a rerun with the fault removed archives normally

#### Scenario: AM-130 a rerun after a failed move recomputes the manifest
- WHEN the store commit succeeds but the move is made to fail, an inventoried file is then changed, and the run is repeated without the fault
- THEN the archived bundle carries exactly one manifest whose entries match the bundle's final content — the changed file's new hash included, so the second run demonstrably recomputed rather than reused the first manifest (which is never listed in itself)

#### Scenario: AM-132 publication is exclusive and replaces, never follows, an occupant
- WHEN a symbolic link named `archive-manifest.json` pointing at a store file sits in the bundle, and separately a directory occupies that name
- THEN the first archives with the store file byte-identical and the archived manifest a regular file; the second fails the run naming the manifest with the store untouched, no temp left behind and the bundle intact, and archives normally once the occupant is removed

#### Scenario: AM-135 a short write never publishes a truncated manifest
- WHEN the descriptor accepts only part of the manifest and then fails, separately accepts it in small pieces, and separately makes no progress at all
- THEN the first fails the run naming the manifest with the store untouched, no manifest published and the run's temp removed; the second publishes a complete manifest that parses and matches the bundle; the third fails as a short write instead of spinning

#### Scenario: AM-133 a symlinked bundle root is refused and an archived baseline stays intact
- WHEN `changes/<name>` is a symbolic link to an already archived bundle that carries a manifest
- THEN `archive --write` refuses before writing anything, naming the link, and the archived manifest is byte-for-byte unchanged

#### Scenario: AM-134 prototype-named files are files
- WHEN the bundle holds regular files named `__proto__`, `constructor` and `toString`
- THEN all three are listed in the manifest with their hashes

#### Scenario: AM-131 links are recorded, never followed
- WHEN the bundle contains a symbolic link (to a file inside and, separately, to a file outside the bundle) beside regular files
- THEN the manifest records the link as `link:<target>` without hashing or following it, the regular files are hashed as usual, and the run succeeds

## Notes

Why: the archive is documented as a frozen snapshot, but nothing records what the snapshot contained — a real project wrote eight review files into an archived bundle seven days after archiving, with no trace. The manifest records the content at archive time; `apriori check` (see the check delta) reports later drift. It is written before the store is touched so a failure can never leave stores rewritten and the archive unbaselined (Claude × Astra consensus, 2026-09-26).
