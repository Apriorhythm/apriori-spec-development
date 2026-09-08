# Gap report — cli-strictness (STEP1 / P3)

Inputs: requirement/req-final.md (flag table verified against code by the r2 review) · truth/*.md all fresh · repo at d70ad29.

## Current state A
Ten ad-hoc argv loops (8 lib clis + new + stamp positional handling); all silently ignore unknown tokens except doctor (positional-strict) and stamp (count-strict but flag-blind). Usage strings exist per command (printed on error paths only). Dispatcher-level --help/-v/unknown-sub already correct.

## Gaps
G1 new lib/args.js (parseStrict per the req contract). G2 migrate ten cli() functions (usage strings become the single source, printed by both --help and error paths). G3 delta spec: cli store ADDED requirement CL-11..16 + tests (loop over all subcommands via spawned BIN). G4 X3-class test updates: any existing test relying on silent-ignore semantics (audit shows none expected — CL-07's archive misuse test passes flags that exist; doctor/stamp strict tests unchanged).

## Risks
R1 init's interactive branch must not regress (parseStrict returns flags; interactivity decision stays in init.cli). R2 verify's `--specs` multi accumulation must keep existing tests green (S5). R3 the three declared behavior changes (new extras / stamp --foo / multi single-dash stop) are the only intentional diffs — P8 checks nothing else moved.

No blockers. → STEP2.
