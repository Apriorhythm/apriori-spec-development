# Issue ledger — hotfix-channel

<!-- recorded on behalf of the reviewer (codex read-only sandbox), R2 transcription rule; raws: review/*-raw.txt -->

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | hotfix 身份与 Q2/Q3 未覆盖防降级不变量、命名空间生态代价及错误的 Q5 引用 | med* | STEP0·r1 | verified — r2 核验：B2 两案代价+身份不变量四条成立 |
| REQ-2 | Q1 缺少真正保留 gate④ 的候选，现有 sign-off 证据不可认证 | high* | STEP0·r1 | verified — r5 核验：d1-ext 移除、排除域无第四写入面成立 |
| REQ-3 | Decisions 追加缺少目标、格式、冲突、重跑及异常契约 | high* | STEP0·r1 | verified — r4 核验：TOCTOU 诚实披露+o1/o2/o3+AC5 缩窄成立 |
| REQ-4 | “原子提交”强于 state A，spec + truth + move 的事务和恢复边界未声明 | high* | STEP0·r1 | verified — r3 核验：F1/F2 分离、部分提交/恢复/completion point 完整 |
| REQ-5 | no-test 所依赖的机器绑定判断、operation 范围及副作用未定义 | high* | STEP0·r1 | verified — r6 核验：正交声明+载体强制+ii/iii 边界+AC3 成立 |
| REQ-6 | 纯结论归档与 AM-17/`discoverDeltas` 的 zero-delta fail-closed 冲突 | high* | STEP0·r1 | verified — r8 核验：e1-β 聚合契约+AC13 逐项成立 |
| REQ-7 | 强制 conclusion 及必填 header 没有负向 acceptance | med* | STEP0·r1 | verified — r2 核验：B7/AC7 负向全谱成立 |
| REQ-8 | AC1 缺少客观计时协议或代理指标阈值 | low* | STEP0·r1 | verified — r2 核验：AC1 阈值与计时边界成立 |
| REQ-9 | AC8 的真实 fixture 不在声明输入中，预期断言不足 | med* | STEP0·r1 | verified — r2 核验：AC8 重构 fixture 诚实且钉死 |
| REQ-10 | 开放问题清单遗漏正文标"裁"的选择：B3 ID ownership 与 B5 机制选择无 Q 承接 | med* | STEP0·r2 | verified — r3 核验：Q6-Q8 承接+次级裁项声明成立 |
| REQ-11 | g2 verify 豁免形态使无测试场景不阻塞 GREEN，属放宽 fail-closed 绑定，与别改清单冲突 | high* | STEP0·r3 | verified — r4 核验：g2 移除+g2' 仅报告级成立 |
| REQ-12 | KB 生命周期缺 Contract freshness 后果与 Decision supersession 形态 | high* | STEP0·r3 | verified — r5 核验：r2 补充定位+AC12 资格/升格断言成立 |
| REQ-13 | spec-preserving 紧急代码修复无合法形态与测试规则 | high* | STEP0·r4 | verified — r9 核验：z2 移除+成对半缺+AC14 扩全部成立 |
| REQ-14 | 重复 scenario ID 使声明目标键不唯一（state A 允许 duplicate 出现） | high* | STEP0·r5 | verified — r6 核验：键唯一不假设+k1/k2 完整成立 |
| REQ-15 | 倾向载体 c1 需三个手工文件，与 AC1 ≤2 上限冲突 | med* | STEP0·r5 | verified — r6 核验：三文件冲突明示+c1'/调阈值出路+AC1 重核算成立 |
| REQ-16 | 外仓 fix-ref 不可被本仓 C6/source-files 观察，产生假 clean 信号，后果与 AC 未声明 | high* | STEP0·r9 | verified — r12 核验：消费边界/λ2 移除/摘要同步成立 |
| REQ-17 | w1 未闭合本仓但 C6 不可观察路径（映射缺口 n/a 违背可观察承诺） | high* | STEP0·r12 | verified — r13 核验：strict/weak 拆分+对称披露+三态负向 fixture 成立 |

\* Risk 列为生产方评级（reviewer r1/r2 未给分级；依各 finding 风险段措辞折算），非 reviewer 原话。
