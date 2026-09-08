# gap-report — gate-id-pattern

依据：req-final；lib/{config,spec-runner,gate,check,doctor}.js 实读；真实样本实测（identity 见 review/ 证据）。

## 现状 A（代码事实）

1. **id-pattern 的四个消费点，四种现状**：
   - `lib/spec-runner.js`：`DEFAULT_ID = '[A-Z]+-\\d+'`；`verify` cli 有 `--id-pattern` flag（`f['--id-pattern'] || DEFAULT_ID`），`verify()` 内 `new RegExp(opts.idPattern || DEFAULT_ID)`——非法 flag 会**抛异常逃逸**（未捕获，CLI 崩溃带栈）。
   - `lib/gate.js` `checkBinding()`：调 `verify({change,...})`/`verify({specs,...})` **不传 idPattern**；cli flags 无 `--id-pattern`。
   - `lib/check.js` `checkScenarioIds(specText, name, idPattern = '[A-Z]+-\\d+')`：默认参数写死；边界用 `'^('+p+')\\b'`——与 leadId 语义不同（REQ-4 已定：改为复用 leadId）。调用点 cli 内一处（CK-04）。
   - `lib/doctor.js`：`classifyProbe` 内 `new RegExp(DEFAULT_ID)`（对结果不敏感，保持现状）；D6 处 `collectScenarios([specsDir], new RegExp(DEFAULT_ID))` + finding 文本内嵌 `${DEFAULT_ID}`。
2. **config 读取通道已成熟**：`lib/config.js` `parseConfig/readConfig/getConfig`——行级扫描、fence/comment 不生效、同值容忍/异值 CONFLICT、问题仅消费时上浮。先例消费者：`configTestCmd`（spec-runner）、`configCas`（resolve）。**缺口**：`readConfig` 的 `fs.readFileSync` 无 try/catch——process-config 为目录/不可读时抛异常（现状对 test-cmd 等键同样存在，本 change 按 req B3 兜底为 problem）。
3. **单元格切分**：`parseConfig` 用 `t.split('|')` 朴素切分——`\|` 会被切开，无转义语义（req B5 的奇偶算法即针对此处）。
4. **样本实测**（复现记录 identity.txt）：默认 pattern 下 store 71 identified/36 UNIDENTIFIED；gate C1 恒 BLOCKED；check CK-04 36 条误报 FAIL；项目 pattern 下 107/0。
5. **测试现状**：254 个测试全绿；test/ 下按模块分文件（spec-runner/gate/check/doctor/config 各有）；config 相关场景 CF-01..07 已入 store spec。

## 目标 B（req-final B1–B6）

一处配置（process-config `id-pattern` 行，继承 config-contract 全边界 + `\|` 奇偶转义），四处统一消费（flag > config > DEFAULT_ID；统一 leadId 识别契约；B3 错误矩阵；输出继承既有契约）；模板与 docs/cli 双语同步。

## 缺口清单（A→B 的改动面）

| # | 位置 | 改动 |
|---|---|---|
| G1 | lib/config.js | parseConfig 单元格奇偶 `\|` 切分算法；readConfig 读取失败→problem（getConfig 通道上浮） |
| G2 | lib/spec-runner.js | 新共享解析器 `resolveIdPattern(cwd, flagValue)` → {source, origin:'flag'/'config'/'default'} 或 {error}；verify cli/verify() 接入；非法→infra ERROR exit 2（进 run.errors，先于读 spec/跑测试） |
| G3 | lib/gate.js | cli 加 `--id-pattern`；runGate 解析后传入两处 verify 调用；非法→err() 结构化 exit 2 |
| G4 | lib/check.js | checkScenarioIds 复用 leadId；CK-04 处消费 config（无 flag）；非法→RESULT: ERROR exit 2 |
| G5 | lib/doctor.js | D6 消费 config，detail 带来源（config/default）；非法配置→D6 finding（点名 process-config）不扫场景；D5 探针保持 DEFAULT_ID |
| G6 | templates/process-config.md | 预置 id-pattern 行 + 两层语义文案（B6 措辞标准） |
| G7 | docs/cli.md + docs/cli_cn.md | verify/gate/check/doctor 四节 + 配置键说明（裸源串、`\|`/`[|]`、优先级、错误矩阵） |
| G8 | CHANGELOG.md | 条目（含 `\|` 全键语义变化声明） |
| G9 | apriori/specs（经本 change delta） | config 模块新 CF 场景（`\|` 奇偶、读取失败）；spec-runner 新 SR 场景（config 回退、非法 pattern、统一识别契约）；gate 新 GT 场景（flag/config/错误）；check 新 CK 场景（CK-04 复用 leadId+config）；doctor 新 DR 场景（D6 来源与非法配置 finding） |
| G10 | test/ | 每个新场景一个带 ID 的失败先行测试 + AC5 真值表/回归样本 + AC1 fixture |

## 风险

- R1（高）：parseConfig 切分算法改动波及**所有键**——回归面最大；AC5 的非转义回归样本是防线；实现顺序上 G1 先行并全量跑 254。
- R2（中）：check 的 CK-04 边界从 `\b` 改 leadId——对默认 pattern 语义几乎等价，但存量项目若有依赖 `\b` 差异的极端场景会变判定；一致性测试清单（B4）覆盖。
- R3（中）：doctor D6 finding 文本变化（含来源）——doctor 测试可能断言旧文本，需同步。
- R4（低）：gate 新 flag 需过 args 严格解析器（withStrict flags 表），漏加即 unknown-flag exit 2；有既有模式可循。
- R5（低）：样本只读纪律——AC6 flag 路径原地跑（零写入），配置路径只在 ~/tmp 副本。

## 结论

改动面清晰、全部机械可测；无需 spike。进入 STEP2（P4：proposal/specs/design/tasks）。
