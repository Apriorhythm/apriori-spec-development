# Tasks — golden-path

- [x] T1. Failing tests GP-01..05 (test/golden-path.test.js) — red run.
- [x] T2. scripts/golden-path.mjs (extractBlocks/buildPlan/runner).
- [x] T3. ci.yml golden-path job (existing jobs byte-identical).
- [x] T4. Local full run green (--local); suite green; verify --change golden-path GREEN; gate PASS; check --self PASS.
- [x] T5. Packed-mode smoke DONE 2026-07-11: npm pack (3.2.0 tgz) + --packed → 'golden-path: OK (packed) — 4 blocks, exits [0, 1, 0, 0], final state green'. Also caught during T4: nested node:test env inheritance (NODE_TEST_CONTEXT/NODE_OPTIONS) broke the demo's TAP — the runner now sanitizes the walk env.
