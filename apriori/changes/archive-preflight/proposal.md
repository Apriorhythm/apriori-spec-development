# proposal — archive-preflight

## WHY

一个棕地 change 的 `tasks.md` 有 **45 项未勾**、bundle 内一致性评审 **0 份**，
`apriori archive --write` 照样成功重写了 living store 并把 bundle 移走。

archive 的 preflight 只校验**与 delta 有关**的东西（语法、冲突、CAS 戳）——
全文没有 `flow-state` / `tasks` / `issues.md` 任何一个字。
而能抓住这件事的检查**已经存在**：gate 的 C2（tasks 全勾）、C3（flow-state 合法）、C4（ledger 终态）。
只是 archive 不要求 gate 通过，两条命令互不知情。

归档是**不可逆**的：store 被重写、bundle 被移走。别的检查失败只是白跑一趟，这一条失败是把错误状态固化进 living spec。

## WHAT

1. **就绪度 preflight**：在既有 preflight 全过之后、任何写入之前，用**纯文件读取**检查
   flow-state 合法且 `current-step: STEP6`、tasks 无未勾项、ledger 每行都是归档态终态。
   判据**不是三条简化检查，而是复用 gate 的完整 C2/C3/C4**——只有同源，
   「归档成功 ⇒ 随后的 gate 不会在 C2/C3/C4 上 BLOCK」这个命题才可能成立。
2. **解析命名空间检查（N0..N3）**：归档只捕获**一次**时间戳并与最终移动共用；
   同名归档目录的排序、两个 trust root、待移动的 active 条目本身，
   都按 `resolveChange()` 的**同一套判据**校验——否则「归档后 gate 查的是刚归档那个」并不成立。
3. **两条绕过口一并堵上**：单文件形式 `--store/--delta` 在 `--delta` 归属到正式 bundle 时
   同样执行就绪度（它带 `--changes-dir` 会移动 bundle，不带也照样写 store）。
4. **`--force` 是受限的可见豁免**：只有「活儿没干完」类可豁免；`ABANDONED`、`DONE`、
   一切结构性/格式性失败**不可豁免**；且必须有**预先存在**的人类 gates 证据（工具绝不替人签字）。
5. **dry-run 同样诚实**：会被拦下的 change，dry-run 不再打印 `RESULT: MERGED`。

## OUT OF SCOPE

| 不做 | 理由 |
|---|---|
| 让 archive 自己跑测试或 verify | 重、慢，与 gate C1 职责重叠 |
| 要求「gate 曾经 PASS」作为前置 | 需要一个可信的通过记录锚点，那是另一个设计问题 |
| 回溯校验存量已归档 bundle | 只对新归档生效 |
| 跨进程锁 / TOCTOU 检测 | 与既有事务模型（只承诺失败原子性到 commit 点）不匹配；改为**声明前置条件**并证明「不声称检测」 |
| 扩展 gate / resolver 接口去接受自定义 changes root | 改为明确声明：自定义 root 上的归档**不享有** post-archive gate 保证 |
| 统一仓内两份语义不同的 `containsReal` | 既有事实；实测在本 change 的调用点上行为一致，不必搬迁 |
| 追踪被**复制**到 bundle 之外的 delta | 真副本无法机械归属，属调用方责任（外部 **symlink** 不在此列——它的目标可归属） |

## 触及范围

`lib/archive-merge.js`（就绪度调用点、N0 时间戳、归属算法）·
**新增** `lib/readiness.js`（基础层 = gate 今天那一份，一字不改；archive 叠加层）·
`lib/gate.js`（改为从 readiness 引入，**行为一字不变**，继续再导出 `classifyStatus`）·
`lib/resolve.js`（新增导出 `archiveNamespaceDefect`，既有行为不变）。
另：3 份 living spec、3 份 truth、11 个测试文件的 fixture 迁移、CHANGELOG。

## 必须让人类看见的两件事

1. **退出条件收紧属于行为变更**：存量项目里 tasks 未勾 / ledger 未终态的在途 change，
   升级后第一次归档会被拦。这是期望行为——拦下的正是复盘里那类归档。
2. **STEP0 在 cap 上退出**（step0-cap=5 用满，verdict 序列 7→6→3→2→2，**未收敛**）。
   `req-final` 承载最后三条修复但**未经独立评审**；STEP2 的 P5 循环是第一次有人独立读它。
   人类可据此要求补一轮 STEP0。
