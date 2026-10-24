change: discriminating-examples
phase: review                            # ground | specify | build | review | done | abandoned
reviewer-session: n/a                     # the reviewer's resumable session id, the moment round 1 prints it

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/discriminating-examples`（从 v6-dev@5462a38 开出）；本地提交；评审接受后 squash 合回 v6-dev，推 judge 与 GitHub，删分支，不打 tag、不发版
- observed: 来源——Claude × Astra 共识 `/root/asd-lab/work/astra-discuss/r1024/R1024-CONSENSUS.md` 第六节（2026-10-25，Astra 8 条分歧 Claude 全部接受）；人类同日「你来，开始吧」。证据：四次评估基线运行里，失败的要求都已写进契约，却没有落实到所有入口（权限规则做在 API、没做在设置页与详情编辑器；深嵌套解码守卫做在 query、没做在 body），且测试断言弱于契约（`"a"*256` 分不出 code point 与 UTF-16；创建者读详情只断言字段消失而不是 403/404）
- observed: 现行文字落点——RUNBOOK §4 Specify「Minimal means minimal」bullet（305 行）、§4 Build & Test「Do, in order」(1)（parametrized-test 规则）、§4 Review & Deliver「Disposition of findings」bullet、P2 的「One scenario per user-visible output」bullet 与 `[Build & Test]` 行、concepts 中英三处 parametrized-test 回声（359、476、574/570 行）；既有测试钉住「examples table may share ONE parametrized test」「scope is judged per finding, never by volume」等短语——原样保留，只追加
- observed: Review 第 1 轮（`review/code-review-v1.md`，Opus 子 agent，R2 转录）= `VERDICT: 3 issues open`：DE-1 新句与下一条「Model by observable outcome, not by input example」矛盾（结果不同的条件是另一个场景）；DE-2「真实代码里的入口」与「规格不得点名内部 handler」相撞；DE-3 修完一处后查其他入口没有痕迹，`fixed` 仍可凭单入口证据关闭；advisory A-1 concepts 只改了 359 行一处回声（476、574/570 未改，Reality Check 还写错了行号——正是本 change 自己的教训）、A-2 P2 丢了「in the sources」、A-3 否定断言太窄、A-4 §4 与 P2 范围不一致、A-5「complete expected result」可被读成快照所有字段、「by default」没说谁能加
- decision: DE-1 fixed — 例子覆盖「同一结果类别内会改变预期结果的条件」，改变类别的条件是自己的场景；DE-2 fixed — 入口按调用方到达的方式命名（路由、页面、命令、输入通道），绝不是内部 handler，去掉「in the real code」；DE-3 fixed — `fixed` 处置的证据写明查过同规则的哪些其他入口（或说明没有），§4 与 P2 同步
- decision: advisory — A-1 采纳（三处回声全改，测试改为数量相等断言）；A-2 采纳（P2 补回「in the sources」）；A-3 采纳（否定断言加 matrix / all combinations / a new document）；A-4 采纳（§4 也写「a review or a test」）；A-5 采纳（「the expected result it names」+「the sources or the owner may ask for more」）
- observed: Review 第 2 轮（`review/code-review-v2.md`，同一评审会话续接）= `VERDICT: no spec-vs-code gaps`：DE-1/2/3 ADDRESSED；无新发现；advisory A-6 P2 的 Specify 句没带「the sources or the owner may ask for more」、A-7 括号只说「条件」改变类别未提「入口」、A-8 「stands for / names」用词漂移——评审接受后不再改契约文字，记录，留给下一个触及这段的 change
- decision: approach — 三处各加一句（Astra 措辞）：Specify 的 examples 覆盖「会改变预期结果的条件」与「同一规则可能失效的不同入口」，选判别性代表例、默认不枚举全部组合，每例带入口与预期；Build & Test 每个选定例子的证据断言完整预期、共享测试只有真正执行并断言该例才算覆盖；Review & Deliver 修完一处后查同规则的其他入口。P2 带三条；concepts 中英只回声证据句。不加 gate、字段、覆盖账本、笛卡尔积义务，不把评测项 ID 或本题矩阵写进 RUNBOOK；P3 不动

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- check → gate → archive --write（不接管道）→ squash 合回 v6-dev，推 judge 与 GitHub

gates:
  - 2026-10-25T01:59 note: change scaffolded by `apriori new`
  - 2026-10-25T02:01 note: Ground → Specify（protocol PR-75）→ Build：test/discriminating-examples.test.js 先红后绿；RUNBOOK 三处各加一句、P2 两处、concepts 中英回声、CHANGELOG 小节；phase → review
  - 2026-10-25T02:07 note: Review 第 1 轮 3 issues open（DE-1 与「按可观察结果建模」矛盾、DE-2 入口命名与「不点名 handler」相撞、DE-3 同规则其他入口检查无痕迹）已修复，A-1..A-5 采纳；全量与 verify 重跑；续接同一评审会话开第 2 轮
  - 2026-10-25T02:09 note: Review 第 2 轮接受（no spec-vs-code gaps）；A-6..A-8 记录不改；进入 check / gate / archive
