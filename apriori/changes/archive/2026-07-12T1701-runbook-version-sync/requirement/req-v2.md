# 需求:runbook-version-sync —— runbook 版本串不再与 CLI 漂移 (v2)

> change: `runbook-version-sync` · tier: medium · track: harden
> 来源:4.0.2 实验摩擦点——runbook 头部 3.0 与 CLI 4.x 漂移。
> v2 修订:RV-1(CN 各自==pkg major)、RV-2(parse target 写死)、RV-3(钉子不比 full version)。

## 目标

RUNBOOK 头部自标 `runbook-version: 3.0`(引用块内),但 runbook 由 4.x CLI 分发;`update` 刷新副本内容却不刷该字符串。修正当前值并**加一道机械守卫**,使 runbook 的 major 版本永远与 CLI(package.json)major 一致,以后不再漂。

## 行为需求

1. **修正当前值**:RUNBOOK.md 与 RUNBOOK_cn.md 头部 `runbook-version: 3.0` → `runbook-version: 4.0`(引用块与反引号格式保持;两版同步)。
2. **机械守卫 CK-11**(`apriori check --self`):
   - **parse target(RV-2)**:文件头部引用块中形如 `` > `runbook-version: X.Y` `` 的**唯一**条目;缺失、多于一个、或格式不匹配 → FAIL 点名(不误抓正文示例)。
   - **断言(RV-1)**:RUNBOOK.md 是 canonical 打包源,其 major 必须 == package.json `version` 的 major;`RUNBOOK_cn.md` 若存在,**各自**恰一个 header 且 major 也 == package major(不是 EN/CN 彼此一致,而是各自等于 pkg major)。
   - 不一致 → check 失败,消息点名文件、两个值与修复方向(改 RUNBOOK 头部)。
3. **不改 update 逻辑**:`update` 已整体拷贝 RUNBOOK.md → `apriori/runbook.md`,源正确则副本正确;无需 update 特殊处理(消费者项目 `update` 后即得 4.0 串)。
4. **回归钉子(RV-3)**:CK-11 在当前(RUNBOOK 头 4.0 vs pkg 4.x)PASS;把任一版 RUNBOOK 头改回 3.0(或制造缺失/多头)→ CK-11 FAIL 点名该文件——测试比对 **major**,不诱导实现去比 full version。

## 非目标

- runbook-version 的 minor 语义化/自动生成(只守 major 一致)。
- update 命令行为变更。
- 其它文档版本串(README 徽章等)。

## 约束

- 零依赖;既有 check/CK 场景不回归;CK-11 只在 `--self` 模式(消费者项目不被此自检牵连)。

## 开放问题

- 无。
