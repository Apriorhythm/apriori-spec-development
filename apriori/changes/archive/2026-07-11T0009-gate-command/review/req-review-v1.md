# Review — gate-command req-v1

## Dimension Results

1. Target state B clear and unambiguous: issues open — GREQ-1, GREQ-2, GREQ-3.
2. Edge cases and exception paths covered: issues open — GREQ-4, GREQ-5, GREQ-6.
3. Implied but undeclared state changes or side effects: no major issues; read-only is explicit.
4. Acceptance criteria testable as if/then: issues open — GREQ-1, GREQ-2, GREQ-3, GREQ-6.
5. Conflicts with current state A: issue open — GREQ-7.
6. Target lineage declared and matches repo reality: no major issues. Repo is on `v3`; package is currently `3.1.0`; target release is declared as additive but version wording is advisory below.

## Issues

### GREQ-1 — Stage resolution is ambiguous when multiple archived dirs match

Description: The requirement says archived lookup uses the “newest `apriori/changes/archive/<stamp>-<name>/`”, but does not define the stamp parse/sort rule or tie handling. Archive stamps are minute-granularity (`YYYY-MM-DDThhmm`), so duplicate matches are possible.

Risk: Implementations may choose different archived dirs, making C1/C2/C3/C6 results nondeterministic.

Suggested fix: Define exact matching and ordering: parse only `<YYYY-MM-DDThhmm>-<name>` dirs, sort by stamp lexicographically or parsed timestamp, tie-break by full basename lexicographically, or treat ties as exit 2 ambiguity.

### GREQ-2 — Flow-state legality vocabulary is underspecified

Description: C3 says `current-step ∈ the §3 vocabulary (STEP0..6, INTENT-CARD, SPIKE, EXTRACTION, DONE, ABANDONED)`, but does not define exact accepted string forms. Existing flow-state files may use comments, case, labels, or values like `STEP5` versus `STEP5 apply`.

Risk: A gate implementation could reject valid states or accept placeholders/invalid strings differently.

Suggested fix: Provide the exact accepted regex or enum after comment stripping. Also state whether `change` must match `--change`, whether `round` and `next-action` are required, and whether missing required keys block or exit 2.

### GREQ-3 — Verdict raw matching is not precise enough

Description: C5 says docs are files matching review/design globs containing a line starting `VERDICT:`, and a raw must exist as `apriori/review/S-raw.*`. It does not define whether archived raw must be a file, how to treat directories/symlinks, duplicate raws, non-markdown review docs, or case/whitespace around `VERDICT:`.

Risk: The mechanical anti-simulated-review check can be bypassed or implemented inconsistently.

Suggested fix: Specify exact detection: regular files only, non-symlink or realpath-contained files, line regex such as `^VERDICT:`, raw glob must match at least one regular file under `apriori/review/`, and multiple raws are allowed or blocked.

### GREQ-4 — Change name/path validation for `gate --change` is missing

Description: The requirement defines lookup paths from `<name>` but does not require `CHANGE_NAME_RE` or realpath containment. Other 3.1 surfaces explicitly guard change names and symlink/path traversal.

Risk: Correctness/security issue: `--change ../x` or symlinked archive/change dirs can make gate read outside intended roots while still claiming a mechanical verdict.

Suggested fix: Require bare-kebab-case `CHANGE_NAME_RE` for `--change`, plus realpath containment for resolved in-flight/archived change dirs and files read under them. Invalid/escaping names should exit 2 and write nothing.

### GREQ-5 — C6 uses git without defining failure modes

Description: C6 says “if git is available” then run `git log <c>..HEAD -- lib/<m>.js`; otherwise `–`. It does not define invalid `source-commit`, command failure, non-git cwd, shallow history, missing `HEAD`, or whether stderr/nonzero is `–`, blocked, or exit 2.

Risk: Fresh clones, shallow CI, or stale/bad truth docs can produce inconsistent or noisy gate results.

Suggested fix: Define exact C6 command handling: which git executable invocation, cwd, timeout if any, and classification for nonzero exits. For example, invalid commit or git failure → `–` with note, not block, unless the log command succeeds and emits commits.

### GREQ-6 — C1 verify invocation details are incomplete

Description: C1 says in-flight uses projected verify and archived uses plain verify. It does not state whether gate passes `--cwd`, `--json`, `--id-pattern`, or how it handles missing test command/config. It also does not define how C1 detail should report verify GAPS versus verify ERROR.

Risk: Gate may run verify against the wrong root, lose custom ID pattern support, or classify missing test command inconsistently.

Suggested fix: Define the internal verify call: root is `--cwd`, `testCmd` from `--test-cmd` or config, optional `--id-pattern` if supported or explicitly out of scope, in-flight `change`, archived `specs: [<cwd>/apriori/specs]`. Missing test command should be exit 2 or blocked, explicitly.

### GREQ-7 — Ledger path for archived changes conflicts with current status convention

Description: C4 refers to “ledger file” but does not give the path. The status KB and code use `<root>/apriori/review/<change>-issues.md`, while all later checks read from the resolved change dir. For archived stage, using the resolved dir would imply a different path than current state A.

Risk: Implementers may look for a ledger under the archived change dir or under `archive/`, missing the actual ledger and misreporting C4.

Suggested fix: Declare ledger path explicitly as `<cwd>/apriori/review/<name>-issues.md` for both in-flight and archived stages.

## Advisories

ADV-G1 batch: The out-of-scope section exists and is clear. Version wording is odd: “3.2.0-line work started as 3.1.x feature” is not a stable target; prefer “ships in next minor after 3.1.0, expected 3.2.0” or a concrete version. C2’s trivial-tier “no STEP2” rule should mention how tier is known when `flow-state.md` is missing. C4 should define whether statuses like `open-ish` block; current status parser uses `^open\b`.

## Ledger Delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| GREQ-1 | Archived stage resolution is ambiguous when multiple archive dirs match a change name. | Gate may read different archived artifacts across implementations. | STEP0·r1 | open |
| GREQ-2 | Flow-state legality vocabulary and required fields are underspecified. | Valid flow states may be rejected or invalid placeholders accepted inconsistently. | STEP0·r1 | open |
| GREQ-3 | Verdict raw matching lacks exact file, regex, symlink, and duplicate handling rules. | The simulated-review backstop can be bypassed or inconsistently enforced. | STEP0·r1 | open |
| GREQ-4 | `gate --change` lacks explicit change-name validation and realpath containment. | Path traversal or symlink escapes can make gate read outside intended roots. | STEP0·r1 | open |
| GREQ-5 | C6 git freshness check does not define git failure and invalid-commit handling. | CI/shallow/non-git environments can produce inconsistent PASS/BLOCKED/N/A results. | STEP0·r1 | open |
| GREQ-6 | C1 verify invocation details and missing test-command handling are incomplete. | Gate can run the wrong verify target or classify verify setup failures inconsistently. | STEP0·r1 | open |
| GREQ-7 | Ledger path is undeclared for archived changes and conflicts with status convention if inferred from resolved dir. | Gate may miss the actual issue ledger and falsely pass C4. | STEP0·r1 | open |
| ADV-G1 | Advisory batch: version wording, trivial-tier without flow-state, and exact `open` status wording. | Low. | STEP0·r1 | advisory |

VERDICT: 7 issues open
