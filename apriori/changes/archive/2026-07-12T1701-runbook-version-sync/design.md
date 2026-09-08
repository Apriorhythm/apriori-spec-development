# Design — runbook-version-sync(事实对齐)

## 现状事实
- RUNBOOK.md/RUNBOOK_cn.md 第 9 行:`` > `runbook-version: 3.0` · … ``(引用块+反引号)。
- lib/check.js:self-mode 在 cli(:248 附近)聚合一堆 check* 纯函数;PACKAGED_RUNBOOK 常量已指向包内 RUNBOOK.md。package.json version = 4.0.x。
- CK-06 是 warn-only 的 scaffolded-runbook freshness(比对副本 vs 包内),与本变更正交。

## 方案
- 改 RUNBOOK.md/RUNBOOK_cn.md 第 9 行 `3.0`→`4.0`。
- 新 `checkRunbookVersion(root, pkgVersion)`(纯函数):对 RUNBOOK.md(必)与 RUNBOOK_cn.md(存在则)各:提取头部引用块中唯一 `` > `runbook-version: X.Y` `` 条目(正则锚定引用块行,排除正文示例);缺失/多个/格式不符 → fail 点名;major(X)≠ pkgVersion 的 major → fail 点名两值。
- cli self 分支追加调用,fails 汇入既有 self-mode fails 列表(exit 1);consumer 模式不调用(--self only)。
- 打包源即真相,update 无需改。

## SPEC 触点
check spec ADDED「CK-11 keeps the runbook version aligned with the CLI major」+ CK-11 场景。
