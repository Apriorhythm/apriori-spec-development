# Issue ledger — cas-mandatory

Rows recorded on behalf of the reviewer (codex session 019f5310-28e4-7103-9c14-1c1181180f9b; raws beside their docs in this dir).

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| CM-1 | D8/update 旧布局检测漏顶层 spike/(4.0 定义五个旧根)。 | 3.x explore 布局升级被静默放过。 | STEP0·r1 | verified |
| CM-2 | status --change 路径保护只到 resolver,flow-state.md/issues.md 文件级 symlink 逃逸未覆盖。 | 声称修复的洞留了一半。 | STEP0·r1 | verified |
| CMSPEC-1 | RUNBOOK 措辞/MIGRATING 4.0 小节/homepage 三个验收面无 spec 绑定。 | 可跳过实现而 verify 仍 GREEN。 | STEP2·r1 | verified |
| CMIMPL-ADV-1 | Advisory:resolveChange 内部不做 name 校验(调用方负责)注释可更精确;guardedResolve 的 missing: 前缀识别可结构化。 | 低;均已 ack,注释随本变更补。 | STEP5·r1 | advisory-acked |
