# proposal — verify-change-scope

**WHY**：多 change 并行的棕地 store 上，"本 change 达标"没有一等公民命令：`verify --change` 被历史 UNBOUND 淹没（副本实测 107 场景 61 UNBOUND），`--specs <delta>` 把别人的测试全判 ORPHAN（46 个误报）——达标要跑两个命令再人工解释，每个 change 重写一遍免责说明（复盘 roadmap P0-2）。根因：工具把"store 健康"与"本 change 达标"混在一个 verdict 里。

**WHAT**：
1. `verify --change` 的 verdict 收窄为"本 change 达标"：change 范围按 Requirement 块 provenance（ADDED/MODIFIED/RENAMED 产出块的场景 occurrence），REMOVED 不入；scoped duplicate（跨全投影撞 ID）与 scoped unidentified 计入 verdict。
2. 同一次运行输出**完整** store report（六类：boundRed/unbound/true-orphan/unidentified/unattributed/duplicates）——历史缺口持续可见、零信息丢失；**可豁免的只有可证归属的范围外缺口**（绑定到范围外场景的 red、passing orphan、范围外 unbound/duplicate/unidentified）——无 provenance 的失败信号（无 ID 的 not ok、failing orphan）照旧阻断 verdict，fail-closed。
3. D-SR-x 的 --change 限定：可解释的非零测试进程状态 + 无 infra error + change clean → GREEN exit 0（多 change 并行独立变绿的关键）；不可解释非零照旧 ERROR。
4. gate C1（in-flight）消费收窄 verdict——并行 change 各自独立可绿；detail 带 store 摘要尾缀。
5. 输出契约钉死：JSON 顶层改 change 语义、storeReport/changeScope 仅 GREEN/GAPS 存在（absent 非 null）、operations 数组表达 rename-then-modify、单次执行契约四路径表、零范围真值表。
6. RUNBOOK 双语 STEP5 段、docs/cli 双语、CHANGELOG 三处行为变化声明。

**OUT OF SCOPE**：`--specs` 与 post-archive 语义（byte 级不动）；三态定义本身；MODIFIED 完整性（change 3）；hotfix；跨 change 协调视图；archive/merge 语义；id-pattern 机制。

**验收锚点**：req-final AC1–AC9；副本 batch3 对比证据（change 段 9 场景 vs 改前 107 场景淹没）。
