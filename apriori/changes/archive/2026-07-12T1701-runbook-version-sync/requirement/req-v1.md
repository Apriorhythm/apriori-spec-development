# 需求:runbook-version-sync —— runbook 版本串不再与 CLI 漂移 (v1)

> change: `runbook-version-sync` · tier: medium · track: harden
> 来源:4.0.2 实验(Opus/admin-reopen)摩擦点——`apriori/runbook.md` 头部 `runbook-version: 3.0`,却由 apriori-cli 4.0.2 安装/`update` 刷新,读者困惑在遵循哪版协议。

## 目标

RUNBOOK 头部自标 `runbook-version: 3.0`(引用块内),但 runbook 由 4.x CLI 分发;`update` 刷新副本内容却不刷该字符串。修正当前值并**加一道机械守卫**,使 runbook 的 major 版本永远与 CLI(package.json)major 一致,以后不再漂。

## 行为需求

1. **修正当前值**:RUNBOOK.md 与 RUNBOOK_cn.md 头部 `runbook-version: 3.0` → `runbook-version: 4.0`(引用块与反引号格式保持;两版同步)。
2. **机械守卫 CK-11**(`apriori check --self`):断言打包源 RUNBOOK.md 的 `runbook-version: <major>.<minor>` 之 major 等于 package.json `version` 之 major;不一致 → check 失败,消息点名两个值与修复方向(改 RUNBOOK 头部)。CN 版存在时同样纳入(取二者 major 一致即可,或分别校验——由 STEP0 定,以两版 major 同为 4 的最简实现为准)。
3. **不改 update 逻辑**:`update` 已整体拷贝 RUNBOOK.md → `apriori/runbook.md`,源正确则副本正确;无需 update 特殊处理(消费者项目 `update` 后即得 4.0 串)。
4. **回归钉子**:CK-11 在当前(修正后 4.0 vs pkg 4.0.3)PASS;人为把 RUNBOOK 头部改回 3.0 → CK-11 FAIL 点名。

## 非目标

- runbook-version 的 minor 语义化/自动生成(只守 major 一致)。
- update 命令行为变更。
- 其它文档版本串(README 徽章等)。

## 约束

- 零依赖;既有 check/CK 场景不回归;CK-11 只在 `--self` 模式(消费者项目不被此自检牵连)。

## 开放问题

- 无。
