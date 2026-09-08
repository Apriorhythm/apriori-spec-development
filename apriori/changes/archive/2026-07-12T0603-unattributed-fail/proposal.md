# Proposal — unattributed-fail

**为什么**:verify 存在已复现的假绿(未归因 `not ok` + 非零退出仍 GREEN/exit 0),打穿 3.0.1 的 fail-closed 承诺;verify 是全体系的发布闸口,地基级必修(外部评审 P0-1)。

**做什么**:精确分类器捕获一切顶层非指令 `not ok`(含裸形/半形)为"未归因失败"→ GAPS exit 1;infra ERROR 保持优先;`exec.status !== 0` 绝不 exit 0;报告/JSON 合同精确定义。

**不做什么**:嵌套 TAP 重设计、YAML diagnostics、verify 之外的表面。

**规模**:medium。lib/spec-runner.js 单点 + 全形状回归。
