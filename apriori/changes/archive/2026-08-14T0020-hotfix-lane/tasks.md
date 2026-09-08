# tasks — hotfix-lane（STEP3；按 gate3-ruling.md 裁定收敛后的实现清单）

裁定组合：γ' · 无 no-test · 签收 d+d1 · Q-3=i（隐式 scoped verify）· 正式 trivial 半径否决 b · 评审 {R2}×{retain} · profile{ui,backend,fullstack,docs} · 无模块类型表（对称申报）· π1 · {f1} · t1 clean-tree · 无 hash= · ADDED 默认 R3 · runbook 4.1 · N=3 · 位置 a · 载体 c1' · p1 · k1 · v1 · w2 · λ1 · t1 · o1 · r1+r2 · s2 · 定位头必填 · gate 映射 m1。

未选方案（π2/π3、f2/f3、c1/c2/c3、k2、v2、m2/m3、o2/o3、s1/s3、Q-4b/c、Q-12=yes、类型表）**不实现、不测**——AC-I 中对应条目随裁定出域。

## T1 配置与词表面
- [x] T1.1 `lib/config.js`：读 `verification-profile` 行（值域 ui/backend/fullstack/docs；缺省=未声明；未知值 F1），沿 id-pattern 行模式
- [x] T1.2 `templates/process-config.md`：新增 verification-profile 四列行 + 注释（design-drafts/process-config-rows.md 为准；module-type-map 行**不加**——裁定不引入）
- [x] T1.3 测试：缺省不升格、未知值 F1、pipe 转义沿用现行规范

## T2 bundle 形态与 scaffold
- [x] T2.1 `lib/new.js`：`hotfix new <name>` scaffold——`hotfix-state.md`（头部字段骨架 + `## Conclusion` 占位 + `## Bindings` 节）、`specs/`（空，可选 delta）、`evidence/`（空）
- [x] T2.2 状态文件 parser（新 `lib/hotfix.js`）：头部字段块、`## Conclusion`/`## Bindings`/`## Gates` 节切分（未知头字段/未知二级节 F1）
- [x] T2.3 身份互斥：`flow-state.md` 与 `hotfix-state.md` 并存 = F1（检查加在 status/preflight 消费点）；同名 scaffold 冲突拒
- [x] T2.4 测试：HL-F-32/33/34a/34b、HL-I-01/02

## T3 字段契约与分级函数（`lib/hotfix.js` 核心）
- [x] T3.1 字段契约表实现（design D1.1）：change-kind / touched-modules / fix-ref(v1) / frontend-touched / backend-touched / affected-scenario-ids / delta / decisions
- [x] T3.2 跨字段不变量表（含 kinds 互斥与一致性、定位头必填、touched ⊇ delta 模块、doc-fix 全套）
- [x] T3.3 判定次序表 → 输出二元组 (半径, R2 子型)；γ' 白名单（`blast: low` 命中降 R2；marker 保留、delta 自授/扩权 F1）；ADDED 默认 R3
- [x] T3.4 R3 拒绝的指路文案（指向正式流程）
- [x] T3.5 测试：HL-F-01..41（去掉类型表相关 HL-G-21..26）、HL-G-01..20、HL-N-19/31/33/42/43/44/53/54/60/69/70

## T4 bindings（c1' 载体）
- [x] T4.1 `## Bindings` 节内 keyed 行 parser（键前置、首 marker 切分、尾冒号键、singleton 行首式）
- [x] T4.2 需求函数 f(change-kind, 目标键, p1)：code-*+目标键→必 1；doc-fix→0；零 delta→0（p1）；no-code→0
- [x] T4.3 载体互斥：delta 块内/独立文件出现 bindings 定式 = F1
- [x] T4.4 测试：HL-B-01..09、11..14、16..22（去 Q-4b/c 与 p2 相关）、HL-N-16/18/29..32

## T5 验证证明（Q-3=i）
- [x] T5.1 `lib/spec-runner.js`：scoped 运行入口（裸 ID 集——k1 裁定，无 occurrence 复合键）；verdict 语义不动
- [x] T5.2 scope 集合：(delta scenarios ∪ affected-scenario-ids)；无 no-test 故无差集
- [x] T5.3 双阶段 oracle：preflight scoped GREEN；post-archive whole-store 互斥有序函数（fail>0→RED；pass>0→GREEN；否则 UNBOUND）
- [x] T5.4 测试：HL-V-01..04、08..11；HL-N-30 出域（k2 未选）

## T6 profile 证据（π1 + {f1} + 无 hash）
- [x] T6.1 截图观察记录 `evidence/screenshots.md`：行定式 `- path= obs= time= baseline= run=`（**hash= 出现即 F1**）；path 限仓根相对 `apriori/tmp/` 下；逐组件 symlink/realpath containment
- [x] T6.1b **档参数化（owner 裁定 D）**：增量档 advisory（缺失打印提示不阻塞、n/a 行不强制；提供即全谱校验）——**全量档强制项（HL-E-03a/10/11a）不在本 change 实现基线**，随 decision-summary §七 的范围裁定归属 successor change；若 owner 裁 (ii) 则移回本 change 并补 gate 第八项
- [x] T6.2 f1 新鲜度：工件基线行 == preflight HEAD；clean tree（t1；排除集 apriori/changes/** + apriori/tmp/**）
- [x] T6.3 `ui: not-applicable — <理由>` 行——增量档：可选，出现即校验（本 change 实现）；全量档强制：**pending 范围裁定，不在本基线**
- [x] T6.4 E2E 工件 PASS 行解析（增量档 n/a；**全量档的机械强制不在本 change 范围**——见 design D2.2 范围收窄；正式流程侧只做 T10.1 的 RUNBOOK 文字升格）
- [x] T6.5 测试：HL-E-01/02/**03b/03c**/04/05/09/**11b**/12..14、HL-K-02/03、HL-V-29..31/33（**HL-E-03a/10/11a 属全量档强制，pending 范围裁定，不在本基线**）

## T7 归档 preflight 与三段事务
- [x] T7.1 F1 global preflight（字段/不变量/分级/载体/摘要/scoped verify/证据/clean-tree 全谱，零写入）
- [x] T7.2 digest-core（tag+bytes 双长度前缀、UTF-8 序、业务实体正列）
- [x] T7.3 d1 令牌（core + store/truth 基线域；无 artifact 域——未裁 f2）+ `approval.md`（command-owned；`token`/`date`/`grade`）
- [x] T7.4 三段写集合 stores→truth→bundle move（逐段失败报告指名+幂等续跑）；truth Decisions 追加（t1 分配 ID、o1 基线校验、s2 supersession、r1+r2 freshness advisory）
- [x] T7.5 CLI：`hotfix archive <name>`（dry-run 呈阅）+ `--approve <token>`
- [x] T7.6 测试：HL-T-01..13、HL-R-01..05/23a..25、HL-N-36

## T8 评审面（{R2}×{retain}）
- [x] T8.1 verdict 行定式（`^VERDICT:` + role/digest 必填、digest 64 位小写、boundary 仅 γ' 点检时）
- [x] T8.2 raw 定式唯一 verdict 区 + 轮次命名 `round-<n>.md`/`-raw.txt` + 最大 n 消费
- [x] T8.3 投影：R2（code）单轮点检；R2×docs 双职责双 verdict；R0-with-decisions 点检 decisions↔结论；R1 无点检
- [x] T8.4 `lib/check.js` 与 RUNBOOK phrase table 收录新短语（`VERDICT: no findings` / `VERDICT: gaps found` 入 VERDICT_PHRASES + 双语 §5 表新增两行 + 尾注文法说明；CK-17）——**本条一度被误勾为完成，实际未做，答 §七/§八 时自查发现并补齐**
- [x] T8.5 测试：HL-R-06..13/16..20/22、HL-N-47..49

## T9 gate 映射（m1）与正式流程回归
- [x] T9.1 `lib/gate.js`：识别 hotfix bundle → 明确拒绝并指路 hotfix preflight（**七项检查逻辑分毫不动**）
- [x] T9.2 `lib/status.js`：列出并标注 hotfix
- [x] T9.3 正式 trivial 半径否决 b：behavior/R3 机械否决出 trivial；whitelist R2 交 human 判定
- [x] T9.4 测试：HL-X-01..09（含 X-02b 正式 trivial 交叉、X-09 范围断言）、HL-R-31（m1）、HL-C 逐格（去 π2/f2 相关格）

## T10 文档与 KB
- [x] T10.1 RUNBOOK.md / RUNBOOK_cn.md 双语新节（hotfix lane + 验证缩放 + phrase-table delta + platform note 缩为一句）；**正式流程侧措辞按范围裁定取形：(i) 写「流程要求」、(ii) 写「机械退出条件」**；runbook-version 4.0→4.1
- [x] T10.2 docs/cli.md + docs/cli_cn.md：hotfix 命令面
- [x] T10.3 CHANGELOG
- [x] T10.4 新 truth：`truth/hotfix.md`；`truth/new.md`、`truth/resolve.md`（裁定：建）
- [x] T10.5 `check --self` 绿

## T11 收尾
- [x] T11.1 AC1 lab：`~/terra/p0-hotfix-lane-lab/` 三类各一遍 + 四种 R3 拒绝 + gate/status 缝（NOTES.md 为记录）。**命令数 ≤3 三形态全部达成；手工文件数 R0=1 ✓ / R1=1 ✓ / R2=4–5 ✗（超 ≤3 预算——γ' 点检要求 round 文档+raw 成对，属结构性超支，如实上报不修改数字，见 decision-summary §八）**
- [x] T11.2 AC8 fixture：`fixtures/ac8-1012769/`（README 首句即标注非原件）；机械复核判定 = (R3, n/a) 不予准入，且该判定正是要点——拒绝在十秒内发生并指路，而非记录根本不被写下；可承载的那一半（no-code + 上线后学到的业务事实）另列
- [x] T11.3 存量测试全绿（374/374）；`verify --change hotfix-lane` GREEN；`gate --change hotfix-lane` 七项自证

**顺序建议**：T1→T2→T3→T4→T5→T6→T7→T8→T9→T10→T11（T3 是核心，T7 依赖 T3..T6）。
