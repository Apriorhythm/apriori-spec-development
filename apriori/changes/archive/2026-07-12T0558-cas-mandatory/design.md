# Design — cas-mandatory(事实对齐)

## 现状事实
- archive-merge:`buildProjection` 收集 `unstampedMutations`(:342);高层 cli 打警告(:419),单文件形式 :550 同;两形式共用 merge/preflight。gate 有 `configCas()`(process-config `| cas | optional |` 行)与 `--no-cas` flag。
- gate.js `require('./status')`(:10)——status 不能反向 require gate;`resolveChange` 与 `configCas` 需迁出。
- status.js 只读 active 路径(:43),无名称校验/containment。
- doctor 七检查 D1..D7;update 刷 runbook/命令文件,无布局感知。

## 方案
- **新共享模块 `lib/resolve.js`**:迁入 `resolveChange(cwd, name)`(含 CHANGE_NAME_RE、containment、archive 解析)与 `configCas(cwd)`;gate/status/archive-merge 均 require 它(gate 保持再导出以兼容既有测试引用面——以实测为准)。
- **archive 硬拒**:两形式在 preflight 分类后、任何 stage/write 前:`unstampedMutations.length > 0 && !waived` → 错误列出每个文件 + cure,exit 1;waived(cli `--no-cas` 新 flag,或 configCas==='optional',flag 优先)→ 既有警告路径 + 一行 `cas waived by --no-cas|process-config`。
- **status**:`--change` 走 resolveChange;文件级 guard(lstat regular + realpath 收容:flow-state.md 必在,issues.md 可缺);输出加 `stage`;json 加 stage/path;无参列表内部复用同一 guard(输出形态不变)。
- **doctor D8 / update**:共享 `legacyRoots(root)` 帮助函数(五根,existsSync/lstat 不跟随),doctor 出 finding,update 出 warning;MIGRATING.md 增 4.0 小节(手动迁移步骤:与本仓库/ai-company 实战一致的映射表摘要)。
- **homepage**:package.json 一行。RUNBOOK 双语 CAS 句改现在时(点名两豁免)。

## SPEC 触点
archive-merge RENAMED+MODIFIED(AM-32 重写 + AM-40/41 新增,AM-33/34/35 原样保留);status ADDED ST-05..08;doctor ADDED DR-13;update ADDED UP-12。
