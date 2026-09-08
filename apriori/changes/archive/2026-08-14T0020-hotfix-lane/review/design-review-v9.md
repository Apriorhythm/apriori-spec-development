<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r9 transport=codex-exec-wsl-proxy -->

复审结论：事故修订这次确已真实落盘，DES8-1/2/3/5/6/7/8 的声明修复可核验；但 MODIFIED occurrence、π2 操作链和 verdict 定式仍有 7 个开放问题。

DES-1｜阻断｜MODIFIED 的“裸 ID 存在性”归属函数不是 occurrence 全域函数

依据：[design.md:125](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:125) 规定：只要裸 ID 存在于旧块，新块中的该 ID 就取 store 身份，并按旧块 occurrence 排序。

反例：旧块有一次 `X`，MODIFIED 新块有两次 `X`。两个新 occurrence 都命中“旧块含 X”，但旧块只提供一个 ordinal：

- 若两者都取 `store=...#1`，复合键重复；
- 若第二个取 `store=...#2`，它又并非旧 store occurrence；
- 若第二个应取 delta 身份，则当前“裸 ID 存在性”无法得出。

旧块两次 `X`、新块一次 `X` 时也无法判断保留的是哪个 occurrence。state A 已在 [archive-merge.js:350](/mnt/d/Workbench/misc/apriori-spec-development/lib/archive-merge.js:350) 同时持有完整 old/new block，设计应定义 occurrence 级匹配，例如按每个 ID 的 old/new occurrence 多重集顺序配对，超出旧基数的尾部 occurrence 才归 delta；并明确重排、删减时的规则。

DES-2｜高风险｜k2 的 `<标题>` 仍未满足 req-v41 的“requirement+occurrence”唯一语义

依据：req-v41 要求 k2 使用 requirement+occurrence 定位；但 [design.md:125](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:125) 只写 `<标题>`，未说明它是 requirement 标题还是 scenario 标题，也未规定 rename-then-modify 时使用旧 requirement 名还是新名字。

这不是展示问题：state A 的 projected scope 使用最终 requirement 名，[spec-runner.js:527](/mnt/d/Workbench/misc/apriori-spec-development/lib/spec-runner.js:527)；而 MODIFIED 比较面同时保存 old/new 名和块，[archive-merge.js:352](/mnt/d/Workbench/misc/apriori-spec-development/lib/archive-merge.js:352)。两个消费者可能为同一 occurrence 生成不同键。应显式固定标题类型及 ADDED、MODIFIED、rename-then-modify 各分支的 old/new 取值。

DES-3｜高风险｜π2 的三步算法仍不保证步骤③崩溃后的可重入

依据：[design.md:137](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:137) 的步骤③会把原 source path 改写成 bundle path，但没有规定 `screenshots.md` 是一次临时文件原子替换，也没有保留 source manifest。

若步骤③写到一半失败：

- 已改写行丢失原 source 身份；
- 未改写行仍以原 source 参加 `basename→source` 单射；
- 重跑时，同一图片可能被识别成“bundle target source”和“原 source”两个不同源，产生假碰撞；
- 若文件被截断，辅助命令甚至无法恢复完整计划。

应将全部 path 改写先在内存生成，再以 temp+rename 一次提交；或者持久化独立的 source→target manifest。需补步骤③ fault injection，而不仅是步骤②复制中断。

DES-4｜高风险｜π2 辅助命令未进入 CLI grammar，并使合法 d×π2 组合突破三命令成本上限

依据：

- D1.4 的 [design.md:49](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:49) 只定义 `new`、`archive`、`--approve`，没有 π2 辅助命令的名称、参数和输入；
- D3 又允许 d×π2，[design.md:112](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:112)；
- `HL-K-01` 保持每类最多三条命令，[cli-checkpoints.md:71](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:71)。

按当前设计，d×π2 至少需要：

1. `hotfix new`
2. π2 copy 辅助命令
3. archive dry-run
4. `--approve`

共四条。prior art 允许 gate③显式调整阈值，但 D3 和 decision-summary 未披露这一联动。需要定义辅助 CLI，并把 d×π2×AC1 阈值加入合法联合选项表和 owner 摘要，或将复制整合进不增加写入风险的既有作者步骤。

DES-5｜高风险｜verdict 的 `role` 与 `digest` 仍被语法写成可选，与 req-v41 强制内容绑定矛盾

依据：[design.md:141](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:141) 和 [runbook-hotfix-lane-section.md:43](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/runbook-hotfix-lane-section.md:43) 均使用：

`VERDICT: <phrase> [role=<r>] [digest=<hex>]`

方括号通常表示选填；正文只对 boundary 给出双向 requiredness，没有明确 role/digest 缺失即拒。但 req-v41 要求每条职责 verdict 都携同一摘要，role 又是判断短语配对及双职责顺序的必要输入。

应把 hotfix verdict 的 role、digest 明定为必填、各恰一、顺序固定；只有 boundary 条件选填。补缺 role、缺 digest、重复尾注三个拒绝例。

DES-6｜高风险｜AC-I 尚未覆盖本轮新增算法的关键边界

依据：[cli-checkpoints.md:68](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:68) 的 HL-N-31..41 已真实存在，但缺少：

- old `X×1` → new `X×2` 的 MODIFIED occurrence 归属；
- old `X×2` → new `X×1` 的消歧；
- rename-then-modify 下 requirement 标题取值；
- π2 步骤③ path 改写故障及恢复；
- d×π2 四命令成本投影；
- verdict 缺 role、缺 digest；
- doc-fix 不含 kind 1 的拒绝例——`HL-F-36a2` 只覆盖 code-*，而设计的不变量还包含 doc-fix。

因此“AC-I 全谱”和“一例一 ID”虽已比 v8 完整，仍未覆盖新函数的输入域。

DES-7｜中风险｜`module-type-map` 仍未给出全模块词表可解析的机械语法

依据：[process-config-rows.md:6](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/process-config-rows.md:6) 用冒号分隔 module/type、分号分隔条目，却没有规定空白、空条目、冒号/分号转义及合法 module 字符集。req-v41 要求键来自完整 store/truth 模块后缀词表；state A 的 [config.js:63](/mnt/d/Workbench/misc/apriori-spec-development/lib/config.js:63) 只把整个 Value 当不透明字符串返回，不会替设计消除内部歧义。

模块后缀若包含 `:` 或 `;`，当前格式不能唯一表达。应给出封闭 module grammar，或采用无歧义编码；并补重复分隔符、空 module、尾分号及保留字符例。

VERDICT: 7 issues open.