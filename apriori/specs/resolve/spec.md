### Requirement: change resolution validates its trust roots, entries, and names
`resolveChange` SHALL fail closed on exactly three object classes — the two trust roots (`apriori/changes`, `apriori/changes/archive`), the queried name's active candidate, and archived candidates matching `<stamp>-<name>` — leaving unrelated archive entries to doctor/check. Trust roots are lstat-ed before any readdir: a symlinked or non-directory root (a plain file included) is a structural error, and the archive root must realpath-contain within the changes root. The active candidate is accepted ONLY when lstat shows a real directory — ANY symlink (dangling or resolving, wherever it points) is a structural error, never a silent fallback to the archive. A matching archived candidate that is a symlink is equally structural. Archived stamps validate semantically: the `YYYY-MM-DDTHHMM` fields must Gregorian round-trip (leap days legal; 2/31, 4/31, month 13 illegal) with hours 00-23 and minutes 00-59; an illegal stamp matching the queried name is a structural error never masked by an older valid dir. Names validate through the shared `validateChangeName(name)` returning `{ok}` or `{ok:false, kind: 'invalid-shape'|'date-prefixed'|'reserved'}` — the reserved set holds `archive`; every by-name surface (new, gate, status, archive high-level AND single-file) rejects per kind with its existing message style. `fileReadDefect` returns `null` or `{kind: 'missing'|'symlink'|'not-file'|'bad-ancestor'|'escape', path}`, walking ENOENT leaves up to the bundle root only. Structural errors surface as exit 2 on gate and status — no fallback, no guessing.

#### Scenario: RS-01 trust roots are validated before use
- WHEN `apriori/changes/archive` is a symlink (or junction) pointing outside `apriori/changes`, a plain FILE sits at that path, and separately `apriori/changes` ITSELF is a symlink or a plain file
- THEN gate and status exit 2 naming the structural problem in every case — never resolving through a link at either root (the reviewer's archive-root escape and uncaught-ENOTDIR repros both die here)

#### Scenario: RS-02 broken entries never fall back, at either stage
- WHEN `apriori/changes/<name>` is a dangling symlink while a valid archived bundle of the same name exists; separately a symlink to a REAL directory; and separately the MATCHING `archive/<valid-stamp>-<name>` entry is itself a symlink
- THEN each is a structural error (exit 2) naming the entry — the archived bundle is never silently selected behind a broken active entry, and change identity is never delegated to a link target at either stage

#### Scenario: RS-03 the reserved name and date-prefixed names are rejected on every surface
- WHEN `gate --change archive`, `status --change archive`, `archive --change archive`, AND the single-file `archive --store <f> --delta <f> --change archive` run in a repo whose changes root contains gate-shaped files directly under `archive/` (the reviewer's repro), and when a date-prefixed name like `2026-07-10T1200-x` is queried on each of those four surfaces
- THEN every surface rejects per validateChangeName's kind (resolver surfaces exit 2; archive CLIs exit non-zero with the named rejection) — none treats `archive/` itself as an in-flight change, and none accepts a date-prefixed name

#### Scenario: RS-04 pseudo-timestamps neither sort nor resolve
- WHEN the archive holds `9999-99-99T9999-c` beside a valid `2026-07-10T1200-c`, and separately `2026-02-31T1200-c` alone
- THEN resolving `c` exits 2 naming the illegal stamp (the fake dir never wins "newest", and an illegal stamp is never masked by an older valid one)

#### Scenario: RS-05 read defects speak kinds, not string prefixes
- WHEN `fileReadDefect` inspects a clean file, a missing leaf, a missing leaf under a symlinked ancestor (within the bundle), a symlinked leaf, and an escaping target
- THEN it returns null / kind missing / kind bad-ancestor / kind symlink / kind escape respectively, each carrying the offending path — and consumers switch on kind, never on message prefixes
