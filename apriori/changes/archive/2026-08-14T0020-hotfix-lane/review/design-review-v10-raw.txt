<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r10 transport=codex-exec-wsl-proxy -->

复审结论：DES9-1..7 的声明修订均已真实落盘，MODIFIED 数量增减、verdict 必填尾注和四命令联动已有对应检查点；但新定式仍有 7 个开放问题。

DES-1｜高风险｜k2 的“最后一个 `/`”切分仍可被 requirement 标题破坏

依据：[design.md:125](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:125) 规定按最后一个 `/` 切分 carrier/ID，只禁止 ID 含 `/`；requirement 标题仍允许 `/`。

键 `store=config/spec.md/CFG-1@read/write behavior#1` 会在标题中的 `/` 处分割，而不是 carrier 末尾。state A 的 requirement parser [archive-merge.js:16](/mnt/d/Workbench/misc/apriori-spec-development/lib/archive-merge.js:16) 并不禁止标题含 `/`。应同时禁止标题含 `/`，或改用长度前缀组件编码。

DES-2｜高风险｜k2 ordinal 同时被定义为“块内序号”和“承载文件内序号”

依据：[design.md:125](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:125) 的配对函数按每个 old/new requirement 块分别产生 `ordinal=i`；同段末尾又定义 `n=同 ID 在承载文件内的 occurrence 序`。

若同一 store 文件的 Requirement A、B 各有一个 ID `X`：

- 块内定义产生 A#1、B#1；
- 文件级定义要求 A#1、B#2。

虽然 requirement 标题暂时还能区分二者，但不同消费者会生成不同 canonical key。应固定为“requirement 块内 ordinal”或“整个 carrier 文件内 ordinal”，并同步配对函数。

DES-3｜高风险｜`module-type-map` 示例自身非法，且模块词表到配置 token 的映射未定义

依据：[process-config-rows.md:6](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/process-config-rows.md:6) 的示例是 `modA`/`modB`，却同时要求 `/^[a-z0-9-]+$/`，示例会立即 malformed。

此外 req-v41 使用 store/truth“模块后缀词表”，state A 实际路径包括 `archive-merge/spec.md`、`archive-merge.md` 等；当前 grammar 无法表达 `/` 和 `.`。若真正的 module token 是归一后的 `archive-merge`，设计必须给出从 store/truth 路径推导该 token 的唯一函数；否则类型表会把真实模块全部当作 uncovered→R3。

DES-4｜高风险｜d×π2 的 AC1 联动与正式成本检查点互相矛盾

依据：[design.md:112](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:112) 将 d×π2 列为合法，并允许“阈值调至 ≤4 或接受超限”；但 [cli-checkpoints.md:73](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:73) 的 HL-K-01 仍无条件要求每类 ≤3 条命令。

“接受超限”并不能同时满足未修改的 AC。应把 HL-K-01 参数化：

- 非 d×π2：≤3；
- d×π2：仅 gate③ 明示将阈值改为 ≤4 后合法；
- 未改阈值却选择 d×π2：gate③ 联合选择非法，而不是合法但验收失败。

DES-5｜高风险｜π2 的 temp+rename 尚不能推出崩溃后幂等重跑

依据：[design.md:137](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:137) 只规定内存生成、写 temp、原子改名，没有定义 temp 名称、旧 temp 的处理及失败清理。

若进程在写完 temp、rename 前崩溃，重跑会遇到残留 temp。state A 的现行模式在 [archive-merge.js:699](/mnt/d/Workbench/misc/apriori-spec-development/lib/archive-merge.js:699) 明确把预存 temp 判为失败，而不是自动续跑。因此 HL-N-45 的“崩溃后幂等”不能从现设计推出。需定义残留 temp 的同内容复用/安全覆盖/冲突规则及 fault-injection 观察点。

DES-6｜高风险｜d1 扩展记录仍缺总排序和 f2 artifact 封闭集合

依据：[design.md:132](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:132) 只规定“各域内”按 UTF-8 路径排序，未规定 store、truth、artifact 三域的总体顺序。不同实现可生成 store→truth→artifact 或 artifact→store→truth，得到不同 token。

同时 [design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138) 只说 f2 的“截图/工件”进入令牌，没有封闭枚举究竟包括 results.txt、screenshots.md、π2 图片、π3 目标、E2E manifest 中哪些实体。可能出现合法实现只绑定记录行、不绑定图片字节。应固定域序，并定义 artifact discovery 的完整正列及路径排序。

DES-7｜高风险｜AC-I 未覆盖 v10 定式暴露的新边界

依据：[cli-checkpoints.md:68](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:68) 的 HL-N-42..52 已落盘，但尚缺：

- requirement 标题含 `/` 的 k2 解析拒绝；
- 同文件不同 requirement 共享 ID 时的 ordinal；
- 合法 module suffix 到配置 token 的推导；
- π2 遗留 temp 的重跑；
- d1 域顺序置换与遗漏某类 artifact；
- d×π2 未调整 AC1 阈值时的非法联合选择。

故 AC-I 仍未覆盖新增函数的完整输入域。

VERDICT: 7 issues open.