<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r12 transport=codex-exec-wsl-proxy -->

七条修订均已落盘；module canonical 形态、summary 联动、digest 主定式及 HL-N-60..68 均可核实。但有三项未端到端收口，并发现新的交叉问题。

- **DES-1｜高风险｜k2 ordinal 已统一，但 occurrence 配对域仍错误地停留在裸 ID 全局。**  
  carrier 函数仍写“对每个裸 ID”汇总所有 old/new 块后按第 i 项配对，而 `n` 已改成 requirement 块内序。例：store 中 A 块无 X、B 块有 X；delta 同时在 A 新增 X、在 B 保留 X。全局序列会把 A 的新 X 错配给 B 的旧 X，继而把 B 判成 delta 尾部。标题进入最终 key 不能修复错误的 store/delta provenance。配对域须改为 rename 解析后的 requirement 身份 × ID，再做块内 occurrence 配对。依据：[design.md:125](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:125)。

- **DES-2｜高风险｜π2 的新 fail-closed 策略与“可重入”及旧检查点直接矛盾。**  
  D6 规定残留 `screenshots.md.tmp.*` 必须 F1、人工清理；但同段仍称三步“可重入”。HL-N-45 要求步骤③半写崩溃后直接重跑幂等，HL-N-56 更明确要求“删除重建”，均与残留 temp 一律拒绝相反。还需明确该 temp 不变量由 archive preflight 同样检查，否则绕过 evidence 辅助命令可把残留 temp 归档。依据：[design.md:137](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:137)、[cli-checkpoints.md:69](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:69)、[cli-checkpoints.md:70](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:70)。

- **DES-3｜高风险｜f2 的树遍历量词会拒绝合法目录，导致 f2×π2 自相矛盾。**  
  正文写“`evidence/` 树下全部条目”逐项 `lstat`，且 regular file 之外任何类型均 F1；目录也是非 regular 类型，却未被列为合法遍历节点。π2 必然创建 `evidence/screenshots/` 目录，因此一种实现会按字面拒绝所有 f2×π2 组合，另一种实现会自行推断目录例外。应明确：真实目录仅作为遍历节点合法，不生成 artifact 记录；symlink 目录及其他非 regular 叶节点拒绝。依据：[design.md:132](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:132)、[design.md:137](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:137)。

- **DES-4｜高风险｜“approve 重算承担快照边界”不足以保证 d1 绑定最终归档字节。**  
  重算只能发现 dry-run 与 approve 两次调用之间的稳定变化，不能封堵单次遍历中的 enumerate→`lstat`→read 竞态，也不能封堵 approve 完成散列后、bundle move 前的新增、替换或内容修改。最终归档 evidence 可能不同于已签 token。需要稳定 staging snapshot、以已打开 fd 散列并提交，或在 move 前对完整 manifest/身份/内容再做 CAS 式复核。依据：[design.md:132](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:132)。

- **DES-5｜中风险｜RUNBOOK delta 未同步 verdict digest 的封闭词法。**  
  design 已规定恰 64 位小写 hex，HL-N-67/68 也覆盖负例；但将来实际合入 RUNBOOK 的 EN/CN 草案仍只写 `digest=<hex>`，没有长度和大小写约束。由 design 实现与由规范草案实现会得到不同 grammar。依据：[design.md:141](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:141)、[runbook-hotfix-lane-section.md:43](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/runbook-hotfix-lane-section.md:43)、[runbook-hotfix-lane-section.md:45](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/runbook-hotfix-lane-section.md:45)。

- **DES-6｜中风险｜AC-I 对 v12 新语义仍非全谱，且内部存在相反预期。**  
  缺少跨 requirement 的 existing/new 同 ID 配对例、f2 含真实子目录的通过例、遍历中及 hash 后内容变化拒绝例、残留 temp 直接进入 archive preflight 的拒绝例；同时 HL-N-45/56 与 HL-N-63 对残留 temp 给出相反结果。HL-N-60 只证明两个 ADDED 块各自 `#1`，不能覆盖 DES-1 的 MODIFIED 混合 provenance。依据：[cli-checkpoints.md:68](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:68)、[cli-checkpoints.md:69](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:69)、[cli-checkpoints.md:70](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:70)。

VERDICT: 6 issues open.