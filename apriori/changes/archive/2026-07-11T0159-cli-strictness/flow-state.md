change: cli-strictness
tier: medium         # uniform CLI-surface hardening across subcommands: new user-visible ERROR behavior, one shared helper; no shared state, no cross-module data flow (each cli() edited independently) — sized medium, will escalate on the first surprise per §2
track: harden
track-rationale: goal and acceptance stateable — roadmap item 6, owner ordered the 3.2-phase batch ("按你的顺序做") on 2026-07-11
lineage: v3 branch (independent lineage; never merge to main or v2)
current-step: DONE
round: STEP6·r0   # STEP5 exited 03:30 at P8 r2: "VERDICT: no spec-vs-code gaps" (SIMPL-1/2 verified); impl committed 20bee2b; self-archived; post-archive: verify GREEN, 150/150, check PASS
reviewer-session: 019f4b30-68f9-7222-9b64-17f52a333b4c   # codex (same resumable session)
next-action: none — change DONE, released in 3.3.0   # 2026-07-11T12:40
# KB pre-check DONE 01:36: all eight lib truth docs exist and are fresh (lib/ untouched since each stamp: spec-runner/archive-merge/status 024ee2c→ still clean, gate 363bc79, doctor 4c73156, init/update/check fb3ed60). bin/apriori.js has no truth doc — thin dispatch fully covered by the cli store spec; scoping noted.
artifact-root: .
gates:
  - 2026-07-11T01:34 note: change scaffolded by `apriori new`
  - 2026-07-11T01:36 note: owner directive verbatim: "按你的顺序做，9 号砍半，Pilot 时机我后面定" — authorizes the 3.2-phase batch in the proposed order (6→7→10→8/9/11→12a), item 9 Python-only. Medium tier: stops at gate ④ as normal; gate ④s presented itemized at batch checkpoints.
  - 2026-07-11T03:32 note: STEP6 archive done (cli store +CL-11..17 requirement). KB writeback: truth/args.md captured (D-AR-1); eight truth docs cli-lines refreshed to the strict parser, stamps → 20bee2b. Gate ④ pending.
  - 2026-07-11T12:40 gate④: owner reply to the itemized six-gate batch report (+ release), verbatim: "发 3.3.0，另外 github 的当前 main 分支分出一个 v1 用来定格 v1 版本" — batch KB/artifact sign-off approved via the release order. current-step → DONE.
