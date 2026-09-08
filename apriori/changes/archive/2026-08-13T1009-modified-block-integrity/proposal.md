# proposal — modified-block-integrity

**WHY**：RUNBOOK 明警"MODIFIED 整块替换会静默删除未重述内容"，但保真性今天全靠 LLM 评审注意力（复盘 P0-3：一次替换靠评审员逐行子序列比对才确认 11/13 行未丢——防线表唯一 ⚠ 项"建议做进 CLI"）。本批 change 2 自己就重述过一个 9 场景块。确定性问题不该交给注意力。

**WHAT**：
1. 纯共享引擎 `compareModifiedBlock`（archive-merge 内，零 matcher 依赖）：结构扫描（fence 感知、state-A 正则、requirement 标题行不比较）→ occurrence 级基数真值表分类（retained/titleChanged/dropped/added/ambiguous）→ 保序贪心子序列行比较（missingLines，含 requirement 散文与 fence 内容）。
2. `verify --change`：报告并入输出（JSON `modifiedIntegrity` GREEN/GAPS 恒在 + human 显著性段）；旧块标题搭乘既有单一标题批（零新增 matcher 调用）；一切 ERROR 类无报告。
3. `archive --change`（high-level form 专属）：dry-run 与 --write preflight 打印同一 human 段；matcher 经 bin 层注入（config>default，可终止通道）；失败降级为整行 sanitizeMsg warning + 跳过报告，archive 语义分毫不动。
4. **informative 定位**：不改任何 verdict/exit/写入语义——机械检查无法区分"有意删"与"手滑丢"，它的职责是把差异摆上台面给人与 P8 评审。
5. docs/cli + RUNBOOK 双语、CHANGELOG。

**OUT OF SCOPE**：single-file archive form；archive --json；确认/override flag；跨块移动检测；自动补回；三个 change 之外的一切语义。

**验收锚点**：req-final AC1–AC10；AC7 活教材冻结 fixture（change 2 的 9 场景重述，人工推导期望值）。
