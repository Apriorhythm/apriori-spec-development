<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r21 transport=codex-exec-wsl-proxy -->

v21 的探针删除路线成立，DES20-1..3 已实质消解；π3 containment 与 π2 两态也已进入正文，但后两项尚未闭环。新鲜走查发现 7 条问题。

- **DES-1｜高风险｜gate③ 摘要仍把 f2 描述成全域 fail-closed。**  
  主设计和 RUNBOOK 承认平台可能静默忽略 `O_NOFOLLOW`，此时无法检出；但 owner 摘要只说“不支持时 fail-closed、不可归档”，遗漏该残余。owner 可能据此把 f2 误判为无 fail-open 边界。应在 Q-6 决策项同步披露“报错型不支持→拒绝；静默忽略→不可检出残余”，并明确是否需要 owner 接受。依据：[design.md:133](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:133)、[decision-summary.md:41](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:41)、[runbook-hotfix-lane-section.md:49](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/runbook-hotfix-lane-section.md:49)。

- **DES-2｜高风险｜`src=` 未进入保留 marker 集，两态语法仍不可唯一解析。**  
  唯一保留子串清单没有 ` src=`。因此 `path=` 行的 `obs=` 值可合法包含 ` src=`：实现若把它识别为字段，会误报“src/path 并存”；若按观察文本处理，又无法机械执行并存 F1。应将 `src=` 纳入唯一 marker 清单，并分别给出 pre-copy/post-copy 的完整封闭 grammar。依据：[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)。

- **DES-3｜高风险｜π2 的目标路径生成函数仍缺失。**  
  设计定义了 source、basename 冲突及最终 bundle-relative `path=`，却没有规定复制目标目录或 `src → path` 函数。实现可分别选择 `evidence/<basename>`、`evidence/screenshots/<basename>` 等不同结果，进一步改变 f2 artifact tag、d1 token 和归档解析。需固定目标，例如 `evidence/screenshots/<basename>`，并定义改写值。依据：[design.md:133](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:133)、[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)。

- **DES-4｜高风险｜π2 的 source 域与 owner 摘要中的“仓外截图改裁 π2”矛盾。**  
  `src` 被限制为仓根相对且“路径安全同 π1”，按正文即还须落在 `apriori/tmp/`；它不能直接表达仓外图片。摘要却告诉 owner 仓外截图可直接改裁 π2。若真实流程是“先人工复制到 `apriori/tmp/`，再运行 evidence”，必须如实写明额外动作并计入 AC1；否则应给 π2 独立的外部 source 根契约。依据：[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)、[decision-summary.md:41](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:41)。

- **DES-5｜高风险｜π3 containment 检查与实际散列读取之间仍有未声明 TOCTOU。**  
  π3 可与非 f2 新鲜度组合；此时只规定逐组件检查和 `realpath` containment，没有要求哈希读取使用 D6.2 的 `O_NOFOLLOW + fstat + dev/inode` 安全 fd。检查后、重新按路径读取前替换祖先目录或目标为 symlink，仍可能读取仓外字节。D6.2 只为 f2 披露该竞态，D6.3 却把 π3 containment 称为真实成立。应让所有 π3 哈希从受检 fd 读取，或把残余边界显式降级并呈 owner。依据：[design.md:133](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:133)、[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)。

- **DES-6｜高风险｜AC-I 内存在与 v21 正文直接相反的旧断言。**  
  HL-N-82h/82i 要求 π3 symlink/越根拒绝；HL-N-75c 却仍要求“π3 外部路径不 containment、由 hash 承担”通过。两者不可同时满足，故 DES20-4/6 尚不能核验关闭。应删除或改写 HL-N-75c。依据：[cli-checkpoints.md:69](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:69)、[cli-checkpoints.md:70](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:70)。

- **DES-7｜中风险｜RUNBOOK 草案与新增 π 契约未同步，AC 也缺新边界例。**  
  RUNBOOK 仍只称 π2“入 bundle”、π3“hash reference”，没有仓根相对/containment、π2 `src→path` 两态或 `hotfix evidence` 作者动作。检查点也缺 `obs` 含 ` src=`、固定目标路径改写、π2 外部源处理及 π3 检查后换链攻击例。未来实现可通过现有 AC，却交付与设计不同的用户接口。依据：[runbook-hotfix-lane-section.md:28](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/runbook-hotfix-lane-section.md:28)、[cli-checkpoints.md:75](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:75)。

VERDICT: 7 issues open.