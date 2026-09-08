# Proposal — cli-strictness

**WHY.** Every subcommand silently ignores unknown argv tokens — `verify --sepcs x` (typo) falls back to the config and can verify the WRONG spec set while exiting green: fail-open in the toolchain that promises fail-closed. And no subcommand answers `--help`. Roadmap item 6, first of the owner-ordered 3.2 batch.

**WHAT.** One shared `parseStrict` helper (lib/args.js) wired into all ten subcommands: `--help`/`-h` → usage exit 0; unknown dash-tokens → exit 2 naming them; positional arity enforced; value/multi/boolean semantics declared (incl. repeats and aliases). Three declared behavior changes, all fail-closed: `new` extras error, `stamp --foo` is an unknown flag, multi stops at single-dash tokens.

**OUT OF SCOPE.** New flags, --json additions, shell completion, long-form docs (item 7).

Requirement: requirement/req-final.md (3 P1 rounds → no major issues; ledger 6 verified / 0 open).
