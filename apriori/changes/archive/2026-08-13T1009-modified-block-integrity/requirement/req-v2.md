# req-v2 — modified-block-integrity：MODIFIED 整块替换的保真性成为机械报告

target lineage: main（v4 产品线；不合并 v1/v3）。**state A 声明（REQ-8）**：本 change 构建在工作区中两个未归档先行 change（gate-id-pattern：id-pattern 解析与可终止 matcher；verify-change-scope：change-scoped verdict、单标题批、deltaOps、storeReport）之上；三者按序归档，spec/design 以工作区代码为 state A。

## 背景（现状 A）

同 req-v1（复盘 P0-3 唯一 ⚠ 防线项；活教材 = verify-change-scope delta 的 9 场景块重述；merge() 整块替换零对比；对比原料在 buildProjection 处零成本在手）。

## 目标（目标态 B）

### B1. 保真报告的判定算法（REQ-1/REQ-2 收口）

**规范化**：行统一 CRLF/CR→LF；比较前每行去行尾空白、行首空白（含 tab）整体剥离；空行不参与比较。

**occurrence 级场景配对（互斥分类）**：对旧块与新块各自的场景 occurrence 序列——
1. 双方各自内部：同一 ID 出现 >1 次（或无 ID 场景同规范化标题出现次数不一）→ 该 ID/标题记入 `ambiguous`（不可分析，单列；不进其他类）。
2. 有 ID 且双侧唯一：同 ID 同规范化标题 → `retained`；同 ID 异标题 → `titleChanged`（两类互斥；两类都继续做体行比较）。旧有新无 → `dropped`；新有旧无 → `added`。
3. 无 ID 场景：按规范化全标题多重集配对；配上的按标题变更不可检测（同标题即 retained）；未配上的分别 dropped/added。

**行级比较（顺序保持子序列，唯一算法）**：对每个 retained/titleChanged 场景，取旧场景体的规范化非空行序列 O 与新体序列 N，做**保序贪心子序列匹配**（O 的每行按序在 N 中找首个未被消费的相等行；重复行按出现次数逐一消费）——未匹配的旧行即 `missingLines`（重排导致的失配如实报告；子序列不要求连续）。比较范围 = 场景体**全部非空行**（含散文；场景标题行本身不在体内；code fence 围栏内的行**参与比较**——它们是被整块替换语义威胁的内容，Q3 裁定）。**Requirement 级散文**（块首至第一个场景标题之间）同规则比较，缺行记 `missingLines`（scenario 字段为 null）。

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

- **JSON（verify --change，GREEN/GAPS 恒在）**：`modifiedIntegrity: [ { file, name, retained: [{id, title}], titleChanged: [{id, oldTitle, newTitle}], dropped: [{id, title}], added: [{id, title}], ambiguous: [{idOrTitle, side}], missingLines: [{scenario: <id|title|null>, line: <完整原文，不截断> }] } ]`——每个 MODIFIED 操作恒一条（含全空 diff 的条目）；数组排序：条目按 (file, name)；场景类按旧块内出现序；missingLines 按旧块行序。无 ID 场景的 id 字段为 null、以 title 表达。
- **human（verify 与 archive 同一段式）**：段标题 `— MODIFIED INTEGRITY —`；**显著性规则（Q1 裁定）**：仅当存在 dropped / missingLines / ambiguous 时打印该 MODIFIED 的明细（行前缀 `!`），titleChanged 单行提示，retained/added 只出计数行；全部 MODIFIED 无上述三类时整段静默。行截断 120 字符 + `…`（仅 human；JSON 保留全文）。
- **确认机制（REQ-9 收口）**：**不新增**任何确认/override flag——含 dropped 的 `--write` 与既有流程完全相同；Q2 删除。

## 范围外（won't do）

req-v1 各项保持；另明确：single-file archive form；`--json` for archive；跨块移动检测（dropped+added 如实）；requirement 块的新旧散文"新增行"不报（只报旧内容缺失——保真检查的方向性）。

## 验收标准（确定 oracle）

- AC1（场景级互斥分类）：旧块 KV-01/KV-02/KV-03，新块 KV-01(同)/KV-03(标题变)/KV-04 → retained=[KV-01]、titleChanged=[KV-03(old/new 标题)]、dropped=[KV-02]、added=[KV-04]。
- AC2（行级）：KV-01 旧体 4 行、新体缺一条 AND → missingLines 含该行全文；行尾空白/行首缩进/tab 差异不报；重排的行如实报缺；重复行次数不足按次报缺；fence 内行参与比较；requirement 散文缺行报 scenario:null。
- AC3（ambiguous）：旧块内 KV-05 出现两次 → ambiguous 含 KV-05，且不进其他四类。
- AC4（verdict/exit 不变）：AC1/AC2 fixture 的 verify exit 与报告前完全一致；archive dry-run RESULT 行、--write 写入行为不变；gate 输出不变。
- AC5（json schema）：AC1 fixture 的 modifiedIntegrity 整条 deepStrictEqual（含排序）；无差异 MODIFIED 条目 diff 全空但存在；一切 verify ERROR 类字段缺省；--specs 永不出现（golden 复核）。
- AC6（执行纪律）：config-origin 下 matcher batch 计数仍恰好 2（旧块标题在第一批内——payload 断言）；invalid pattern 0 投影 0 spawn 无报告；archive 注入 matcher 失败 → bounded warning + 无报告段 + archive 结果照旧。
- AC7（活教材，冻结 fixture）：verify-change-scope 的 delta MODIFIED 块与其 store 原块**复制为测试 fixture**（内容冻结）→ 报告 deepStrictEqual：retained 7 条、titleChanged 2 条（SR-16/SR-18，含 old/new 标题）、dropped=[]、added=[]、ambiguous=[]、missingLines 精确清单（以 fixture 实算值钉死）。
- AC8（rename-then-modify）：RENAMED A->G + MODIFIED G → 基线为原 A 块，条目 name=G。
- AC9（archive 面）：同 AC1 fixture 走 archive dry-run → human 段与 verify 同数据；preflight 失败（CAS mismatch）→ 无报告段；--write 成功时报告在写入前打印。
- AC10（兼容与文档）：--specs byte golden 绿；306 存量测试绿；docs/cli 双语（verify/archive 节）+ CHANGELOG；check --self 绿。

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
