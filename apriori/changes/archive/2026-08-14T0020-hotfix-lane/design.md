# design — hotfix-lane（STEP2 v28；契约基线 = requirement/req-v41.md；不含实现代码）

## D0. 读法

req-v41 是机械契约权威文本；本文：①物化三表与全笛卡尔耦合表；②定式 req 留给 STEP2 的机械接口（D6）；③映射实现触点；④缺陷账走查（参数化）；⑤合法联合选项表；⑥delta 草案骨架（design-drafts/）。倾向均待 gate③。

## D1. 分级函数

### D1.1 字段契约（物化全表）

| 字段 | requiredness | 合法值 | F1 |
|---|---|---|---|
| change-kind | 必填 | no-code / code-trivial / code-behavior / doc-fix（仅 docs profile） | 缺失/未知/doc-fix 非 docs/docs 下 code-* |
| touched-modules | code-* 必填（本 change 提案必填；选填案 fallback=次序 0.5）；**doc-fix 必填且 == delta 模块集（相等不变量）**；no-code 禁止 | 模块词表非空无重复列表 | 缺失/空/未知/重复/词表外/超集不变量违反（touched⊉delta 或 doc-fix ≠） |
| fix-ref | 与 touched-modules 成对；**doc-fix 必填指向本仓文档变更 commit（v1 案=格式+声明；v2 案=commit 存在性，ref 不存在=F1）** | 仓域标记格式 | 半缺/空/格式非法 |
| frontend-touched / backend-touched | 所有 code-* 必填（与 profile 正交）；no-code/**doc-fix** 禁止；类型表案为派生变量（申报出现=F1） | yes/no | 应缺而现/应现而缺/未知值 |
| affected-scenario-ids | code-* 必填非空 | 既有 store 或本 delta scenario ID；duplicate occurrence 按 k 裁定（k1=F1/k2=复合键） | 缺失/空/未知/重复键 |
| delta | 可选；**doc-fix 必填非零** | 现行 parser | 不可解析/doc-fix 零 delta |
| decisions | 可选 | prior art B3 契约 | malformed |

跨字段不变量（F1，req-v41 全文为准）：no-code+非零 delta；no-code+任何定位/触及/affected 字段；doc-fix 触及字段出现；载体互斥（非所裁载体中可识别 bindings 形态）。

### D1.2 判定次序（输出二元组，首中唯一；**无 2a——doc-fix 与 code-* 同次序 2**）

| 序 | 条件 | 输出 |
|---|---|---|
| 0.5 | （仅定位头选填案）code-* 且定位头成对全缺 | (R3, n/a) |
| 1 | REMOVED/RENAMED；或 union(touched∪delta∪decisions 目标) ≥2；或 decisions supersession/单模块 >N（N 待裁 Q-10）；或双端命中（申报案 frontend∧backend=yes / 类型表案派生）；或任一 MODIFIED/ADDED 块无 scenario | (R3, n/a) 拒绝 |
| 2 | delta 非零（code-* 与 doc-fix 同规则）——默认 (R3, n/a)；白名单降级：①γ' 案 `blast: low` 命中（marker 保留；delta 自授/扩权=F1）②Q-12=yes 案 ADDED-only∧每块含 scenario∧单模块 | (R3, n/a) / (R2, whitelist) |
| 3 | code-behavior（零 delta） | (R2, behavior) |
| 4 | code-trivial（零 delta）∧单模块 | (R1, n/a) |
| 5 | no-code | (R0, n/a) |

### D1.3 缺陷账走查（参数化——随裁定变化处显式标注）

| 案例 | 形状 | 判定 | 参数注 |
|---|---|---|---|
| 改 GROUP BY 引入重复项 | MODIFIED 口径块无标注 | (R3) | 各案恒定（口径块不会获标注） |
| 前端维度漏改后端 | frontend∧backend yes | (R3) | 恒定 |
| 改"最新"口径 | MODIFIED 无标注/跨模块 | (R3) | 恒定 |
| 文案错别字 | code-trivial 零 delta 单模块 | (R1) | 验证=Q-3 案；Q-4b/c 案可 no-test 留痕 |
| 1012772 纯排查 | no-code | (R0) | 恒定 |
| 换机迁主板事实 | no-code + decisions 1 条单模块 | (R0)——**当 N≥1**；N=0 案则次序 1 判 (R3) | 随 Q-10 |
| BR-007 删分支 | REMOVED | (R3) | 恒定 |
| 已授标注展示块措辞修 | MODIFIED 白名单命中 | (R2, whitelist) | 测试强制于 Q-4a/b；Q-4c 案可逐键 no-test（条件式后果） |

### D1.4 实现触点（修正到可实施精度）

- `bin/apriori.js`：dispatch 新增 `hotfix` case；**CLI grammar 按签收裁定案参数化（r3 DES3-2——不预裁 d+d1）**：`apriori hotfix new <name>` 恒定；**π2 案辅助命令 `apriori hotfix evidence <name>`（复制+记录行改写三步——r9 DES9-4 入 grammar）**；归档面—— a 案 = `hotfix archive <name>` 直接写入（approval 记录调用时间）；b 案 = `hotfix archive <name> --signed-off-by <人>`（参数必需缺失拒，记录之）；c 案 = 纯结论免签直接写入、有回写形态按所配签收；d 案 = `hotfix archive <name>`（dry-run 呈阅）+ 第二命令 `--approve`——d1 子案携 `<token>` 且写入前重算校验；d2 子案无 token 仅重查 CAS 基线；d3 子案无校验。approval.md（**一切签收案均由归档命令写入——签收证据统一落点，r4 DES4-3**）结构随案：恒有 `date`、`grade`；a 案加 `mode: direct-invocation`；b 案加 `signed-off-by: <人>`；**c 案 = prior art 原义——纯结论免签（`mode: conclusion-only-exempt`）、有回写分支用 b 式 sign-off（非独立签收轴）**；d1 加 `token`；d2 加 `mode: cas-recheck`；d3 加 `mode: two-step-unbound`；f2（仅 d1 组合）加工件哈希枚举。位置候选 b（独立 `apriori/hotfixes/`）若被裁：resolve/status/verify 兄弟归因/archive discovery 的路径触点全部另建（成本见 prior art 位置候选后果），本触点清单按候选 a（changes/ 复用）书写并如此标注。
- `lib/new.js`：hotfix scaffold（字段骨架+bindings 容器预填——10 分钟预算关键）。
- 归档 preflight：**新模块 `lib/hotfix.js`（提案）**——字段契约/不变量/分级函数/载体互斥/摘要计算/双阶段 oracle；**三段写集合（stores→truth→bundle move）为新事务设计**（state A 无通用三段提交原语——仅复用 archive-merge 的 delta parser 与"临时文件+单文件原子改名"的写模式；AM-17 路径不触碰）。
- `lib/spec-runner.js`（r7 DES7-3 触点全谱）：**scoped verify 新接口**——scope 运行入口（k1 案：裸 ID 集；k2 案：复合键集）；**k2 案连带触及**：occurrence 收集（byId 聚合层加 occurrence 序）、duplicate policy 参数化（k1 案 duplicate=GAPS 现状不动；k2 案 duplicate 为合法被寻址态）、scope 键投影、裸 TAP 结果向复合键的 GREEN/RED/UNBOUND **全谱复制（fan-out）**、store report 的复合键展示。verdict 语义不动（正式流程路径回归断言）。
- `lib/status.js`（**硬编码 flow-state.md 处**）：识别 hotfix-state 并标注列出；`lib/gate.js`（进门要求 flow-state 处）：hotfix 映射按 Q-8 m 案（m1 拒绝指路/m2 适配表（α/β 子案）/**m3 全移 preflight——三案俱列**）；**`lib/check.js` 与 RUNBOOK phrase table：verdict 行新尾注格式的识别扩展（见 D6——保持 `^VERDICT:` 前缀兼容，尾注不破坏现行 parser，但 phrase table 需收录新定式）**；`lib/resolve.js` 按目录解析——身份互斥检查加在消费点（status/gate/preflight）而非 resolve。
- truth：new/resolve 建 truth doc（提案：建）；hotfix 契约入新 `truth/hotfix.md`（提案）。
- config：`lib/config.js` 增 verification-profile / module-type-map 读取（沿 id-pattern 行模式）。
- 平台：**f2 ∨ π2 复制 ∨ π3 ∨ 任一 hash= 出现时**逐文件安全打开的常量存在性检查与 fail-closed 报错路径（无独立探针；Windows 分支明确——r23 DES23-1）。

## D2. 验证缩放

### D2.1 配置行（四列对齐现行模板——见 design-drafts/process-config-rows.md）
### D2.2 证据三层与 oracle（同 req-v41：机械判结论须 PASS；人类可查证物存在性+基线；豁免物理由非空；双阶段；clean-tree 无条件于含评审组合）
**截图义务按档参数化（owner 裁定 D）：**全量档（medium/large）强制**（记录行缺失 = 不过退出条件；frontend:no 须留 `ui: not-applicable — 理由` 行）；**增量档（hotfix/trivial）降为 advisory**——frontend:yes 而无记录行时打印提示、**不阻塞归档**，n/a 行亦不强制。**提供即校验**：增量档下一旦写了记录行，其语法/路径安全/f1 基线/run 一致仍全谱校验（malformed = F1，杜绝「写错反而没事」的倒挂）**（本裁定不弱化 state A——截图在现行 RUNBOOK 中本就是自觉项，增量档 advisory 仍强于现状）。
**证据存在性按档参数化（修正 req-v41 的无条件量词）：**①机械判结论者——**该 tier/profile 实际要求的那些**必须存在且 PASS（hotfix 增量档 = scoped verify 强制、E2E n/a；全量档 = 现行矩阵 + E2E，其机械消费按范围提案待裁）；②人类可查证物与豁免物的存在性——全量档强制、增量档 advisory。「恒强制」的措辞不成立（会与增量档 E2E n/a 冲突），已改为「要求哪些就强制哪些」——r-D2 DES-4。**
**范围收窄——生产方提案，待 owner 确认（r-D2 DES-1 更正：这是对 goal B「E2E/视觉验证升格为对应 tier 的机械退出条件」的范围缩减，生产方无权单方定案）**：提议本 change 的机械面只覆盖 hotfix 通道（`lib/hotfix.js` preflight）；正式流程侧只做 RUNBOOK 文字升格，机械化列后续 change。理由：正式 change 无 `frontend-touched` 载体，机械化必须新增 gate 检查项，与本 change 自设的「gate 七项分毫不动」不变量冲突。**两条出路二选一由 owner 裁：(i) 采纳本提案（正式侧延期，需指定 successor change）；(ii) 不采纳——本 change 加做正式侧机械面（新增 gate 检查项 C8 + 正式 change 的 frontend 触及载体设计 + 其 AC 全谱），并显式解除「七项不动」为「七项行为不动、可新增第八项」。**在 owner 裁定前，本文与 tasks 按 (i) 书写并全程标注 pending。**

### D2.3 耦合表全笛卡尔物化

**表 A：hotfix 通道（增量档）。** 格值 = 验证下限；参数轴在格内引用（Q-3 证明机制、Q-4 no-test 案、Q7c singleton、Q-6b 新鲜度——组合语义见 req-v41 行类型/证据契约段，唯一投影）。

| 半径 | 未声明 | backend | docs | ui | fullstack |
|---|---|---|---|---|---|
| (R0, n/a) | 结论(+decisions)；评审按 R0 拆分 | 同左 | 同左 | 同左（触及字段禁止） | 同左 |
| (R1, n/a) | Q-3 案 scoped GREEN/证据契约；Q-4b/c 案 singleton no-test 留痕 | 同左 | **n/a（不可达）** | 未声明列 + **截图 advisory（增量档；frontend:yes 无记录行 → 打印提示不阻塞；n/a 行不强制；提供即全谱校验）** | ui 列 ∪ backend 列 |
| (R2, whitelist) | Q-3 案（含 delta scenario 绑定）；no-test 按 Q-4 三案 | 同左 | doc-fix：check 全绿+retain 强制（waive 准入拒） | 未声明列 + 截图 advisory（同 R1 ui 格）；E2E n/a | ui∪backend |
| (R2, behavior) | Q-3 案（scope=affected−…）；Q-4c 案 singleton no-test | 同左 | **n/a（doc-fix 无 behavior）** | 同 R2-whitelist ui 格（截图 advisory） | ui∪backend |
| (R3, n/a) | **不准入（全行 n/a——拒绝指路全流程）** | n/a | n/a | n/a | n/a |

**表 B：正式流程。** 准入 = 机械否决（behavior/R3 否决出 trivial；whitelist 按 Q-5 a 否决/b 交 human 判定）∧ state A human tier 判定（三资格 human-owned，机械层两态无第三值）。

| tier | 覆盖档 | 验证下限 |
|---|---|---|
| trivial（R0/R1；Q-5b 案加 whitelist R2） | 增量档 | **正式 R0/R1 下限独立列出（r3 DES3-6——不引用 hotfix 格值）：state A trivial 现行下限恒定（tests + verify GREEN + 一次 consistency review；docs 项目 = check+P8）；"增量档"仅指测试覆盖面可取受影响集、且截图为 advisory（owner 裁定 D）（覆盖面概念复用，格值不复用——hotfix R0 的"结论即全部"不适用于正式流程）**；whitelist R2 = code scoped GREEN 强制/docs check+retain（独立列出） |
| medium/large（任意半径自愿；R3 必须） | 全量档 | 现行矩阵 + profile 升格项（**ui：全量 E2E + 截图记录为 RUNBOOK 要求，全量档不降级（owner 裁定 D）；但其机械强制不在本 change 范围——见 D2.2 范围收窄**；backend/docs≈现状） |

**表 C：评审两轴投影（hotfix）。** scope∈{none,R2,all-code}×docs-P8∈{retain,waive}：

| 组合 | R0-concl | R0+decisions | R1 | R2（code） | R2×docs（doc-fix） |
|---|---|---|---|---|---|
| none×retain | n/a | **profile=docs 时点检 decisions 一致性（req 条件分支）；其他 profile n/a** | n/a | n/a | 仅 P8 单 verdict |
| none×waive | n/a | n/a | n/a | n/a | 准入拒（waive） |
| R2×retain | n/a | 点检含 decisions 一致性 | n/a | 单轮点检 | 单轮双职责双 verdict |
| R2×waive | n/a | 点检 | n/a | 单轮点检 | 准入拒 |
| all-code×retain | n/a | 点检 | 点检 | 点检 | 双职责 |
| all-code×waive | n/a | 点检 | 点检 | 点检 | 准入拒 |

## D3. 合法联合选项表（完整版）

| 联动组 | 合法 | 非法 |
|---|---|---|
| Q-8/Q7a 载体×Q-8/Q7c | c1/c1'×{p1,p2}；c2/c3×p1 | p2×c2/c3 |
| Q-1 γ'×签收×评审 | γ'×d；γ'×(a/b/c)×scope≥R2+边界职责 | γ'×(a/b/c)×none |
| Q-6a π1×签收 | π1×d | π1×(a/b/c) |
| Q-6b {f2}/{f1+f2}×签收新鲜度 | ×d+d1 | ×(a/b/c)、×d+d2、×d+d3 |
| Q-3×Q-4 | 保留案=Q-3=i 的优先例外（scope 按键切分）；**ii×Q-4c 合法交叉**（behavior×ii×c×p2、delta×ii×c 混合键）；**ii×Q-4b×p2 合法（r5 DES5-5：R1 singleton no-test——final scope 空、ii 工件 n/a、理由留痕，结果唯一）** | — |
| Q-4×Q-8/Q7c=p2 | a：singleton 仅 tests:；b/c：可 no-test: | — |
| Q-6c t2×评审 | t2 仅无评审组合 | t2×含点检/P8 组合 |
| Q-2c-无类型表 | 28-a 唯一 fallback | 28-b/c 须 owner 明示 |
| doc-fix×docs-P8 | ×retain | ×waive（准入拒） |
| prior art w1×定位头 | w1×必填 | w1×选填 |
| prior art freshness | r1 或 r1+r2 | r2-only |
| Q7a=c1×AC1 阈值 | c1 须同步调 ≤3 文件（或裁 c1'） | c1×现行 ≤2 不动 |
| k 裁定×affected duplicate | k1=F1 / k2=复合键（解释联动） | — |
| 签收 a/b/c×截图存续期 | ×π2（入库）/π3（哈希）合法 | ×π1 非法（无呈阅载体） |
| Q-6b {f1}/{f3}×签收 | 任意签收案合法（非绑定） | — |
| 签收 d×新鲜度子案 | d 必须连带选 d1/d2/d3 之一（成组） | 裸 d 无子案 |
| 签收×π2×source origin×AC1 阈值（r23 DES23-2 完整联合表） | a/b/c×π2 仓内源 = 3 条（现行 ≤3 即合法）；a/b/c×π2 仓外源 = 4 条（须明示调 ≤4）；d×π2 仓内源 = 4 条（须 ≤4）；d×π2 仓外源 = 5 条（须 ≤5）；d×{π1,π3} 合法无联动。**任一格未同步调到对应阈值 = 非法联合选择**（含：未调阈值的 a/b/c×外源；未调阈值的 d×π2 内源；d×π2 外源但阈值仅调到 ≤4）（r10 DES10-4——未调阈值的 d×π2 = 非法联合选择，非"合法但验收失败"）** | 未调阈值的 a/b/c×外源；未调阈值的 d×π2 内源；d×π2 外源但阈值仅 ≤4 |
| Q-4b×Q7c=p2 | singleton no-test 仅 R1 合法 | R2-behavior×Q-4b singleton no-test |
| Q-8 m2 α/β×C6 e 案 | m2-α×{e1-α,e1-β,e2}；m2-β×同（PASS 边界明示义务） | —（连带必裁） |
| prior art w1 子案/w2 | w1-strict/w1-weak（各自后果）；w2×必填完整语义；**w2×选填：code-* 定位头全缺经次序 0.5 判 (R3) 拒——hotfix 实际不可达（r3 后果修正）；五项放弃的实义域仅限选填案可达形态** | w1×选填 |

## D4. delta 草案（design-drafts/——RUNBOOK 双语同步义务、四列 config 行、检查点全谱见各文件）

## D5. AC 映射（AC-D1→D1；AC-D2/D3→D2.3 表 A/B/C；AC-D5→decision-summary.md；AC-D6→proposal 取代清单；AC-I→design-drafts/cli-checkpoints.md 全谱）

## D6. STEP2 定式（实现者唯一化输入）

### D6.1 bundle 布局与状态文件语法（r2 DES2-1）
- 目录（候选 a）：`apriori/changes/<name>/`——`hotfix-state.md`（身份+申报+结论+bindings（c1' 案））、`specs/`（delta，可选）、`decisions.md`（可选）、`evidence/results.txt`（Q-3=ii 案固定路径）、`approval.md`（一切签收案，排除域，归档命令写入）、`review/`（点检/P8 verdict 文档与 raw，评审工件域）。
- `hotfix-state.md` 布局（节序固定，二级标题定式；r3 DES3-1 全域化）：头部字段块——每字段一行 `key: value`；**基数由字段契约的 requiredness 唯一决定（必需字段恰一；禁止字段零；无全局恰一）**；重复行 = F1；**未知头字段 = F1；未知二级节标题 = F1**。字段语法：`hotfix: <name>`（bare kebab-case）；`date: YYYY-MM-DD`；`kinds:` = {1,2,3} 非空子集逗号分隔，**互斥与一致性（r6 DES6-1 修正）：1 与 2 互斥；3 可与任一组合或单独出现（纯业务事实 = {3} 合法）；含 1 ⟺ change-kind ∈ {code-*, doc-fix}；含 2 ⟹ change-kind = no-code（单向——no-code 合法组合 = {2}/{3}/{2,3}）；含 3 ⟺ decisions 存在**（违反 = F1）；`touched-modules:`/`affected-scenario-ids:` = 逗号+空格分隔列表；k2 案复合键语法（r7 DES7-2 组件唯一化）= `store=<模块后缀>/<id>@<标题>#<n>` 或 `delta=<specs 相对路径>/<id>@<标题>#<n>`（**固定前缀二选一**；**carrier/ID 切分 = 最后一个 `/`；组件封闭字符集：路径/ID/标题禁含 `,`、换行、`@`、`#`；**ID 与标题均禁含 `/`（r10 DES10-1——标题含 `/` 会破坏切分）**——超出 = F1 fail-closed 无转义**；**carrier 归属函数（r12 DES12-1 配对域修正）：配对域 = (rename 解析后的 requirement 身份 × 裸 ID)——对每个该二元组，其 old/new 块内 occurrence 按出现序构成序列（非裸 ID 全局汇总——跨 requirement 同 ID 不互配）——第 i 个 new occurrence ↔ 第 i 个 old occurrence（存在则取 store 身份、ordinal=i）；new 序列超出 old 基数的尾部 occurrence → delta 身份（**ordinal 同一口径 = 其所在 requirement 块内该 ID 的出现序——r11 DES11-1 删除文件级口径，全文唯一**）；old 超出 new（删减）的旧 occurrence 不产生键；重排不追踪（顺序配对即语义）。ADDED 块目标一律 delta 身份（ordinal 同为块内序）**。**`<标题>` = requirement 块标题（非 scenario 标题）；rename-then-modify 取最终（新）requirement 名——与 state A projected scope 的最终名消费一致（r9 DES9-2）**；**n = 同 ID 在其 requirement 块内的 occurrence 序（1-based ordinal——r10 DES10-2 统一为块内序，与配对函数同域；canonical key 含 requirement 标题故块内序全局唯一）**、无前导零）；scope/bindings/ii 工件/接口签名全链取完整复合键（k1 案 = 裸 ID）。**k2 结果模型诚实边界：state A TAP 只有裸 ID——TAP 结果按裸 ID 聚合后复制到该 ID 的全部申报复合键（k2 提供申报寻址消歧、不提供 occurrence 级结果消歧——固有限制如实标注）**。`## Conclusion`：**缺失/空白/占位模板未改 = F1（其余通过——r3 条件反写修正）**。`## Bindings`（c1' 案）。业务节正列 = {Conclusion, Bindings}；**合法流程节枚举 = {## Gates}（排除域）；此外任何二级节 = F1 未知节（r4 DES4-1——解析无两可）**。
- 声明行语法（一切载体统一；**词法入口两分（r6 DES6-3）：行匹配 `/^(tests|no-test): /` = singleton 分支；否则 keyed 分支——按首个 ` tests: ` 或 ` no-test: ` marker 切分，marker 前内容须以 `:` 结尾、去尾冒号即目标键（无尾冒号 = F1）；键禁含两 marker 子串；c3 值禁含 `-->`；c1/c1' 容器内仅声明行与空行**）：keyed = `<键>: tests: <非空>` / `<键>: no-test: <非空>`；singleton = 无键行首式。c1 案：`bindings.md` 于 bundle 根。c3 案 = 随块 HTML 注释 `<!-- <keyed 行文本> -->`，**随块合入 store（prior art 语义恢复——r4 修正：只有 c2 的块内裸行在归档合并前剥离（恰删该行其余字节不动）；c3 不剥离）**。
- fix-ref grammar（r3 DES3-4 正则化）：本仓 = `/^[0-9a-f]{7,40}$/`；外仓 = `/^[a-z][a-z0-9+.-]*:\/\/\S+$/`（URL 形）或 `/^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+:\S+$/`（host:ref 形；host 须含点、ref 无空白非空）；两者皆不匹配 = F1。

### D6.2 双摘要域（r2 DES2-2——公共核+扩展，两个算法显式分离）
- **公共核 digest-core**（r6 DES6-4 唯一编码）：SHA-256 over 实体记录序列，每记录 = `<十进制 tag 字节长度>\n<type-tag>\n<十进制 bytes 长度>\n<bytes>`（**tag 与 bytes 双长度前缀——tag 含换行也不能伪造记录边界，r7 DES7-4**）；**排序一律 UTF-8 字节序**；记录序 = ①delta 文件（tag `delta:<specs 相对路径>`，路径字典序）②`decisions`③`section:Conclusion`④`section:Bindings`⑤（c1 案）`bindings-file`⑥头部字段全集（tag `field:<key>`，字段名字典序，bytes=value）⑦`baseline`（bytes=HEAD|fix-ref 值）。
- **评审摘要** = digest-core（verdict 行尾注所载；preflight 重算比对）。
- **d1 签收令牌**（r8 DES8-5 统一记录编码）= SHA-256 over 记录序列，记录格式与 digest-core 同（tag 与 bytes 双长度前缀）：首记录 tag=`core`、bytes=hex(digest-core)；扩展记录 tag=`store:<相对路径>`/`truth:<相对路径>`/（f2 案）`artifact:<相对路径>`、bytes=SHA-256(文件字节) 的 hex——**域总序固定 core→store→truth→artifact→ext-artifact（ext-artifact 为第五域；域内按 canonical path 的 UTF-8 字节序）**；**canonical path 函数（r17 DES17-2，去重与排序的唯一输入）：（**输入域已收窄为仓根/bundle 根相对——无 UNC/drive/POSIX 绝对根，故无需根感知，r19 DES19-3**）分隔符一律归一为 `/`；折叠重复分隔符；消解 `.` 段（`..` 一律 F1，含 π3）；**不做大小写折叠**（大小写不同 = 不同 canonical path——与 state A 路径处理一致，跨平台差异如实）；同一 canonical path 的多条截图记录：hash 全等 = 去重为一条记录、hash 不等 = F1；**canonical path 亦是唯一解析/打开路径（r18 DES18-2——先 canonicalize、再以 canonical path 打开与散列；raw→canonical 多对一别名（如 POSIX 下含 `\` 的真实文件名）由此不产生两可：canonical 之外的 raw 形态不再被单独解析）**；**f2 的 artifact 封闭正列 = bundle `evidence/` 树 ∪ ext-artifact 集合（r16 DES16-2——approve 终核 manifest 同此并集；外部项散列用同一安全打开三件套）**；树遍历契约不变（真实目录 = 遍历节点；叶须 regular；symlink/FIFO/socket/设备/不可读 = F1）；**快照与最终绑定（r13 DES13-1/2 边界诚实化）：散列打开文件用 O_NOFOLLOW（**平台能力（安全打开的适用面 = **f2 ∨ π2 复制 ∨ π3 ∨ 任一 `hash=` 出现**——r23 DES23-1 完整归因（凡需按路径读取目标字节者皆需）；r20 DES20-1/2/3 定案：删除独立探针——探针的命令归属、结论绑定与"tmp 文件系统 ≠ 证据文件系统"三处缺陷同源于"离线探测"这一形态）：安全打开逐文件在其真实路径上进行——**运行时先查 `fs.constants.O_NOFOLLOW` 存在且为非零数值——缺失/非数值/为零 = 立即 fail-closed 拒绝（禁止与其它 flag 位或后折为零而静默普通打开，r22 DES22-2）**；平台/文件系统不支持时 open 报错（EINVAL/ENOSYS 等）同样 fail-closed 拒绝该次散列并报平台不支持；**残余如实**：平台若静默忽略该 flag 则不可检出（与 o1 同级残余，声明不消除）**）、打开后 fstat 必须 regular 且 dev/inode 与 lstat 一致（叶节点三件套为机械保证；**祖先目录在 lstat→open 间被替换的竞态属 o1 同级残余（如实声明；openat 目录 fd 链 anchoring 列为实现可选强化，非本设计承诺），r14 DES14-2**）；`--approve` 在三段写集合开始前对 evidence manifest（条目集合+逐项哈希）做最终 CAS 式复核（不等 = 拒）——复核到写集合开始点为机械保证；**终核后至 bundle move 前为 o1 同级无锁残余窗口（单机人驱并发近零，如实声明不消除——与 prior art truth CAS 边界同格式）**；空集 = 该域零记录。枚举清单印于 dry-run 输出并写入 approval.md。评审摘要域不因 f2 扩大。
- approval.md 为 command-owned（人工改写=审计违规）；字段按上；d 案另附 dry-run 输出全文。

### D6.3 证据工件与截图定式（r2 DES2-4）
- Q-3=ii 工件（`evidence/results.txt`）头部字段行：`baseline: <值>`（f1 案必需）、`timestamp: <ISO UTC 秒精度 YYYY-MM-DDThh:mm:ssZ>`（f3 案必需）、`run-id: <无空白字串>`；随后每 scope ID 恰一行 `<scenario-id>: PASS|FAIL`。解析违例/字段按案缺失 = 拒。
- 截图观察记录（固定路径 `evidence/screenshots.md`）：每行 `- path=<相对路径> obs=<一行观察> time=<ISO UTC 秒> baseline=<值> run=<标识>[ hash=<hex>]`（hash：**本 change 的 gate③ 裁定组合（π1+{f1}）下禁用——出现即 F1（无 oracle 消费却触发安全打开）**；π3 案必需；**π1×f2 案必需（r15 DES15-1——π1 图片在 bundle evidence/ 树外，f2 的树绑定覆盖不到：hash 必填且机械校验重算==字段值，并以 `ext-artifact:<仓根相对路径>` 记录入 d1 令牌）**；π2×f2 案可省（树绑定已覆盖）；其余可选；一律 SHA-256 恰 64 位小写 hex**）；**hash 全域 oracle（r23 DES23-4 补目标投影与同 fd 规则）：`target(π, state)` = π2 pre-copy 行→`src`；π2 post-copy 行→bundle `path`；π1/π3→仓根 `path`。hash 字段一旦出现，无论 π/f 组合，必须等于 target 字节的 SHA-256（不等 = F1）；**π2 的 hash 校验、内容比较与复制读取必须消费同一个受检 source fd（禁先按路径算 hash 再另开 fd 复制）**——不消费该字段的组合亦如此，杜绝格式正确内容错误的误导性证据**；**字段值禁含子串显式清单（唯一一份）= { ` path=`, ` src=`, ` obs=`, ` time=`, ` baseline=`, ` run=`, ` hash=` }（r21 DES21-2 补 src）**；**两态封闭 grammar：pre-copy 行恰含 {src, obs, time, baseline, run[, hash]}、post-copy 行恰含 {path, obs, time, baseline, run[, hash]}——含两者或缺主键 = F1**；**三 oracle 入定式（r7 DES7-5）：π3 案须 hash == SHA-256(path 所指文件字节)；同一 bundle 全部记录行 run= 值必须一致（不一致 = 拒）；baseline 分域比较（本仓 == HEAD/外仓 == fix-ref 值）**；**路径安全（r14 DES14-1 根按 π 参数化）：记录行 path= 的根域随 π 案——π2 = bundle 根相对（归档整移后仍解析、持久可查证）；π1 = 仓根相对且必须落于 `apriori/tmp/` 下（归档后不可复查为 π1 本义如实）；π3 = **仓内路径域（r19 DES19-3/4/5 定案收窄：绝对路径/UNC/drive/URI 一律 F1——跨平台绝对路径词法是本轮连锁缺陷的根因，收窄后消解；仓外截图请置于仓内（如 `apriori/tmp/`）或改裁 π2，此为显式范围收窄，入决策摘要披露）：path 一律仓根相对；含 `..` = F1（与 π1/π2 同——canonical 函数无需根感知消解）；目标缺失/不可读/非普通文件 = 拒；hash oracle 唯一（重算==字段值）；**containment 同 π1/π2：逐组件 symlink = F1；最终 realpath 须落于仓根内且为普通文件，否则 F1；**π3 的 hash 读取一律经受检 fd（O_NOFOLLOW + fstat regular + dev/inode 一致，与 f2 同——r21 DES21-5；祖先替换残余同 o1 级如实，与是否组合 f2 无关）**；"仓外截图请置于仓内或改裁 π2"由此真实成立**；d1 的 artifact: 恒 bundle 根相对（f2 只绑 bundle evidence/ 树）。π1/π2 案：含 `..`/绝对路径 = F1；逐组件 symlink = F1；最终 realpath 须落于对应根内且为普通文件**；**π2 案两态记录行（r21 DES21-3/4 补目标函数与 source 域）：复制前 `- src=<路径> …`——**src 域 = 仓根相对且仅限 `apriori/tmp/` 下（路径安全同 π1）；仓外图片须作者先自行放入 `apriori/tmp/`——**AC1 唯一核算方式（r22 DES22-5）：以命令计（`cp`/`mv` 各算一条），故 d×π2×仓外源 = 5 条命令，须 gate③ 明示阈值调 ≤5 才合法（未调即非法联合选择；仓内源不受影响）****；复制目标函数固定 `evidence/screenshots/<basename>`；步骤③改写为 `- path=evidence/screenshots/<basename> …`（删 src；两态互斥，preflight 只收复制后态）**。**π2 复制是归档命令之外的作者编辑动作（bundle 编辑期由辅助命令完成——F1 零写入约束只辖归档命令的 store/truth/bundle-move 写集合，不辖作者编辑自己的 bundle）；辅助命令三步可重入（r11 DES11-3 修正）：①全量**纯只读**计划校验（路径安全+碰撞预判+**残留 `screenshots.md.tmp.*` = F1 报告请人工清理（archive preflight 同查此不变量——绕过 evidence 命令也归不了档；"可重入"的准确含义 = 清理后重跑幂等，r12 DES12-2 统一）**）②逐文件复制（**目标侧安全写入协议（r23 DES23-3）：目标父目录逐组件复核（symlink = F1）；目标已存在时以受检 fd 读取比较（同内容 no-op、异内容冲突拒）；新写入先写 bundle 内 `…/<basename>.tmp.<pid>`（O_EXCL）再原子 rename——残留 tmp 于计划步 F1 报告请清理（同 screenshots.md.tmp 口径），半文件因此不会成为「异内容目标」，重跑清理后幂等续完**；读取一律经受检 fd：O_NOFOLLOW + fstat regular + dev/inode 一致（与 π3/f2 同——r22 DES22-3；祖先替换残余同 o1 级如实）**；basename→source 单射：不同 source 同 basename 碰撞拒；同一 source 重跑同内容 no-op、异内容冲突拒——中途失败重跑幂等续完）③path= 改写：内存生成全部改写行，写 `screenshots.md.tmp.<pid>` 后原子改名替换（**进程唯一名只避免 temp 互踩；同一 bundle 的 evidence 并发调用不受支持——无锁、last-writer 语义：较旧进程后改名可静默丢弃较新观察行且无自动检测（r14 DES14-3 如实披露）；修复路径 = 人工发现后重新编辑并串行重跑**）；dry-run/digest/签收/归档一致看编辑完成后的 bundle；`--approve` 不再执行复制（第二步只校验不写）**；**可判字符集：任何字段值禁止换行；禁含子串以唯一清单为准（见同段前文 r7 清单——含 ` hash=`；r8 DES8-6 删除本处旧枚举）；路径含无法表达字符 F1**。**f3 判定函数**：通过 ⟺ time（UTC 秒）严格大于 bundle 全部业务实体**文件** mtime（秒截断）最大值（相等=拒；不存在文件不计；缺 time=拒）。**诚实标注（r4 DES4-9）：这是文件级近似 oracle——排除域节更新或文件复制/checkout 会推高 mtime 令证据无关失效（fail-closed 方向：只误拒不误放），非实体级函数；如实接受此弱语义（f3 本就是明示弱化案）**。f1/f2 按基线/哈希。
- f2 的截图/工件哈希序列化位置 = d1 令牌输入（见 D6.2），呈阅清单可见。

### D6.4 verdict 行定式（r2 DES2-5——兼容 state A `^VERDICT:` 接口）
- raw 末尾唯一 marker `=== VERDICT ===`；区内每行 **`VERDICT: <结论短语> role=<r> digest=<hex> [boundary=<b>]`——role 与 digest 必填且各恰一（缺失/重复 = 拒）；digest = 恰 64 位小写 hex（违反 = 拒，r11 DES11-6）；仅 boundary 条件选填**，`<r>` ∈ {inspection, p8}；`^VERDICT:` 前缀保持。**role×phrase 合法配对（r4 DES4-6）**：role=inspection → {`no findings`, `<N> issues open`（N = 十进制正整数字面）}；role=p8 → {`no spec-vs-code gaps`, `gaps found`}；配对外组合 = 拒。**γ' 边界职责 = inspection verdict 行的附加尾注 `boundary=within|exceeds`（不产生第三行——基数不变；exceeds 拒绝归档）**。不通过短语（issues open/gaps found）拒绝归档。双职责恰两行（inspection 前 p8 后），单职责恰一行。**评审工件选择算法（r5 DES5-4 全域化）：review/ 下定式命名 `round-<n>.md` + `round-<n>-raw.txt`（n 十进制正整数无前导零——`round-01` 类命名 = F1）；preflight 消费 n 最大的一对；任意轮次（含低轮次）doc/raw 缺对 = F1**。**boundary 尾注 requiredness：γ' 以点检替代 d 时 inspection 行必含（缺 = 拒）；其余场景出现 = 拒**。

### D6.5 其余
- R2 子型序列化：`grade: (R2, whitelist)` 行入 dry-run 输出与 approval.md（排除域）；非 R2 = `grade: (Rx, n/a)`；不入摘要域（派生值）。
- process-config 行：四列——design-drafts/process-config-rows.md。

## D7. π2 的范围声明（r24 定案——设计包边界）

**π2（截图复制入 bundle）的机械契约在本设计包内不宣称完成。** 连续多轮评审表明，π2 引出一条独立的文件复制事务链——目标目录安全创建、rename 的跨平台 no-replace 语义、temp 名与合法 basename 碰撞、目标祖先换链、半写恢复——其粒度已超出 gate③ 设计包应定的层级（本包的职责是准入分级与验证缩放的决策表，不是文件复制规范）。

**处置**：
- π1 与 π3 的契约完整、可直接裁定与实现；
- **π2 保留为 owner 可裁选项，但附带条件：裁 π2 即触发"实现前的后续设计增量"**——该增量须补齐 D7 所列复制事务链（目标侧安全写入全谱、跨平台 rename 语义、命令预算联合表、AC 全谱），方可进入实现；
- 本包已落盘的 π2 部分（两态记录行、src 域、目标函数、受检 fd 读取、目标侧协议草案、命令数联合表）作为该增量的**起点而非终稿**，其未闭合面在此显式列名：目标目录安全创建、rename no-replace 平台差异、temp 与 basename 碰撞、目标祖先换链、半写恢复的完整错误谱。
- 相应地，本包的 AC-I 对 π2 只保证起点级覆盖；π1/π3 的 AC 全谱不受影响。

**两分支账本状态机（r26 DES26-4）**：①**改裁 π1/π3 分支**——DES24-3..7 属未选方案的出域项，按 state A 两步流转：生产方记 `rejected`+理由 → reviewer 复核转 `rejected-verified` 后终结，不再阻塞归档；②**仍裁 π2 分支**——DES24-3..7 **保持 open，不使用 waiver 伪终结**（waiver 语义是接受风险，非临时延期）；gate③ 只记录条件选择与回退 STEP2，后续增量**在原 ID 上**复审至 `verified`（state A 规则：重开原 ID，不新建行），全部收敛且二次 gate③ 批准后方可实现。

**重新准入协议（gate 阻塞规则，非普通后续事项）**：若 gate③ 裁 π2，本 change **不得进入实现**；须先**回到 STEP2** 补齐 D7 所列缺口，跑异构复审至账本收敛（π2 相关行全部 verified），并**再次取得 human gate③ 批准**方可解除阻塞；**阻塞解除的唯一充分条件 = 增量完成 ∧ DES24-3..7 原 ID 全部 verified ∧ 二次 gate③ 批准**（不使用 waiver 作为解除路径——r27 修正）。

**倾向**：gate③ 选 π1（与 d 组合）——它无复制事务、契约完整；π3 次之；π2 仅在 owner 确需"图片随 bundle 永久归档"时选，并接受增量成本。
