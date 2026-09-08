# tasks — id-pattern-and-delta-notes

STEP5 按本表顺序执行；每完成一项立刻打 `[x]`。测试先行：先写失败测试并给出失败运行，再实现。

## M — 基线与影响面清点（先做）

- [x] M-1 **既有 living scenario 的连带修订**（SPEC-1）：本 change 的 delta 已经把
      `SR-08` / `SR-13` / `SR-50` / `SR-53` / `CK-13` / `CF-12` 六处改掉了——
      实现时必须把它们**对应的既有测试**一并改到与新 spec 一致，且不得靠放宽实现来让旧测试过：
      · `SR-13`：`XX-01b` 现在绑定为**完整** `XX-01b`（不再 unidentified），而 `XX-01b2` / `XX-01_x` 仍 unidentified
      · `SR-50` / `CK-13`：config 行改用**比新默认式更窄**的 `[A-Z]+-\d+`，用「加了行反而更严」来证明优先级
      · `SR-53`：只断言 resolution/channel 不变，**不再**断言行为逐字节不变

- [x] M0 跑一次全量测试并记录**全绿基线**
- [x] M1 逐条核出会因默认式放宽而变色的既有测试——**实测结果：恰 6 条**，全部按已改的 spec 更新（`config.test.js` 的 CF-12、`id-pattern.test.js` 的 SR-50 / CK-13 / DR-16 / CF-12、`spec-runner.test.js` 的 SR-13）。SR-50 与 CK-13 改用**比默认式更窄**的行来证明优先级；DR-16 的 bare 项目由 finding 变 ok；SR-13 断言 `XX-01b` 现在绑定为完整 ID
- [x] M2 确认 `apriori/changes/archive/**` 的 delta 语料里非-Requirement h3 与非法定 h2 仍各为 **0** 处

## T — 测试先行

### 默认 pattern
- [x] T1 AC-IP-01 `AC-BIS-01` / `LIFE-DWS-01` / `AC-30f` 在**未配置** id-pattern 的项目里被识别
- [x] T2 AC-IP-02 兼容性 oracle **在 `leadId` 层比**（SPEC-2 更正——裸 `.match()` 层是**假的**：`AC-30f` 旧式返回 `AC-30`、新式返回 `AC-30f`；`AC-BIS-01` 旧式能从 index 3 匹到 `BIS-01`）：对每个**旧 `leadId` 返回非 null** 的标题，新 `leadId` 返回**逐字节相同**的 ID。三条路径各测一遍：默认内联 matcher、config 来源子进程、CK-04 的默认参数
- [x] T3 AC-IP-03 本仓 store：新旧两式的 identified / unidentified / duplicates 与 **ID 集合**全部相同
- [x] T4 AC-IP-04 无前导 ID 的场景仍 unidentified
- [x] T5 AC-IP-05 配置了 `id-pattern` 行时配置仍优先（`resolveIdPattern` 优先级不变）
- [x] T6 AC-IP-06 `AC-30` 与 `AC-30f` 是两个不同 ID，不构成重复
- [x] T7 AC-IP-07 放宽后新出现的重复 ID 照常报 duplicate
- [x] T8 AC-IP-08 四个消费者（check CK-04 / doctor D6 / verify / gate C1）经**同一个** `DEFAULT_ID`，无第二处硬编码

### D5 解耦
- [x] T9 AC-IP-09 / DR-19 构造 `ok 1 - AC-30f pending # SKIP flaky` 的 TAP，断言 D5 结论在默认式放宽**前后一致**
- [x] T10 DR-19 静态断言：`lib/doctor.js` 的 D5 分类路径不出现 `DEFAULT_ID`（它有自己的冻结常量且**不导出**）
- [x] T11 D5 的其余分类分支（spawn error / signal / bail-out / 空输出 / 非 TAP / 未解释非零退出 / `1..0`）**一字不变**

### D6 分流
- [x] T12 AC-IP-10 / DR-20 ID 形状但不匹配 → fix 指向 `process-config.md` 的 `id-pattern` 行；detail 含 bounded source 与 origin
- [x] T13 AC-IP-11 无前导 ID → fix 文案与本 change 前**一字相同**
- [x] T14 AC-IP-12 两类同时存在 → **恰两条** finding，各自只点名自己的场景
- [x] T15 分类谓词逐例：`AC-BIS-01` / `ac-01` / `AC_01` / `AC-30f` / `AC-01:` 判 ID 形状；`123` / `AC-` / 空标题判 missing-ID
- [x] T16 样例上限：≤3 个、按库内顺序、各截 40 字符（SPEC-3：该契约现已写进 doctor delta 的正文与 DR-20，不再只活在 design/tasks 里）
- [x] T17 AC-IP-13 D6 的重复 ID / 空库 / 缺目录 / 坏 pattern 配置四条**一字不变**

### `## Notes`
- [x] T18 AC-IP-14 其余合法且至少一个操作的 delta 含 `## Notes` → 正常通过，段内不参与合并
- [x] T19 AC-IP-14b **Notes-only** delta → 仍按零操作拒绝（既有文案不变）
- [x] T20 AC-IP-14c 三个位置（首段前 / 段间 / 文件末）× 出现两次 → 都正常
- [x] T21 AC-IP-14d 合法戳在 `## Notes` **之前** → 生效
- [x] T22 AC-IP-14d2 戳形状的行在 `## Notes` **段内** → **忽略**（不采纳、不报 problem）；若别处无戳且有 mutation → 走既有 CAS 默认拒绝
- [x] T23 AC-IP-14e / AC-IP-14g Notes 结束于围栏外的下一个 h2：**四种**法定操作段（含 `RENAMED`）都恢复解析；其它 h2 照旧报 problem
- [x] T24 AC-IP-14f Notes 段内**未闭合**围栏 → 其后保持不透明到文件末
- [x] T25 AC-IP-15 段内的 `### Requirement:` / `#### Scenario:` 不产生任何合并操作
- [x] T26 AC-IP-16 其它未识别 h2 仍是带行号的 problem，文案不变

### 非-Requirement h3
- [x] T27 AC-IP-17 `IN_REQUIREMENT` 内的非-Requirement h3 → 带行号的 problem，delta 被拒
- [x] T28 AC-IP-17b 其后还有正文再跟合法 `### Requirement:` → **恰一条** problem；作废块不进 buckets；其后正常开新块
- [x] T29 AC-IP-17c `FILE_PREAMBLE` / `IN_SECTION` 段首自由文本处的同类 h3 → **一字不变**
- [x] T30 AC-IP-17d `#####` 及更深 → 一字不变
- [x] T31 AC-IP-17e RENAMED 段内非法 Requirement 触发既有作废块后，再出现非-Requirement h3 → **不产出第二条 problem**（P1）
- [x] T32 AC-IP-17f `SKIP_UNRECOGNIZED` 内的 h3 → 静默跳过，不新增 problem
- [x] T33 AC-IP-17g `## Notes` 出现在 `SKIP_UNRECOGNIZED` → 终止跳过态并进 `IN_NOTES`
- [x] T34 AC-IP-17h **作废块内的戳形状行**（新 h3 作废 / RENAMED 作废两种来源各一）→ 仍按状态 A 的戳处理走，**不被当正文吸收**
- [x] T35 AC-IP-19 归档 delta 语料仍逐个零 problem（既有语料测试保持绿）
- [x] T36 AC-IP-20 围栏内的 `###` / `##` 仍不透明

### 模板与端到端
- [x] T36b CF-18 / AC-IP-21b/21c 的 living scenario 已进 config delta——测试须覆盖 fresh-init 后 `origin:'config'`、config 子进程在**标题与 TAP description 两侧**都认得三种 ID、四消费者结论一致
- [x] T37 AC-IP-21 `templates/process-config.md` 的 **Value 列 + Default 列 + 表下注释**三处都是新式（可 grep 断言旧式 `[A-Z]+-\d+` 在该文件中**零命中**）
- [x] T38 AC-IP-21b fresh `apriori init` 后不手改 config → `resolveIdPattern` 返回新 source、`origin: 'config'`；config 子进程对三种 ID 形状在**场景标题与 TAP description 两侧**都返回完整 ID
- [x] T39 AC-IP-21c 同一新项目上 check / doctor D6 / verify / gate C1 结论一致
- [x] T40 跑全量测试，记录失败清单（应大面积红）

## I — 实现

- [x] I1 `lib/config.js:16`：`DEFAULT_ID` 换新式
- [x] I2 `lib/doctor.js`：新增**不导出**的 `D5_TAP_ID = '[A-Z]+-\d+'`，`:33` 改用它；`:45` 的算式一字不动
- [x] I3 `lib/doctor.js`：D6 按 `isIdShaped(firstToken(title))` 分两组，各产一条 finding
- [x] I4 `lib/archive-merge.js`：`NOTES_LINE_RE` 与 `IN_NOTES` —— 判定插在 `SECTION_LINE_RE` 与 `H2_LINE_RE` **之间**；吞噬 `if (state==='IN_NOTES') continue;` 插在 `:133` 之后、**戳处理之前**
- [x] I5 `lib/archive-merge.js`：非-Requirement h3 判定插在**戳处理之后、`:166` body 分支之前**，条件含 `!blockDiscard`
- [x] I6 `templates/process-config.md` 三处旧值
- [x] I7 全量测试到绿；`check --self` PASS；`verify --change id-pattern-and-delta-notes` GREEN

## D — 文档与 KB

- [x] D1 `RUNBOOK.md` + `RUNBOOK_cn.md`：delta 相关段落加 `## Notes` 的用法与示例（AC-IP-22）
- [x] D2 `docs/cli.md` + `docs/cli_cn.md`：提及默认 id-pattern 的位置改为新式（AC-IP-23）
- [x] D3 `CHANGELOG.md`：**默认值变更**（可能新出现 duplicate）+ **delta 语法两处变更**（`## Notes` 新增、h3 收紧）+ 迁移建议（AC-IP-24）
- [x] D4 逐条核对 AC-IP-01..24（含 14b..14g / 17b..17h / 21b..21c）全部有证据，对照表进 flow-state

## S — STEP5 出口

- [x] S1 `apriori verify --change id-pattern-and-delta-notes` GREEN
- [x] S2 P8 异构一致性评审（R2，codex）——r1..r5 共五轮，verdict 序列 6→2→1→1→0；五份 review 文档 + 五份 raw 全部落盘
- [x] S3 ledger 全行进入可归档终态

（STEP6 的 KB 写回在 P9 阶段做——**含改正 `truth/doctor.md` 里那句「D5 的计数分类 pattern-insensitive」**，
它已被 req-final §1.5 的反例推翻，与 change 1 修 "seven checks" 同类。）
