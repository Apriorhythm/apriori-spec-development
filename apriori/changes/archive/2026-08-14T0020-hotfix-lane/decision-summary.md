# decision-summary — hotfix-lane（gate③ owner 一页决策摘要）

依据：req-v41（STEP0 43 轮收敛 VERDICT 0）+ design.md。**联动组内不能拆开选——非法配对已标明**。每项给倾向，全部由你裁。

## 一、爆炸半径分级表（拍板方向的落地形态）

| 半径 | 定义 | 机械信号 | 准入 |
|---|---|---|---|
| R0 | 不改代码（纯排查/业务事实） | no-code + 零 delta（decisions ≤N 条单模块非 supersession） | hotfix ✓ 结论即全部 |
| R1 | 真 trivial（文案/配置/单出口） | code-trivial + 零 delta + 单模块 | hotfix ✓ 受影响测试 |
| R2-whitelist | 白名单降级的 spec 变更 | MODIFIED/ADDED 命中人类 blast:low 标注（或 Q-12 ADDED 例外） | hotfix ✓ 测试强制（Q-4c 案例外） |
| R2-behavior | 零 delta 行为修复 | code-behavior 申报 | hotfix ✓ 测试强制（同上） |
| R3 | 改契约/形态/口径/跨端/结构 | REMOVED/RENAMED、跨模块并集≥2、双端、无 scenario 块、未标注 MODIFIED/ADDED（fail-up 默认）、decisions 越界 | **拒绝→全流程** |

诚实边界：机械判定作用于申报面+delta 形状；整体瞒报拦不住（补偿=结论强制+审计+后续评审）；缺陷账三回归案（GROUP BY/双端/口径）全部机械出局。

## 二、profile×tier 决策表（方向表的最终形态）

| 档 | ui profile 下 | backend/docs |
|---|---|---|
| medium/large（全量档） | 现行矩阵 + 全量 E2E + 截图记录升格（**不降级**；其为 RUNBOOK 要求，**机械强制是否本 change 落地见第七节**） | 现行矩阵（backend≈现状；docs=check+P8） |
| hotfix（增量档） | 受影响测试证明（按 Q-3 案）+ **截图 advisory**（touch 前端时无记录行 → 提示不阻塞；提供即全谱校验）；E2E n/a；no-test 按 Q-4 案 | 测试证明（Q-3 案）；docs=check+评审轴投影 |
| 正式 trivial（增量档；Q-3/Q-4/Q-11 不适用） | state A tests+verify GREEN 恒定 + 一次 consistency review；测试覆盖面可取受影响集；**截图同为 advisory（owner 裁定 D）** | 同左；docs=check+P8 恒定 |
| 纯后端 change in ui profile | **全量档**：`ui: not-applicable — 理由` 行强制留痕；**增量档**：可选（出现即校验） | — |

原则：机械判结论者（verify/E2E）恒须 PASS；人类可查证物与豁免物的**存在性按档**（全量强制／增量 advisory）；缩放的是覆盖面。**范围问题（需你裁，见第七节）：正式流程侧的机械化本 change 做不做**。覆盖面=档、准入=(半径,子型)∧human 判定、证据类型=profile，三者正交。

## 三、耦合规则（两半怎么扣上）

hotfix 验证下限 = 半径行 × profile 列（表二增量档）；R3 根本进不来（准入先于验证）；no-test 存废是 Q-4；正式流程零继承 hotfix 豁免（trivial 恒 tests+GREEN）。

## 四、待你拍板（按重要度）

1. **Q-1 降级机制**：γ'（human-owned `blast: low` 白名单标注，缺标注默认 R3）vs β'（delta 一律 R3）。**倾向 γ'**。连带确认：标注语义=预授权未来整块替换降级；γ' 强绑签收 d 或点检承担边界职责（γ'+a/b/c+none 非法）。
2. **Q-4 no-test 存废**（R2 禁令是我们的推导提案，非你已拍板——goal 原文未限半径）：a 全移除（**倾向**）/ b 保留限 R1（留痕语义，无自动逼偿）/ c 全域保留（goal 原义；后果条件式：无同 ID 测试才 UNBOUND→GAPS→gate 阻塞）。
3. **Q-8 签收**（prior art Q1）：a 调用即批准 / b sign-off / c 分级 / **d 两步式（连带必选子案 d1 令牌绑定（倾向）/d2 仅重查 CAS/d3 不绑内容——d 与子案成组）**。**倾向 d+d1**（在候选中最强的内容绑定——**绑定域 = 业务实体+申报字段+代码基线，及所选 f2 时的证明工件与截图哈希；未裁 f2 时截图/证据文件不受令牌绑定，如实**）。连带：{f2}/{f1+f2} 新鲜度绑 d+d1；π1 截图呈阅绑 d（任子案）；**γ' 绑 d（任子案，完整呈阅）或 scope≥R2 边界点检——非必 d1（r4 修正）**。
4. **Q-3 测试证明**：i 隐式 scoped verify（**倾向**，机械 oracle）/ ii 证据引用（须明示放弃机械 oracle）。
5. **Q-5 正式 trivial 半径否决**：a 全部 R2 否决 / b 仅 behavior 否决、whitelist 交 human 判定（**倾向**）。注意：两案下无标注 docs 修复都比 state A docs trivial 严——docs trivial 实质收紧，请确认。
6. **Q-11 hotfix 评审两轴**：code-review-scope{none/R2/all-code}×docs-P8{retain/waive}——**倾向 {R2}×{retain}**（none 的后果：瞒报型漂移零防线）。
7. **Q-2 profile 值集**（ui/backend/fullstack/docs；backend/docs≈现状如实）+ **Q-2c 模块类型表**（有=派生触及、无=对称申报 28-a）。
8. **Q-6 证据链**：a) 截图存续期 π1（呈阅可查证，绑 d）/π2（入库；**连带 `hotfix evidence` 辅助命令——命令数按四格函数：a/b/c×内源 3、a/b/c×外源 4、d×内源 4、d×外源 5；每格须同步明示调到对应阈值，否则非法联合选择**）/π3（哈希；**范围收窄披露：π3 的 path 限仓根相对、经 containment 与受检 fd——绝对/UNC/drive/URI 一律拒**）；**π2 的范围声明（重要）：本设计包不宣称 π2 的机械契约完成**——其文件复制事务链（目标安全创建、跨平台 rename 语义、temp/basename 碰撞、祖先换链、半写恢复）超出本包粒度；**裁 π2 即触发实现前的后续设计增量**（详见 design.md D7）。已落盘的 π2 部分（两态记录行、src 限 apriori/tmp、目标函数、受检 fd、命令数联合表 a/b/c 内源3 外源4、d 内源4 外源5）为该增量起点。**倾向 π1**（无复制事务、契约完整）；π3 次之；π2 仅当确需图片随 bundle 永久归档时选**；b) 新鲜度集合 {f1}（**倾向**）/{f2}/{f1+f2}（绑 d+d1；**平台后果披露：f2 的证据散列要求 O_NOFOLLOW 安全打开——**安全打开的适用面 = f2 ∨ π2 复制 ∨ π3 ∨ 任一 hash= 出现**（改裁非 f2 不足以规避——还须避开 π2/π3 与可选 hash；选其中任一即接受静默忽略残余）；**报错型不支持**（open 失败或 O_NOFOLLOW 常量缺失）的平台下 fail-closed 拒绝、无 fallback——**仅命中四触发条件的 bundle 不可归档**（要在该平台照常工作，须避开 f2、π2 复制、π3 与任一 hash= 四者全部）；**静默忽略该 flag 的平台不可检出——声明级残余，选中任一触发条件（f2 / π2 复制 / π3 / 任一 hash=）即接受**。**未触发任一条件的组合（如 π1 + {f1} + 无 hash）不受此限，在该平台照常可归档****）/{f3}（明示弱化）；c) clean-tree t1（**倾向**）/t2（仅限无评审组合）。
9. **Q-12 ADDED 例外**：ADDED-only∧含 scenario∧单模块降 R2——默认不降（R3），yes 才启用。**倾向不降**（absence of evidence 论证局限如实）。
10. **Q-7 runbook-version 4.0→4.1**（倾向升）；**Q-10 R0 decisions 上限 N**（倾向 N=3）。
11. **Q-8 内嵌 prior art 全候选清单（逐项，命名空间 Q-8/…）**：位置 a（changes/ 复用+专名互斥，**倾向**）/b（独立 hotfixes/）；Q9 KB 生命周期 freshness r1 或 r1+r2（**倾向 r1+r2**；r2-only 非法）+ supersession s1/s2/s3（**倾向 s2**）+ 定位头必填（**倾向必填**；选填=五项放弃）；Q7c 零 delta 声明 p1（**倾向**）/p2；k1（**倾向**）/k2 键唯一性；v1（**倾向**）/v2 fix-ref 校验；w1-strict/w1-weak/w2（**倾向 w2**）仓域；λ1 单仓域（唯一候选）；t1（**倾向**）/t2 ID 归属；o1（**倾向**）/o2/o3 并发；m1/m2-α（**倾向其一**）/m2-β/m3 gate 映射 + C6 等级 e1-α（**倾向**）/e1-β/e2；载体 c1/c1'/c2/c3——**倾向唯一 = c1'**（bindings 节住状态文件；**若改裁 c1 则连带 AC1 手工文件阈值 ≤2→≤3 调整，此连带随裁定一并生效**）。联动约束（不能拆开选）见 design.md D3 表。
12. **顶层 Q-9：hotfix-channel bundle 去留**（本 change 取代其范围；req-v13 作候选空间基线保留引用）。

## 五、拿不准、需要你特别看的

- **γ' 白名单的治理成本**：标注是永久预授权，撤销走正式 change——如果你觉得这太重，β'（delta 一律 R3）意味着 hotfix 只承接零 delta 修复与纯排查/事实，spec 变更全走正式流程（更简单但砍掉"事后补记带 delta"用例的一半）。
- **docs trivial 的收紧**（Q-5 注意事项）：无标注的单文件 docs 修复将不能走 trivial/hotfix（除非授标注）。这是 fail-up 的代价，评审确认无法机械区分"措辞 vs 口径"。
- **10 分钟预算与形式面契约的张力**：字段+bindings+摘要呈阅的操作成本靠 scaffold 预填压回预算（AC1 验收把关）；若 lab 实测超时，回旋方向是砍申报字段（弱化机械面）——届时再呈。

## 六、gate③ 需你就 π2 做的显式动作（r25 定案）

账本中属 π2 复制事务链的是 **DES24-3..7 五项，保持 open**（DES24-1 平台指引与 DES24-2 AC1 矛盾已在本包 fixed，不属该链——r27 身份更正）。这五项不是被我方消化掉的，而是提请你在 gate③ 二选一：
- **改裁 π1 或 π3**（倾向 π1）：DES24-3..7 作为未选方案的出域项，先由生产方记 `rejected`+理由、再经 reviewer 复核转 `rejected-verified` 终结（两步，不一步直写终态），设计包即完整；
- **仍裁 π2**：DES24-3..7 **保持 open 不 waive**（waiver 的既有语义是接受风险，不能用作临时延期）；gate③ 只记录「条件选择 π2 + 回退 STEP2」，随后回 STEP2 补齐 design D7 缺口、**在原 ID 上复审至 verified**（不另开 successor 行），再次取得 gate③ 批准后方可实现。

## 七、范围问题——**已裁：(i) 正式侧延期，本 change 不做**（owner，2026-08-14）

你的 goal B 原文要求：E2E/视觉验证「从自觉项升格为对应 tier 的机械退出条件」。**hotfix 通道这半我能机械化；正式流程那半做不了**——正式 change 没有 `frontend-touched` 这类载体，要机械判「这次动没动前端」就必须给 gate 加一个新检查项，而我在本 change 里锁了「gate 七项分毫不动」这条不变量（为防回归）。

两条路：

- **(i) 正式侧延期（我倾向）**：本 change 只机械化 hotfix 通道；RUNBOOK 把全量档的 E2E+截图写成**流程要求**（比今天的自觉项强：写进矩阵、有 tier 归属），机械强制由后续 change 承接（需自带载体设计 + 新 gate 检查项 + AC）。代价：goal B 的一半这轮拿不到机械保证。
- **(ii) 本轮做全**：本 change 加做正式侧——新增 gate 第八项检查、给正式 change 设计前端触及载体、补全 AC。代价：本 change 体量再涨一截，且要显式把不变量从「七项不动」松成「七项行为不动、可加第八项」。

在你裁定前，设计与 tasks 按 (i) 书写并全程标注 pending。

**裁定结果（2026-08-14）：走 (i)，正式流程侧的机械化不在本 change，由后续 change 承接。** 决定性理由不是工作量，是载体的**所有权**：正式 change 要机械判「动没动前端」，只能把 `frontend-touched` 加进 `flow-state.md` 由 agent 自己填——而 agent 自己申报自己要不要交证据，正好把 `verification-profile` 坚持「人拥有」堵上的口子从另一边打开。这个所有权问题没有答案之前动手会开出坏口子。

**后续 change 的入场条件（写死在这里，免得下一轮重新推导）**：①载体设计并论证所有权（α 加 flow-state 字段／β 从 fix commit 推——正式 change 目前无 fix-ref 载体／γ 模块类型表——本轮已按 Q-2c 否决）；②gate 新增第八项检查，并显式把「gate 七项分毫不动」的不变量松成「七项**行为**不动、可加第八项」；③AC 全谱。三条缺一不可。

本 change 已落地的那半（增量档机械化）不受影响；RUNBOOK §2c 的全量档行文按 (i) 取「流程要求」形，不写「机械退出条件」。

---

## 八、实现与模拟实验之后：三件要你知道的事（owner 已裁，2026-08-14）

实现按 §七 的 (i) 完成（正式流程侧机械化仍 pending，等你裁）。374/374 测试绿，`verify --change hotfix-lane` GREEN，`gate --change hotfix-lane` 七项 PASS。未 commit、未 push。

模拟实验在 `~/terra/p0-hotfix-lane-lab/`——真 git 仓、真 CLI、无 fixture，三类承载对象各跑一遍并全部归档，四种 R3 各跑一遍并全部零写入拒绝，gate/status 两处缝也实证了。记录在该目录的 `NOTES.md`。

### 1. lab 抓到一个单测抓不到的缺陷（已修）

dry-run 打印的写集合说目的地是 `archive/2026-08-13-nothing-broken`，实际 move 用的是 `archive/2026-08-13T2230-nothing-broken`——归档戳含时分，我在打印计划时用了另一个日期函数。**两半各自都正确，合起来在对人说谎**：呈阅的写集合与真实写入不一致，而两步签收的全部意义就是「你看到的就是要写的」。已改为直接用 `archiveStamp(date)`。

这正是你坚持每轮做模拟实验的理由——单测各测各的，端到端才看得见接缝。

### 2. AC1 的手工文件预算，R2 形态不达标（结构性）——**已裁：改数字，不动机制**

> **owner 裁定（2026-08-14）**：改数字，不动机制。修订后的 AC1 = 命令数 ≤3 · 墙钟 ≤10:00 · 手工文件数：零 delta ≤1 · 含 delta 无点检 ≤2 · 含 delta 走点检（R2-whitelist）≤4 · 再叠 ui×frontend:yes ≤5。已同步 `gate3-ruling.md` §五。

| 形态 | 命令数 | 手工文件数 | AC1 预算 |
|---|---|---|---|
| 无代码结论 (R0) | 3 | 1 | ≤1 ✓ |
| 零 delta 琐碎修 (R1) | 3 | 1 | ≤2 ✓ |
| 白名单 delta (R2) | 3 | **4–5** | 原 ≤3 ✗ → **修订为 ≤4／≤5** ✓ |

命令数三形态全部达成。R2 超支的原因是结构性的：γ' 裁定要求一轮点检，而「一轮」按既有证据规则是**文档 + raw 两份**，再加状态文件与 delta 就已 4 份；若同时 frontend-touched，截图记录第 5 份。

我没有去凑这个数——预算是设计阶段的估计，裁定是你的，估计错了就报估计错了。压到 ≤3 只有两条路：把点检的 doc+raw 合并为一份（动既有证据规则，令通道留痕与正式流程分叉），或把 R2-whitelist 的点检降为可选（动 γ' 裁定本身，等于白名单块此后无人复核）。**owner 裁定：两条都不走，改数字。**

### 3. 补了一个裁定之外的 truth doc

裁定列了 `truth/new.md`、`truth/resolve.md`「建」。我另外建了 `truth/config.md`——因为 `verification-profile` 的公开函数落在 `lib/config.js`，而 config 本来就没有 truth doc，不补的话是**本 change 自己制造的新缺口**。这一笔超出裁定，如实报备；不要就删掉。**owner 未提出异议，保留。**

（另：`gate` 的 C6 现在报 `cli: no truth doc`——`lib/`…其实是 `bin/apriori.js` 的 dispatch 面没有 truth doc。这个缺口不是本 change 造成的，我没动它。）
