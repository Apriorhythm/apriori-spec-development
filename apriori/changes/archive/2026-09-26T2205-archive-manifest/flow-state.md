change: archive-manifest
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: 01a0ddfe-4624-7760-8605-5beb0bb0a6f2   # codex exec, round 1 (2026-09-26)

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/archive-manifest`（从 v6-dev@8aa98fb 开出）；本地提交；评审通过后合回 v6-dev；不进 preview/v6-20260926 快照
- decision: requirement — `work/astra-discuss/diag-next/DN-CONSENSUS.md` §一 E + `work/astra-discuss/three-topics/TT-CONSENSUS.md` 议题 2（Claude × Astra，人类 09-26 批准）：archive --write 在既有归档事务内、最终成功前写 `archive-manifest.json`（排除自身；流式 sha256 全部普通文件含 raw；符号链接不跟随、记录不哈希）；写失败 = 归档整体不成功，不留「store 已改而清单缺失」半状态；`apriori check` 对有清单的归档比对，报告增/删/改，**仅 note、不改退出码**；无清单归档汇总一行 no baseline，措辞不断言早于 manifest；不因漂移新增拒绝门、不覆盖已有归档、不重建清单洗差异；不动 status；层 1 + codex，不做层 2；原子性未闭合不合入
- observed: archiveChange 事务顺序（lib/archive-merge.js:905-1116）：preflight（无写）→ readiness → declaration 回退 → integrity/drop-guard → dry-run 返回 →【phase 2 stage temps】→【phase 3 commit renames，中途失败不回滚】→【phase 4 move `archiveChangeDir`，失败提示 rerun】。「store 已改而清单缺失」只能靠把清单写在 phase 2 之前避免：在 dry-run 返回之后、staging 之前把清单写进在制 bundle，随 move 整体搬走（AM-36 bundle travels whole）；写失败即 code 1、store 未动；move 失败后 rerun 会重算并覆盖 bundle 内旧清单（自身被排除）
- observed: 归档 stamp 由 `archiveChangeDir(changesDir, name, new Date(), ops)` 在 move 时取；要让清单里的 stamp 与目录名一致，须提前取 `now` 并传入
- observed: 目标冲突保护已有：destination 已存在时 `renameSync` 抛错 → 「stores committed but the change-dir move failed … rerun」；本 change 不改该路径，也从不向已存在的 archive 目录写清单
- observed: `apriori check`（lib/check.js:279-362）消费者模式只跑 CK-04 与 CK-10、CK-06 warn；输出约定：失败 `✗ …` 计入 fails 决定退出码，警告 `! …` 不计入。漂移报告应走 `!` 通道且不入 fails；`--specs` 与 archive 目录无关，archive 根固定为 `<cwd>/apriori/changes/archive`
- observed: 现有测试语料（AM-30 只扫 specs/*.md；verdict-corpus 只读 flow-state.md；CK-10 只扫 review/）都不受 bundle 内新增 json 影响
- observed: 场景 id 空位：archive-merge 最大 AM-127，check 最大 CK-18
- observed: 人类语境——归档目录事后写入的实证：merchant-bill（公司电脑 git 9bbaf41，归档 7 天后 8 个评审文件）；D-59「回改 10 处」是业务代码非归档目录（已更正）
- observed: Build 完成 —— 新增 lib/manifest.js（listBundle 流式 sha256 / link: 记录 / writeInto 原子 / read / diff，写读一套代码）；lib/archive-merge.js 在 dry-run 返回后、phase 2 之前写清单（失败 code 1 nothing written），move 复用同一 now；lib/check.js checkArchiveDrift 两模式 `!` 通道只报不入 fails；docs/cli 两版各两句；CHANGELOG 条目；test/archive-manifest.test.js 绑 AM-128..131、CK-19..21（先红后绿）
- observed: 两处既有测试随契约调整（供评审核对）：AM-119 归档目录列表加入 `archive-manifest.json`（对应 delta 的 MODIFIED 块把「不引入新强制文件」改为「唯一新增文件是内容清单」）；ADM-06 的注入 writeFileSync 从「全部写失败」收窄为「只在 `.tmp-archive` 失败」，因为清单经同一 seam 写在 staging 之前——断言未改
- observed: Review 第 1 轮（`review/code-review-v1.md`）= 4 issues：①P1 固定名临时文件以截断语义打开、会跟随占位符号链接写穿 store，且排除该名字使其后续改动逃出漂移报告；②P1 `changes/<name>` 为符号链接指向已归档 bundle 时会重写其清单基线、move 只搬链接、check 又跳过符号链接项；③P2 `{}` 字典让 `__proto__` 文件消失、`in` 让 `constructor` 的删除不报；④P2 AM-130 两次尝试间内容未变、不能证明重算，且发布 rename 绕过注入 seam。修：①run 独占临时名（pid+随机）以 `wx` 独占创建、经 fd 写、rename 覆盖占位（不跟随）、只删自己的临时文件、只排除自身与本次临时名；②清单前 lstat bundle 根，符号链接/非目录即 REFUSED nothing written；check 对 archive/ 下符号链接项报「not compared」；③`Object.create(null)` + hasOwn；④AM-130 在两次尝试间改文件并断言新哈希；新增 AM-132（符号链接占位 → store 字节不变、清单为普通文件；目录占位 → 失败、store 不动、无临时残留、移除后成功）、AM-133（符号链接 bundle 根被拒、归档清单字节不变）、AM-134/CK-22（原型名文件）。发布 rename 仍用 fs 自身（bundle 内部交换），失败路径以目录占位实测覆盖而非 seam
- observed: Review 第 2 轮（`review/code-review-v2.md`）= 2 issues：①P1 `fs.writeSync` 单次调用忽略返回字节数，短写会发布截断清单并放行 store 提交；②P2 AM-132(a) 的符号链接指向本次合并的 store 文件，后续 store 提交会盖掉写穿证据、证明不了字节不变。修：①写循环直至写完、零进展即失败，fsync 后 rename；`ops.writeSync` 为注入 seam；新增 AM-135（短写后失败 / 分片写完 / 零进展）；②AM-132(a) 改为指向不参与合并的 bystander store 文件并断言字节相等。四条第 1 轮发现判 resolved
- observed: Review 第 3 轮（`review/code-review-v3.md`）= `VERDICT: no spec-vs-code gaps`；短写与 AM-132 证据两条判 resolved，第 1 轮四条保持 resolved；无 advisory；无需 SPLIT

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- gate → check → archive --write → 提交 → 合回 v6-dev（不进 preview 快照）

gates:
  - 2026-09-26T22:03 note: review-progress code-review round 3 — issues: AM-130 (round 2 judged its recompute evidence resolved; retained), plus round 2's two un-ided findings (P1 short write, P2 AM-132 evidence); actions: writeInto drains the buffer through an injectable writeSync, fails on zero progress, fsyncs before rename (AM-135 added); AM-132(a) retargeted to a bystander store file with exact-byte assertion; evidence: lib/manifest.js, test/archive-manifest.test.js, apriori/changes/archive-manifest/specs/archive-merge/spec.md, apriori/changes/archive-manifest/review/code-review-v2.md; approach: kept — exclusive run-owned temp, publish by rename, report-only drift
  - 2026-09-26T22:04 note: Review 第 3 轮接受（no spec-vs-code gaps）；进入 gate / archive
  - 2026-09-26T22:02 note: Review 第 2 轮落盘（2 issues）；短写循环 + AM-135、AM-132(a) 改 bystander；开第 3 轮
  - 2026-09-26T21:58 note: Review 第 1 轮落盘（4 issues）；四条已修并加 AM-132/133/134、CK-22；开第 2 轮
  - 2026-09-26T21:50 note: Build 完成（7 场景先红后绿）；进入 Review
  - 2026-09-26T21:46 note: Ground 完成；进入 Specify
  - 2026-09-26T21:44 note: change scaffolded by `apriori new`
