# proposal — id-pattern-and-delta-notes

## WHY

三件事，都是「**默认值与语法把合法输入判成了缺陷**」。

1. **默认 id-pattern 认不出真实项目的 ID**。`[A-Z]+-\d+` 认不出 `AC-BIS-01`、`LIFE-DWS-01`、`AC-30f`。
   棕地样本实测：151 个场景里 **50 个**绑不上——而那些 ID 完全合法（唯一、稳定、可被测试名携带）。
   后果链：verify 报 GAPS → gate C1 BLOCKED → 每个 change 都要手写一段「这是结构局限不是缺陷」的免责说明。
   4.1.0 把 pattern 变成可配置了，**但默认值没动**，而配置行住在人类持有的 `process-config.md` 里——
   实测那个项目升到 4.1 后该文件仍是模板原样，**从没人加过那一行**。修复躺在二进制里，落地率 0。
2. **doctor D6 的修复提示指错对象**。它说 `add leading IDs`，会把人打发去改 50 个合法 ID，
   而正解是加一行 config（本 change 之后：什么都不用做）。
3. **delta 语法里没有说明性内容的位置**。作者写的小节标题被当成指令而阻断归档；
   更糟的是 **`### 非-Requirement 标题` 落在 requirement 块里会被静默并进 store**——
   MODIFIED 路径上 4.1.0 的完整性报告能照出来，**ADDED 路径上照不出来**。

## WHAT

1. 默认式放宽为 `[A-Z]+(?:-[A-Z]+)*-\d+[a-z]*`。正则语言上它是旧式的超集；
   **兼容性保证写在 `leadId` 层，不是裸正则层**（design §D1）——
   对每个**旧 `leadId` 返回非 null** 的标题，新 `leadId` 返回**逐字节相同**的 ID。
   （裸 `.match()` 层反例现成：`AC-30f` 旧式返回 `AC-30`、新式返回 `AC-30f`；`AC-BIS-01` 旧式能从 index 3 匹到 `BIS-01`——
   但两者从来都不是**绑定**，因为 `leadId` 要求 `m.index === 0` 且拒绝尾随 `[A-Za-z0-9_]`。）
   本仓 store 实测：新旧两式的 identified/unidentified/duplicates 与 ID 集合完全相同。
2. **doctor D5 与项目的场景 ID 词汇表解耦**：它判的是 TAP **管道**，不是身份，却借用了 `DEFAULT_ID`。
   不解耦的话，放宽默认式会让 `ok 1 - AC-30f x # SKIP` 这类行从 untagged 变成 tagged skip，
   使 `parsed` 归零，把健康的 TAP 打成 `truncated or malformed`。
3. **D6 按类分流**：首 token 含数字且含 `-`/`_` = ID 形状 → fix 指向 `id-pattern` 配置行；否则 → 维持原文案。
4. **delta 新增 `## Notes` 不透明段**，并把「requirement 块内的非-Requirement h3」从静默并入改成带行号的 problem。

## OUT OF SCOPE

| 不做 | 理由 |
|---|---|
| 改 `resolveIdPattern` 的优先级（flag > config > 默认） | `gate-id-pattern` 刚立的契约，本 change 只换兜底值 |
| 替用户往 `process-config.md` 写 `id-pattern` 行 | 违反 R3；而且本 change 的**要点**正是让大多数项目不需要那一行 |
| 改 `leadId` 的边界规则 | 与 pattern 宽窄正交，改它会动每一个消费者的绑定语义 |
| 让解析器「智能判断」哪些标题是说明 | 复盘明确列为过度方案。一个约定好的段名就够 |
| 修 D5 把 tagged SKIP/TODO 算成 0 这个**既有**怪癖 | 它今天就存在（旧 pattern 认得的 ID 一样中招），与本 change 无因果；修它要改 D5 的分类语义，有自己的验收面。本 change 用**解耦**保证不把它变严重 |
| 讨论模板该不该给 `id-pattern` 设 active Value | 独立的产品决定（要动 `init` 的模板哲学）；本 change 只保证两列 + 注释三处一致、不留旧值 |
| change 2（`archive-preflight`）的任何内容 | 已按 owner 裁定挂起；本 change 只碰 delta **解析器**，与它改的高层 archive 块不是同一个 Requirement |

## 必须让人类看见的三件事

1. **默认值变更是外部可见的行为变更**：既有项目里此前 unidentified 的场景会变成已识别；
   若其中两个恰好识别成同一 ID，会**新出现** duplicate 报错。这是期望行为——
   重复 ID 本来就是缺陷，只是此前被 unidentified 掩盖。
2. **`## Notes` 是新的语法面**，一旦发布就要长期兼容；段名与语义在本 change 里定死。
3. **非-Requirement h3 由「静默并入」变「拒绝」是收紧**。本仓语料实测 0 处受影响，
   但外部项目可能有——CHANGELOG 给出迁移建议（改成 `## Notes`，或降级为正文）。

## 触及范围

`lib/config.js`（一个常量）· `lib/doctor.js`（D5 分类 regex 解耦 + D6 fix 分流）·
`lib/archive-merge.js`（`IN_NOTES` 状态 + 一条 h3 判定）· `templates/process-config.md`（三处旧值）。
另：**5 份 living spec**（spec-runner ×2 块 / doctor / archive-merge / check / config——STEP2·r1 的 SPEC-1 指出
另有四条既有场景会因放宽而变假，delta 因此从 3 个模块扩到 5 个、6 个 MODIFIED 块）、3 份 truth、
RUNBOOK ×2、docs ×2、CHANGELOG。
