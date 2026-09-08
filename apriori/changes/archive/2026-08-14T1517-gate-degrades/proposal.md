# proposal — gate-degrades

## WHY

一个棕地项目的 `apriori/process-config.md` 少了一行 `test-cmd`，
于是 `apriori gate` 在那个 change 的**整个生命周期内运行次数 = 0**。

七项机械检查里只有 C1 需要跑测试；C2（tasks 全勾）、C4（ledger 终态）恰好就是能抓住
「45 项 tasks 未勾、0 份 P8 评审就归档」的两项——它们因为一行缺失的配置而从未启动。
这是 5.1 复盘定级最高的 false-negative（§5 FN-4 / §8 P0-1）。

同一情形下 `apriori doctor` 报 **HEALTHY**：D5 对「未配置测试命令」返回 `n/a`，
而 `n/a` 不计入 findings。**唯一该诊断这件事的命令说一切正常**——
这才是 FN-4 能潜伏一整个 change 生命周期的机制原因。

## WHAT

三件事，一句话各一条：

1. **gate 的 C1 降级而不是整体拒绝**——测试命令缺席时 C1 报 `skipped`，C2..C7 照常执行并给真实结论。
2. **新增第四种结果 `INCOMPLETE` / 退出码 3**——「跑了但没跑全」既不能报 PASS（说谎）、
   不能报 BLOCKED（伪造阻断，违反 D-GT-2）、也不该报 ERROR（六项检查的结论明明可信）。
   优先级 `ERROR(2) > BLOCKED(1) > INCOMPLETE(3) > PASS(0)`。
3. **doctor 把后果说出来**——完全未配置时 D5 由 `n/a` 升为 `finding`，点明「gate 的 C1 无法执行」。

为让 ① 成立，`lib/spec-runner.js` 导出既有的 projection-only 入口
（C7 的输入本来就由它在测试执行**之前** 33 行处产出），并新增两个仅供测试的注入 seam，
使「gate 与 verify 共用同一套 projection 实现」可被机械断言。

## OUT OF SCOPE

| 不做 | 理由 |
|---|---|
| 自动探测项目的测试命令 | 脆弱、不可预测（复盘自己也列为过度方案） |
| 让 agent 写 `process-config.md` | 违反 R3，该文件人类持有 |
| `test-cmd: none` 这类「本项目声明没有测试命令」的取值 | 独立的一件事，需要自己的验收面。后果：docs-only 项目会长期看到一条 D5 finding —— 接受，因为那条 finding 陈述的是事实 |
| 改 C1..C7 **各自的判定逻辑** | 本 change 只改「哪些能跑」与「跑不成怎么说」 |
| 让 `apriori verify` 也降级 | 没有测试命令时 verify 没有任何可降级的产出 |
| 改 hotfix bundle 的拒绝路径（mapping m1） | 该拒绝早于测试命令解析，不受影响 |
| 改 `lib/config.js` 的空值归一化 | 「`test-cmd` 行值为空」按共享 parser 的契约等同于「无该行」，改它要动全部 key |
| 修「新鲜度检查看不见内容陈旧」这一机制局限 | 本 change 只把 `truth/doctor.md` 这一份改对（它写着 seven checks，实际 D1..D8） |

## 仓外影响（必须让人类看见）

退出码 3 是**契约扩展**。按 `exit != 0` 判定的 CI 会把 INCOMPLETE 当失败——
**这是期望行为**，不完整的 gate 本就不该算通过。本仓内没有把 gate 退出码钉死为 0/1/2 的
可执行消费者（已逐一核过 `.github/workflows/`、`scripts/`、`docs/`）。

## 触及范围

`lib/gate.js` · `lib/doctor.js` · `lib/spec-runner.js`（严格限于：导出 projection-only 入口、
新增 `_setProjectionBuilder` / `_setTestRunner` 两个测试 seam、`verify()` 改走同一可替换引用）。
另：3 份 living spec、3 份 truth、6 份 docs、CHANGELOG。
