### Requirement: the hotfix state file parses as fixed structure
`lib/hotfix.js` SHALL parse `hotfix-state.md` as a fixed shape, never as free text: a leading header block of `key: value` lines, then second-level sections. The legal header keys are exactly `hotfix`, `date`, `kinds`, `change-kind`, `touched-modules`, `fix-ref`, `frontend-touched`, `backend-touched`, `affected-scenario-ids`; an unknown header key is a fatal parse problem (F1), as is a repeated key. The legal sections are exactly `## Conclusion`, `## Bindings` and `## Gates`; any other second-level heading is F1. `## Conclusion` is the one unconditionally required section — missing, blank, or still carrying the scaffold placeholder text verbatim is F1. `## Gates` is process metadata (excluded from the review digest); `## Conclusion` and `## Bindings` are business sections. Parsing NEVER throws: every failure returns as a problem list.

#### Scenario: HF-01 the header block parses by key with fixed vocabulary
- WHEN a state file carries `hotfix`, `date`, `kinds` and `change-kind` header lines followed by `## Conclusion`
- THEN each key resolves to its trimmed value, section boundaries are recognized, and no problem is reported

#### Scenario: HF-02 unknown or repeated header keys are fatal
- WHEN the header carries `severity: high` (not in the vocabulary), or two `change-kind` lines
- THEN parsing reports a problem naming the offending key in each case — unknown key and duplicate key are distinct messages, and neither throws

#### Scenario: HF-03 unknown sections are fatal, known process sections are not business content
- WHEN the file carries `## Notes` (unknown), and separately a file carries `## Gates` alongside `## Conclusion`
- THEN the first is a problem naming the section; the second parses cleanly with `Gates` classified as process metadata and `Conclusion` as business content

#### Scenario: HF-04 the conclusion is unconditionally required and must be filled in
- WHEN `## Conclusion` is absent, present but blank, or still holds the scaffold placeholder line verbatim
- THEN each case is a problem naming the conclusion — the placeholder case says the placeholder was never replaced

### Requirement: declared fields obey a fixed contract before grading runs
The field contract SHALL be checked before any grading: `change-kind` is required and one of `no-code | code-trivial | code-behavior | doc-fix`; `touched-modules` and `fix-ref` are required together for every `code-*` and for `doc-fix`, forbidden for `no-code`; `frontend-touched` and `backend-touched` are required for every `code-*` (independent of the verification profile — a touch signal is a radius input, not an evidence input) and forbidden otherwise; `affected-scenario-ids` is required and non-empty for every `code-*`, forbidden for `no-code`. `kinds` is a non-empty comma-separated subset of `1,2,3` where 1 and 2 are mutually exclusive; `kinds` containing 1 implies a `code-*` or `doc-fix` kind, containing 2 implies `no-code`, and containing 3 is equivalent to decisions being present. `touched-modules` is a non-empty duplicate-free list drawn from the store/truth module vocabulary and SHALL be a superset of the delta's modules; for `doc-fix` it SHALL equal them. Every violation is F1 with a message naming the field — grading is never attempted on a contract-invalid bundle.

#### Scenario: HF-05 change-kind is required with a closed vocabulary
- WHEN `change-kind` is missing, or reads `hotfix` (not in the set)
- THEN each is F1 naming `change-kind`, and the missing case is distinguishable from the unknown-value case

#### Scenario: HF-06 locator headers are paired, required for code and doc kinds, forbidden for no-code
- WHEN a `code-trivial` bundle omits `touched-modules`, or omits `fix-ref` while keeping `touched-modules`, or a `no-code` bundle carries either
- THEN each is F1 naming the missing or forbidden field

#### Scenario: HF-07 touch signals are radius inputs, independent of the profile
- WHEN a `code-behavior` bundle omits `frontend-touched` (with no verification profile declared at all), or a `no-code` bundle carries `backend-touched`
- THEN each is F1 — the requirement does not consult the profile

#### Scenario: HF-08 affected-scenario-ids is required and non-empty for code kinds
- WHEN a `code-trivial` bundle omits `affected-scenario-ids` or leaves it empty
- THEN each is F1 naming the field

#### Scenario: HF-09 kinds is a constrained subset with cross-field implications
- WHEN `kinds` reads `1,2` (mutually exclusive), or `1` on a `no-code` bundle, or `2` on a `code-trivial` bundle, or `3` with no decisions present
- THEN each is F1 naming the inconsistency; `kinds: 3` alone on a `no-code` bundle carrying decisions is legal (a pure business-fact write-back)

#### Scenario: HF-10 touched-modules is a clean vocabulary superset of the delta
- WHEN the list is empty, repeats a module, names a module outside the store/truth vocabulary, or omits a module the delta touches (and, for `doc-fix`, names a module the delta does not touch)
- THEN each is F1 naming the field and the offending module

### Requirement: blast radius grades mechanically to a radius/subtype pair
Grading SHALL run only on contract-valid input and SHALL return the ordered-first match as the pair `(radius, subtype)`: (1) a delta carrying REMOVED or RENAMED, a union of touched/delta/decision modules of two or more, decisions carrying a supersession or exceeding the per-module cap, a dual-end touch (`frontend-touched` and `backend-touched` both yes), or any MODIFIED/ADDED block without a scenario ⇒ `(R3, n/a)`; (2) a non-zero delta ⇒ `(R3, n/a)` by default, demoted to `(R2, whitelist)` only when every touched requirement block carries a human-granted `blast: low` marker in the store; (3) `code-behavior` ⇒ `(R2, behavior)`; (4) `code-trivial` with one touched module ⇒ `(R1, n/a)`; (5) `no-code` ⇒ `(R0, n/a)`. Fail-up is the rule: an unannotated MODIFIED or ADDED block never reaches R2. A delta that introduces a `blast: low` marker absent from the store, or drops one present in the store, is F1 — the marker is human-granted and a delta may neither self-grant nor revoke it. `R3` is not an admission: it is rejected with a message pointing at the formal process.

#### Scenario: HF-11 structural deltas and cross-module bundles grade R3
- WHEN the delta carries a REMOVED block, or a RENAMED block, or the module union spans two modules (including a code module plus a decisions-target module)
- THEN each grades `(R3, n/a)` and the rejection message points at the formal process

#### Scenario: HF-12 decision shape and dual-end touches grade R3
- WHEN decisions carry a supersession, or exceed the per-module cap of three, or the bundle declares `frontend-touched: yes` together with `backend-touched: yes`
- THEN each grades `(R3, n/a)`

#### Scenario: HF-13 an unannotated delta grades R3, an annotated one demotes to R2-whitelist
- WHEN a single-module MODIFIED delta touches a store block that carries no `blast: low` marker, and separately one whose store block carries the marker
- THEN the first grades `(R3, n/a)` (fail-up: the defect account's GROUP BY / selection-criteria rewrites never reach the lane) and the second grades `(R2, whitelist)`

#### Scenario: HF-14 an ADDED-only delta still grades R3 without an annotation
- WHEN the delta is ADDED-only, single-module, every block carrying a scenario, with no `blast: low` marker on the target
- THEN it grades `(R3, n/a)` — ADDED extends the living contract, and the absence of ADDED-type regressions in the defect account is not evidence of safety

#### Scenario: HF-15 a scenario-less delta block grades R3 whatever its annotation
- WHEN a MODIFIED block carries no scenario at all, even with a `blast: low` marker on the store block
- THEN it grades `(R3, n/a)` — there is no executable test target to bind

#### Scenario: HF-16 zero-delta kinds grade by declaration
- WHEN the bundle is `code-behavior`, or `code-trivial` with a single touched module, or `no-code`
- THEN they grade `(R2, behavior)`, `(R1, n/a)` and `(R0, n/a)` respectively, and every non-R2 result carries the subtype `n/a`

#### Scenario: HF-17 a delta may neither self-grant nor revoke the marker
- WHEN a delta block introduces a `blast: low` marker that the store block does not carry, and separately a delta block drops a marker the store block does carry
- THEN each is F1 naming the marker — self-granting and revoking are both refused before grading

### Requirement: bindings live in the state file and cover every delta target key
The `## Bindings` section is the single carrier for test-binding declarations (carrier c1'). Each line reads `<target key>: tests: <non-empty>`, where the target key is a scenario ID when the delta block carries scenarios and the requirement title otherwise; the line is split at the FIRST ` tests: ` marker and the text before it, minus its trailing colon, is the key. The requirement function is fixed: a `code-*` bundle with a non-zero delta SHALL carry exactly one line per delta target key (a missing key, a duplicated key and a key absent from the delta are each F1); `doc-fix` SHALL carry none (its oracle is `check` plus review, not a TAP binding); a zero-delta bundle SHALL carry none (ruling p1); `no-code` SHALL carry none. `no-test:` lines are refused outright — the ruled lane has no no-test escape. Carrier exclusivity is mechanical: a binding declaration appearing anywhere but the `## Bindings` section — inside a delta block or in a standalone bindings file — is F1.

#### Scenario: HF-18 every delta target key carries exactly one binding line
- WHEN a two-scenario MODIFIED delta declares both keys once each, and separately when one key is missing, duplicated, or names a key the delta does not carry
- THEN the first is clean and the other three are F1 naming the offending key

#### Scenario: HF-19 kinds that must not declare bindings are refused when they do
- WHEN a `doc-fix`, a zero-delta `code-behavior` or a `no-code` bundle carries a `## Bindings` line
- THEN each is F1 naming the kind — under the ruled combination only a non-zero-delta code bundle declares bindings

#### Scenario: HF-20 no-test lines and out-of-carrier declarations are refused
- WHEN a `## Bindings` line reads `GT-01: no-test: not worth it`, and separately when a `tests:` declaration sits inside a delta block or in a standalone bindings file
- THEN each is F1 — the ruled lane has no no-test escape and no second carrier

### Requirement: screenshot evidence is tier-parameterized and validated when present
Under a declared `ui` or `fullstack` profile the screenshot observation record `evidence/screenshots.md` carries lines of the fixed shape `- path=<repo-relative> obs=<one line> time=<ISO UTC seconds> baseline=<value> run=<id>`. The obligation is tier-parameterized by the owner's ruling: at the **incremental tier** (the hotfix lane) a missing record is an ADVISORY — it prints a reminder and never blocks; at the **full tier** it is mandatory. Whatever the tier, a record that IS present is validated in full: every field required, no field value may contain another field's ` key=` marker, `path` is repo-relative under `apriori/tmp/` with no `..` and no symlink component, `time` parses as ISO UTC seconds, every line shares one `run` value, and `baseline` equals the repo HEAD the evidence was produced against. A `hash=` field is REFUSED under the ruled combination (π1 + f1): nothing consumes it and its presence would drag in a platform-dependent safe-open path. `ui: not-applicable — <reason>` with a non-empty reason is how a backend-only bundle waives the record; at the incremental tier the line is optional, at the full tier it is required.

#### Scenario: HF-21 a missing record is advisory in the lane and never blocks
- WHEN a `ui`-profile hotfix declares `frontend-touched: yes` and carries no screenshot record
- THEN the result is admitted with an advisory naming the missing record — the ruling downgraded this obligation for the incremental tier

#### Scenario: HF-22 a present record is validated in full
- WHEN a record line omits a field, carries a `path` outside `apriori/tmp/` or containing `..`, carries a `time` that is not ISO UTC seconds, or two lines disagree on `run`
- THEN each is F1 naming the offending field — providing a record buys no leniency

#### Scenario: HF-23 a stale baseline and an injected marker are refused
- WHEN a record's `baseline` does not equal the repo HEAD, and separately when an `obs` value contains the substring ` run=`
- THEN each is F1 — an old screenshot cannot be recycled and no field value may impersonate another field

#### Scenario: HF-24 hash is refused and the waiver line needs a reason
- WHEN a record line carries a `hash=` field, and separately when the bundle waives with `ui: not-applicable —` and an empty reason
- THEN each is F1: `hash` is refused under the ruled combination, and a waiver without a reason is not a waiver

### Requirement: two digest domains share one unforgeable record encoding
Every digest record SHALL be `<decimal tag byte length>\n<type-tag>\n<decimal bytes length>\n<bytes>` — BOTH the tag and the bytes length-prefixed, so a tag carrying a newline cannot forge a record boundary — and every ordering SHALL be UTF-8 byte order, never locale collation. The **review digest** (`digest-core`) is SHA-256 over the business entities in the fixed order: delta files by path, `decisions`, `section:Conclusion`, `section:Bindings`, the header fields by key, `baseline`. Process metadata (`## Gates`, `approval.md`, `review/`) is excluded — it is the exclusion domain, and a change there SHALL NOT move the digest. The **d1 signoff token** is SHA-256 over records in the fixed domain order `core → store → truth`; the first record is `core` carrying the hex digest-core, and each later record carries the SHA-256 of a baseline file's bytes. There is no artifact domain — `f2` was not ruled in. Paths are canonicalized before ordering and dedup: separators normalized to `/`, repeats collapsed, `.` segments dropped, `..` refused, and NO case folding. The same canonical path appearing twice with different content hashes is a problem, not a silent last-writer.

#### Scenario: HF-25 the record encoding resists tag and boundary forgery
- WHEN two different (tag, bytes) pairs are chosen so that a naive concatenation would serialize identically — including a tag containing a newline
- THEN the two records differ, because both lengths are prefixed

#### Scenario: HF-26 the review digest covers business entities and excludes process metadata
- WHEN the conclusion text, a delta file, a header field value or the bindings section changes, and separately when only `## Gates` / `approval.md` / `review/` content changes
- THEN the first four each move the digest and the last leaves it byte-identical

#### Scenario: HF-27 digest ordering is byte order, not locale order
- WHEN the same delta files and header fields are supplied in a different input order
- THEN the digest is unchanged, and files whose names differ only by case are ordered by their bytes and never folded together

#### Scenario: HF-28 the token binds the core to the store and truth baselines in a fixed domain order
- WHEN the same core is combined with the same baseline files supplied in a scrambled order, and separately when one baseline file's hash changes
- THEN the first two tokens are equal and the third differs — the domain order `core → store → truth` is fixed and there is no artifact domain

#### Scenario: HF-29 canonical paths refuse `..` and never fold case
- WHEN a baseline path is `apriori/specs/../specs/gate/spec.md`, and separately when two paths differ only in case
- THEN the first is a problem naming `..` and the second yields two distinct records

#### Scenario: HF-30 one canonical path may not carry two different hashes
- WHEN two baseline entries canonicalize to the same path with different content hashes, and separately with equal hashes
- THEN the first is a problem and the second dedups to one record

### Requirement: the review surface is a fixed verdict grammar with a ruled projection
The raw transcript SHALL carry exactly one `=== VERDICT ===` marker, and every line after it SHALL read `VERDICT: <phrase> role=<r> digest=<hex>` with an optional `boundary=<within|exceeds>` trailer. `role` and `digest` are mandatory and occur exactly once each; `digest` is exactly 64 lowercase hex characters; `role` is `inspection` or `p8`; the phrase SHALL pair with the role (`inspection` → `no findings` | `<N> issues open`; `p8` → `no spec-vs-code gaps` | `gaps found`). The projection is fixed by grade: `R1` demands no point-check; `R0` demands one only when decisions are present (the point-check reads decisions against the conclusion); `R2` code demands one `inspection` round; `R2 × docs` demands two lines, `inspection` then `p8`. The `boundary=` trailer is REQUIRED exactly when the γ' whitelist point-check stands in for a human signoff, and its presence anywhere else is refused. A non-passing phrase, a `boundary=exceeds`, or a verdict digest that does not equal the recomputed digest-core each refuse the archive. Review rounds are named `round-<n>.md` + `round-<n>-raw.txt` (decimal `n`, no leading zeros); the highest `n` is consumed and any incomplete pair, at any round, is a problem.

#### Scenario: HF-31 the verdict zone is unique and its lines parse by fixed grammar
- WHEN the raw transcript carries no marker, or two markers, or a well-formed single zone
- THEN the first two are problems naming the marker and the third parses each line into phrase, role, digest and optional boundary

#### Scenario: HF-32 role, digest and phrase pairing are mandatory and closed
- WHEN a verdict line omits `role=`, omits `digest=`, repeats one of them, carries a digest that is not 64 lowercase hex, names an unknown role, or pairs `role=p8` with `no findings`
- THEN each is a problem naming the offending part

#### Scenario: HF-33 the projection demands exactly the ruled rounds and roles
- WHEN an R1 bundle carries no review, an R0-with-decisions bundle carries none, an R2 code bundle carries one inspection line, and an R2 docs bundle carries `p8` before `inspection`
- THEN the first is clean, the second is a problem naming the missing round, the third is clean, and the fourth is a problem naming the ruled order

#### Scenario: HF-34 a non-passing verdict, an exceeded boundary and a stale digest each refuse the archive
- WHEN the phrase reads `2 issues open`, or an inspection line reads `boundary=exceeds`, or the line's digest differs from the recomputed digest-core
- THEN each is a problem — the archive is refused rather than warned about

#### Scenario: HF-35 the boundary trailer is required exactly where the ruling puts it
- WHEN a `(R2, whitelist)` inspection line omits `boundary=`, and separately when a `(R2, behavior)` inspection line carries one
- THEN each is a problem — the trailer stands in for a human signoff and appears nowhere else

#### Scenario: HF-36 rounds are selected by highest n and must be complete pairs
- WHEN `review/` holds rounds 1 and 2 complete, and separately when round 2 has only its document, and separately when a file is named `round-01.md`
- THEN the first selects round 2, the second is a problem naming round 2, and the third is a problem naming the leading zero

### Requirement: the lane is scaffolded, judged with zero writes, and archived in three stages
`apriori hotfix new <name>` SHALL scaffold `apriori/changes/<name>/` with a `hotfix-state.md` whose header carries every legal key, a placeholder conclusion and a bindings container — the skeleton parses cleanly except for the placeholder it tells the author to replace. The name rule is `apriori new`'s, and an existing directory is refused, never merged into. A directory carrying BOTH `flow-state.md` and `hotfix-state.md` is F1 at every consumption point: a bundle has one identity. `apriori hotfix archive <name>` runs a global preflight that performs ZERO writes — field contract, grading, carrier, CAS stamp against the store it rewrites, screenshot evidence, clean tree (excluding `apriori/changes/**` and `apriori/tmp/**`), the review projection, and the scoped verdict — and prints the grade, scope, digest and write set. With `--approve <token>` it recomputes the token and refuses unless it matches; the token binds the digest-core to the store and truth baselines, so any move in either refuses the archive. The write set runs in three stages — stores → truth → bundle move — each through a temp file and one atomic rename; a failing stage names which files committed, which did not, and that rerunning completes the run. Truth decisions take their ID prefix from the doc's existing decisions; a doc with none refuses to allocate one rather than inventing a prefix.

#### Scenario: HF-37 the scaffold lands a parseable skeleton and refuses a name that is taken
- WHEN `hotfix new` runs in a clean project, then again with the same name, then with a name that is not bare kebab-case
- THEN the first writes a skeleton whose only parse problem is its own unreplaced placeholder, and the other two are refused with the reason named

#### Scenario: HF-38 a bundle carrying both identities is refused
- WHEN a directory holds both `flow-state.md` and `hotfix-state.md`
- THEN preflight refuses it, naming both files — a bundle is a formal change or a hotfix, never both

#### Scenario: HF-39 preflight writes nothing, whether it passes or fails
- WHEN preflight runs on a clean bundle and again on one whose working tree is dirty outside the bundle
- THEN the first reports its grade and the second reports the uncommitted paths, and in both cases the store bytes and the bundle listing are unchanged

#### Scenario: HF-40 the token is refused when a baseline moved after it was issued
- WHEN a token is issued by a dry run and a truth doc in the token's baseline set is edited before `--approve` runs
- THEN the archive is refused naming the mismatch, and nothing is written or moved

#### Scenario: HF-41 an approved run writes stores, truth and the bundle move in that order
- WHEN a matching token approves a whitelisted MODIFIED bundle carrying one decision
- THEN the store block is rewritten, the decision is appended to the truth doc with the next allocated ID and the ratifying change name, `approval.md` is written command-owned carrying the token and the ratified IDs, and the bundle is moved under `changes/archive/`

#### Scenario: HF-42 a failing stage names what committed and what did not
- WHEN stage 2 cannot allocate a decision ID because the truth doc carries no existing decision
- THEN the run fails naming the stage, the cause and what stage 1 already committed, and the bundle stays in place for the rerun
