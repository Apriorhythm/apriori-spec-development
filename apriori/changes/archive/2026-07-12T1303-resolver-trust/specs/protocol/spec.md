<!-- apriori-base: sha256:aee3d96eb43c89a6d055c76cbb7bbc587ae066d9a1d6619f0f9e5c77f37abbd1 -->
## ADDED Requirements

### Requirement: the migration pointer reaches npm users
The npm package SHALL ship `MIGRATING.md` (listed in `package.json` `files`), and the legacy-layout messages (doctor D8's fix, update's warning) SHALL carry both the local path and the stable URL `https://github.com/Apriorhythm/apriori-spec-development/blob/v4/MIGRATING.md` — a pointer the diagnosed user can actually open.

#### Scenario: PR-23 the pointer is packaged and dual-form
- WHEN the npm files list and the D8/update message templates are read
- THEN `MIGRATING.md` appears in `package.json` `files`, both messages carry the local file reference and the stable blob URL, and MIGRATING's pre-4.0 CAS wording carries the "archive denies by default since 4.0.1" correction so the old table cannot be read as current behavior
