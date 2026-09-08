# 未来 CLI 检查点——scenario 级描述（AC-I 全谱映射；一例一 ID 可追踪；设计阶段不含实现；HL- 为草案占位，正式 ID 归实现 change）

## 字段契约与不变量（HL-F）
- HL-F-01 change-kind 缺失拒 · HL-F-02 change-kind 未知值拒 · HL-F-03 doc-fix 非 docs profile 拒 · HL-F-04 docs profile 下 code-* 拒
- HL-F-05 touched-modules 空拒 · HL-F-06 未知模块拒 · HL-F-07 重复模块拒 · HL-F-08 词表外拒 · HL-F-09 touched⊉delta 模块拒 · HL-F-10 doc-fix touched≠delta 模块集拒 · HL-F-11 doc-fix touched 缺失拒
- HL-F-12 fix-ref 半缺拒 · **HL-F-13a 本仓 grammar 反例拒 · HL-F-13b 外仓 grammar 反例拒** · HL-F-14 doc-fix fix-ref 缺失拒 · HL-F-15 v2 案 ref 不存在拒 · HL-F-16 v1 案同输入通过
- HL-F-17 frontend-touched 应现而缺拒 · HL-F-18 应缺而现拒 · HL-F-19 未知值拒 · **HL-F-17b/18b/19b backend-touched 同三态独立例** · HL-F-20 doc-fix 触及字段出现拒
- HL-F-21 affected-ids 空拒 · HL-F-22 未知 ID 拒 · **HL-F-23a** k1 案 duplicate 拒 · **HL-F-23b** k2 案复合键通过
- HL-F-24 delta 不可解析拒 · HL-F-25 doc-fix 零 delta 拒 · HL-F-26 decisions malformed 拒
- HL-F-27 no-code+delta 拒 · HL-F-28 no-code+touched 拒 · HL-F-29 no-code+fix-ref 拒 · HL-F-30 no-code+affected 拒 · HL-F-31 no-code+触及字段拒
- HL-F-32 状态文件头字段重复拒 · HL-F-33 占位模板未改拒 · HL-F-34a conclusion 缺失拒 · HL-F-34b 空白拒 · **HL-F-35 kinds 1×2 互斥违反拒 · HL-F-36a1 含1而 kind=no-code 拒 · HL-F-36a2 code-* 而不含1 拒 · HL-F-36b 含2而非 no-code 拒（单向） · HL-F-36c1 含3而无 decisions 拒 · HL-F-36c2 有 decisions 而不含3 拒 · HL-F-37 未知头字段拒 · HL-F-38 未知二级节拒 · HL-F-39 date 语法非法拒 · HL-F-40 列表分隔语法非法拒 · HL-F-41 k2 键含保留字符拒**

## 分级函数（HL-G）
- HL-G-01 REMOVED→(R3) · HL-G-02 RENAMED→(R3) · HL-G-03 union≥2 混合 bundle（代码 A+Decision B）→(R3) · HL-G-04 decisions supersession→(R3) · HL-G-05 decisions >N→(R3)（N 参数化） · HL-G-06 双端申报案 yes+yes→(R3) · HL-G-07 双端类型表派生案→(R3) · HL-G-08 无 scenario 块→(R3)
- HL-G-09 MODIFIED 无标注→(R3) · HL-G-10 blast:low 命中→(R2,whitelist) · HL-G-11 Q-12=yes 案 ADDED-only 单模块含 scenario→(R2,whitelist) · HL-G-12 Q-12=no 案同输入→(R3) · **HL-G-13a** doc-fix MODIFIED 标注命中→(R2,whitelist) · **HL-G-13b** 未标注→(R3)
- HL-G-14 code-behavior→(R2,behavior) · HL-G-15 code-trivial→(R1,n/a) · HL-G-16 no-code→(R0,n/a) · HL-G-17a R3 分支 (R3,n/a) 断言 · HL-G-17b R1 分支断言 · HL-G-17c R0 分支断言 · HL-G-17d R2 双子型派生断言 · HL-G-18 选填案次序 0.5 全缺→(R3)（必填案同输入 F1）
- HL-G-19 blast marker 删除拒 · HL-G-20 delta 自授标注拒 · HL-G-21 类型表词表外键拒 · HL-G-22 重复模块映射拒 · HL-G-23 未知类型值拒 · HL-G-24 行不可解析拒 · HL-G-25 未覆盖被触模块→保守(R3) · HL-G-26 整表缺失回退申报案 · HL-G-27 process-config 多条同名行按 state A 现行语义例

## bindings（HL-B）
- HL-B-01 c1 应 1 缺失拒 · HL-B-02 c1 应 0 文件存在拒 · HL-B-03 c1' 应 1 节缺失拒 · HL-B-04 c1' 应 0 空节拒 · HL-B-05 节标题重复拒 · HL-B-06 嵌套拒 · HL-B-07 错序拒 · HL-B-08 域外 bindings 行（流程节内）拒
- HL-B-09 keyed 缺行拒 · HL-B-10 多行拒 · HL-B-11 键重复拒 · HL-B-12 c1' 多目标键正例（节内两行通过） · HL-B-13 c2/c3 多目标键正例（两块各一行通过） · HL-B-14 singleton 恰一行通过 · HL-B-15 singleton 多行拒 · HL-B-16 零 delta 出现键行拒
- HL-B-17 doc-fix 带任何 bindings 拒 · HL-B-18 p2 案零 delta 无 singleton 拒 · HL-B-19 p1 案零 delta 出现 singleton 拒 · HL-B-20 载体互斥：裁 c1 而块内出现行拒 · HL-B-21 裁 c1' 而独立文件存在拒 · HL-B-22 p2×c2/c3 非法组合拒
- **HL-B-29 c3 no-test 注释合法例 · HL-B-30 c3 随块合入 store（不剥离）断言 · HL-B-31 c2 裸行剥离（恰删该行）断言 · HL-B-32 keyed 行键前置语法非法拒**
- HL-B-23 Q-4a 案 no-test 行拒 · HL-B-24 Q-4b 案 R1 singleton no-test 通过 · HL-B-25 Q-4b 案 R2 no-test 拒 · HL-B-26 Q-4c 案 keyed 混合通过 · HL-B-27 Q-4c 案 singleton no-test 通过 · HL-B-28 no-test 理由空值拒（一切载体）

## 验证证明（HL-V）
- HL-V-01 scope 集合：D1=no-test+E1 affected→scope={E1} · HL-V-02 E1 GREEN 通过 · HL-V-03 E1 RED 拒 · HL-V-04 E1 UNBOUND 拒
- HL-V-05 空 scope：测试工件缺席通过 · HL-V-06 存在拒 · HL-V-07 交叉：R2-behavior×ui×frontend:yes（测试证明 n/a 时截图按档——增量档 advisory，owner 裁定 D；原「截图仍强制」措辞属被裁方案）
- HL-V-08 preflight 不消费排除键 per-ID 结果（排除键 RED 不改准入） · HL-V-09 归档后同 RED whole-store 阻塞 · HL-V-10 互斥有序函数：pass+fail 混合→RED · HL-V-11 skip-only→UNBOUND
- HL-V-12 ii：缺 scope ID 拒 · HL-V-13 FAIL 拒 · HL-V-14 结果缺失拒 · HL-V-15 重复 ID 拒 · HL-V-16 不可读拒 · HL-V-17 scope 外 ID 拒（域外即拒） · HL-V-18 结果键集==scope 正例 · HL-V-19 非法结果值拒
- HL-V-20 ii×Q-4c：behavior×ii×c×p2 singleton（证明域 n/a+留痕） · HL-V-21 delta×ii×c 混合键（tests 键证据 PASS+no-test 键理由） · HL-V-22 重叠键不复活（差集后 scope）
- HL-V-23 f1 缺工件基线行拒 · **HL-V-23b** f1 基线值≠HEAD 拒 · **HL-V-24a** f2 案工件内无字段通过 · **HL-V-24b** d1 摘要缺工件哈希拒 · **HL-V-24c** 缺代码基线拒 · HL-V-25 f3 案缺时间戳拒 · **HL-V-25b** f3 时间戳≤最大 mtime 拒 · HL-V-26 f3 案基线字段缺失非错误 · **HL-V-27a** {f1+f2}×d+d1 双查正例 · **HL-V-27b** 工件基线行失配拒 · **HL-V-27c** 摘要哈希失配拒 · HL-V-28 {f2}×d+d2 非法配对拒
- HL-V-29 clean-tree：sibling bundle dirty 不拒 · HL-V-30 spec/config/truth/RUNBOOK dirty 拒 · HL-V-31 含评审组合 untracked 拒（t2 不豁免） · HL-V-32 t2×无评审组合 untracked 忽略正例 · HL-V-33 f2/f3 案 clean-tree 同样强制

## profile 证据（HL-E）
- HL-E-01 E2E 工件 FAIL 拒 · HL-E-02 PASS 行解析通过 · HL-E-03a 全量档截图记录存在性强制（缺失不过）**〔pending 范围裁定：属正式流程机械面，不在本 change 基线〕** · HL-E-03b 增量档缺记录行 → advisory 提示且归档通过 · HL-E-03c 增量档提供 malformed 记录行 → F1（提供即校验） · HL-E-04 基线==HEAD（本仓）正例 · HL-E-05 基线≠HEAD 拒（旧图复用） · HL-E-06 外仓 equality（==fix-ref）例 · HL-E-07 混合运行标识拒 · HL-E-08 f2 案截图哈希失配拒 · HL-E-09 无法表达字符路径拒（fail-closed 无转义）
- HL-E-10 not-applicable 理由非空（全量档强制）**〔同 pending〕** · HL-E-11a 全量档 frontend:no 须走 n-a 行 **〔同 pending〕** · HL-E-11b 增量档 frontend:no 无 n-a 行亦通过 · HL-E-12 docs 列 check oracle · HL-E-13 doc-fix×retain 通过 · HL-E-14 ×waive 准入拒
- HL-E-15 w2 案 unverifiable 声明行 · HL-E-16 逐模块 n/a 附因（混合 bundle decisions 模块照常查） · HL-E-17 无 touched∩stale 假命中 · HL-E-18 w2×选填全缺仅通用提醒 · HL-E-19 w1-strict 映射缺口 F1 拒 · HL-E-20 w1-weak advisory 披露例 · HL-E-21 x1 案外仓证据放行+明示 · HL-E-22 x2 案拒

## 评审与签收（HL-R）
- HL-R-01 摘要域：仅改流程节不失配 · HL-R-02 仅改 Bindings 节失配 · HL-R-03 改 Conclusion 失配 · HL-R-04 改任一申报字段失配 · HL-R-05 HEAD 变化失配强制复审
- HL-R-06 raw 缺 verdict 区拒 · HL-R-07 marker 重复（追加攻击）拒 · HL-R-08 摘要不等拒 · HL-R-09 verdict 区与评审文档不一致拒 · **HL-R-10a** 双职责基数错（仅一行）拒 · **HL-R-10b** 顺序错（p8 前）拒 · HL-R-11 单职责恰一行 · HL-R-12 `^VERDICT:` 前缀兼容 · **HL-R-12b** 结论短语枚举外值拒 · **HL-R-12c** γ' 边界否定短语拒绝归档
- HL-R-13 γ' 点检职责（完整 old/new 输入+边界 verdict 行断言）
- 表 C 逐格（六组合×五半径列，非 n/a 格逐一）：HL-R-14 none×retain×R0+decisions（docs profile 点检/其他 n/a 双例） · HL-R-15 none×retain×R2docs 仅 P8 单 verdict · HL-R-16 R2×retain×R0+decisions 点检 · HL-R-17 R2×retain×R2code 单轮点检 · HL-R-18 R2×retain×R2docs 双职责双 verdict · HL-R-19 all-code×retain×R1 点检 · HL-R-20 all-code×retain×R2code 点检 · **HL-R-21a/b/c waive 列 doc-fix 准入拒（none/R2/all-code 各一）** · HL-R-22 R2×waive×R2code 点检照常（waive 只辖 docs-P8）
- **HL-R-23a/b/c/d 签收 d+d1 令牌失配四例（bundle 业务/store/truth/部分提交重跑各一）** · HL-R-24 approval 排除域写入不失配 · HL-R-25 grade 行入 dry-run 与 approval
- **HL-R-26 签收 a 案直接写入+approval 记录时间 · HL-R-27a b 案缺 --signed-off-by 拒 · HL-R-27b 携参通过 · HL-R-28a c 案纯结论免签通过 · HL-R-28b c 案有回写走 b 式 sign-off · HL-R-29 d+d2 案 CAS 重查失配拒 · HL-R-30 d+d3 案两步无校验通过（弱化如实） · HL-R-31 gate 映射 m1 案拒绝指路 · HL-R-32 m2-α 案 C3 适配 hotfix-state 合法性 · HL-R-33 m2-β 案 PASS 边界明示行 · HL-R-34 m3 案检查全在 preflight（gate 不适用）**

## 身份与事务（HL-I/HL-T——adopted prior art 契约面，r4 DES4-8）
- HL-I-01 flow-state 与 hotfix-state 并存各消费点 fail-closed · HL-I-02 同名 scaffold 冲突拒 · HL-I-03 status 列出并标注 hotfix · **HL-I-04a 轮次命名定式正例（最大 n 消费） · HL-I-04b 前导零命名拒 · HL-I-04c 任意轮次缺对拒**
- HL-T-01 stores 段 F2 注入 · HL-T-02 truth 段注入 · HL-T-03 bundle move 段注入（各：已完成段保持+报告指名） · HL-T-04 重跑幂等续完 · HL-T-05 F1 任一项 preflight 拦截=全局零写入 · HL-T-06 truth 目标缺失拒 · HL-T-07 Decisions 节重复拒 · **HL-T-08a truth 目标 symlink 拒 · HL-T-08b 逃逸路径拒** · HL-T-09 条目 ID 冲突拒 · HL-T-10 同 ID 同内容重跑 no-op · HL-T-11 异内容 conflict · HL-T-12 写入间隙外部改 truth→conflict（o1 案窗口如实） · **HL-T-13a s2 案原子更新+呈阅含旧条目 · HL-T-13b s1 案冲突拒绝+升格指引**
- **HL-E-23 π2 案截图入 bundle 归档载体断言 · HL-E-24 π3 案 hash 字段必需（缺失拒）**

## 正式流程回归（HL-X）
- HL-X-01 正式 change gate 七项行为无变 · HL-X-02 正式 trivial 恒 tests+GREEN（Q-4 各案零继承） · **HL-X-02b 正式 trivial 缺截图仍通过，但 tests/verify GREEN/consistency review 缺一仍拒（advisory 不是验证豁免泄漏）** · **HL-X-09 正式流程侧机械强制不在本 change 范围的断言（RUNBOOK 文字升格；gate 无新检查项）** · HL-X-03 R2-behavior/R3 机械否决出 trivial · HL-X-04 Q-5b 案 whitelist R2×trivial 下限独立断言（code scoped GREEN/docs check+retain） · HL-X-05 AM-17 对普通 archive 不变 · HL-X-06 verify 三态/verdict 语义不变 · HL-X-07 存量测试全绿 · HL-X-08 verification-profile 缺省=不升格、未知值 F1

## 耦合表逐格（HL-C）——design D2.3 表 A **全部格**各一正一反（"同左"格独立展开）
- R0 行：HL-C-01/02 ×未声明（正：结论归档/反：带触及字段拒） · HL-C-01b/02b ×backend · HL-C-01c/02c ×docs · HL-C-01d/02d ×ui · HL-C-01e/02e ×fullstack
- R1 行：HL-C-03/04 ×未声明（正 scoped GREEN/反 RED 拒） · HL-C-03b/04b ×backend · HL-C-05/06 ×ui frontend:yes（正：带记录行通过；反：无记录行 → advisory 提示且通过——增量档不拒，owner 裁定 D） · HL-C-05b ×ui frontend:no（n-a 行） · HL-C-05c/06c ×fullstack · HL-C-15 ×docs n/a 不可达断言
- R2w 行：HL-C-07/08 ×未声明 · HL-C-07b/08b ×backend · HL-C-09/10 ×docs（正 check+retain/反 waive 拒） · HL-C-07c/08c ×ui · HL-C-07d/08d ×fullstack
- R2b 行：HL-C-11/12 ×未声明 · HL-C-11b/12b ×backend · HL-C-13/14 ×ui · HL-C-13b/14b ×fullstack · HL-C-16 ×docs n/a 断言
- R3 行：HL-C-17a-e 五 profile 各一拒绝断言

## 新定式补例（HL-N，r5 DES5-9）
- HL-N-01 k2 端到端正例（复合键贯穿 scope/bindings/ii 工件） · HL-N-02 k2 序号非法（0/前导零）拒 · HL-N-03 k2 键中途坍缩为裸 ID 拒
- HL-N-04 π3 哈希内容失配拒（非缺字段） · HL-N-05 round 前导零命名拒 · HL-N-06 低轮次孤立 doc/raw 拒 · HL-N-07 boundary 缺失（γ' 点检案）拒 · HL-N-08 boundary 域外出现拒
- HL-N-09 truth 无 ## Decisions 节拒 · HL-N-10 malformed 条目拒 · **HL-N-11a o2 案锁互斥断言 · HL-N-11b o3 案串行化断言** · HL-N-12 s3 案自由追加弱化如实例（参数化）
- HL-N-13 路径含 .. 拒 · HL-N-14 末端 symlink 拒 · HL-N-15 非普通文件拒 · HL-N-16 keyed 首 marker 切分例（理由含 ': tests:' 仍唯一解析） · HL-N-17 c3 值含 --> 拒 · HL-N-18 c1' 容器内非声明内容拒
- **HL-N-85 ext-artifact 第五域序断言 · HL-N-86a 字面同路径去重 · HL-N-86b `./` 与重复分隔符归一后去重 · HL-N-86c 分隔符 `\`→`/` 归一去重 · HL-N-86d 大小写不同=不同 canonical path（不折叠）断言 · HL-N-86e 同 canonical path 不同 hash = F1 · HL-N-86f POSIX 下含 `\` 的真实文件与 canonical 别名：以 canonical path 为唯一解析目标断言 · HL-N-86g canonical 输入域收窄后无根感知需求断言（绝对/UNC/drive 皆 F1 于词法层） · HL-N-87 ext-artifact 安全打开三件套适用断言 · HL-N-88 approve 终核 manifest=树∪ext 并集断言（外部项漏检拒）**
- **HL-N-80 π1×f2 hash 必填缺失拒 · HL-N-81 π1×f2 截图内容变化→ext-artifact 令牌拒 · HL-N-82a π3 仓根相对正例 · HL-N-82b POSIX absolute F1 拒 · HL-N-82c URI F1 拒（`://` 与 `file:` 无斜杠形态各一：82c1/82c2） · HL-N-82d `C:\x`/`C:/x` drive 形态 F1 拒（82d1/82d2） · HL-N-82e `C:x` F1 拒 · HL-N-82f UNC F1 拒 · HL-N-82g π3 含 `..` F1 拒 · HL-N-82h π3 逐组件 symlink F1 拒 · HL-N-82i π3 realpath 越仓根 F1 拒 · HL-N-82j1 π3 末端替换由 O_NOFOLLOW/dev-inode 拒 · HL-N-82j2 祖先替换为声明级残余（文档断言，不作机械预期） · HL-N-82k π3×非 f2 组合同样经受检 fd 断言（收窄声明真实性断言） · HL-N-83 π3 本地缺失/不可读/非普通各一拒（83a-c） · HL-N-84 f2 散列在不支持 O_NOFOLLOW 的平台/文件系统上 open 报错 → 该次散列 fail-closed 拒 · HL-N-84b 平台后果双处披露（文档断言） · HL-N-84c 静默忽略 flag 的残余不可检出（诚实声明断言） · HL-N-84d 无独立探针——归档与 evidence 命令均不产生探针写入断言 · HL-N-84e1 常量缺失拒 · HL-N-84e2 常量为零拒 · HL-N-84e3 常量非数值拒 · HL-N-84f π3×非 f2×能力不可用 → 拒（适用面归因断言） · HL-N-84g π2 复制经受检 fd 断言 · HL-N-84h hash 字段出现即校验（π1×非 f2 内容错误 hash 拒） · HL-N-84i1 a/b/c×π2 内源 3 条合法 · HL-N-84i2 a/b/c×π2 外源 4 条须调阈值（未调拒） · HL-N-84i3 d×π2 内源 4 条须调阈值 · HL-N-84i4 d×π2 外源 5 条须调阈值 · HL-N-84i5 d×π2×外源但阈值仅调到 ≤4 = 拒（签收限定 d；a/b/c×外源的阈值是 ≤4，见 84i2） · HL-N-84j π2×能力不可用拒 · HL-N-84k hash= 出现×能力不可用拒 · HL-N-84l π2 目标父目录 symlink 拒 · HL-N-84m π2 单文件半写崩溃→残留 tmp F1→清理后幂等续完 · HL-N-84n pre-copy hash 对 src 校验例 · HL-N-84o post-copy hash 对 bundle path 校验例 · HL-N-84p π2 hash/比较/复制同一受检 fd 断言 · HL-N-84q1 π3 内容错误 hash 拒 · HL-N-84q2 π2 内容错误 hash 拒（起点级）**
- **HL-N-74a O_NOFOLLOW 断言 · HL-N-74b fstat regular 断言 · HL-N-74c dev/inode 一致断言（叶三件套各一） · HL-N-75 π2 归档后 bundle 相对路径解析通过例 · HL-N-75b π1 案 apriori/tmp 根域正例 · HL-N-78 祖先目录替换残余声明例（文档断言） · HL-N-79 并发 last-writer 静默丢行披露例（文档断言） · HL-N-76 终核后窗口残余为声明级（文档断言非机械——o1 同级如实） · HL-N-77 evidence 并发不支持声明例（文档断言）**
- **HL-N-69 跨 requirement 同 ID 不互配例（A 新增 X 不配 B 旧 X——配对域断言） · HL-N-70 MODIFIED 混合 provenance 例（同块 old 配对+尾部 delta 并存） · HL-N-71 f2 含真实子目录通过例 · HL-N-72 hash 后内容变化→approve 终核拒例 · HL-N-73 archive preflight 残留 temp 拒例**
- **HL-N-60 ADDED 块 delta 身份块内序例（两 ADDED 块同 ID 各 #1 且 canonical key 因标题不同而唯一） · HL-N-61 module token 推导碰撞 F1 例 · HL-N-62 嵌套 spec 路径不可推导→保守 R3 例 · HL-N-63 π2 残留他 temp F1 报告例 · HL-N-64 f2 树内 symlink 拒 · HL-N-65 FIFO/非 regular 拒 · HL-N-66 不可读拒 · HL-N-67 verdict digest 非 64 位拒 · HL-N-68 digest 大写 hex 拒**
- **HL-N-53 requirement 标题含 / 拒 · HL-N-54 同文件不同 requirement 共享 ID 的块内 ordinal 例（A#1 与 B#1 并存） · HL-N-55 module token 推导函数例（specs 与 truth 双路径→同 token） · HL-N-56 π2 残留 temp 于 evidence 命令计划步 F1 报告例 · HL-N-57 d1 域序置换检出（token 不等）例 · HL-N-58 f2 遗漏 evidence/ 树内文件检出例 · HL-N-59 未调 AC1 阈值×d×π2 非法联合选择拒**
- **HL-N-42 MODIFIED old X×1→new X×2（第二 occurrence 取 delta 身份）例 · HL-N-43 old X×2→new X×1（顺序配对第 1 个、旧第 2 个无键）例 · HL-N-44 rename-then-modify 取最终 requirement 名例 · HL-N-45 π2 步骤③半写崩溃→残留 temp F1→人工清理后重跑幂等（与 63 一致口径） · HL-N-46 d×π2 四命令成本投影例（AC1 联动） · HL-N-47 verdict 缺 role 拒 · HL-N-48 缺 digest 拒 · HL-N-49 尾注重复拒 · HL-N-50 doc-fix 不含 kind 1 拒 · HL-N-51 module-type-map 空条目/尾分号/重复分隔各一拒（51a-c） · HL-N-52 module grammar 外后缀不可入表→保守 R3 例**
- **HL-N-31 no-code+{2,3} 通过例 · HL-N-32a-d k2 组件含逗号/换行/@/# 各一拒 · HL-N-32e ID 含 / 拒 · HL-N-33 MODIFIED 既有 scenario 取 store 身份断言 · HL-N-33b MODIFIED 新增 scenario 取 delta 身份断言 · HL-N-34 k2 fan-out 后 RED 传播例 · HL-N-35 fan-out 后 UNBOUND 传播例 · HL-N-36 digest tag 换行注入唯一性例 · HL-N-36b d1 扩展域路径换行注入唯一性例 · HL-N-37 obs 含 ' hash=' 解析拒 · HL-N-38 π2 多文件中途失败重跑幂等续完 · HL-N-39 --approve 不执行复制断言 · HL-N-39b π2 复制前 src= 态正例 · HL-N-39c 复制后 path= 态正例 · HL-N-39d 同行同时含 src 与 path = F1 · HL-N-39e 归档 preflight 拒复制前态 · HL-N-39f obs 含 src= 子串拒 · HL-N-39g 目标路径函数固定 evidence/screenshots/<basename> 断言 · HL-N-39h src 越出 apriori/tmp 拒 · HL-N-39i 两态封闭 grammar 缺主键拒 · HL-N-40a 同一 source 重跑 no-op · HL-N-40b 不同 source 同 basename 碰撞拒 · HL-N-41 复制后晚到 F1——归档命令零写入断言（作者编辑与归档写集合分界例）**
- **HL-N-19 kind {3} 纯业务事实合法例 · HL-N-20 跨 store 同标题同 ID 复合键消歧例 · HL-N-21 current-delta（ADDED）目标 occurrence 例 · HL-N-22 singleton 行首式正例（词法入口） · HL-N-23 π2 同名碰撞复制时拒 · HL-N-24 绝对路径拒 · HL-N-25 中间组件 symlink 越界拒 · HL-N-26 hash 非 64 位小写拒 · HL-N-27 digest 长度前缀唯一性例（含 NUL 内容文件） · HL-N-28 π2 复制失败无 dry-run（前置步骤失败例） · HL-N-29 keyed 无尾冒号 F1 · HL-N-30 TAP 裸 ID 结果复制到全部申报复合键例（k2）**

## π2 范围声明（HL-P，r24——本包只保证起点级覆盖，见 design D7）
- HL-P-01 π2 的 AC 覆盖为起点级声明（文档断言）：目标目录安全创建、rename no-replace 平台差异、temp 与 basename 碰撞、目标祖先换链、半写恢复错误谱**留待后续设计增量**，不在本包 AC 全谱内。
- HL-P-02 π1/π3 的 AC 全谱不受该声明影响（文档断言）。

## 成本（HL-K）
- HL-K-02 手工编辑文件数按形态断言（裁定组合 π1+{f1}+c1'）：零 delta ≤1 · 含 delta ≤2 · 含 delta×ui×frontend:yes ≤3（**截图 advisory 后，作者可只写 2 个文件即归档——上限保留为写了截图记录时的上界**）。
- HL-K-03 裁定组合下 `hash=` 出现即 F1（安全打开四条件全不命中的断言）。
- HL-K-01 三类各一遍 lab 重演：**命令阈值按 D3 四格联合表参数化（r25 DES25-2 消矛盾）——不含 π2 的组合 ≤3；a/b/c×π2 内源 ≤3、外源 ≤4；d×π2 内源 ≤4、外源 ≤5；每格以 gate③ 明示调定的阈值为准**、手工编辑 ≤2 文件（按所裁载体核算）、脚本墙钟 ≤10:00（scaffold→归档成功，不含测试套件与人类思考）。
