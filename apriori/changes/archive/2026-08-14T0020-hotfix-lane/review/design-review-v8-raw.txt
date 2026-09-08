<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r8 transport=codex-exec-wsl-proxy -->

复审结论：design.md 中 DES7-2..6 的主体修订多数已落盘，D1.4 对 state A `spec-runner` 的触点评估也明显更完整；但 `cli-checkpoints.md` 实际仍停留在上一版内容，并发现 6 个新定式问题，共 8 条开放 finding。

DES-1｜阻断｜DES7-1 的检查点修复并未实际落盘

依据：[cli-checkpoints.md:11](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:11) 仍写：

`HL-F-36b 含2⇔no-code 违反拒`

这仍是旧的双向关系，与 [design.md:125](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:125) 已定的单向 `含2 ⇒ no-code` 冲突，也没有用户声明的两个通过例。按现文件实现，纯业务事实 `{3}` 仍会被错误拒绝。

DES-2｜阻断｜DES7-7 声称的检查点拆分及 HL-N-31..41 均不存在

依据：[cli-checkpoints.md:11](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:11)、[cli-checkpoints.md:16](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:16) 仍保留复合 ID：

- `HL-F-34 conclusion 缺失/空白拒`；
- `HL-F-36a`、`HL-F-36c` 各自合并双向关系的两个方向；
- `HL-G-17` 用一个 ID 承担全部非 R2 分支。

文件在 [cli-checkpoints.md:68](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:68) 结束于 HL-N-30，全文没有 HL-N-31..41。账本 [issues.md:149](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/review/issues.md:149) 却已记为 fixed，形成“账本先翻、工件未写入”的流程不一致。

DES-3｜高风险｜k2 所谓“组件封闭字符集”仍不能唯一解析 carrier 与 ID

依据：[design.md:125](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:125) 只禁止路径/ID/标题中的逗号、换行、`@`、`#`，但没有禁止 ID 中的 `/`，也没有规定 carrier/ID 按哪个 `/` 切分。store 和 delta 路径本身合法包含多级 `/`，而 state A 的 ID pattern 可由 [config.js:116](/mnt/d/Workbench/misc/apriori-spec-development/lib/config.js:116) 自定义。

因此 `store=a/b/ID/sub@Title#1` 可被解释成：

- carrier=`a/b`、ID=`ID/sub`；
- carrier=`a/b/ID`、ID=`sub`。

需要明确“按最后一个 `/` 切分并禁止 ID 含 `/`”，或对各组件采用长度前缀/转义。当前是分隔符黑名单，不是封闭字符集。

DES-4｜高风险｜MODIFIED 块中新增加的 scenario 没有合法 carrier 身份

依据：[design.md:125](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:125) 规定：

- MODIFIED 块内既有 scenario 使用 `store=`；
- `delta=` 仅限 ADDED 新目标。

但 MODIFIED 是整块替换，完全可能在保留旧 scenario 的同时新增 scenario。这个新增 occurrence 既不是“既有目标”，又不属于 ADDED，无法构造任何合法复合键。

还需定义旧/新 occurrence 的匹配函数：按完整标题、裸 ID 加 ordinal，还是 old/new 块位置对应；无法匹配的 MODIFIED 新 occurrence 应明确使用何种身份。

DES-5｜高风险｜`digest-core` 已唯一编码，但 d1 扩展域仍使用可注入的行拼接

依据：[design.md:130](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:130) 已对公共核使用 tag/bytes 双长度前缀；但 [design.md:132](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:132) 的 d1 扩展仍拼接：

`store:<path>=<hex>\n`、`truth:<path>=<hex>\n`、`artifact:<path>=<hex>\n`

store/truth 相对路径没有禁止换行或其他控制字符，因此仍可注入额外逻辑行；“域前缀使编码唯一”的声明不成立。应让扩展域复用同一长度前缀记录编码，并把 domain 与 path 分别纳入 tag/bytes。

DES-6｜高风险｜截图“唯一一份禁用清单”仍有第二份冲突清单

依据：[design.md:137](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:137) 前部的新清单正确包含：

`path/obs/time/baseline/run/hash`

但同段后部仍保留旧句“任何字段值禁止含保留键子串”，列出的只有：

`path/obs/time/baseline/run`

再次遗漏 `hash=`。实现者无法判断 `obs=x hash=...` 应按前一清单拒绝，还是按后一清单接受。应删除后一份枚举并只引用唯一清单。

DES-7｜中风险｜π2 的“同名碰撞拒绝”与“同内容 no-op”边界仍未唯一

依据：[design.md:137](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:137) 同时规定碰撞预判，以及目标存在且内容相同为 no-op。若两个不同源路径具有相同 basename 且字节相同：

- 按 HL-N-23 的“同名碰撞”应拒绝；
- 按复制规则，第二个目标已存在且同内容，应 no-op，最终两条记录指向同一个归档文件。

必须区分“同一源的重跑”与“不同源的 basename 冲突”。建议计划阶段以规范化源路径建立 `basename→source` 单射；只有同一 source 的重跑才能 no-op。

DES-8｜高风险｜decision-summary 对 d1 的内容绑定能力仍有过度保证

依据：[decision-summary.md:36](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:36) 称 d1 是唯一保持“人看过的内容=落盘的内容”的方案；但 [design.md:130](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:130) 的 digest-core 不包含 `evidence/screenshots.md` 或 π2 复制的图片，只有选择 f2 时 [design.md:132](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:132) 才把 artifact 哈希加入令牌。

因此合法的 `d+d1 × π2 × {f1}` 组合中，dry-run 后可替换截图或修改观察记录而令牌不变；`--approve` 只能重新验证当前工件，不能证明它就是呈阅时的字节。应把摘要措辞收窄为“绑定业务实体及所选 f2 工件”，或者将 π2 证据无条件纳入 d1。

VERDICT: 8 issues open.