# Tasks — win-bash

- [x] T1. Failing tests GP-06..10 in test/golden-path-resolve.test.js (dynamic ESM import; fake seams; multi-hit CRLF/space/blank where-output; never-bare-bash sweep) — red run.
- [x] T2. resolveBash + entry guard in scripts/golden-path.mjs; all spawn sites use the resolved BASH; win32-only single log line.
- [x] T3. Suite green; golden-path --local green; verify --change GREEN; gate PASS; check --self PASS.
