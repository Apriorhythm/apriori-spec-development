# proposal — gate-id-pattern

**WHY**：真实棕地样本上，`gate` C1 因无 id-pattern 通道恒 BLOCKED（36 unidentified），`check` CK-04 同样误报，"永远红的告警等于没有告警"——一个参数的缺口透支了整个机械门的信号价值（复盘 roadmap P0-1）。id-pattern 是项目恒量，verify 的 `--id-pattern` 手输必忘、忘了静默不匹配。

**WHAT**：
1. 新配置键 `id-pattern`（process-config 表行，裸 JS 正则源串），完整继承 config-contract；共享 parseConfig 新增 Markdown 单元格 `\|` 奇偶转义（全键统一）。
2. 统一解析优先级 flag > config > `DEFAULT_ID`，一处实现（`resolveIdPattern`）四处消费：verify（回退配置）、gate（新增 `--id-pattern` flag + 回退）、check CK-04（仅配置）、doctor D6（仅配置，detail 显示来源）。
3. 统一识别契约（leadId 语义），check 从 `^(...)\b` 改为复用。
4. 错误矩阵：非法生效 pattern → verify/gate/check exit 2（继承既有文本/JSON 契约），doctor → D6 finding + FINDINGS exit 1；校验先于读 spec/跑测试；`RegExp` 异常不逃逸库入口。
5. 模板预置 id-pattern 行（两层语义文案）；docs/cli EN/CN 同步；CHANGELOG。

**OUT OF SCOPE**：verify `--change` 语义收窄（change `verify-change-scope`）；MODIFIED 完整性检查（change `modified-block-integrity`）；hotfix 通道；`check` 新增 flag；ID 三态/leadId 边界规则本身；非 JS 生态附录；doctor D5 探针语义。

**验收锚点**：req-final AC1–AC7；真实样本 flag+config 双路径对比证据（改前 C1 36 unidentified → 改后 0）。
