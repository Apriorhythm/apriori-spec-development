<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r7 transport=codex-exec-wsl-proxy -->

复审结论：DES6-3 与 DES6-7 已完整闭环，D1.3 走查、D3 联动表及 RUNBOOK 双语增量未发现新冲突；其余修订仍有 7 个开放问题。

DES-1｜高风险｜`kinds` 主契约已改成单向蕴含，但检查点仍要求旧双向关系

依据：[design.md:125](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:125) 已正确规定“含 2 ⇒ no-code”，允许 no-code×`{3}`；但 [cli-checkpoints.md:11](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:11) 的 `HL-F-36b` 仍写成“含2⇔no-code 违反拒”。

按该检查点实现会重新要求 no-code 必含 2，与 `HL-N-19` 的纯业务事实 `{3}` 正例直接冲突。应改成单向断言，并分别覆盖：

- 含 2 但非 no-code → 拒；
- no-code+decisions+`{3}` → 通过；
- no-code+decisions+`{2,3}` → 通过。

DES-2｜高风险｜k2 复合键增加了承载文件段，但词法和 provenance 仍非机械唯一

依据：[design.md:125](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:125) 的键为 `<store 后缀|delta:<路径>>/<ID>@<标题>#<n>`，但只禁止标题中的 `@/#/逗号`，没有限制或编码：

- store/delta 路径中的逗号、换行、`@/#`；
- 可配置 scenario ID 中的分隔字符；
- store 身份与 delta 身份的明确前缀；
- MODIFIED 块内既有 scenario 应取 store 身份还是 delta 身份；
- `n=承载文件内行号序`究竟是物理行号还是同 ID occurrence 的 1-based ordinal。

state A 允许递归发现任意 `.md` 相对路径，[archive-merge.js:327](/mnt/d/Workbench/misc/apriori-spec-development/lib/archive-merge.js:327) 没有上述字符限制；ID 又可由 [config.js:116](/mnt/d/Workbench/misc/apriori-spec-development/lib/config.js:116) 自定义。当前键放入逗号分隔的 `affected-scenario-ids` 时仍可能无法无歧义切分。需要为两个 carrier 分支加固定前缀并对各组件编码，或明确封闭字符集，同时唯一化 MODIFIED provenance 与 occurrence 算法。

DES-3｜高风险｜D1.4 仍把 k2 低估成“增加 scoped 参数”，未覆盖 state A 的 duplicate 拒绝链

依据：[design.md:52](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:52) 对 `lib/spec-runner.js` 的触点仍只描述“接受显式 scenario-ID 集合的 scope 接口”。实际上 state A：

- 在 [spec-runner.js:118](/mnt/d/Workbench/misc/apriori-spec-development/lib/spec-runner.js:118) 按裸 ID 建 `byId`；
- 在 [spec-runner.js:202](/mnt/d/Workbench/misc/apriori-spec-development/lib/spec-runner.js:202) 将重复裸 ID归为 duplicate；
- 在 [spec-runner.js:455](/mnt/d/Workbench/misc/apriori-spec-development/lib/spec-runner.js:455) 把 duplicate 报为歧义；
- 最终在 [spec-runner.js:486](/mnt/d/Workbench/misc/apriori-spec-development/lib/spec-runner.js:486) 因 duplicate 判 GAPS。

因此 k2 还必须触及 occurrence 收集、k1/k2 参数化 duplicate policy、scope 键投影、裸 TAP 结果向复合键的 GREEN/RED/UNBOUND 全谱复制及 store report 展示。仅新增 scope 参数无法使 `HL-N-30` 成立。

DES-4｜高风险｜`digest-core` 只给 bytes 加长度，type-tag 本身仍可注入记录边界

依据：[design.md:130](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:130) 的记录编码是 `<type-tag>\n<长度>\n<bytes>`。delta 路径直接进入 type-tag，但路径字符集未禁止换行；因此 tag 可伪造下一行的长度字段，“长度前缀消除分组歧义”的声明仍不成立。

还未定义“路径字典序”是 UTF-8 字节序、Unicode code point 还是平台字符串序。应把 tag 也做长度前缀，或禁止 tag 中控制字符并给出固定 UTF-8 bytewise 排序。`HL-N-27` 目前只覆盖 bytes 含 NUL，未覆盖 tag 注入。

DES-5｜高风险｜截图定式仍有一处内部矛盾，并缺三个机械 oracle

依据：[design.md:137](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:137) 前半段的保留子串集合已包含 `hash=`，但后半段真正声明“字段值禁止含”的列表仍遗漏 ` hash=`，解析器可以得到两套行为。

同段还没有明确写出：

- π3 必须满足 `hash == SHA256(path 所指文件字节)`；
- 所有截图记录的 `run=` 必须一致；
- baseline 按本仓 `HEAD`、外仓 `fix-ref` 分域比较。

这些结论虽出现在 [cli-checkpoints.md:36](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:36) 的 HL-E-04..08/N-04 中，却未进入 D6 的实现者定式，形成“AC 有预期、设计无函数”的倒挂。

DES-6｜高风险｜π2 前置复制仍破坏零写入与两步签收的可重入性

依据：[design.md:137](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:137) 要求在 dry-run 前复制图片并改写 `screenshots.md` 的 `path=`，同时声称“不属事务、无回滚问题”。但这已经修改 bundle：

- 若复制后其他 F1 才被发现，就违反 req-v41 的“F1 拒绝零写入”和 `HL-T-05`；
- 多图片复制到一半失败会留下部分副本和部分 path 改写；
- d 两步签收的第二次 `--approve` 再跑前置步骤时，path 已指向目标文件，可能自复制或命中同名碰撞；
- 失败重试缺少“已复制且内容相同即 no-op”的规则。

应把 π2 明确定义为归档外的独立作者操作，或采用“先全量只读计划校验，再暂存，再提交”的可重入步骤，并定义 canonical path 已存在时的同内容 no-op/异内容冲突。

DES-7｜高风险｜AC-I 映射尚未覆盖 v7 新定式的失败边界，“一例一 ID”也仍未完全成立

依据：[cli-checkpoints.md:63](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:63) 新增了 HL-N-19..30，但仍缺：

- k2 carrier 分隔符注入、MODIFIED provenance 两可；
- k2 fan-out 后 RED/UNBOUND 传播；
- digest type-tag 换行注入；
- observation 中 ` hash=` 的解析攻击；
- π2 多文件中途失败、第二次 approve 可重入、复制后晚到 F1 的零写入断言。

此外 `HL-F-34` 仍把 Conclusion“缺失/空白”合成一个 ID，`HL-F-36a/36c` 各自把双向关系的两个反例合并，`HL-G-17` 用一个 ID 承担全部非 R2 分支全域断言。故文件首行宣称的“一例一 ID 可追踪”仍不严格成立。

VERDICT: 7 issues open.