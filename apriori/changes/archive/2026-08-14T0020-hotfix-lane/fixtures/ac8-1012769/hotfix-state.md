hotfix: machine-swap-conflict
date: 2026-06-18
kinds: 1,3
change-kind: code-behavior
touched-modules: order-attribution
fix-ref: 0000000
frontend-touched: no
backend-touched: yes
affected-scenario-ids: BR-007

## Conclusion

A machine swap rebuilds the operations machine in the new backend and migrates its
mainboard. BR-007 ("a mainboard-fallback conflict is not attributed") was written without
either side of the review knowing that operation chain exists, so a genuine post-swap
fallback was read as a conflict and three orders (¥133, measured in UAT) went unattributed.
The MACHINE_CONFLICT branch is removed; a fallback after a recorded swap attributes
normally.

## Bindings

BR-007: tests: order-attribution.test.js covers a fallback after a recorded machine swap
