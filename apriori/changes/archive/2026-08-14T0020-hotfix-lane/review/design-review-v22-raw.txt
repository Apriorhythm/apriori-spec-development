<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r22 transport=codex-exec-wsl-proxy -->

v22 的分级表、D1.3 走查和原有 D3 联动未发现新漂移。DES21-1..3、DES21-6 已实质修复；π2/π3 的剩余闭环仍有以下问题。

- **DES-1｜高风险｜π3 引入的 `O_NOFOLLOW` 平台限制被错误归因于 f2。**  
  π3 无论是否选择 f2，都强制使用 `O_NOFOLLOW` 受检 fd；因此不支持该能力的平台即使从 f2 改裁 f1/f3，π3 仍无法工作。decision-summary 与 RUNBOOK 却都说“改裁非 f2”即可恢复归档，D1.4 也只列 f2 平台触点。应明确平台后果是“f2 或 π3 任一命中即需要安全打开”，并补 `π3×非f2×O_NOFOLLOW 不可用→拒绝`。依据：[design.md:56](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:56)、[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)、[decision-summary.md:41](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:41)、[runbook-hotfix-lane-section.md:49](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/runbook-hotfix-lane-section.md:49)。

- **DES-2｜高风险｜“能力不支持时 open 必然报错”不是完整的机械契约。**  
  设计只定义了 `open` 返回 EINVAL/ENOSYS 等错误的路径，没有定义运行时 `fs.constants.O_NOFOLLOW` 缺失、非数值或为零时必须先行拒绝。若实现直接将缺失常量与其他 flags 做位运算，JavaScript 会把它折为零，文件可能普通打开并被误当成功；这不只是已经披露的“文件系统静默忽略 flag”。需固定常量存在性检查、flags 构造和拒绝条件，尤其 D1.4 已声称有 Windows 分支。依据：[design.md:56](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:56)、[design.md:133](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:133)、[package.json:20](/mnt/d/Workbench/misc/apriori-spec-development/package.json:20)。

- **DES-3｜高风险｜π2 source 的 containment 检查与实际复制之间仍有 TOCTOU。**  
  `src` 只继承逐组件 symlink 与 realpath containment 检查；步骤②没有规定从受检 fd 复制。检查完成后替换末端或祖先路径，复制仍可能读入 `apriori/tmp/` 外文件。π3 已为同类问题补安全 fd，π2 却没有机械保证或诚实残余声明。应让复制从 `O_NOFOLLOW + fstat + dev/inode` 验证过的 fd 读取，或显式降级保证并补 AC。依据：[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)。

- **DES-4｜高风险｜HL-N-82j 的预期强于正文承诺。**  
  检查点笼统断言“检查后换链攻击拒”，正文却明确承认祖先目录在检查与打开间替换不可检出。若 fixture 换的是祖先链，该 AC 不可满足；若只换末端文件，则测试对象没有被限定。应拆成“末端替换由 O_NOFOLLOW/dev-inode 拒绝”和“祖先替换为声明级残余”两例。依据：[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)、[cli-checkpoints.md:69](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:69)。

- **DES-5｜高风险｜仓外图片的手工搬运无法按现有 AC1 计量。**  
  文本称额外人工动作“计入 AC1”，但 AC1 只有命令数、手工编辑文件数和“脚本墙钟”三个量。若用 `cp`，d×π2 从已占满的四条命令增至五条；若用文件管理器拖放，它既不是命令，也未明确算作手工编辑，脚本墙钟又不能量到该动作。需要定义唯一核算方式，并同步 D3、decision-summary 与 HL-K-01；否则“计入预算”不可验收。依据：[decision-summary.md:41](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:41)、[cli-checkpoints.md:79](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:79)、[req-v13.md:125](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:125)。

- **DES-6｜中风险｜合法出现的可选 `hash=` 没有全域 oracle。**  
  两态 grammar 在 π1/π2 下都允许可选 hash，但正文只强制验证 π3 和 π1×f2；π1×非f2、π2×非f2 中可归档任意格式正确但内容错误的 hash，形成误导性证据。应规定“hash 一旦出现就必须等于目标字节 SHA-256”，或在不消费 hash 的组合中禁止该字段，并补正反例。依据：[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)。

- **DES-7｜中风险｜RUNBOOK 的 π2 操作契约仍未同步完整。**  
  RUNBOOK 已写 `src→path` 和固定目标，但没有告诉操作者 `src` 必须位于 `apriori/tmp/`，也没有写仓外图片须先手工搬入及其 AC1 成本。按未来 RUNBOOK 直接填仓内其他路径或仓外路径，会在辅助命令才被拒，与设计及 owner 摘要不一致。依据：[runbook-hotfix-lane-section.md:28](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/runbook-hotfix-lane-section.md:28)、[runbook-hotfix-lane-section.md:35](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/runbook-hotfix-lane-section.md:35)、[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)。

VERDICT: 7 issues open.