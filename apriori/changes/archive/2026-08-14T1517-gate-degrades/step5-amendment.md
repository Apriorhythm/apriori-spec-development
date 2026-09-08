# STEP5 amendment — 把 B4 / AC-GD-09 / SR-75 的「逐字节不变」缩到实际验证得了的范围

> 触发：STEP5·r2 与 r3 的 P8 一致性评审（IMPL-2，两次 reopen）
> 依据：RUNBOOK §4 STEP5 的 guarantee-claim discipline——
> 「若不存在充分的测试，**要么把测试加上，要么把措辞缩到实际验证得了的范围**」
> 状态：req-final 是 STEP0 的冻结产物，本文件是对它的**记名修正**，不是静默改写。

---

## 一、评审方指出的事实（已复核，属实）

冻结需求的 **B4** 与 **AC-GD-09** 承诺：配置齐备路径上「检查集合、每项 detail 文案、
`--json` 键集与取值、退出码**与本 change 前完全一致**」。
新增的 **SR-75** 一度也写着「byte-identical to their pre-seam form」。

**没有任何测试在证明这件事。** 本仓内不存在状态 A 的冻结 golden，
而「与改动前逐字节相同」这个命题，**在本仓内的测试里根本观察不到**——
测试跑的永远是当前代码，拿当前输出和当前输出比，恒真。

这正是 P8 维度 5 要抓的形状：**散文里的硬保证，没有对抗性注入去验证它**。

## 二、考虑过并否决的方案：冻结一份状态 A 的 byte golden

做法是把 `235a121` 的 `lib/` + `bin/` 导出到临时树，对同一 fixture 项目跑两份实现比对输出。

**否决理由（两条，任一条都足够）**：

1. **CI 上不可靠**：`actions/checkout` 默认 `fetch-depth: 1`，工作副本里**没有父提交**，
   测试运行时解析 `235a121` 会直接失败。本仓的 CI 矩阵是 ubuntu/windows × node 22/24 共八个 job。
2. **改成签入静态 golden 则引入维护税**：输出里含临时目录绝对路径，需要路径归一化；
   而 gate 的输出文案**本来就会随后续 change 演进**，等于给每一次 gate 相关改动
   预埋一次重新捕获 golden 的义务——收益是一次性的，成本是持续的。

（本仓已有的 `test/fixtures/specs-golden/` 是**同版本内**的形状 golden，不是跨版本的实现比对，
两者不是一回事。SR-64 那次 Windows CI 红灯，正是跨平台 golden 假设失效的代价。）

## 三、修正后的措辞（三处）

「与本 change 前完全一致」改为下面这三条**实际成立且各有证据**的断言：

| # | 断言 | 证据 |
|---|---|---|
| A | 两个 seam 的解析器在**无 override** 时都落到原函数：导出的那个按**身份**断言，私有的那个（未导出，外部无从比身份）按**静态源码**断言 | SR-75 的 `currentProjectionBuilder() === buildChangeProjection` 恒等断言，加一条匹配 `function currentTestRunner() { return testRunnerOverride \|\| runTestCommand; }` 的源码断言（STEP5·r4 补） |
| B | 配置齐备路径的**完整公共结果**（`runGate()` 与 `verify()` 两个对象，含 Map 值字段）在**三态**下结构相等：初始 / 装了 projection override 再清空 / 装了 runner override 再清空；且**装上 runner override 时结果确实不同**，保证「清空后相等」不是空转 | SR-75 的同进程三态 `deepStrictEqual` + 一条 `notDeepStrictEqual` 反向守卫 |
| C | 状态 A 时期写就的既有测试中，**除刻意改写的 `DR-07` 一条外，其余断言一字未动且全部通过** | T0 记录的 375 全绿基线，与改动后 392 pass / 0 fail |

> **关于 C 的诚实修正（STEP5·r5）**：此处原写「一条未改其断言」，那是**事实错误**——
> `test/doctor.test.js` 的 `DR-07` 被**故意**改写了：它原本断言「缺配置 → `n/a`」，
> 而本 change 的目标就是把那个结果改成 finding。留着旧断言等于留着一条与目标相反的护栏。
> 因此 C 的正确表述是：**配置齐备路径**上的既有 gate / spec-runner 测试一字未动且全绿；
> 唯一被改写的 `DR-07` 属于本 change 有意改变的行为面，不构成配置齐备路径的回归证据。

**这三条合起来是回归证据，不是逐字节同一性证明**——差别必须说清楚：
若某个改动同时骗过 A、B、C 三条，它仍可能改变配置齐备路径上的某个字节。
本 change 接受这个残余风险，理由是 §二的两条否决理由，并把它记在这里而不是假装它不存在。

## 四、落到文件的改动（r4 / r5 两轮补全——同一条保证在别处还有四份副本）

第一轮只改了 B4 / AC-GD-09 / SR-75 三处。r4 的评审指出**同一条未验证保证在别处还有副本**，
r5 又指出**修正文件自己和已勾的任务记录里仍有过强表述**。全部清单：

| 文件 | 位置 | 处置 |
|---|---|---|
| `requirement/req-final.md` | B4 | 就地加修正标记，指向本文件 |
| `requirement/req-final.md` | AC-GD-09 | 同上 |
| `requirement/req-final.md` | §3.1c 与 O5 的「一字不变」 | r4：加修正标记 |
| `requirement/req-final.md` | **AC-GD-04** | r4：原本在 B4/AC-GD-09 的修正范围**之外**，缩为「退出码 2 + 诊断仍点明 flow-state」 |
| `specs/spec-runner/spec.md` | SR-75 的 THEN | r2/r3：改写为 A + B 的可观察形式；pre-seam 明确**不再声称** |
| `specs/spec-runner/spec.md` | **父 Requirement** 的 "leaving every configured path byte-identical" | r4：改为三态结构相等 + 明确不声称 pre-seam |
| `design.md` | D1.4 | r4：去掉「逐字节不变」；r5：进一步去掉「调用序列不变」——序列**确实变了**（插了两层解析器间接），守恒的是行为与结果 |
| `tasks.md` | T18 | r5：原文引的是修正**之前**的口径且声称加了一条本仓无从断言的显式断言，改为引 A/B/C 三条 |
| 本文件 | 证据 C | r5：原写「一条未改其断言」是**事实错误**，`DR-07` 是被刻意改写的 |
| `lib/spec-runner.js` | 两个 seam 上方的**源码注释** | r6：写着「so a configured run is byte-identical to its pre-seam form」——**第十份副本，而且在实现文件里**，比散文更容易被下一个读代码的人当成契约。改为「解析器落到原函数 + 清空后结果结构相等」，并明确不声称 pre-seam 同一性 |

| `gap-report.md` | §二「状态 B（目标）」第 4 条 | r7：写着「有配置的路径逐字节不变」——**第十一份副本**。它是 STEP1 交给 STEP2/STEP5 的**目标陈述**，不是历史引用，所以带着操作性。已改为记名修正范围 + 明确不声称 pre-seam |

**关于 `requirement/req-v1..v5.md` 里的同类字样（不改，记在此处）**：那些是 STEP0 的**版本历史**，
按 RUNBOOK §4 的产物表原样保留；`req-final.md` 才是冻结生效的那一份，它已带记名修正标记。
改写历史版本会让「五轮评审如何把这条保证一步步逼出来」这段审计链失真——
所以留原样，并在这里点名它们**不是**现行契约。

> **第十份副本的教训（r6）**：前九处都在流程文档里，第十处在**源码注释**里。
> 我在 §四 上一版写「全部清单」的时候，只 grep 了 `apriori/changes/` 与 `docs/`，
> 没 grep `lib/`——而那条注释恰恰是我在本 change 里**新写**的。
> 「同一条保证的所有副本」这件事，检索范围本身就是个陷阱。

## 五、若将来要补强

出现下列任一情形时，重新考虑冻结 golden：
① CI 改为全历史 checkout（`fetch-depth: 0`），§二-1 消失；
② gate 的输出文案进入稳定期，§二-2 的维护税降到可忽略。
届时它是一个独立的小 change，不是本 change 的补丁。
