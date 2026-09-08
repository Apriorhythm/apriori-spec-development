# Tasks — tap-plan

- [x] T1. Failing tests SR-26..31 (parseTap unit cases + fake-TAP E2E fixtures incl. the E3 masking fixture verbatim, `ok 01` numeric dup, `ok:` non-point, `1..0 # SKIP`, plan-less, verify --change + gate inheritance) — red run.
- [x] T2. parseTap: plans/points/dupNumbers collection (PLAN_LINE_RE, POINT_LINE_RE, numeric dup set); infraErrors: the three new guards after noTap.
- [x] T3. Suite green; verify --change GREEN; gate PASS; check --self PASS.
