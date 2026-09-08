# Tasks — update-manifest

- [x] T1. Failing tests UP-06..11 + IN-13..17 (incl. the generation-membership guard and dry-run no-write assertions) — red run; audit which existing UP/IN tests assumed existence-only refresh and adapt their fixtures without weakening their intent.
- [x] T2. lib/managed.js (readManifest hygiene, writeManifest, hashBytes, TEMPLATE_GENERATIONS, allowedTargets(tools)).
- [x] T3. lib/update.js managed/adoption/skip semantics + action vocabulary; lib/init.js manifest-first hygiene check, create-only recording, merge, dry-run guard.
- [x] T4. Suite green; verify --change GREEN; gate PASS; check --self PASS.
