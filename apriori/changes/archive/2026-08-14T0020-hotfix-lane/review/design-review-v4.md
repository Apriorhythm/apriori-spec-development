<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r4 transport=codex-exec-wsl-proxy -->

复审结论：DES3-4、DES3-6 等修复已有效落盘，但 v4 仍有 10 条开放问题，主要集中在 bindings、签收定式及 prior-art 契约的端到端投影。

1. **DES-1｜高｜`kinds` 全域语法仍接受 prior art 禁止的类别组合。**  
   依据：[design.md:125](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:125)允许 `{1,2,3}` 任意非空子集，却未禁止类别 1 与类别 2 同现；prior art 明确类别 3 可与 1/2 组合，而 1/2 互斥。该行还同时规定“未知二级节 F1”和“其余节为排除域”，但没有枚举哪些流程节属于合法“其余节”，解析器无法区分合法流程元数据节与未知节。

2. **DES-2｜阻断｜bindings 定式仍无法承载 req-v41 的 keyed 契约，并误改 c3 的持久化语义。**  
   依据：[design.md:126](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:126)只定义无键 `tests: <值>`/`no-test: <值>`：

   - c1/c1′ 完全没有 keyed 行语法；
   - c2 一个 requirement 块可含多个 scenario，仅凭所在块无法做到“每目标键恰一行”；
   - c3 只定义 `tests` 注释，漏 `no-test`；
   - 该行要求合并前剥离“这些行/注释”，但 prior art 的 c3 定义正是 HTML 注释随块合入 store；只有 c2 应剥离。

   因此 c1/c1′/c2/c3 四载体不能按当前定式得到同一需求函数。

3. **DES-3｜高｜签收参数化在 D1.4、bundle 布局和 approval 定式之间仍互相矛盾。**  
   依据：

   - [design.md:49](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:49)要求 a/b/c 也产生批准记录；
   - [design.md:124](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:124)却把 `approval.md` 限定成“签收 d 案”；
   - [design.md:133](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:133)又无条件要求 `token:`，与 a/b/c、d2、d3 不带 token 冲突；
   - c 案写成“有回写形态按所配签收”，但 prior art 已定义其回写分支采用 b 式 sign-off，不存在另一个待配签收轴。

   实现者无法据此唯一决定各案命令和 approval 文件合法形状。

4. **DES-4｜高｜k2 occurrence 定位没有贯穿 scope、bindings 和证明工件。**  
   依据：[design.md:125](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:125)把 k2 定为 `<scenario-id>@<requirement 标题>`，没有 req 所要求的 occurrence 定位，标题包含 `@` 或列表分隔符时也无转义规则。更严重的是：

   - [design.md:52](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:52)仍向 spec-runner 传纯 scenario-ID 集；
   - [design.md:136](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:136)的 Q-3=ii 工件也只接受 `<scenario-id>`。

   相同 ID 的多个 occurrence 在申报后重新坍缩，k2 实际不可实施。

5. **DES-5｜高｜π3 截图候选没有机械载体，artifact 路径也没有固定根。**  
   依据：[design.md:137-138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:137)的截图记录没有 hash 字段；只有选择 f2 时，图片哈希才进入 d1 令牌。但 π3 是独立的“外部路径+哈希”存续期候选，在 `{f1}`、`{f3}` 等合法组合下仍须保存哈希，当前无处可写。此外截图 `path=<相对路径>` 和 d1 的 `artifact:<相对路径>` 均未规定相对于仓根、bundle 根还是 `apriori/tmp/`，相同记录可解析到不同文件。

6. **DES-6｜高｜verdict 定式尚未形成唯一的角色—结论函数，也未定义当前评审工件选择规则。**  
   依据：[design.md:141](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:141)列出 inspection、P8、γ′ 三组结论，却未规定合法 role×phrase 配对，也未说明 γ′ 边界结论是替代普通 inspection 结论，还是产生第三条 verdict；后一解释会违反单职责/双职责基数。`N issues open` 也未定为实际十进制整数语法。bundle 允许 `review/` 下多个轮次文件，但 D6 没有固定当前 review doc/raw 的命名或选择算法，preflight 无法确定应消费哪个 verdict 对。

7. **DES-7｜高｜decision-summary 把 γ′ 的签收强绑错误收窄到 d+d1。**  
   依据：[decision-summary.md:35](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:35)称“γ′ 呈阅均绑 d+d1”，与同页第 33 行及 [design.md:97](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:97)冲突。req-v41 要求的是 γ′ 强绑任一完整呈阅的 d，或 scope≥R2 的边界点检；d2/d3 虽弱化内容新鲜度，仍是 dry-run 完整呈阅候选。该摘要会误导 owner 将 d1 当作 γ′ 的必需条件。

8. **DES-8｜高｜cli-checkpoints 仍漏 adopted prior-art 的关键验收面。**  
   依据：[cli-checkpoints.md](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md)没有覆盖：

   - `flow-state.md` 与 `hotfix-state.md` 并存、同名 scaffold 冲突及 status 身份标注；
   - stores→truth→bundle 三段 F2 fault injection、部分提交报告与重跑；
   - truth 目标缺失、Decisions 节重复、symlink/逃逸、ID 冲突和并发子案；
   - 新增的 kinds 互斥、未知头字段/二级节、非法 date/list/k2 语法；
   - c3 `no-test` 及其“随块保留”语义；
   - π2/π3 实际归档载体。

   这些不是实现细节，而是 req-v41 按引用采纳的身份、F1/F2、truth 和 KB 生命周期契约。

9. **DES-9｜中｜f3 的 mtime oracle 会被排除域更新和文件复制无关失效。**  
   依据：[design.md:137](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:137)比较证据时间与“业务实体文件最大 mtime”；但 `hotfix-state.md` 同时容纳业务节和排除域流程元数据，文件系统只有整文件 mtime。仅更新 gates/notes 也会推高 mtime，使证据失效，与实体级排除语义不一致。checkout、复制或恢复文件同样会改变 mtime 而内容不变。设计需明确接受这一非内容稳定副作用，或改用内容内时间/代码基线，而不能称其为业务实体级函数。

10. **DES-10｜高｜双语 RUNBOOK 仍把正式 trivial 错误纳入 Q-3/Q-4 参数化。**  
    依据：[runbook-hotfix-lane-section.md:30](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/runbook-hotfix-lane-section.md:30)及中文第 37 行先把“hotfix / trivial”共同写成按 Q-3 i/ii 和 Q-4 裁定执行，随后又说正式 trivial 恒保持 state-A tests+verify GREEN。Q-3=ii 引用证据及 Q-4 no-test 只辖 hotfix；正式 trivial 不继承二者。当前同一段给出了两个不同 oracle，也与 [design.md:78](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:78)的修正版正式表冲突。

VERDICT: 10 issues open