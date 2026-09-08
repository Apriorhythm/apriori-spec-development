<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r3 transport=codex-exec-wsl-proxy -->

复审结论：DES2-3（Conclusion 入摘要）和 DES2-6（表 C 条件分支）已收口，其余修复有实质进展，但仍留下 10 条开放问题。

1. **DES-1｜阻断｜D6.1 状态文件语法仍非全域唯一，并有一处逻辑反写。**  
   依据：[design.md:122](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:122)称头部“每字段基数恰一”，但 frontend/backend、定位头、affected 等字段按 change-kind、类型表案和必填/选填案可能必需或禁止，不能统一恰一。该节还未定义：

   - touched-modules、affected-scenario-ids 的列表分隔和复合键 k2 语法；
   - `kinds` 的合法组合及其与 change-kind 的一致性约束；
   - date 的准确语法；
   - 未知头字段、未知二级节如何处理。

   同一行的“`Conclusion` 非空非占位 = F1，否则拒”更把合法条件写成 F1；应是缺失、空白或占位才 F1。

2. **DES-2｜高｜CLI grammar 和 approval 结构只实现了 d+d1，无法承载仍待裁的其他签收案。**  
   依据：[design.md:49](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:49)只有 dry-run 和 `--approve <token>` 写入路径，[design.md:130](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:130)也强制 approval 含 token。但合法候选仍包括：

   - a：调用即批准；
   - b：`--signed-off-by`；
   - c：按形态分级签收；
   - d+d2：仅重查 CAS；
   - d+d3：两步但不绑定内容。

   这些候选分别如何触发写入、记录何种 approval、哪些参数必需均未定义；当前定式实际预裁了 d+d1。

3. **DES-3｜阻断｜d1 摘要的扩展串接仍不能跨实现稳定复算。**  
   依据：[design.md:127-130](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:127)的 digest-core 已明显改善，但 d1 扩展没有规定：

   - `digest-core` 参与二次散列时使用 32-byte digest、hex 字符还是规范化原文；
   - store/truth 基线哈希使用的算法；
   - 每个扩展项的路径、类型标签、分隔符和缺席标记；
   - 空 store/truth 集、同内容不同路径的唯一编码。

   此外 `kinds`、hotfix name/date 等必填业务头不在 digest-core 正列中；改变承接类别可能不令 d1 token 失效，违反 prior art “bundle 业务内容全部绑定”的契约。

4. **DES-4｜高｜fix-ref 和截图记录仍不是无歧义 grammar，f3 也没有完整判定函数。**  
   依据：

   - [design.md:124](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:124)对外仓只写 `<scheme>://…` 或 `<host>:<ref>`，没有完整正则、非空约束、空白约束及 ref 边界；不能称为机械 grammar。
   - [design.md:134](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:134)用空格分隔字段，却允许 `obs` 是自然语言；观察文本含 ` time=`、` baseline=` 等保留片段时解析仍两可。“禁止歧义”没有给出可判字符集。
   - 同行只说 f3 比较 timestamp 与最大 mtime，未定义通过关系、相等边界、mtime 精度和缺失文件行为，无法实现“新鲜度失配拒绝”的唯一 oracle。

5. **DES-5｜高｜verdict 行恢复了前缀兼容，但没有定义可接受的 role-specific 结论。**  
   依据：[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)仍以 `<结论短语>` 占位。实现无法知道：

   - inspection 的通过/不通过短语；
   - P8 是否必须沿用 `no spec-vs-code gaps`；
   - γ′ 边界职责的肯定/否定结论如何编码；
   - 哪些短语进入 phrase table，哪些结果阻塞。

   `^VERDICT:` 只能保证现有 C5 看见该行，不能保证它机械判断正确结果。`role=inspection|p8` 也应明确这是两个枚举值，而非字面含 `|` 的值。

6. **DES-6｜高｜正式流程表对 R0 的验证下限仍自相矛盾。**  
   依据：[design.md:78](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:78)先说 R0/R1 复用表 A 对应行；表 A 的 R0 只有结论和 decisions；同一格随后又说正式 trivial “恒 tests+verify GREEN”。req-v41 明确正式流程不继承 hotfix 豁免。设计必须分别写清正式 R0、R1 的 state A 下限，不能同时引用 hotfix R0 格和断言恒 GREEN。

7. **DES-7｜高｜D3 仍未形成完整合法联合选项表，且两处后果失真。**  
   依据：[design.md:94-112](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:94)仍漏或误述：

   - d 与 d1/d2/d3 必须成组选择；
   - `d×π2`、`d×π3` 的合法组合；
   - Q-4b 下 p2 no-test 只对 R1 合法，R2-behavior 不合法；
   - w2×选填定位头全缺虽是候选组合，但 code-* 输入按次序 0.5 输出 R3 并拒绝 hotfix，不只是“五项放弃+通用提醒”。

   因此 gate③ 仍可能从表中得到错误或不完整的组合结果。

8. **DES-8｜高｜decision-summary 所称“prior art 全候选”仍漏项。**  
   依据：[decision-summary.md:35](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:35)只列 d+d1，没有 d+d2、d+d3；[decision-summary.md:43](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:43)写“载体 c1/c1′（倾向）”，没有唯一指出究竟倾向 c1 还是 c1′，也没有把 c1 导致 AC1 阈值调整作为连带裁定放在摘要内。owner 仍不能只靠这一页完整裁定。

9. **DES-9｜高｜cli-checkpoints 尚未做到“一例一 ID”，AC-I 仍有明确漏项。**  
   依据：

   - [cli-checkpoints.md:8](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:8)用 HL-F-23 同时承载 k1 拒绝与 k2 通过；
   - HL-G-13、HL-V-24、HL-V-27、HL-R-10、HL-R-21 等也各自包含多个结果；
   - 字段谱只点名 frontend-touched，没有 req 明示要求的 backend-touched 缺失/非法/应缺而现独立例；
   - 缺 f1 基线值不等于 HEAD 的拒绝例；
   - 缺 f3 timestamp 新鲜度失配例；
   - 缺 m1/m2-α/m2-β/m3 gate 映射场景及 a/b/c/d2/d3 签收路径；
   - [cli-checkpoints.md:49-50](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:49)仍没有逐格覆盖表 A：R0×backend/docs/ui/fullstack、R1×backend、R2×backend 等格被“同左”压缩掉，不满足“逐格 oracle”。

10. **DES-10｜高｜EN/CN 文本已逐句对应，但共同引入了四处未裁定或超契约语义。**  
    依据：

    - [runbook-hotfix-lane-section.md:8](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/runbook-hotfix-lane-section.md:8)与第 17 行先断言“一切未标注 ADDED 都是 R3”，随后又允许 Q-12 ADDED-only 白名单，句内自相矛盾；
    - 第 12/21 行把外仓一律写成 `unverifiable`，预裁了 w2/x1，未保留 w1/x2 拒绝案；
    - 第 28/35 行断言图片必留 `apriori/tmp/`，预裁 π1，未保留 π2/π3；
    - 第 30/37 行把 hotfix 一律写成 scoped verify，漏 Q-3=ii 和 Q-4 no-test 分支；并把 req 的“frontend=yes 至少一条受影响页截图”扩大成“每个受影响页面至少一条”，属于未经 owner 裁定的加严。

VERDICT: 10 issues open