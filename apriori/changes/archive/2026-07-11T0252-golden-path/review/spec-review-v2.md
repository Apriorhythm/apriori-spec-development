**Resolution Check**

GPSPEC-1 is verified. The design now explicitly runs the assembled script without `set -e`, captures each block’s last exit via sentinels, and treats a missing sentinel as script death with a named failure.

GPSPEC-2 is verified. The CI design now captures the exact tarball filename with `TGZ=$(npm pack --silent)` and passes `"$TGZ"` to the runner, removing glob ambiguity.

**Issues**

GPSPEC-3 — Final-state assertions do not specify reuse of the same `apriori` resolution.

Description: The design aliases `apriori` for the Quickstart walk in `--local` mode via a bash function, and uses isolated PATH for `--packed`. But final-state assertions are described as separate `spawnSync` calls in the demo dir. A bash function will not exist for those calls, and the design does not require the isolated packed PATH to be reused.

Risk: Final assertions may fail locally, use a preexisting global `apriori`, or stop proving the same binary that ran the Quickstart.

Suggested fix: Define one resolver used for both the block walk and final assertions. For example: local mode uses an absolute `node <checkout>/bin/apriori.js` shim or temp PATH entry; packed mode passes the isolated-prefix PATH env to every final assertion. Add a test proving final assertions do not depend on a global install.

GPSPEC-4 — Windows bash PATH handling is still underspecified for packed mode.

Description: The design chooses `<prefix>` as the Windows npm bin dir, then prepends it to PATH inside a bash script. On `windows-latest` with bash, raw Win32 paths such as `C:\...` can be misparsed in colon-separated bash PATH unless converted or injected through the correct environment mechanism.

Risk: The Windows packed job can fail before proving the packaged CLI, or the prefix preflight can compare incompatible path forms.

Suggested fix: Specify Windows path normalization. Either build the child process env in Node using `path.delimiter` and pass it to bash, or convert the prefix/bin dir to a bash path before exporting. Normalize the `command -v apriori` result before checking containment.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| GPSPEC-1 | Per-block exit capture could abort before later blocks run. | The walk dies at the documented red step. | STEP2·r1 | verified |
| GPSPEC-2 | Packed-mode CI tarball selection ambiguous. | Stale tarballs could be installed. | STEP2·r1 | verified |
| GPSPEC-3 | Final-state assertions do not specify reuse of the same `apriori` binary resolution as the block walk. | Runner may assert with the wrong CLI or depend on a global install. | STEP2·r2 | open |
| GPSPEC-4 | Windows bash PATH handling for the isolated npm prefix remains underspecified. | Windows packed job may fail or prove the wrong path form. | STEP2·r2 | open |

VERDICT: 2 issues open
