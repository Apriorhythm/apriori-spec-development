# req-v1 — modified-block-integrity：MODIFIED 整块替换的保真性成为机械报告

target lineage: main（v4 产品线；不合并 v1/v3）

## 背景（现状 A）

- RUNBOOK 明确警告："MODIFIED 是整块替换，块内未重述的内容会被静默删除。"现状没有任何机械检查：落地复盘（1012692）中，一次 MODIFIED 重述靠 **STEP2 评审员逐行子序列比对**才确认 store 原块 11/13 行全部保留、缺失 0——复盘 P0-3 原话："这件事完全可以机械做……不该依赖 LLM 评审的注意力。"防线表中它是唯一 ⚠ 项（"建议做进 CLI"）。
- 就在本批 change 中再次出现活教材：verify-change-scope 的 delta 对 9 场景的 Requirement 块做 MODIFIED 整块重述，仅 2 条场景文本有意变更、其余 7 条须逐字保留——保真性目前仍靠作者自查 + P8 评审注意力。
- 代码事实：`merge()` 对 MODIFIED 直接 `store.set(name, block)`（整块替换，无任何对比）；`verify --change` 的投影与 `archive`（dry-run 与 --write）同用此路径。delta 与 store 原块在 `buildProjection` 时同时在手（storeText 已读、delta 块文本已解析）——对比的原料零额外成本。

## 目标（目标态 B）

### B1. 机械保真报告（informative，不判死）

对每个 MODIFIED 操作（RENAMED 后再 MODIFIED 的目标同理），在 `verify --change` 与 `archive`（dry-run 与 --write 前的 preflight 输出）中报告**替换块相对 store 原块的结构性差异**：

- **场景级**：原块的每个场景 ID——保留（still present）/ 丢失（dropped）/ 新增（added）；场景标题变更（同 ID 文本不同）单列。
- **子句级**：对同 ID 保留的场景，原场景体内的 `- AND ...` 子句（以及 WHEN/THEN 行）在新场景体内是否逐行保留——丢失的行列出（行文本截断展示）；仅缩进/尾随空白差异不算丢失。
- 输出定位为 **informative 报告**（默认不改变 verdict/exit）：MODIFIED 的合法用途就包括删场景/删子句（SR-17 的语义），机械检查无法区分"有意删"与"手滑丢"——它的职责是把差异**摆到台面上**让人与评审确认，而非替人裁决。

### B2. 消费面

- `verify --change`：报告并入现有输出（human 一段 + `--json` 结构化字段）；`--change` 之外零变化。
- `archive`：dry-run 与 `--write` 的 preflight 阶段打印同一报告（沿用其现有输出通道）；报告不改变 archive 的既有 exit/写入语义。
- `gate`：不消费（C1 的 verdict 不受影响）——报告是给人与 P8 评审看的。

### B3. 判定资料与语义

- 对比基线 = 投影/归档当次读到的 store 原块（同一快照，无二次读取——沿用 buildProjection 单快照纪律）；替换块 = delta 的 MODIFIED 块（RENAMED 目标取改名后块名）。
- 场景切分沿用现行 `#### Scenario:` 语法与 leadId 识别（用生效 id-pattern——与既有解析一致）；无 ID 场景按标题全文对比。
- 行级对比规则：规范化（trim 行尾空白、统一行首缩进宽度不参与比较）后的**逐行子序列**判定——原块场景体的每一行是否按序出现在新场景体中；乱序但存在算保留（子序列不要求连续）。
- 空对比（原块与新块 trim 后相同——idempotent rerun 的 unchanged 路径）：不报告（无差异无噪音）。

## 范围外（won't do）

- 不改变 merge()/archive/verify 的任何 verdict、exit code、写入语义（纯增量报告）。
- 不做"自动合并/自动补回"——只报告。
- 不做 ADDED/REMOVED/RENAMED 的额外检查（各自语义已完整；REMOVED 的可见性由 deprecated 机制承担）。
- 不做跨块移动检测（场景从 A 块挪到 B 块会报 dropped+added——如实反映，人来解释）。
- hotfix 通道、前两个 change 的语义均不动。

## 验收标准（确定 oracle）

- AC1（场景级）：store 块含 KV-01/KV-02/KV-03，MODIFIED 块含 KV-01/KV-03(文本变)/KV-04 → 报告：retained KV-01；title-changed KV-03；dropped KV-02；added KV-04。
- AC2（子句级）：KV-01 原体 4 行（WHEN/THEN/AND×2），新体缺一条 AND → 报告该行文本；缩进/行尾空白差异不报。
- AC3（verdict 不变）：上述两例的 verify --change exit 与无报告时完全一致（GREEN/GAPS 判定不动）；archive dry-run RESULT 行不变。
- AC4（json）：`--change --json` 在 GREEN/GAPS 增加 `modifiedIntegrity` 数组（每 MODIFIED 一项：{file, name, retained, dropped, added, titleChanged, missingLines:[{scenario, line}]}），ERROR 类缺省；`--specs` 运行不带此字段。archive `--json`？（archive 现有无 --json——human 输出即可，评审裁）。
- AC5（rename-then-modify）：RENAMED A->G + MODIFIED G → 对比基线为原 A 块（改名前内容），报告挂在 G 名下。
- AC6（idempotent）：delta 与 store 已一致 → 零报告行。
- AC7（活教材回归）：对 verify-change-scope 的真实 delta（9 场景块重述）运行 → 报告 retained 7、title-changed 2（SR-16/SR-18）、dropped 0、missingLines 若干如实——作为测试 fixture 固化。
- AC8（兼容）：`--specs` byte 级不变（沿用 golden）；306 存量测试全绿；docs/cli 双语 + CHANGELOG。

## 开放问题（评审请裁）

- Q1：报告触发的显著性——MODIFIED 无差异时完全静默（倾向：是，零噪音）；有 dropped/missingLines 时是否在 human 输出加 `!` 前缀提醒（倾向：是）。
- Q2：archive --write 是否在报告含 dropped 时要求二次确认 flag？（倾向不做：报告 informative 定位，交给评审/人；避免新交互面。）
- Q3：子句级对比是否只限 `- ` 开头的列表行（WHEN/THEN/AND 等）而忽略散文行？（倾向：全部非空行都比，散文也是规范内容。）
