**Resolution Check**

RREQ-3 is verified. The v3 migration map now matches the fence-stripped README inventory: the fenced §8.2 template pseudo-headings are no longer treated as document headings, §8 travels together to `docs/cli.md`, and §3 child headings are dispositioned explicitly.

No new requirement issues found. The advisory fixes also landed: R2 now names heading counts, levels, and numeric prefixes, and R7 requires verbatim usage strings in both `docs/cli.md` and `docs/cli_cn.md`.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| RREQ-3 | “MOVED not rewritten” migration map previously mismatched the fence-stripped README inventory. | Preservation rule was ambiguous and hard to review deterministically. | STEP0·r1 | verified |

VERDICT: no major issues
