# req-v3 — modified-block-integrity：MODIFIED 整块替换的保真性成为机械报告

target lineage: main（v4 产品线；不合并 v1/v3）。**state A 声明（REQ-8）**：本 change 构建在工作区中两个未归档先行 change（gate-id-pattern：id-pattern 解析与可终止 matcher；verify-change-scope：change-scoped verdict、单标题批、deltaOps、storeReport）之上；三者按序归档，spec/design 以工作区代码为 state A。

## 背景（现状 A）

同 req-v1（复盘 P0-3 唯一 ⚠ 防线项；活教材 = verify-change-scope delta 的 9 场景块重述；merge() 整块替换零对比；对比原料在 buildProjection 处零成本在手）。

## 目标（目标态 B）

### B1. 保真报告的判定算法（REQ-1/REQ-2 收口）

**规范化**：行统一 CRLF/CR→LF；比较前每行去行尾空白、行首空白（含 tab）整体剥离；空行不参与比较。

**occurrence 级场景配对（唯一基数真值表，REQ-2 r2 收口）**：配对键 = 场景 ID（有 ID 时）或规范化全标题（无 ID 时），同一张表对两类键统一适用。对每个键统计旧块出现数 o、新块出现数 n：

| o | n | 分类 |
|---:|---:|---|
| 0 | 1 | added |
| 1 | 0 | dropped |
| 1 | 1 | 正常配对（有 ID 键：同规范化标题→retained，异→titleChanged，两类互斥且都做体行比较；标题键：即 retained） |
| 0 | >1 | ambiguous(side=new) |
| >1 | 0 | ambiguous(side=old) |
| >1 | 1 | ambiguous(side=old) |
| 1 | >1 | ambiguous(side=new) |
| >1 | >1 | ambiguous(side=both) |

ambiguous 的键**完全跳过** retained/titleChanged/dropped/added 与体行比较；每键一条 entry，携带 side 与两侧计数。

**行级比较（顺序保持子序列，唯一算法）**：对每个 retained/titleChanged 场景，取旧场景体的规范化非空行序列 O 与新体序列 N，做**保序贪心子序列匹配**（O 的每行按序在 N 中找首个未被消费的相等行；重复行按出现次数逐一消费）——未匹配的旧行即 `missingLines`（重排导致的失配如实报告；子序列不要求连续）。

**结构扫描规则（REQ-10 收口）**：① Requirement 标题行（`### Requirement: …`）**永不**参与比较（rename-then-modify 不得因标题差异假报缺失）；② requirement 散文 = 标题行之后第一行起、至第一个**有效**场景标题前，同规则比较，缺行记 `missingLines`（scenario=null，仅报旧内容缺失）；③ 场景体 = 有效场景标题之后至下一个有效场景标题或块尾；④ 有效场景标题沿用 state A 精确语法（`#### Scenario: `），且**fence 感知**——三反引号围栏内形如场景标题的行不是分隔符（与 verify 的场景采集一致）；⑤ fence 定界行与围栏内非空行都作为当前散文/场景体的比较行（被整块替换威胁的内容）；⑥ 未闭合 fence 沿用 state A 语义：其后内容全部归入当前围栏（即并入当前散文/体的比较行序列，不再切分场景）。

### B2. 消费面与执行纪律（REQ-4/REQ-5 收口）

- **`verify --change`**：旧块标题作为第 4 类 tag 并入**既有的单一标题批**（不新增 matcher 调用——SR-63 的两批契约保持；这些 pairs 不进入绑定 acc，仅供 integrity 配对）；invalid pattern / matcher failure / projection failure 走既有 ERROR 路径，此时**无** integrity 报告。id-pattern 解析与 state A 完全一致（flag > config > default）。
- **`archive --change`（high-level form 专属；single-file form 明确 out of scope——一模块手术是专家手动路径）**：dry-run 与 `--write` preflight 输出同一数据语义的 human 段（**不新增 --json**，REQ-3 附带裁定）。id 提取沿用统一解析（config > default，archive 无 flag）与可终止通道——经 **bin 层依赖注入**（bin/apriori.js 同时持有两模块，把 spec-runner 的 matcher 工厂注入 archive cli 的可选参数；archive-merge 模块自身仍零依赖 spec-runner，方向不破）。invalid config pattern 或 matcher failure → 打印一条 bounded warning、**跳过 integrity 报告**，archive 的一切既有语义（exit/写入/输出其余部分）不变。
- **`gate`**：不消费。

### B3. 报告存在性矩阵（REQ-6 收口）

| 情形 | 报告 |
|---|---|
| verify --change GREEN/GAPS，delta 含 MODIFIED（或 rename-then-modify） | JSON `modifiedIntegrity` **恒存在**（无差异条目也出现，见 B4）；human 段按 B4 显著性规则 |
| verify --change 任一 ERROR 类 | 字段与段落一律缺省 |
| verify --specs | 永不出现（byte golden continues） |
| archive dry-run / --write preflight 全部通过 | human 段输出 |
| archive 任一 preflight/合并失败（malformed、missing target、CAS、denial、conflict、hygiene） | 无报告段（失败信息照旧）；部分模块失败时成功模块也不输出（fail 即整体拒绝——archive 现有原子语义） |
| idempotent rerun（unchanged 路径） | 该 MODIFIED 无差异——JSON 条目 diff 全空，human 静默 |

### B4. 输出契约（REQ-3 收口）

- **JSON（verify --change，GREEN/GAPS 恒在）**：`modifiedIntegrity: [ { file, name, retained: [{id, title}], titleChanged: [{id, oldTitle, newTitle}], dropped: [{id, title}], added: [{id, title}], ambiguous: [{key, side: 'old'|'new'|'both', oldCount, newCount}], missingLines: [{scenario: <id|title|null>, line: <完整原文，不截断> }] } ]`。取值裁定（REQ-3 r2）：`file` = store 相对 suffix（与 projection.modules 同制）；`retained.title` 取**新块**原始标题（规范化仅用于配对判定）；`ambiguous.key` = ID 键取 ID，标题键取规范化标题；每个 MODIFIED 操作恒一条（含全空 diff 条目）；排序：条目按 (file,name)，场景类按旧块出现序（added 按新块出现序），missingLines 按旧块行序。无 ID 场景 id=null 以 title 表达。
- **human（verify 与 archive 同一段式）**：段标题 `— MODIFIED INTEGRITY —`；**显著性规则（Q1/REQ-3 r2 终裁）**：某 MODIFIED 条目存在 dropped/missingLines/ambiguous/titleChanged 任一非空即打印该条目——dropped/missingLines/ambiguous 行冠 `!` 前缀，titleChanged 一行提示（无 `!`），retained/added 只出计数；**全部条目四类皆空时整段静默**。行截断沿用 state A 惯例：超过 120 时 `slice(0,119)+'…'`（总长恒 ≤120，JS UTF-16 code unit 计）；JSON 保留全文。archive 的 warning（B2 降级路径）：stderr、固定前缀 `warning: modified-integrity `、经 sanitizeMsg 有界（≤200 含省略号，控制字符剥离）。
- **确认机制（REQ-9 收口）**：**不新增**任何确认/override flag——含 dropped 的 `--write` 与既有流程完全相同；Q2 删除。

## 范围外（won't do）

req-v1 各项保持；另明确：single-file archive form；`--json` for archive；跨块移动检测（dropped+added 如实）；requirement 块的新旧散文"新增行"不报（只报旧内容缺失——保真检查的方向性）。

## 验收标准（确定 oracle）

- AC1（场景级互斥分类）：旧块 KV-01/KV-02/KV-03，新块 KV-01(同)/KV-03(标题变)/KV-04 → retained=[KV-01]、titleChanged=[KV-03(old/new 标题)]、dropped=[KV-02]、added=[KV-04]。
- AC2（行级）：KV-01 旧体 4 行、新体缺一条 AND → missingLines 含该行全文；行尾空白/行首缩进/tab 差异不报；重排的行如实报缺；重复行次数不足按次报缺；fence 内行参与比较；requirement 散文缺行报 scenario:null。
- AC3（ambiguous）：旧块内 KV-05 出现两次 → ambiguous 含 KV-05，且不进其他四类。
- AC4（verdict/exit 确定 oracle，REQ-11 收口）：AC1 fixture 配 TAP（覆盖新块全部场景且全绿、无孤儿）→ verify --change **恰为 GREEN exit 0**（报告在场不改判）；同 fixture 去掉一条测试 → **GAPS exit 1**；archive dry-run **exit 0** 且 RESULT 行与现版本逐字一致、--write 写入字节与现版本一致；gate --change 输出与现版本一致（不消费报告）。
- AC5（json schema）：AC1 fixture 的 modifiedIntegrity 整条 deepStrictEqual（含排序）；无差异 MODIFIED 条目 diff 全空但存在；一切 verify ERROR 类字段缺省；--specs 永不出现（golden 复核）。
- AC6（执行纪律与 archive id-pattern 全路径，REQ-4 r2 收口）：verify config-origin 下 matcher batch 计数仍恰好 2（旧块标题在第一批 payload 断言）；invalid pattern 0 投影 0 spawn 无报告。archive 面五路径：①自定义 config pattern 正向——报告正确识别 default 认不出的 ID（如 AC-08a）；②无 config 时 default 正向；③invalid config row（matcher 构造前失败）→ warning+无报告段+archive 结果照旧；④matcher timeout/failure 类（注入）→ 同 ③；⑤warning 断言：stderr、`warning: modified-integrity ` 前缀、有界无控制字符。
- AC7（活教材，冻结 fixture）：verify-change-scope 的 delta MODIFIED 块与其 store 原块**复制为测试 fixture**（内容冻结）→ 报告 deepStrictEqual 于**人工独立推导**的期望值（先读 fixture 手工列出 retained 7/titleChanged 2（SR-16、SR-18 含 old/new 标题）/dropped 0/added 0/ambiguous 0/missingLines 逐行清单，写死于测试——绝不以实现输出回填）。
- AC8（rename-then-modify 与结构边界）：RENAMED A->G + MODIFIED G（散文与场景逐字保留）→ 条目 name=G 且 **missingLines 为空**（标题行差异不报）；fence 内伪场景标题（```` ```\n#### Scenario: FAKE-01 x\n``` ````）不切分场景、其行参与体比较。
- AC9（archive 面）：同 AC1 fixture 走 archive dry-run → human 段与 verify 同数据；preflight 失败（CAS mismatch）→ 无报告段；--write 成功时报告在写入前打印。
- AC10（兼容与文档）：--specs byte golden 绿；存量测试（本轮基线 306）全绿；docs/cli 双语（verify/archive 节）+ RUNBOOK 双语 MODIFIED 警告句旁补一句机械报告 + CHANGELOG；check --self 绿。

## 需求裁定记录（对 r2 评审）

- REQ-2：基数真值表统一两类键；ambiguous 全跳过其他类与体比较；entry 带 side/oldCount/newCount。
- REQ-3：file=store suffix；retained.title=新块原标题；ambiguous.key 语义；titleChanged 也触发条目打印（终裁）；截断=state A 惯例 119+…；archive warning 通道/前缀/有界钉死。
- REQ-10：结构扫描六规则（标题行不比较、fence 感知有效标题、未闭合 fence 归当前体）；AC8 扩展两案例。
- REQ-4：AC6 扩为 archive 五路径（正向双例+invalid config+matcher 失败+warning 断言）。
- REQ-11：AC4 改确定 exit oracle（GREEN 0/GAPS 1/dry-run 0 逐字 RESULT/写入字节一致）。
- r2 advisories（4 条批处理）：测试数量作本轮基线不入 spec；AC7 期望值人工独立推导（已入 AC7）；RUNBOOK 双语在 MODIFIED 警告句旁加一句机械报告存在（纳入 AC10 文档清单）；analyzer 设计为纯共享 helper（设计约束记入 design）。

## 需求裁定记录（对 r1 评审）

- REQ-1：唯一算法=保序贪心子序列（重复行计次消费）；比较范围=场景体全部非空行含 fence 内容与 requirement 散文；规范化规则明列；Q3 删除。
- REQ-2：occurrence 级互斥分类 + ambiguous 类；无 ID 场景标题多重集配对；titleChanged 继续体比较；元素结构带 old/new 标题。
- REQ-3：B4 完整 schema + 存在性 + 排序 + 截断（JSON 全文/human 120）+ archive 无 --json + Q1 显著性裁定 + 空 diff 条目语义。
- REQ-4：旧块标题并入既有单一标题批（零新增 matcher 调用）；ERROR 无报告；archive 经 bin 层注入 matcher，失败降级 warning+skip。
- REQ-5：high-level form 专属，single-file 明确 out of scope。
- REQ-6：B3 存在性矩阵全表。
- REQ-7：AC7 改冻结 fixture + deepStrictEqual 钉死。
- REQ-8：state A 声明入 lineage 段。
- REQ-9：不新增确认 flag，Q2 删除。
