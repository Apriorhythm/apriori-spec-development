<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r24 transport=codex-exec-wsl-proxy -->

v24 的 `target(π,state)` 与同一 source-fd 规则已闭合，常量错误谱也已拆分；但 AC1 矩阵和 π2 目标提交协议仍不自洽。

- **DES-1｜高风险｜平台规避指引仍与安全打开适用面矛盾。**  
  RUNBOOK 已正确枚举 `f2 ∨ π2-copy ∨ π3 ∨ hash-present`，结尾却仍要求“改裁非 f2”；这不足以避开其余三种触发条件。decision-summary 同段也先写“选其中任一即接受静默残余”，后又收窄成“选 f2 即接受”。应统一为：避开全部触发条件才可规避，命中任一即接受残余。依据：[decision-summary.md:41](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:41)、[runbook-hotfix-lane-section.md:49](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/runbook-hotfix-lane-section.md:49)。

- **DES-2｜阻断｜AC1 四格表与正式检查点仍给出互斥预期。**  
  D3 规定 a/b/c×π2×外源在阈值 ≤4 时合法；HL-K-01 却仍要求所有非 d×π2 组合 ≤3。HL-N-84i2 又说该组合调至 ≤4 可通过，而 HL-N-84i5 未限定签收案地断言“外源只调到 ≤4 拒绝”。同一输入因此同时应通过和拒绝。须让 D3、HL-K-01、84i1..i5 使用同一四格函数，并将 i5 明确限定为 `d×π2×外源`。依据：[design.md:113](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:113)、[cli-checkpoints.md:69](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:69)、[cli-checkpoints.md:79](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:79)。

- **DES-3｜高风险｜`evidence/screenshots/` 的创建契约缺失。**  
  新 bundle 布局没有要求 scaffold 预建该目录，而步骤②直接要求复核目标父目录并在其中 O_EXCL 创建 temp。对于正常的新 bundle，目录不存在时究竟由 `hotfix new` 创建、由 evidence 命令安全 mkdir，还是判 F1 未定义。若由 evidence 创建，还需定义逐级创建、已存在非目录/symlink、部分创建失败及重跑语义。依据：[design.md:125](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:125)、[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)。

- **DES-4｜高风险｜O_EXCL 只保护 temp，最终 rename 仍可静默覆盖竞争目标。**  
  计划检查后、rename 前若最终 `<basename>` 出现，普通原子 rename 在部分平台会替换它，在另一些平台可能报错；设计没有 no-replace/CAS 语义。两个 evidence 进程也可各自通过计划、写不同 temp，随后覆盖同一最终截图。需定义原子 no-clobber 提交，或在 rename 前后以目标身份/哈希 CAS，并明确平台一致错误谱。依据：[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)、[archive-merge.js:699](/mnt/d/Workbench/misc/apriori-spec-development/lib/archive-merge.js:699)。

- **DES-5｜高风险｜目标侧祖先替换仍可把 temp 写出 bundle。**  
  “父目录逐组件复核”与随后按路径 O_EXCL 打开之间仍有窗口；祖先目录被替换为 symlink 后，temp 可能创建在 bundle 外。正文的 o1 残余只明确描述散列读取的 lstat→open 竞态，未披露写路径逃逸，风险也高于普通内容竞态。应使用 anchored dir-fd/openat 类方案，或把目标写入逃逸作为独立残余呈 owner，而不能由读取残余笼统承接。依据：[design.md:133](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:133)、[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)。

- **DES-6｜高风险｜temp 命名空间与合法最终 basename 可碰撞。**  
  临时文件为 `<basename>.tmp.<pid>`，但合法 source basename 没有保留该后缀。合法图片 `shot.tmp.123` 的最终路径可能与另一张 `shot` 的 temp 路径相同，也无法与残留 temp 机械区分。需要将 temp 放入不允许作为最终载体的专属目录，或封闭 basename grammar 并保留 temp 命名空间。依据：[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)。

- **DES-7｜中风险｜新增 AC 仍未覆盖目标提交错误谱，且 84q 重新合并了两个例子。**  
  当前缺少目标目录缺失/安全创建、最终目标在 rename 前出现、no-replace 平台差异、目标祖先换链、temp 名与合法 basename 碰撞等例。HL-N-84q 又把 π2、π3 两个反例放进一个 ID，与设计包既定“一例一 ID”纪律不符。依据：[cli-checkpoints.md:69](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:69)。

VERDICT: 7 issues open.