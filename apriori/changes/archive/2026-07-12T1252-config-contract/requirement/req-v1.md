# 需求:config-contract —— process-config 是配置,不是全文 regex (v1)

> change: `config-contract` · tier: medium · track: harden
> lineage: v4;不合并 main/v1/v3
> 来源:GPT-5.6 四审 P0-2 + P2-4,豁免绕过已本机复现(fenced 块内的 `| cas | optional |` 授予豁免,围栏外真正的 `| cas | required |` 反被忽略)。

## 目标

`process-config.md` 的读取目前是对整份 Markdown 做首匹配 regex(`configCas`、`configTestCmd` 同病)。fenced 代码块、HTML 注释里的示例行会被当成生效配置;重复/冲突行"第一行获胜"且无声。本变更引入**一个共享的结构化配置读取器**,所有配置消费方走同一入口。

## 行为需求

1. **共享解析器 `readConfig(cwd)`**(建议落在 lib/resolve.js 或独立小模块):
   - 逐行扫描,**跳过 fenced 代码块**(``` 开闭,与 spec-runner 的 fence 语义一致)与 **HTML 注释**(`<!-- … -->`,含多行);
   - 只识别**有效配置行**:`| key | value |` 形状的表行(表头/分隔行按现状忽略);
   - 产出 `{values: Map<key,value>, problems: string[]}`:**同 key 重复且值不同 → problem(冲突)**;重复同值 → 取一并记 note 级 problem?(决策:同值重复容忍,异值冲突 fail-closed);
   - 解析器纯函数、可单测。
2. **消费方切换 + fail-closed 语义**:
   - `configCas`:走 readConfig;`cas` 键值非 `optional`/`required` → 配置错误;**存在冲突或非法值时,一切豁免judgment fail-closed 为"无豁免"且消费面(archive/gate)报配置错误**——坏配置绝不放行写入;
   - `configTestCmd`:同解析器(fence 内的 test-cmd 示例不再生效);
   - `language` 等其他消费方(以实测为准全库 grep)统一切换。
   - `--no-cas` flag 保持显式最高优先级(flag 在,配置坏也可明确豁免——flag 本身就是人的显式意志)。
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
