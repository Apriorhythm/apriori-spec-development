# req-v1 — gate-id-pattern：id-pattern 成为项目级配置，gate 获得收窄通道

target lineage: main（v4 产品线；不合并 v1/v3）

## 背景（现状 A，实测证据）

真实棕地样本（/mnt/d/agent-base/t_just-projects，规格库仓，83+ 活跃场景）实测（2026-08-13）：

- store 中存在两类默认 pattern `[A-Z]+-\d+` 不认的合法 ID：字母后缀（`AC-08a`）与多段式（`AC-BIS-01`）。项目自用 pattern 为 `[A-Z]+(-[A-Z]+)*-\d+[a-z]*` 一族（tools/ 桥接脚本注释）。
- `apriori verify --specs` 默认 pattern：36 个 UNIDENTIFIED；加 `--id-pattern` 后 0 个（107 个场景全部识别）。verify 已有 `--id-pattern` flag，可用但每次手输必忘，忘了静默不匹配。
- `apriori gate --change <archived>`：C1 恒 BLOCKED（`verify GAPS: 71 unbound, 36 unidentified`），其余 C2–C7 全过。gate **没有任何 id-pattern 通道**（无 flag、不读配置）——复盘定性："永远红的告警等于没有告警"，连带 C2~C7 信用透支。
- `apriori check`（CI 门）CK-04 用写死默认 pattern，样本上把全部字母后缀/多段式场景误报为 "scenario without a bindable ID"。
- `apriori doctor` D6 同样写死 DEFAULT_ID。

机制层根因：id-pattern 是**项目恒量**（一个项目一个 ID 风格），但工具把它当成每次调用的参数，且四个消费点（verify/gate/check/doctor）中两个根本不可配、一个只可手输。

## 目标（目标态 B）

id-pattern 升级为项目级配置，一处声明、处处生效：

1. **新配置键** `id-pattern`：`apriori/process-config.md` 表中一行，值为 JS 正则源串（不带定界符）。人类持有（R3），agent 只读。
2. **统一解析优先级**（四个消费点一致）：CLI `--id-pattern` flag（有 flag 的命令）> process-config `id-pattern` 行 > 内置默认 `[A-Z]+-\d+`。
3. **消费点覆盖**：
   - `apriori verify`：无 flag 时回退到配置（现状：flag > 默认，配置缺位）。
   - `apriori gate`：新增 `--id-pattern` flag；无 flag 时读配置——C1 两种 stage（in-flight 的 `verify --change` 投影、archived 的全 store）都用解析后的 pattern。
   - `apriori check` CK-04：读配置（check 无此 flag，可不加——CI 场景本就该用项目恒量；是否加 flag 留设计裁量）。
   - `apriori doctor` D6：读配置；配置行本身非法时 doctor 应给出诊断而非崩溃。
4. **fail-closed 错误处理**：非法正则（flag 或配置行）→ 消费时报错并 exit 2，消息指明来源（flag 还是 process-config 行）；**绝不静默回退默认**（静默回退＝换一种方式静默不匹配）。配置问题仅在消费时上浮（沿用 config-contract 惯例）。
5. **表格单元格中的 `|`**：正则常含 alternation（如 `(AC|BR)-\d+`）。process-config 是 markdown 表，`|` 是单元格分隔符。标准 markdown 语义 `\|` 表示字面 pipe——本 change 需让配置解析对该键可表达含 `|` 的正则（具体机制——parseConfig 尊重 `\|` 转义或其他——留设计决策），并把约束写进文档与模板。

## 范围外（won't do）

- verify `--change` 的语义收窄（"本 change 达标"视角）——独立 change `verify-change-scope`。
- MODIFIED 整块完整性检查——独立 change `modified-block-integrity`。
- hotfix 最小回写单元——本轮不做。
- 场景 ID 书写规则本身（三态语义、leadId 词边界规则）不动——复盘§三"别改清单"。
- 非 JS 生态接入附录（roadmap P2-11）——不在本 change。
- process-config 其他键的解析行为变化：仅当"`\|` 转义"方案落在共享 parseConfig 上时允许对全部键统一生效，且需在 config-contract 相关 KB/spec 同步陈述；除此之外不动。

## 验收标准（可测试）

- AC1：`process-config.md` 含 `| id-pattern | <re> |` 行且无 flag 时，verify/gate/check/doctor 全部按 `<re>` 识别场景 ID（if 配置了合法行 then 四消费点零 UNIDENTIFIED/零 CK-04 误报，样本级）。
- AC2：`--id-pattern` flag 同时存在时覆盖配置行（verify、gate）。
- AC3：非法正则：flag 来源 → exit 2 + 消息含 "--id-pattern"；配置来源 → exit 2 + 消息含 "process-config"；两者均不静默用默认。
- AC4：无配置行、无 flag → 行为与现版本完全一致（254 存量测试全绿）。
- AC5：含 `\|` 转义的 id-pattern 配置行（如 `(AC\|BR)-\d+`）被正确解析为含 alternation 的正则。
- AC6：真实样本对比证据（存入本 change review/）：改前 `gate --change dashboard-launch-surface-slim` C1 BLOCKED（36 unidentified）；改后同命令 + `--id-pattern`（或配置行副本环境）→ unidentified=0，仅剩真实缺口（unbound——样本无可跑测试命令所致）。样本只读：flag 路径直接在样本上验证，配置行路径在样本副本上验证。
- AC7：EN/CN 文档同步（docs/cli*.md 的 gate/verify 用法、templates/process-config.md、README 若涉及），CHANGELOG 条目。

## 开放问题（评审请裁）

- Q1：check 是否也加 `--id-pattern` flag？（倾向不加：check 是 CI 门，恒量应来自配置；加 flag 反而制造"CI 里手输"的新遗忘面。）
- Q2：模板 `templates/process-config.md` 是否预置 id-pattern 行（值=默认）？（倾向预置：可发现性——test-cmd 无模板行导致其可发现性差的教训。）
- Q3：`\|` 转义落在共享 parseConfig（全键统一、符合 markdown 语义）还是仅 id-pattern 消费侧？（倾向前者，理由：单键特例会让两个键值语义不一致。）
