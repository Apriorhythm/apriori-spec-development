# Design — change-bundle

One atomic task boundary (CB-3): CLI flip + tests + docs + this repo's migration land in ONE commit; before it nothing flips.

**lib/gate.js**
- `checkLedger(cwd, name, tier, stage, dir)` → ledger path becomes `path.join(dir, 'review', 'issues.md')`; the trivial-n/a and blocked messages name that path. `cwd`/`name` params drop from the path computation (signature can shrink to `(tier, stage, dir)` — internal, not exported).
- ONE review-dir guard before C4 AND C5 (CBSPEC-2/3): when `<dir>/review` exists it must be a real directory (lstat, not a symlink) AND `containsReal(dir, <dir>/review)` — a symlinked, escaping, or NON-DIRECTORY `review` blocks both checks naming the path and the defect (never read through, never crashed on). Then `checkEvidence(dir)`: scan `<dir>/review/*.md`, exclude `issues.md` + `*-raw*` stems, VERDICT docs need `<dir>/review/<stem>-raw.*` (lstat-regular). design/ scanning is deleted. Works at both stages unchanged (dir travels).
- GT-15 corpus helper in tests: archived ledger path `<archived>/review/issues.md`.

**lib/status.js** — ledger read for open-item counts: `<changeDir>/review/issues.md` (verify what it reads today: `apriori/review/<name>-issues.md` — flip).

**lib/check.js** — `checkReviewSecrets`: root discovery = for each of `apriori/changes` and `apriori/changes/archive`, list dirs (containsReal-guarded, warn-skip escapes/symlinks), scan `<dir>/review/` recursively with the EXISTING per-file semantics. The old single-root `apriori/review` scan is deleted.

**lib/archive-merge.js** — DELETE phase 3.5 wholesale (escapeReLocal stays only if still referenced — it isn't → delete). No other change: the move already carries the dir.

**lib/new.js** — scaffold: after flow-state write, `mkdirSync(<dir>/requirement)` + `mkdirSync(<dir>/review)`; next-action template → `draft apriori/changes/${name}/requirement/req-v1.md (or the intent card on the explore track)`.

**lib/init.js** — drop `'review'` from the scaffold-dirs list.

**package.json** — `"engines": { "node": ">=22" }`; version → 4.0.0 at release commit. **.github/workflows/ci.yml** — every `node-version` matrix/pin: {22, 24}; golden-path + python jobs pinned ≥22.

**Docs** — runbook EN/CN: artifact table rewritten to bundle rows; every path mention in P0/P1-P12/STEP0/1/6/goal recipes; STEP6 loses all preservation text, keeps executor spike duty ('delete or quarantine spike/ before the archive action' — spike now `changes/<name>/spike/`); the artifact-root comment updated; stability sentence in CHANGELOG header (and any echo) drops the layout clause. concepts EN/CN mirrored (§7.0 ledger paths, mini-kv walkthrough, P5 examples).

**Migration script (session artifact, not shipped)** — per the req-final table, with per-target uniqueness assert + collision abort; runs over apriori/review, apriori/design, apriori/explore, archived requirement files; then `rmdir` the emptied legacy dirs + root `requirement/` (in-flight changes' req docs — change-bundle's own — move into its bundle in the same pass); `git rm`-tracked? review evidence is untracked in THIS repo (apriori/* ignored except specs) — plain fs moves suffice; the tracked apriori/specs untouched.

**Tests**
- PR-21 (new; PR-19/PR-20 test bodies DELETED — their store scenarios are deprecated by the REMOVED blocks): artifact-table anchors, STEP6 no-staging + executor-spike anchors, strip-scan negative (CBSPEC-1: strip WHOLE bundle tokens — /(?:apriori\/)?changes\/[^\s)`"'|]+\//g consumes the full chain incl. archive/<stamp>-<name>/… forms, greedy to the token's last slash — then assert zero `apriori/review/` `apriori/design/` `apriori/explore/` standalone `requirement/` `spike/`), stability-sentence-no-layout anchor.
- GT fixtures: healthy()/ledgerWith/archProject write `<dir>/review/issues.md`; GT-05 evidence fixtures under `<dir>/review/`; GT-15 corpus new path; GT-09 n/a message asserts the bundle path.
- CK-10 tests: secrets planted in `changes/x/review/` and `archive/<stamp>-x/review/`; escaping-review-symlink warn-skip case.
- AM-36..39 rewritten to bundle-travel (fixtures put requirement/+review/ inside the change dir; DI move-failure case; no-staging-lines assertions). AM staging tests from req-sweep deleted with the code.
- NW-05 rewritten (skeleton dirs + new next-action); IN scaffold-list test drops review/.
- SR-32/projection JSON untouched (no path change).
Tasks: T1 red (new/changed tests, red run) → T2 THE ATOMIC FLIP (all lib+docs+CI+engines+migration script run, one commit) → T3 gates (suite/verify/gate/check/golden) → T4 P8 → T5 self-archive (bundle-native) + post-archive gate → release 4.0.0 on branch v4.
