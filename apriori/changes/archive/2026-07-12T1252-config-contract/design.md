# Design — config-contract(事实对齐)

## 现状事实
- `configCas`(lib/resolve.js)与 `configTestCmd`(lib/spec-runner.js)各自对全文跑 `/^\|\s*key\s*\|…/m` 首匹配;`language` 消费在 init/new 文案层(grep 确认后枚举)。
- 模板行多列(`| key | value | 注释 |`);gate C7/archive 的豁免消费点已在 4.0.1 建立。

## 方案
- **新模块 `lib/config.js`**:`readConfig(cwd)` → `{values: Map, problems: string[]}`;行扫描状态机:fence(``` 开闭;未闭合→其后全惰性)、HTML 注释(`<!--`…`-->`,未闭合同理,先开先占不嵌套);有效行 = `|` 开头表行,cell 切分后 [0]=key/[1]=value,多余列忽略,表头(`key` 字面)与分隔行(`---`)忽略;同 key 同值重复容忍,异值 push conflict problem。
- `getConfig(cwd, key)` 便捷:`{value|null, problem|null}`(problem = 该 key 冲突或(消费方声明的)非法值)。
- **消费方**:`configCas` → config.getConfig('cas'):conflict/非法值 → 返回 {error} —— archive 消费点 exit 1 不写(与 casDenials 同集合报告);gate C7 blocked 点名;stamped/ADDED-only 不咨询(现有结构天然如此,加测试钉住)。`configTestCmd` → conflict 时 verify infra ERROR;缺失照旧。`language` 等:STEP5 全库 grep 后统一切,坏值按各面现状降级。
- **可发现性**:archive/gate USAGE 字符串加 `--no-cas`;templates/process-config.md 加 `| cas | required | 归档对无 stamp 变更类增量的强制;optional = 仅警告 |` 示例行。
- 兼容:旧单行合法配置解析结果不变(全部现有测试证明)。

## SPEC 触点
ADDED specs/config/spec.md(CF-01..07);MODIFIED archive-merge deny 需求(+AM-42 配置错误消费);spec-runner ADDED 小需求(SR-49 test-cmd 冲突 ERROR);gate MODIFIED C7 需求(+GT-17);doctor ADDED DR-15。
