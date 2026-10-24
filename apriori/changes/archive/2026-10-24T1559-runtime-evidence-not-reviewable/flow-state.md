change: runtime-evidence-not-reviewable
phase: review                            # ground | specify | build | review | done | abandoned
reviewer-session: n/a                     # the reviewer's resumable session id, the moment round 1 prints it

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/runtime-evidence-not-reviewable`（从 v6-dev@d627acb 开出）；本地提交；评审接受后 squash 合回 v6-dev，推 judge 与 GitHub，删分支，不打 tag、不发版
- observed: 来源——Claude × Astra 共识 `/root/asd-lab/work/astra-discuss/r1024/R1024-CONSENSUS.md` 第一节 ①A（Astra 分歧 2，Claude 接受）：根因是 Build & Test 末句「Where no executable instrument exists for a risk, the independent review is the instrument there」——评估基线三次运行的生产方都据此把「UI 从未在浏览器里跑过」写进交付说明而不是 ## Open，热身唯一的新前端缺陷（注销 503 停错误页）即由此漏掉；custom-properties 还披露迁移未实际执行（证据替代不限于 UI）
- observed: 现行文字落点：RUNBOOK.md §4 Build & Test 第 313 行 bullet「Run the tests the risks call for, not a matrix.」末句；P2 `[Build & Test]` 行；docs/concepts.md 与 docs/concepts_cn.md 同一 bullet（含括号例「no deploy surface; solo; library; docs」与「not a downgrade」）；operator.md 无回声。PR-10（test/protocol.test.js）钉住 bullet 里的「no per-project-type evidence table」「`apriori/tmp/`」「baseline images belong to the project's own test suite」与 concepts_cn「截图自查落在已被 gitignore 的 `apriori/tmp/`」——改写时原样保留
- observed: 生产沙箱实测（evaluate-projects，SANDBOX_RO 绑入裁判的 pw-browsers）headless Chromium 可在沙箱内运行；三次生产方都没有尝试起浏览器——「没有测试运行器」被当成「跑不了」
- observed: Review 第 1 轮（`review/code-review-v1.md`，Opus 子 agent，R2 转录）= `VERDICT: gaps found`：RE-1 P2 把「跑一次 / 开 Open 项」写成并列选项，条件句与「没有测试运行器≠跑不了」只在 §4——生产方只看 P2 时可能对能跑的东西开 Open 项（新增停点）或仍按旧理解不跑；advisory A-1 VISION 中英仍转述旧规则、A-2 concepts 括号里混入按项目类型的豁免清单、A-3/A-4 测试覆盖不全、A-5 术语与标点、A-6 observed: 是持久记录
- decision: RE-1 fixed — P2 从句改为「先跑（没有测试运行器≠跑不了：开发服务器加 headless 浏览器就算）并记 observed:；只有确实跑不了的才是 ## Open 项并写明试过什么」；PR-74 钉住这两处
- decision: advisory — A-1 采纳（VISION 中英改写，PR-74 覆盖）；A-2 采纳（去掉项目类型清单，改为「自身没有运行时行为的改动不需要跑，因为无物可跑，不是评审替代」）；A-3/A-4 采纳（测试覆盖 concepts 中英各要点、operator_cn、P2 的否定断言）；A-5 采纳（「所有者」与半角标点）；A-6 采纳（bullet 写明 observed: 行是持久记录）
- observed: Review 第 2 轮（`review/code-review-v2.md`，同一评审会话续接）= `VERDICT: no spec-vs-code gaps`：RE-1 ADDRESSED；无新发现；advisory A-1 VISION 一句没带「确实跑不了」条件、A-2 concepts 例子「纯库函数」措辞松（库函数由单测执行）、A-3 PR-74 未检查 concepts_cn 的项目类型清单——评审接受后不再改契约文字，三条记录，留给下一个触及这段文字的 change
- decision: approach — 只换那一句并在 P2 加一个从句：运行时行为（页面/用户可见流程、迁移、任务、真实服务调用）没有测试执行到就真跑一次记 observed:（做了什么/预期/实际/证据在哪），跑不了就是带 id 的 ## Open 项（R1 case 2），评审确认静态可判断的结论、不关闭运行时缺口；concepts 中英同步；不加 gate、字段、UI 专用检查，UNBOUND 不改，有证据或能补证的改动不新增停点；P3 不动（Astra 的三个限定）

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- check → gate → archive --write（不接管道）→ squash 合回 v6-dev，推 judge 与 GitHub

gates:
  - 2026-10-24T15:48 note: change scaffolded by `apriori new`
  - 2026-10-24T15:49 note: Ground → Specify（protocol PR-74）→ Build：test/runtime-evidence.test.js 先红（旧句仍在）后绿；RUNBOOK 313 行末句替换、P2 加从句、concepts 中英同步、CHANGELOG 小节；phase → review
  - 2026-10-24T15:57 note: Review 第 1 轮 gaps found（RE-1 P2 条件句）已修复，A-1..A-6 采纳（VISION 中英、concepts 去项目类型清单、测试覆盖、术语标点、observed: 为持久记录）；全量与 verify 重跑；续接同一评审会话开第 2 轮
  - 2026-10-24T15:59 note: Review 第 2 轮接受（no spec-vs-code gaps）；A-1..A-3 记录不改；进入 check / gate / archive
