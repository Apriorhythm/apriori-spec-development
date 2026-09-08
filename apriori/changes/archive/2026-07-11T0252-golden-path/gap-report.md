# Gap report — golden-path (STEP1 / P3)

Inputs: requirement/req-final.md · README Quickstart (four shell blocks, verified [0,1,0,0] by the r1 review) · ci.yml (one test job).

## Current state A
No pack-and-install verification anywhere; the Quickstart contract exists (readme-split) but nothing consumes it mechanically; my hand-run extractor prototype (this session) proved the extraction approach works.

## Gaps
G1 scripts/golden-path.mjs (extractBlocks(text) seam + plan builder + runner with --local/--packed). G2 ci.yml golden-path job (ubuntu+windows, node 20, bash). G3 test/golden-path.test.js (extractor units + doctored-text failure + one --local full run). G4 store module `golden` GP-01..04 delta.

## Risks
R1 Windows npm global layout (`<prefix>` vs `<prefix>/bin`) — the platform bin-dir rule from req; assert resolve-inside-prefix before running. R2 The --local full-run test adds ~5-10s to the suite — acceptable; CI packed run ~1min. R3 bash heredocs inside blocks must survive the runner's script assembly (write the assembled script to a file, don't inline-eval). R4 npm i -g --prefix on Windows needs npm_config_prefix env instead of flag? Use `--prefix` arg + `npm config` fallback; verify in CI (the job IS the verification).

No blockers. → STEP2.
