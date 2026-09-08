<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r20 transport=codex-exec-wsl-proxy -->

六条修订均已真实落盘；π3 绝对路径连锁已删除，canonical 的根问题也随输入域收窄而消解，HL-N-82/84/86 已重制。但探针迁移和 π2/π3 路径边界仍有以下问题。

- **DES-1｜阻断｜能力探针的命令归属自相矛盾。**  
  D1.4 明确定义 `hotfix archive <name>` 是 d 案 dry-run；D6.2 却称探针“不在归档命令内”，同时又说属于 evidence/dry-run。若在 dry-run 执行，它仍位于 archive 命令内并发生临时写入；若只在 `hotfix evidence` 执行，该命令目前仅为 π2 定义，而合法的 `π1/π3 × f2 × d+d1` 没有探针入口。必须定义独立命令，或明确 dry-run 是允许仪器写入的 archive 阶段并同步 req-v41/F1 边界。依据：[design.md:49](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:49)、[design.md:133](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:133)。

- **DES-2｜高风险｜探测结论没有定式字段、requiredness 或内容绑定。**  
  D6 只说结论写入 dry-run 输出和 `approval.md`，但 approval 字段表没有 probe 字段、合法值、基数和缺失/重复错误谱。approval 又属于摘要排除域，d1 token 也未绑定探测结论；人工改写虽被称为“审计违规”，机械上仍可把旧平台或伪造的 PASS 结论交给 approve。需要定式字段，并绑定平台/文件系统身份、探测结果和当前 dry-run token。依据：[design.md:49](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:49)、[design.md:133](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:133)、[design.md:134](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:134)。

- **DES-3｜高风险｜探针在 `apriori/tmp/` 的结果没有覆盖实际散列文件系统。**  
  f2 安全打开实际发生在 bundle `evidence/` 和 ext-artifact 路径；探针却只在 `apriori/tmp/`。这些路径可能处于不同挂载点、网络文件系统或 symlink/mount 边界。tmp 上拒绝 symlink 不证明其他文件系统同样执行 `O_NOFOLLOW`，反之 tmp 不允许创建 symlink也可能错误禁用本来安全的 evidence 文件系统。需要逐实际根探测，或给出并验证“同设备/同能力域”前提。依据：[design.md:133](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:133)。

- **DES-4｜高风险｜π3 的“仓内路径域”仍可通过 symlink 逃逸。**  
  π3 只限制字面为仓根相对并禁止 `..`，却明确不做 containment/逐组件 symlink 检查。仓内 `shots/outside` 若是指向仓外的 symlink，仍可读取并哈希仓外文件；这与 decision-summary“仓外截图须置于仓内或改裁 π2”的范围收窄声明矛盾。若保留该弱化，应把它称为“仓根相对字面、目标可在仓外”，而非仓内路径域；否则需 realpath containment。依据：[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)、[decision-summary.md:41](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:41)。

- **DES-5｜高风险｜π2 复制前的 source 载体仍未定义。**  
  π2 的记录 `path=` 被规定为 bundle 根相对，但辅助命令步骤②需要从某个 source 复制，并使用 basename→source 单射。设计没有规定复制前 source 从哪个字段取得、以仓根还是其他根解析、何时把 source path 改写成 bundle path。因此“仓外截图改裁 π2”也没有可表达的输入形态。需明确 pre-copy 行语法/根域及 post-copy 唯一改写状态。依据：[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)、[decision-summary.md:41](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:41)。

- **DES-6｜中风险｜AC-I 未覆盖上述闭环。**  
  缺少 π1/π3×f2 的探针入口正例、probe 字段缺失/重复/篡改/跨平台复用拒绝例、tmp 与 evidence 不同设备的能力差异例、π3 仓内 symlink 指向仓外例，以及 π2 从 source 状态到 bundle-relative 状态的转换例。HL-N-84i 仅断言 approve 只读结论，不能证明该结论合法、当前且绑定。依据：[cli-checkpoints.md:69](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:69)。

VERDICT: 6 issues open.