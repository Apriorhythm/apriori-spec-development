<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r2 transport=codex-exec-wsl-proxy -->

复审结论：r1 的 DES-3/4/5/10 已实质收口，其余若干条虽有明显推进，但仍存在契约或定式缺口。新鲜走查共发现 10 条开放问题。

1. **DES-1｜阻断｜D6 仍未定义完整、唯一的 bundle 机器语法。**  
   依据：[design.md:115-123](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:115)定义了若干局部定式，但仍缺：

   - `hotfix-state.md` 中 name/date/承接类别/conclusion 的位置、基数、占位符拒绝规则；
   - c1 文件路径及 c2/c3 keyed、singleton 声明行的完整语法和剥离边界；
   - 本仓/外仓 `fix-ref` 的可判 grammar；
   - Q-3=ii 工件的固定路径/文件名；
   - approval 记录的固定位置与结构。

   prior art 的结论强制和身份头属于已引用契约，不是实现者可自由决定的细节。当前仍可能产生多个互不兼容的合法实现。

2. **DES-2｜阻断｜D6 把评审摘要与 d1 签收令牌错误合并为一个摘要域。**  
   依据：[design.md:118](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:118)只定义一个“评审/签收摘要算法”。两者的契约域并不相同：

   - 评审摘要域是 bundle 业务实体、全部申报字段和被评代码基线；
   - prior-art d1 签收令牌还必须绑定各目标 spec store、truth 基线；
   - f2 又要求 d1 纳入证明工件哈希和代码基线，截图哈希也须纳入。

   当前算法没有 store/truth 基线，也没有证明工件及截图哈希。若把它们补入公共摘要，又会无依据扩大评审摘要域。必须拆成两个明确算法或定义公共核加各自扩展域。

3. **DES-3｜高｜评审摘要算法可能漏掉唯一无条件必填的 conclusion。**  
   依据：[design.md:118](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:118)按“业务实体文件”散列，但未正列文件集合；c1′ 下又规定状态文件“仅取 Bindings 节字节”，申报字段随后单独加入，却没有单独抽取 conclusion。若 conclusion 按 prior art 与 bindings 同住 `hotfix-state.md`，它会被排除在摘要外，修改结论不会令 verdict 失配。这违反 req-v41 的实体优先摘要契约。

4. **DES-4｜高｜Q-3=ii 与截图定式不足以承载已定义的新鲜度 oracle。**  
   依据：[design.md:120-121](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:120)存在以下缺口：

   - ii 工件只有 `baseline` 和 `run-id`，没有 f3 必需的 timestamp；
   - f2 工件哈希及截图文件枚举/哈希没有序列化位置；
   - 截图行以裸 `|` 分隔，却未定义 path、观察文本、fix-ref 或 run-id 含 `|` 时的转义；
   - 没有规定 ISO 时间接受的时区/精度和新鲜度比较输入。

   因而 [cli-checkpoints.md:28-32](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:28)列出的 f2/f3 oracle 无法由 D6 格式唯一实现。

5. **DES-5｜高｜新 verdict 行定式与 state A 的 verdict 接口正面冲突。**  
   依据：[design.md:122](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:122)规定 `VERDICT(inspection): ...`，但现行协议要求机器行以 `VERDICT:` 开头，[lib/gate.js:153](/mnt/d/Workbench/misc/apriori-spec-development/lib/gate.js:153)也只识别 `^VERDICT:`；RUNBOOK 的 phrase table 还要求 review verdict 来自固定字符串集合。当前格式会让既有 evidence 检查把评审文档视为“无 verdict”。设计既没有选择兼容格式，也没有把 `lib/check.js`、phrase table 和 gate parser 的扩展列为触点。

6. **DES-6｜高｜评审两轴表有一个错误投影。**  
   依据：[design.md:85](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:85)把 `none×retain` 下所有 R0+decisions 写成 n/a；req-v41 规定 profile=docs 且 docs-P8=retain 时，即使 code-review-scope=none，R0-with-decisions 仍须在同轮检查 decisions↔结论一致性。表 C 缺 profile 维度后静默吞掉了该条件分支，因此并非唯一全域投影。

7. **DES-7｜高｜D1.4 仍预裁了 gate③ 尚未决定的实现拓扑。**  
   依据：

   - [design.md:49-53](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:49)没有给出 `apriori hotfix` 的唯一 CLI grammar：同一 case 同时承担 scaffold 和 archive，却未定义 `new/archive` 子动作或判别方法；
   - D1.4只覆盖复用 `changes/` 的位置候选；若 Q-8 内嵌位置候选选择独立 `hotfixes/`，`resolve/status/verify/archive` 的路径触点完全不同；
   - gate 只映射 m1/m2，漏掉仍在 prior-art 候选空间的 m3；
   - “复用 archive-merge 的原子改名原语”与 state A 不符：该模块导出了 parser/merge 等接口，但没有通用三段提交原语；hotfix 的 stores→truth→bundle 事务需要新设计，不能表述成已有复用点。

8. **DES-8｜高｜D3 和 decision-summary 仍未完整呈现 prior-art 联动候选。**  
   依据：[design.md:94-109](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:94)虽补了六组，但仍漏：

   - a/b/c 签收与 π2/π3 的合法组合；
   - `{f1}`、`{f3}` 与签收的非绑定合法组合；
   - m2-α/m2-β 与 e 子案的联合选择；
   - w1-strict/w1-weak，以及 w2×选填全缺的合法但降级后果。

   [decision-summary.md:42](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:42)又把顶层 Q-9 错标成“KB 生命周期”；顶层 Q-9 实际是 hotfix-channel bundle 去留，KB 生命周期应命名为 Q-8/Q9。摘要也没有枚举位置 a/b、p1/p2、k1/k2、m1/m2/m3、v1/v2、w1/w2、s1/s2/s3 等完整候选，只让 owner 回看 req，未满足 AC-D5 的“一页全待拍板清单”。

9. **DES-9｜高｜cli-checkpoints 仍不是可追踪的 AC-I 全谱 scenario 映射。**  
   依据：[cli-checkpoints.md:4-13](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:4)用 `HL-GRADE-01..07` 承载远多于七个互异错误例，`11..18` 同样列出超过八个判定分支，无法确定哪个 ID 对应哪个 oracle。更关键的是：

   - `HL-REV-06`只是“表 C 全六格逐格投影”的元要求，没有逐格场景；
   - `HL-REG-05`只是“每格至少一正一反”的未来任务，没有列出这些正反例；
   - 缺 t2×无评审的合法正例；
   - 缺 process-config 多条同名行按 state A 语义处理的例；
   - 缺 w1/w2、x1/x2、m1/m2/m3 等所裁分支的参数化验收。

   因此 DES-9/11 的核心要求——“漏项可列、逐场景可追踪”——仍未真正收口。

10. **DES-10｜中｜RUNBOOK 草案仍未交付 req 所要求的双语 delta。**  
    依据：[runbook-hotfix-lane-section.md:1](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/runbook-hotfix-lane-section.md:1)只是中文共同蓝本，并把英文、中文 canonical 文本推迟到实现 change。req-v41 AC-D4 要求本设计包的 spec delta 草案覆盖 RUNBOOK 新节双语；“以后必须同步”的义务不能替代可评审的英文和中文措辞。尤其 verdict、R3 指路、no-test 债务和外仓弱保证均是语义敏感文本，当前无法检查两种语言是否等价。

VERDICT: 10 issues open