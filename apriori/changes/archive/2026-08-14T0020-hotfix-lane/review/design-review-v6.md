<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r6 transport=codex-exec-wsl-proxy -->

复审结论：v6 对 DES5-1..9 的修订大部分已落盘，尤其是 k2 序号、round 定式、债务措辞和检查点拆分；但仍有 8 个开放问题。

DES-1｜高风险｜`kinds` 一致性规则排除了合法的“纯业务事实”包

依据：[design.md:125](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:125) 规定 `含 2 iff change-kind=no-code`，同时 `含 3 iff decisions 存在`。这迫使纯业务事实包成为 `{2,3}`，虚构一个“纯调查”类别；若写成仅 `{3}` 又会因 `no-code` 未含 2 而 F1。

req-v41 与 prior art 的三类载体相互独立，且第三类明确“可与 1/2 并存”，并不要求必须与其中之一并存。应把一致性改成允许 `no-code×{3}`，并区分真正的 investigation `{2}` 与 business-fact `{3}`；补仅 kind 3 的合法例。

DES-2｜高风险｜k2 复合键在多文件及 current-delta 场景下仍非全域唯一，且与 state A 结果模型无法闭合

依据：[design.md:125](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:125) 将 `n` 定义为“该 ID 在 store 文件中的行号序”，但没有定义：

- 同一 ID、同一 requirement 标题分布于不同模块/store 文件时的全局排序；
- ADDED 或 current delta 中尚不存在于 store 的目标如何取得 occurrence；
- 两个文件中相同标题、各自第 1 次出现产生相同复合键时如何消歧。

此外，同一处宣称 Q-3ii 工件和 spec-runner 全链使用复合键，但 [design.md:136](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:136) 的结果行仍写成普通 `<scenario-id>: PASS|FAIL`。state A 的 [lib/spec-runner.js:118](/mnt/d/Workbench/misc/apriori-spec-development/lib/spec-runner.js:118) 等路径也是按普通 ID 聚合，尚无 occurrence 级结果身份。必须加入稳定的模块/store 身份或定义全局投影排序，并说明一个 TAP ID 如何映射、复制或拒绝多个 k2 目标。

DES-3｜高风险｜“首 marker 切分”语法不能解析 singleton 声明

依据：[design.md:126](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:126) 要求按首个 `" tests: "` 或 `" no-test: "` 切分；但 singleton 的合法形状正是行首 `tests: ...` / `no-test: ...`，前面没有空格，因此不含上述 marker。

当前规则会使 Q-4b/Q-4c×p2 的合法 singleton 无法进入解析分支。需要分别定义 keyed 与 singleton 的词法入口，并明确 keyed 前缀末尾冒号是否属于键。

DES-4｜高风险｜`digest-core` 仍不是无歧义规范化序列

依据：[design.md:130](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:130) 仅对 delta 使用 `path\0bytes\0`，随后直接拼接 decisions、状态节、bindings 和规范化字段。存在两类歧义：

- 文件内容允许 NUL 时，`bytes\0` 不能唯一标识文件边界；
- decisions、Conclusion、Bindings、声明行和字段组之间缺少类型标签、长度或组界定符。

因此不同实体分解可能产生相同输入字节，违背“内容摘要绑定”的机械唯一性。应对每个实体使用固定 tag 加长度前缀，或者显式禁止全部可能破坏分隔的字节并证明编码唯一。

DES-5｜高风险｜截图记录语法和路径安全仍不自洽

依据：[design.md:137](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:137) 前文称 observation 保留子串清单包含 `hash=`，但同段后部给出的显式清单只有 `path/obs/time/baseline/run`，遗漏 `hash`。同时 `<hex>` 未限定为恰好 64 位及大小写规范，π3 的“SHA-256”仍不足以生成唯一 parser contract。

路径规则只说“解析为 symlink”即拒绝，没有明确拒绝中间目录是 symlink、最终 realpath 越出仓根的路径。例如仓内目录 symlink 指向仓外、末端是普通文件时仍可能通过文字规则。需要 realpath containment 加逐路径组件 symlink 检查。

DES-6｜高风险｜π2 的复制动作尚未进入事务和摘要生命周期

依据：[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138) 规定 π2 将截图复制到 `evidence/screenshots/`，但 D1.4 的事务阶段没有说明：

- 谁在何时执行复制；
- dry-run、签收、digest 和 archive 各自看到复制前还是复制后的 bundle；
-记录行的 `path=` 保持源路径还是改写为归档副本路径；
- 同名碰撞是在预检、事务暂存还是归档移动阶段判定；
- 复制失败是否参与统一 rollback。

这会导致审批摘要签的是复制前内容，而归档实体是复制后内容。π2 copy 应成为明确的事务 stage，并在 digest/preflight 前完成或被单独内容绑定。

DES-7｜中风险｜RUNBOOK phrase-table 草案把 `boundary` 错写成全角色选填

依据：[runbook-hotfix-lane-section.md:43](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/runbook-hotfix-lane-section.md:43) 的语法为统一的 `[ boundary=...]`；而 [design.md:141](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:141) 要求 boundary 仅在 γ′ inspection 替代 d 时必填，其他场景出现即拒绝。

RUNBOOK 是实现者直接消费的公开契约，当前语法会把本应非法的 `p8+boundary`、普通 inspection+boundary 表达成合法。应在 EN/CN phrase-table 增量中写出双向 requiredness，而不只是可选尾注。

DES-8｜高风险｜AC-I 仍未达到“一例一 ID”及新增语法的全谱覆盖

依据：[cli-checkpoints.md:61](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:61) 以后仍存在复合检查点，例如：

- `HL-I-04` 同时覆盖命名、最大轮次选择和缺配对；
- `HL-N-11` 同时覆盖 o2 与 o3；
- `HL-T-08` 合并 symlink 与越界；
- `HL-T-13` 同时含 s2 正例和 s1 拒绝。

同时缺少 DES-1 至 DES-6 暴露的关键例：kind-3-only、跨 store k2 冲突、current-delta occurrence、singleton 首 marker 正例、π2 basename 碰撞、绝对路径及中间 symlink 越界、SHA-256 非 64 位、digest 含 NUL/分组歧义、π2 复制失败回滚。故本轮“复合 ID 全拆”和 AC-I 全谱映射尚未成立。

VERDICT: 8 issues open.