# Issue ledger — resolver-trust

Rows recorded on behalf of the reviewer (codex session 019f5481-d8ba-7652-b746-642e38e21082; raws beside their docs in this dir).

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| RT-1 | archive 内符号链接"一律结构错误"范围不清(全局熔断 vs 候选级)。 | 无关残留熔断一切解析。 | STEP0·r1 | verified |
| RT-2 | stamp 校验只有字段范围,2026-02-31 仍过。 | 伪时间戳仍参与排序。 | STEP0·r1 | verified |
| RT-3 | validateChangeName 单一来源未约束错误分类,可能改 new 文案。 | CLI 文案回归;date-prefix 覆盖不全。 | STEP0·r1 | verified |
| RT-4 | fileReadDefect 祖先 walk 契约仍字符串式(missing: 前缀脆弱)。 | optional ledger 与 unsafe ancestor 混淆。 | STEP0·r1 | verified |
| RT-5 | D riders 混排 plain edits 与 store deltas,范围不清。 | 验收面漏绑。 | STEP0·r1 | verified |
| RT-6 | 多仓回归约束不可机械验证。 | 空承诺。 | STEP0·r1 | verified |
| RT-7 | active 候选 symlink 判定弱于摘要:未明说任何 symlink(含指向真实目录)皆结构错误。 | 变更身份交给链接目标。 | STEP0·r2 | verified |
| RT-8 | 外部回归矩阵仍非命令级:check --self 无 CLI 前缀,外部 repo 的 change/test-cmd 无枚举来源。 | 验收退化为手工解释。 | STEP0·r2 | verified |
| RTSPEC-1 | doctor delta header 改 22 但 DR-12 场景仍 18。 | store 自相矛盾。 | STEP2·r1 | verified |
| RTSPEC-2 | changes 根自身与匹配 archived 候选 symlink 无场景。 | 只修一半信任根。 | STEP2·r1 | verified |
| RTSPEC-3 | RS-03 未列单文件 archive 形式与 date-prefixed 各表面。 | 单文件面漏拒。 | STEP2·r1 | verified |
| RTSPEC-4 | ST-09 只钉 archived 身份错配,active 未钉。 | active 面漏检。 | STEP2·r1 | verified |
| RTSPEC-5 | MIGRATING 旧表句无场景绑定。 | 文档漂移修复遗漏。 | STEP2·r1 | verified |
| RTIMPL-1 | validateChangeName 先 shape 后 date-prefix,日期名被判 invalid-shape;四表面测试未断言 kind。 | 日期语义非单一来源。 | STEP5·r1 | verified |
| RTIMPL-2 | RS-05 测试缺 escape kind 用例。 | escape 语义未被绑定。 | STEP5·r1 | verified |
