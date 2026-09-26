<!-- apriori-base: sha256:735aa5d3b463935c8410ef942d6421f9645b8bb0224b6c084e7dec049fc88b69 -->
# Delta — check (archive-manifest)

## ADDED Requirements

### Requirement: check reports archive drift and never fails on it
In both modes `apriori check` SHALL look at every directory under `apriori/changes/archive/` (an absent archive root is nothing to report). For a bundle that carries a readable `archive-manifest.json` it SHALL recompute the same listing and report, as a `!` note that does not affect the exit code, `archive drift: <dir> +<added> −<removed> ~<modified>` followed by one indented line per differing path; an unchanged bundle prints nothing. Bundles without a manifest are counted and reported in ONE summary note (`no baseline: N archived bundle(s) carry no manifest — archived before manifests were written, or the manifest is gone`), never one line per bundle; a manifest that exists but cannot be parsed is reported as unreadable, also as a note; an entry under `archive/` that is a symbolic link is named as not compared. Membership is judged on own properties, so a file named `constructor` or `__proto__` is inventoried and its removal reported like any other. The check compares content hashes, so a changed mtime with identical bytes is not drift. Drift is a report of a changed snapshot, not a verdict that the change was wrong, and check never repairs, rewrites or deletes a manifest.

#### Scenario: CK-19 drift is reported per bundle and does not change the exit code
- WHEN an archived bundle with a manifest is left unchanged, and then a file is added, one removed and one modified
- THEN the unchanged bundle produces no line, the changed one produces `! archive drift: <dir> +1 −1 ~1` with the three paths beneath, and `RESULT: PASS` with exit 0 in both cases when nothing else fails; an unrelated failing check still fails as before

#### Scenario: CK-20 bundles without a baseline are summarised once, and a broken manifest is named
- WHEN the archive root holds three bundles without a manifest and one whose manifest is not valid JSON
- THEN check prints exactly one `no baseline` note naming the count 3, one `archive manifest unreadable` note naming the fourth bundle, and the exit code is unaffected

#### Scenario: CK-21 identical content is not drift
- WHEN every file of an archived bundle is rewritten with identical bytes (new mtimes) and a file listed as `link:` still points at the same target
- THEN check prints no drift line for it

#### Scenario: CK-22 prototype-named files diff like any other, and a symlinked archive entry is named
- WHEN an archived bundle's manifest lists root files named `__proto__` and `constructor`, one of which is then removed, and separately a symbolic link is placed directly under `archive/`
- THEN the removal is reported under `archive drift` and the link is reported as not compared, with the exit code unaffected

## Notes

Why: the manifest (archive-merge delta) is only useful if something reads it; `check` is the structural checker projects already run in CI and pre-commit. Reporting without failing is deliberate — appending material to an archive is not always wrong, but it must be visible (Claude × Astra consensus, 2026-09-26).
