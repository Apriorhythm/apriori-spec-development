# 需求:config-contract —— process-config 是配置,不是全文 regex (v2)

> change: `config-contract` · tier: medium · track: harden
> lineage: v4;不合并 main/v1/v3
> 来源:GPT-5.6 四审 P0-2 + P2-4,豁免绕过已本机复现。
> v2 修订:CC-1..4(坏配置消费面矩阵、多列表行、fence/注释边界、消费时点)。

## 目标

`process-config.md` 的读取目前是对整份 Markdown 做首匹配 regex(`configCas`、`configTestCmd` 同病)。fenced 代码块、HTML 注释里的示例行会被当成生效配置;重复/冲突行"第一行获胜"且无声。本变更引入**一个共享的结构化配置读取器**,所有配置消费方走同一入口。

## 行为需求

1. **共享解析器 `readConfig(cwd)`**(建议落在 lib/resolve.js 或独立小模块):
   - 逐行扫描,**跳过 fenced 代码块**(``` 开闭,与 spec-runner 的 fence 语义一致)与 **HTML 注释**(`<!-- … -->`,含多行);
   - 只识别**有效配置行**:以 `|` 开头的表行,**第一格为 key、第二格为 value,多余列(注释列等)忽略**(CC-2,兼容现有模板);表头/分隔行按现状忽略;
   - 产出 `{values: Map<key,value>, problems: string[]}`:**同 key 异值 → problem(冲突)**;**同 key 同值重复 → 静默容忍**(CC-3 决策);
   - **边界语义(CC-3)**:未闭合 fence → 其后至 EOF 全部视为 fence 内(行不生效——对豁免类 key 天然 fail-closed);未闭合 HTML 注释同理;fence 与注释不嵌套解析(先到先占);
   - 解析器纯函数、可单测。
2. **消费方切换 + fail-closed 矩阵(CC-1/CC-4)**:
   - **配置错误只在"该 key 被实际消费"时生效**(CC-4):stamped/ADDED-only 的 archive 不咨询 `cas`,坏 `cas` 行不影响它;一旦消费——
   - `configCas`:`cas` 冲突或值非 `optional`/`required` → 消费面报配置错误:archive **exit 1、不写任何东西**;gate C7 **blocked** 点名配置错误——坏配置绝不等价于豁免;
   - `configTestCmd`:`test-cmd` 冲突 → verify **infra ERROR exit 2**(点名配置冲突,绝不静默选一行跑);缺失照旧走 usage 路径;gate 继承;doctor 的 D5 探针在同况下 **finding** 点名配置错误;
   - `language` 等其他消费方(全库 grep 为准)统一走 readConfig;它们的坏值按各自消费面现有降级语义(见 STEP2 枚举),但绝不读到 fence/注释内容;
   - `--no-cas` flag 保持显式最高优先级(flag 在,配置坏也可明确豁免——flag 是人的显式意志)。
3. **可发现性(P2-4)**:
   - `archive`/`gate` 的 usage 文本列出 `--no-cas`;
   - `templates/process-config.md` 增加带注释的 `cas` 行示例(默认 required 语义,注明 optional 的含义);
   - init 出的新项目因此天然可发现。
4. **回归钉子**:复现输入(fenced optional + 生效 required)必须:archive 拒绝、gate C7 拒绝;反向排列(fenced required + 生效 optional)必须豁免生效;HTML 注释内的行无效;异值重复 → 消费面配置错误。

## 非目标

- YAML/TOML 等新配置格式;process-config.md 的表格形状不变。
- 配置项白名单校验(未知 key 忽略如旧——只有已消费 key 的值域才校验)。

## 约束

- 零依赖;既有测试不回归;gate/archive/verify 的既有 C7/警告语义除"读取更准"外不变。

## 开放问题

- 无。
