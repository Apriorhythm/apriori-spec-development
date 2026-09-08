<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r23 transport=codex-exec-wsl-proxy -->

v23 的七项修订均已真实落盘；D1.2/D1.3、分级耦合表未发现新漂移。常量前置检查、π3 末端/祖先边界拆分及 hash 全域 oracle 已进入正文，但新组合产生以下 5 条问题。

- **DES-1｜高风险｜安全打开适用面仍漏掉 π2 和任意 `hash=`。**  
  D1.4、摘要和 RUNBOOK 均定义“f2 或 π3 任一命中”才需要 `O_NOFOLLOW`；但 D6 又规定 π2 复制必须从受检 fd 读取。此外，π1/π2×非 f2 中只要可选 `hash=` 出现，归档 preflight 也必须重新读取目标字节才能执行全域 hash oracle。因此真实适用面至少是 `f2 ∨ π2-copy ∨ π3 ∨ hash-present`。当前“改裁非 f2 且避开 π3即可”的平台指引仍会把不可执行的 π2 或带 hash 的 π1 放入合法空间；摘要末尾“选 f2 即接受静默残余”也漏了选择 π2/π3/可选 hash 的接受义务。依据：[design.md:56](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:56)、[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)、[decision-summary.md:41](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:41)、[runbook-hotfix-lane-section.md:49](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/runbook-hotfix-lane-section.md:49)。

- **DES-2｜高风险｜AC1 合法联合表漏掉 a/b/c×π2×仓外源。**  
  a/b/c×π2 仓内源需 `new + evidence + archive = 3` 条命令；仓外源再加一次搬运即 4 条，已超过 HL-K-01 对所有“非 d×π2”组合的 ≤3 上限。D3 却把 a/b/c×π2 无条件列为合法，只为 d×π2 定义 ≤4/≤5 联动。并且 d 的非法列仅写“未调阈值”，没有明确“阈值只调到 ≤4 × 仓外源”同样非法。应把签收案、π2、source origin、阈值组成完整联合表：a/b/c 内源≤3、外源≤4；d 内源≤4、外源≤5。依据：[design.md:110](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:110)、[design.md:113](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:113)、[cli-checkpoints.md:79](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:79)。

- **DES-3｜阻断｜π2 只封住了 source 读取，destination 写入仍可逃逸且不具备所称的可重入性。**  
  步骤②没有定义 `evidence/screenshots/<basename>` 的安全创建/替换协议。计划校验后若目标或其父目录被换成 symlink，普通复制可能写出 bundle；若进程在单个图片复制中途崩溃，会留下半文件，重跑按“异内容冲突”拒绝，不能实现“中途失败幂等续完”。需要目标侧至少定义：逐组件复核、同内容目标从受检 fd 比较、新目标以 bundle 内唯一 temp/O_EXCL 写入后原子 rename，以及残留 temp/部分目标的恢复语义。state A 现有归档正是先拒预存 temp、再暂存并 rename，而不是直接覆盖目标。依据：[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)、[archive-merge.js:699](/mnt/d/Workbench/misc/apriori-spec-development/lib/archive-merge.js:699)、[archive-merge.js:722](/mnt/d/Workbench/misc/apriori-spec-development/lib/archive-merge.js:722)。

- **DES-4｜高风险｜全域 hash oracle 没有定义各状态下的唯一读取对象和同一-fd关系。**  
  pre-copy π2 行的目标应是 `src`，post-copy 行应是 bundle `path`；π1/π3 则是仓根 `path`。正文只写“目标字节”，没有明确这一投影，也没有要求 π2 在同一个受检 source fd 上同时完成 hash 校验与复制。若先按路径算 hash、再另开 fd 复制，二者之间替换文件可产生“记录 hash 对应旧文件、bundle 保存新文件”的结果。应定义 `target(π,state)` 函数，并规定 hash、复制和必要的内容比较消费同一受检 fd/字节流。依据：[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)。

- **DES-5｜中风险｜AC-I 尚未覆盖 v23 新契约的完整错误谱。**  
  HL-N-84e 只覆盖常量“缺失/为零”，遗漏正文明确拒绝的“非数值”；没有 π2×能力不可用拒绝例、a/b/c×π2×仓外源四命令联动、d×π2×仓外源但阈值仅调到四的拒绝例、π2 目标 symlink/单文件半写崩溃例，也没有 pre-copy hash 对 src、post-copy hash 对 path 的区分例。HL-N-84h 的单个 π1 反例不足以证明所称全域 oracle。依据：[design.md:133](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:133)、[cli-checkpoints.md:69](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:69)、[cli-checkpoints.md:79](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:79)。

VERDICT: 5 issues open.