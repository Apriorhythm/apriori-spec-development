# CLI 参考

每个子命令都响应 `--help`(退出码 0);未知旗标与多余参数一律退出码 2——不存在静默忽略。下面的用法行与 `--help` 打印的字符串逐字一致。

## apriori init

搭建 apriori/ + 各工具的 runbook 指针(`--tools` 必填——没有交互菜单)

```text
usage: apriori init [--tools <a,b,...>] [--test-cmd "<cmd>"] [--language <lang>] [--yes]
```

示例:`apriori init --tools claude,cursor --test-cmd "npm test" --yes`

退出码:0 完成/你主动放弃 · 1 空选择 · 2 未给 `--tools`(拒绝信息会列出已知工具与项目里检测到的工具),或 `--test-cmd` / `--language` 的值是配置表格装不下的。

**`--tools` 在写入任何东西之前整体校验(6.2)。** 只要有一个未知键——`claud`、`Claude`、`claude,claud` 都一样——就以 2 退出并打印 `unknown tool '…' — known tools: claude, codex, cursor, copilot, opencode, windsurf`,什么都不创建,连 `apriori/` 根目录也不。规则文件里若已有工具写的**旧**指针段落(与某个历史版本逐字相同),该段落会原地升级(`pointer updated`);当前版本或手改过的指针保持原样(`skipped`)。

**`--test-cmd` 逐字节往返(6.2)。** 命令经读取器的序列化孪生(`config.encodeCell` / `splitCells`)写入 `apriori/process-config.md`:`|` 存为 `\|`,反斜线保持原样,`$&`、`$1` 以及任何长得像替换模式的东西都逐字写入(回调替换,绝不用模板字符串),unicode 原样——`getConfig(root, 'test-cmd')` 返回的正是你传入的,所以 `verify` 跑的也正是它。以下在写入任何东西之前就以清楚的错误拒绝(退出码 2):空值(要继承什么都不传就省略该 flag)、含换行的命令(配置行只有一行——把它包进脚本再写脚本名)、以及单元格文法唯一表示不了的形状:紧贴管道符之前的奇数个反斜线。首尾空白会被裁掉。`--language` 走同一对函数。

## apriori doctor

体检项目与 apriori 的接缝:Node 地板、脚手架、runbook 新鲜度、工具指针、TAP 管道探针(`--no-run` 跳过)、规格库健康、变更总览——每个发现指名修复命令。D7 读每个活动变更的状态并列出归档:冻结在 `phase: review` 的归档是正常状态,不提;评审**之前**就归档的会作为信息浮现(`archived <stamp>-<name> @ build — archived before review; frozen as is`),绝不是 finding。已自记收束的 5.x bundle(`current-step:` 为 DONE/SUPERSEDED/ABANDONED,或 `next-action:` 写明 SUPERSEDED)且原地保留作先例的,是同一种冻结历史:作为信息报告(`frozen precedent (recorded, not re-judged)`),绝不是 finding——仍在进行中的 5.x bundle 保持迁移 finding。

```text
usage: apriori doctor [--test-cmd "<cmd>"] [--no-run] [--cwd <dir>] [--json]
```

示例:`apriori doctor`

退出码:0 HEALTHY · 1 有发现 · 2 不可用(未初始化 / Node 过老 / 参数错误,如 `--test-cmd ""`)。

**`--json` 信封**在每一类里都是 `{result: 'HEALTHY'|'FINDINGS'|'UNUSABLE', findings: number, checks: [{id, status, detail, fix?}], errors: string[]}`,参数错误也不例外。`--test-cmd ""` 被拒绝(`empty --test-cmd — pass a command or omit the flag`),绝不回退到配置。

D6 用 `id-pattern` 配置行扫描 store(无 flag;detail 标注来源 `config` 或 `default`)。配置行非法或匹配被终止时 D6 报 finding 且 D5 探针跳过——坏 id-pattern 下 test command 绝不运行(§8.0)。

## apriori new

搭建变更目录 + flow-state 骨架

```text
usage: apriori new <change-name>   (bare kebab-case, e.g. add-playback)
```

示例:`apriori new add-playback`

退出码:0 已创建 · 1 名字非法/已存在 · 2 用法错误。

## apriori status

每个变更走到哪了:阶段、现实核对、open 条目、下一步、派生的评审轮次与 escalation

```text
usage: apriori status [--change <name>] [--json] [--escalation]
```

示例:`apriori status --change add-playback --json`

退出码:成功路径恒为 0(status 只报告,不守门)——`--escalation` 例外,有人被等着时以 **3** 退出;解析或参数错误以 **2** 退出。

**`--json` 信封(6.2)**,每个都对成功与错误固定,并都带 `errors: string[]`:单个视图(下述字段,外加 `errors: []`;解析、名称或参数错误时为 `{change, errors: [msg]}`——先读 `errors.length`)、列表视图 `{changes: [...], errors: []}`、以及 `--escalation` 的 `{change, escalations, acknowledged, historical, errors}`(`escalations` 是 Stop hook 读的 pending 列表;出错时三个列表为空,`errors` 说明原因)。`--json` 下的每个错误都是 JSON,退出码 2。

**唯一状态,原样读回。** `--change` 汇报 flow-state 承载的内容:`phase`;`reality` —— `## Reality Check` 按 `observed` / `decision` / `assumption` 拆开,外加任何没有点明类别的条目(报为不可读,绝不静默丢弃);`openIssues` —— `## Open` 各行原文;`openItems` —— 同样的行解析成 `{id, text, accepted, acceptedAt}`(6.2:`id` 是冒号前的那个 token,行里没有时为 `null`;所有者的 `evidence-accept <id>` 在案时 `accepted` 为 true,`acceptedAt` 是那条记录的时间戳,按原文照抄、绝不规范化);`evidence` —— 只承载遗留的 `## Evidence` 行(`{rows, blocked, recorded}`,该段不存在时全空);`next` —— `## Next` 动作,状态最多承载三条(超出时打印前三条并说明原本有几条);以及 `delivery`。每条未证实的 `assumption` 单独占一行:它是 Reality Check 里唯一还欠着东西的那一类。

**`--escalation` 就是硬停,而 escalation 是**派生**的(6.2):阶段 × 决定状态。** 一个 change 的每条 escalation 处于三种状态之一。**`pending`**——bundle 活动且无人作答:到了第 5 轮或给出 `VERDICT: escalate` 而 `gates:` 里没有 `reframe` 的评审 family、gate C9 / archive R5 拒绝的一切(pending 的 open 条目、没有 id 的条目、悬着的 assumption、遗留的 blocked 行、读不出的增量、结构缺陷)、仍有 open 行的遗留台账(它的迁移拒绝,见 C3)、以及仍带内容的遗留手写 `escalation:` 字段(它的迁移拒绝,见下)。这些打印为 `ESCALATION: …`,命令以 **3** 退出;pending 的 open 条目**就是**所有者的控制点——R1 的"关键证据仍为 blocked"——所以它属于这个通道,直到所有者接受它或生产方关闭它。**`acknowledged`**——所有者的 `reframe` 已在案:打印为 `acknowledged: … — owner decision on record: <出口>`,永远不会从报告里消失,但它本身不是等人的理由(gate C8 / archive R4 仍各自判定收敛——只有 `accept-risk` 关闭底线,archive 仍要 `--force`)。**`historical`**——bundle 已**归档**:它的 escalation 与声明的字段打印为 `historical: … (archived history)`,状态结论打印为 `recorded, not re-judged`,增量不再重新扫描——冻结的记录只作汇报,绝不变成一笔要人去还的债;归档里的证据损坏仍在 C5/C8 报错。无 pending 时打印 `ESCALATION: none` 并以 **0** 退出。`--json` 给出 `{change, escalations: [pending…], acknowledged: […], historical: […]}`——`escalations` 是 Stop hook 读的那个列表。这个退出码就是全部机制:想要 Stop hook 或 CI 就接它。本仓库不自带任何 hook。

**`escalation:` 字段已退役。** 缺失、`none` 或 `n/a` 都可以。活动 bundle 里的任何其他内容都是机器读不出的待决事项,既不能当装饰回显,也不能丢掉:gate C3、archive R1 与 `--review-ready` 以 `escalation: carries a pending decision ('…') — move it to ## Open as \`- <ID>: …\` (or record the owner's reframe if it answers a review round), then delete the field` 拒绝,`--escalation` 在迁移完成前以同样的话以 3 退出。归档 bundle 里的该字段只是历史。`apriori new` 不再写它。

**评审轮次与 escalation。** `--change` 多输出两个派生字段——这里没有任何东西读自手写 `round:`。`review.families` **逐评审 family**(`spec-review`、`code-review`……)各一条:`{family, round, verdict, issuesOpen, stopped, escalating}`。轮次在 family 内计数,**绝不跨 family 相加**——三个 family 各 2、2、1 轮就是这样,不是"第 5 轮"。`verdict` 取该 family 最高序号那一轮(计数形式的 `0 issues open` / `0 issues found` 判 accept);`issuesOpen` 在结论行用计数形式时给出该数,否则为 `null`;`stopped` 在 gate 的 C8 阻断该 family 期间为 true。`review.problems` 列出无法被读成一轮、**并且阻断**的证据:结论行不在词汇表内、一篇文档声明两个不同结果、重复的 family/轮次主张、摘要结论行被删而原始记录还在、以轮次命名的原始记录却没有摘要、轮次断档。`review.advisories` 列出**只值得一提、从不阻断**的东西:正文被粘贴两遍但两次结论相同的文档,以及压根不是评审轮次的原始记录(`kb-check-raw.txt`)。`review/` 目录本身是 symlink、逃逸出 bundle 或不是目录时,改为设置 `review.defect`:status 点名它并拒绝读穿,与 gate 一致。`escalation` 在任一 family 升级之前为 `null`——升级有两种来源:评审方在任一轮给出 `VERDICT: escalate`,或该 family 到达它自己的第 5 轮——之后是 `{family, round, verdict, reason, acknowledged, decision}` 数组;所有者在 `gates:` 里的决定只会把 `acknowledged` 翻成 true,别处的畸形文档也永远不会把这条拿掉。**没有**逐轮新增问题趋势:证据给的是未关闭数,不是增量。flow-state 不可读的 bundle,两个字段均为 `null`。这两个字段汇报的规则写在 RUNBOOK §1 R4。

## apriori verify

确认测试确实跑过,且没有可归属的真实失败——Build & Test 闸口;scenario-ID 绑定缺口(UNBOUND/ORPHAN/UNIDENTIFIED)只作诊断,不是 gate——用 scenario ID 命名测试是便于追踪的建议,从不强制;`--change` 对投影(合并后)规格库验证,变更进行中用这个形式

```text
usage: apriori verify --specs <dir...> --test-cmd "<cmd>" [--id-pattern <re>] [--cwd <dir>] [--json]
   or: apriori verify --change <name> --test-cmd "<cmd>" [--id-pattern <re>] [--cwd <dir>] [--json]
(--test-cmd may be omitted when apriori/process-config.md has a test-cmd row;
 --id-pattern may be omitted when apriori/process-config.md has an id-pattern row)
```

示例:`apriori verify --change add-playback --test-cmd "npm test"`

退出码:0 GREEN · 1 有缺口 · 2 运行不可信(输入缺失、非 TAP 输出、崩溃、合并冲突、CAS 不匹配、投影的结构拒绝、参数错误)。

**`--json` 信封(6.2)** 对 GREEN、GAPS 与每一类 ERROR 都是**同一个**形状——参数错误、配置错误、坏投影、严格解析器拒绝都打印它并以 2 退出:`{clean: boolean, result: 'GREEN'|'GAPS'|'ERROR', errors: string[], specFiles: number, exec: {status: number|null, signal: string|null, error: string|null}, duplicates: [], boundGreen: [{id, pass, fail, skip}], boundRed: [...], unbound: string[], orphan: [...], unidentified: [{file, title}], unattributedFailures: {count: number, lines: string[]}, stderr: string}`;`--change` 运行多一个 `projection`,已判定的 `--change` 运行再多 `storeReport`、`changeScope`、`modifiedIntegrity`。`clean` 是布尔值且等于 `result === 'GREEN'`——仅删除或空范围的运行是 `clean: true`,绝不是那句 vacuous 注记字符串。`--test-cmd ""`(或全空白)在参数层就被拒绝——要继承配置行就省略该 flag。

`--change` 运行是**变更收窄**的:verdict(exit 0/1)只判本 change 的 Requirement 块(场景全绿、无收窄范围内重复/无 ID 场景、无不可归属失败信号——无 ID 的失败、任何兄弟活 change 都不认领的失败 ID 照旧阻断,fail-closed);绑定到范围外场景的 red、或可归因于兄弟 change **完整解析** delta 的失败(仅其 ADDED/MODIFIED 块内场景可授予豁免),不阻断。同一次运行打印信息性 **store report**(全投影六类)——并行 change 各自独立变绿,历史缺口持续可见。`--change --json` 在 GREEN/GAPS 附 `storeReport`、`changeScope` 与 `modifiedIntegrity`(一切 ERROR 缺省);`--specs` 输出与之前 byte 级一致。`modifiedIntegrity` 报告每个 MODIFIED 块的替换保真性(retained/titleChanged/dropped/added/ambiguous 场景与丢失行,含 requirement 散文)——仅信息性,绝不改判;human 的 `— MODIFIED INTEGRITY —` 段在存在风险类时打印。

## apriori archive

把变更的增量规格并入 living 规格库;`--change` 自动发现整个变更,默认 dry-run,`--write` 失败原子地提交

```text
usage: apriori archive --store <f> --delta <f> --change <name> [--write] [--no-cas]
   or: apriori archive --change <name> [--write] [--changes-dir <dir>] [--no-cas] [--force]
```

示例:`apriori archive --change add-playback --write --changes-dir apriori/changes`

**结构预检(6.2)。** 在写入任何东西之前——dry-run 与 `--write` 一视同仁,单文件形式也一样——增量**新增或修改**的每个场景(change scope;REMOVED 或已弃用的块不在其中)都必须带一个别处不重复的稳定 id,判定走受控的 id matcher(`--id-pattern` / 配置行 / 默认值,批量经可终止通道——绝不对配置正则在进程内 `new RegExp`)。以下情形按**增量**文件:行号逐条列出并拒绝,打印 `RESULT: FAILED PREFLIGHT — nothing written`(退出码 1):场景没有可绑定 id(`kv/spec.md:8: scenario without a bindable id: '…' — this change adds or modifies it; give it a leading id`)、本次引入了两次的 id(每一行都点名)、与本次未替换的 store 块冲突的 id(点名 store 文件)。matcher 跑不了(配置正则无效或被终止)同样是拒绝——`the structural check could not run — …`——绝不是跳过检查。范围之外的历史债务(store 里没有 id 的旧场景、store 已经重复携带的 id)只是注记(`note: store debt outside this change (reported, not a block): …`),绝不阻断本次变更——它仍归 `apriori check` 管。已识别场景与测试的绑定仍是劝告性的:没有以场景命名测试的原生测试命令仍然合法。`verify --change` 对同一投影以同样方式拒绝(`structural: …` 错误,退出码 2),且在任何测试命令运行之前,因此 `check → verify → gate → archive` 再也归档不出一个随后被 `check` 判失败的 store。

**遍历。** 增量发现与 store 遍历在**进入**目录之前先判定它:解析到遍历根之外的软链接目录被拒绝(`specs dir cannot be walked: symlinked directory escapes the walk root: …`,退出码 2——绝不静默跳过,绝不进入),已访问过的目录不再进入,所以软链接环会终止。`risk.scanDeltas` 把任何并非单纯缺失的 lstat 或读取失败报为 `unreadable-delta`(fail-closed),绝不当作"没发现风险"。

**就绪度。** 高层形式会拒绝一个还没做完的变更(dry-run 与 `--write` 一视同仁),打印 `RESULT: NOT READY — nothing written`(退出码 1):**R1** flow-state 结构完好、通过 `gate` C3 的同一套合法性检查、且 `phase: review`;**R4** 每个评审 family 的循环都已收敛或带着已记录的 reframe(与 gate 的 C8 同一套派生——见下文),评审证据必须完整(**同一个**判定,与 gate 的 C5 共享:symlink 的摘要、没有原始记录的结论文档,在两个表面上一样拒绝),且 `review/` 根必须是真实的、包含在 bundle 内的目录;**R5** 唯一的实质状态判定,与 `gate` 的 C9 是同一份代码、同一个输入(增量扫描)——没有所有者未接受的 open 条目、没有缺 id 的条目、没有重复 id、没有仍为 `blocked` 的遗留 `## Evidence` 行、没有读不出来的增量、没有悬着的 assumption。R5 永不可 force:`--force` 只覆盖进度,而缺失的现实不是进度。**不存在 R2,也不存在 R3** —— 6.0 不要任务清单,6.2 不读问题台账,所以没有任何一次归档会被这两个文件挡住,它们也不会被读。R1 只报第一个命中项;其余规则一次报全。`review/` 不存在不是缺陷(R4 随后报告缺失的评审轮次)——但**读不出来**的 review 根永远不是:只有真正的 `ENOENT` 走"不存在"分支,其余错误码(EACCES、EIO、ELOOP……)一律结构性拒绝。就绪度排在其余所有 preflight 守卫之后,故既有诊断与退出码不变;它是**看一眼,不是上锁**——检查与提交之间不会重读。

**归档声明。** 它同时是一道**兜底**:一次运行如果自己的声明会写成 `implementation: INCOMPLETE`,即使就绪度放行了也会被拒(`RESULT: NOT READY — nothing written`)——成功的归档永远不可能声明活儿没干完。就绪的一次运行只打印三个状态,别无其他——实现是否完成(计入 pending 的 open 条目与未证实的 assumption)、关键证据是否完成(没有未接受的 open 条目;已接受的逐个点名并报告为仍然在场)、以及已发布还是仍待外部验收(`delivery:`)。这次运行还会打印判定的注记——open 条目摘要、匹配不到条目的接受记录、`contract-mutation` 信号、被忽略的遗留段。已归档的 bundle 是**冻结**的:之后发现的缺陷记为一条简短 outcome 或一个新 change,绝不回改归档。

**`--force`** 只属于高层形式,且**只解进度类**——自 6.2 起恰好只有一件:所有者已回答的第 5 轮 escalation(它的 `reframe` 记录加上这个 flag)。它绝不解 R1(尤其 `abandoned`)、结构性缺陷、停在第 2 轮的循环、未满足的评审底线、或任何 R5 拒绝——没人接受的 open 条目不是"进度"。`archive-force` 文法仍然会被解析,因为它与 `evidence-accept`、`reframe` 是同一条所有者条目形状:

```text
  - <YYYY-MM-DDTHH:MM> owner: archive-force ledger — <人类的理由,逐字>
```

这与接受出口、以及循环的 `reframe` 决定是**同一条**规范所有者条目,由**同一个**解析器读取:真实时间戳、actor 正好是 `owner`、小写动词打头、目标整体匹配、破折号、以及理由。`producer:`、`note:`、`agent:` 和 `gate⑤ (owner):` 前缀在这三种文法里一律不构成授权。但文法里唯一的类别 `ledger` 已经没有消费者:一条在案的 `archive-force` 记录只报告为 `note: archive-force has nothing left to force in 6.2`,不改变任何裁决,带不带 `--force` 都一样。撤销是**追加**一条 `archive-force-revoke ledger — <理由>`,以最后一条为准——只影响这条注记,别无其他。每一条被越过的 R4 阻断项都会连同记录的原始首行一起打印。

**单文件形式。** `--store/--delta` 是对某个规格库文件的单模块手术。它**不再接受** `--changes-dir`(因此永不移动变更目录),也不接受 `--force`,并且会拒绝任何解析到 `apriori/changes` 之内的 `--delta`——词法拼写与 realpath 两种量度、按路径段边界判定。变更 bundle 一律整个按名字归档。

退出码:0 已合并/幂等空转 · 1 冲突/CAS/格式坏/未就绪/delta 越界/暂存-提交-移动失败 · 2 用法/未找到/路径越界。

## apriori stamp

打印规格库文件的 CAS 基线章——贴在增量顶部;库若分叉,verify/archive 会拒绝

```text
usage: apriori stamp <store-file>
```

示例:`apriori stamp apriori/specs/kv/spec.md`

退出码:0 已打印(文件不存在 → `new` 形式)· 2 用法/目录/不可读。

## apriori gate

把一个变更的机械闸口检查合成一个退出码(绑定 verify、flow-state、verdict 证据、KB 新鲜度、评审循环收敛、open 条目);PASS ≠ 人工闸口

```text
usage: apriori gate --change <name> [--test-cmd "<cmd>"] [--id-pattern <re>] [--cwd <dir>] [--json] [--no-cas]
```

示例:`apriori gate --change add-playback --json`

**`--json` 信封**在每一类里都是 `{change: string|null, stage: 'in-flight'|'archived'|null, checks: [{id, status, detail}], result: 'PASS'|'BLOCKED'|'INCOMPLETE'|'ERROR', blocked: number, errors: string[]}`,参数错误也不例外;退出码是映射,绝不是字段。**每个命令:** 未捕获的异常就是不可信的运行——退出码 **2**,`--json` 下仍是 JSON:`{result: 'ERROR', errors: [message]}`。

退出码:0 PASS · 1 BLOCKED · 2 评估不可信 · 3 INCOMPLETE。

完全没有测试命令时(既无 `--test-cmd`,也无 `test-cmd` 配置行),C1 报 `skipped`,其余七项照常执行——总结果是 `GATE: INCOMPLETE`,退出码 3。测试命令来源**坏掉**(配置冲突/不可读、`--test-cmd` 传了空值)仍是退出码 2:坏掉不等于没有。已确证的阻断优先于跳过,所以退出码 1 仍压过 3。

**C2 与 C4 是占位项。** 两个 id 都留在 `checks[]` 里,让按 id 索引的 `--json` 消费者继续可用,且永远报 `–`:C2(`retired in 6.2 — nothing is read`)曾把 5.x 任务清单读作诊断;C4(`ledger retired in 6.2 — open items live in ## Open`)曾读问题台账。这两个文件不再被打开——存在与否、内容如何,都一样。

**C3 —— flow-state 合法性,外加两项 6.2 迁移。** flow-state 经由与 archive R1 **同一个**信任根解析:软链接、越界或非常规文件的 `flow-state.md` 是 `C3 BLOCKED — flow-state.md: symlink at …`,绝不透过它读,随后 C8/C9 报 `flow-state not read — see C3` 而不是第二种意见(`status` 也以同样方式拒绝)。 活动 bundle 的遗留 `review/issues.md` 若有 `open` 行(旧表格契约:首格 id、末格状态,`open` 为首 token,不分大小写),在 C3、archive R1 与 review-ready 一律拒绝——`legacy ledger has N open row(s) — move each into ## Open as \`- <ID>: <text>\` and delete it from review/issues.md (or delete the file): line 3: Q-1 (…)`——同一句话也是 `status --escalation` 的停;带空格的旧 id 会被要求改键(`data schema` → `data-schema`)。只有关闭行或文件缺失则什么也没有;读不出来、或有内容却没有可读的行,是结构错误(读不出的台账无法证明已关闭)。这道门是一次性的:没有 open 行剩下时永不再触发——把行**移走**,绝不复制。冻结的归档永不扫描,工具也永不改写该文件。另一项迁移是已退役的 `escalation:` 字段(见 `status`)。**文档陈述、CLI 无法证明的 ID 规则:** 同一 bundle 内,关闭的 id 不复用给另一个风险;因此一条 `evidence-accept` 的 id 后来指向另一条条目,是文档层面的违规,不是工具能检测的东西。`change`、`lineage`、`phase` 必填;`mode:` 自 6.2 起**可选且不起作用**——缺失或为空都合法,`fast` / `standard` 被接受并回显(`legal (mode fast, build)`),其他任何值(包括未填的 `<fast | standard>` 占位)照旧阻断。没有任何判定依据这个词:没有升级、没有配额、没有车道。

**C9 —— 唯一的实质状态判定。** 一次检查,一个问题:这个 change 自己的状态是否还欠着真东西?gate C9、archive R5、归档声明与 `status` 调用**同一个**函数、读同一个输入;不存在第二份状态。

*`## Open` 条目*(`- <ID>: <文字>`,id 是冒号前的那个 token)。条目在所有者的决定以**封闭**文法记入只追加的 `gates:` 日志之前处于 PENDING:`- <YYYY-MM-DDTHH:MM> owner: evidence-accept <ID> — <理由>`(撤销靠**追加** `evidence-accept-revoke <ID> — <理由>`;最后一条决定生效)。pending 的条目阻断。已**接受**的条目不阻断,但会报告为 `accepted, still present`——在 C9 的 detail 里、作为归档注记、以及在 `status` 里——而且没有任何东西会删掉那一行;风险真正解决时由生产方删除。**没有 id** 的行仍是 open 条目:它阻断,且无法被接受(`give it a stable id to accept it, or close it`)。重复的 id 会被拒绝并点名两行。空段或缺失的段不欠任何东西。接受那一行里每一部分都承重——时间戳(只做**范围**校验:月 01-12、日 01-31、时 00-23、分 00-59,`T11:00` 或 `T1100`;**不做**历法校验——2 月 31 日是笔误,不是伪造,本工具不带历法)、actor 必须正好是 `owner`、小写关键词必须**打头**、id 整体且大小写敏感匹配、破折号、以及带任意文字或数字的理由。`producer:`、`note:`、`gate⑤ (owner):` 前缀、没有时间戳的行、缺破折号或理由、超串 id(`R-011` 顶不了 `R-01`)、以及泛泛的接受措辞,一律**不构成授权**:生产方不能自己发给自己所有者的出口。匹配不到任何条目的接受记录是一条注记(`acceptance R-09 matches no open item`),不阻断。

*状态文件的结构(6.2)。* 只有一个读取器 `lib/flow.js`,为每个表面读整份文件,且只接受**一个** Markdown 子集:第 0 列的 `key: value` 标量(小写 kebab 键,可带 `# 注释`)、`## 标题` 节(任意层级,可带尾部 `# 注释`,标题整体、不分大小写匹配)、`- `/`* ` 条目与**缩进**的续行、CRLF 或 LF。围栏代码与 HTML 注释在任何位置都惰性——绝不是条目、事实或授权。读不出来的东西是点名行号的**结构缺陷**,在活动 bundle 上阻断 C9/R5 与 review-ready 的 `open`:`## Open` / `## Reality Check` 下的编号行或裸行(`line 6: open section line is not a list item — write \`- R-1: …\``)、同一节写了两次(点名两行)、同一标量设了两个不同值(点名两行;C3/R1 也拒绝)、没闭合的围栏或注释(其后整份文件不可读——绝不会读成 GREEN)。已归档 bundle 的缺陷只记录,不拒绝、不迁移;读取器不改写任何文件。

*CLI 已经**证明**的增量事实。* 增量改动了已发布的 requirement(`## MODIFIED` / `## REMOVED` / `## RENAMED`)时,报告为一个信号——C9 detail 里的 `risk: contract-mutation: <文件> <操作> '<需求名>'`,`status --json` 里的 `risk[]`——它本身不要求任何东西。扫描**读不出来**的增量(`specs/` 解析不到、解析到 bundle 之外,或某个增量文件逃逸/读不出)一律 **fail-closed**:任何 open 条目和任何接受记录都治不好它——排除不了风险的扫描,绝不能读作"没发现风险"。

*状态自己的声明。* 仍然悬着的 Reality Check `assumption`、或没点明类别的 Reality Check 行——每一条都是生产方用自己的话说这活儿还没完,而且都按原文读取。`## Next` 超过三条由 `status` 报告,永不阻断。

*遗留的 `## Evidence` 段*(6.0 的行表,已经没有读者)在在途 bundle 里按规则迁移:写着 `blocked` 的行阻断,并给出 `legacy Evidence row '<name>' is blocked — move it to ## Open as an item (or accept it via evidence-accept <name>)`;声称 `owner-accepted` 却没有有效接受记录的行同样阻断(`… claims owner acceptance with no canonical gates: entry — move it to ## Open, or record: <模板>`——自己签的声明不能让风险消失);名字带有效接受记录的行按已接受的条目处理;其余各行(`done`、`n/a`、`fixed`、未填的脚手架行……)一律忽略,只留一条注记:`legacy ## Evidence section ignored (6.2: risks live in ## Open)`。**archived** 的 bundle 只汇报,绝不追溯重判——它的结论是 `recorded`。

**`--review-ready`** 把**同一次**评估换一张脸作为"能否进评审"的答复,并且什么也不写——没有 receipt 文件、没有状态字段、没有缓存裁决;下一次运行重新算。**两项**,每一项都是这次运行真正量到的事实:`tests`(真实的测试/绑定结果,C1)与 `open`(状态可读且自己没有声明任何未了结的东西——每条都带稳定 id、没有重复 id、没有仍悬着的 Reality Check `assumption`、没有不点明类别的 Reality Check 行,每一条都用 C9 自己的措辞拒绝)。pending 的条目不会让 review-ready 失败:那正是评审要看的东西,该项的 detail 会这么说。早先的两项已经删掉(6.2):`evidence` 随行表一起离开,`producer-diff`——一种没有任何东西能观察到的自我认证——也随之删掉;P2 里"读完完整 diff"的指令仍然是指令,只是没有东西检查它。取而代之打印的是这次运行本来就握有的事实:它投影的增量 spec,以及 C1 自己的绑定计数。JSON 信封对已判定视图、求值错误与参数错误是**同一个**形状(6.2):`{change: string|null, ready: boolean|null, items: [{id, ok, detail}], errors: string[]}`——`ready: null` 加 `errors[]`(且没有 items)是错误,退出码 2;已判定视图带 `errors: []`。早先的 `{reviewReady: null, errors}` 与 gate 信封两种错误形式已不存在。两项都成立时退出 0,任何一项不成立退出 1——没准备好的 change 回到 Build & Test,而不是进入一轮评审。C1 被跳过时永远读不成 ready:评审方不该是第一个跑测试套件的人。

**C5 —— 原始证据。** 每份结论文档旁边都要有它的 transcript:一个**非空**的 `<stem>-raw.*` 同名文件——0 字节的文件就是缺 raw,报为 `<stem>.md (<stem>-raw.txt is empty)`——或者自包含 provenance 形式,后者不需要同名文件。工具判定的是证据的形状与在场,不是产出者的独立性。

**C8 —— 评审循环,逐 family。** 轮次由评审证据派生(与 C5 同一次目录扫描),并在每个 family 内部计数,绝不跨 family 相加。派生分两个阶段:结论**含义**从封闭词汇表里读得宽(接受/修订类措辞,加上 `N issues open` / `N issues found`,`0` 判 accept——但绝不做前缀匹配,所以带矛盾尾巴的接受措辞宁可拒绝也不误读);证据**完整性**判得严。任何 family 完成第一轮之前 C8 为 `n/a`;以下情形阻断:某 family 在它自己的第 2 轮后仍为 `revise` 且 `gates:` 里没有 `reframe <family> round <n> <split|tests|redo> — <理由>`;某 family 到达它自己的第 5 轮且所有者尚未以 `reframe <family> round <n> <split|tests|redo|accept-risk> — <理由>` 作答;以及任何证据 **problem**——结论行不可读、一篇文档声明两个不同结果、两份文档争同一 family 同一轮、摘要结论行被删而原始记录还在、以轮次命名的原始记录却没有摘要、或某 family 的 1..N 轮次出现断档。problem 一律 fail-closed 且没有任何 reframe 能豁免:处置是把证据修好,不是对它表决。**advisory 从不阻断**——正文粘贴两遍但结论相同、以及压根不是评审轮次的原始记录。已被确认的 escalation 放行,并依然打印 ESCALATION 行。`review/` 不可读时 C8 为 `n/a`:C5 已经阻断了。

`apriori archive` 经就绪度规则 **R4** 消费同一套判定:循环已停止或存在证据 problem 时归档被拒,什么都不写、什么都不移动;advisory 放行。停在第 2 轮的循环不可 force;第 5 轮止损需要所有者已记录的 `reframe` 决定**加上**显式 `--force`。

in-flight 的 C1 消费变更收窄 verdict(detail 为 `verify GREEN (in-flight, change-scoped)` + 六类 store 摘要尾缀)——并行 change 的 gate 各自独立变绿;archived 阶段仍验证全库。

## apriori check

结构一致性(scenario ID 可绑定;`--self` 另跑 apriori 仓库自己的手册检查)

```text
usage: apriori check [--specs <dir>] [--self]
```

示例:`apriori check`

退出码:0 PASS · 1 FAIL(n) · 2 规格库路径缺失或 `id-pattern` 配置非法/被终止(`RESULT: ERROR`)。

CK-04 用项目的 `id-pattern` 配置行识别场景 ID(无 flag——CI 门吃项目恒量,见 §8.0),识别契约与 verify 完全一致。

## apriori update

CLI 升级后刷新工具所有的文件(runbook 副本、命令指针)——绝不碰你的文件

```text
usage: apriori update [--dry-run]
```

示例:`apriori update --dry-run`

退出码:0 完成 · 1 未初始化。

**一次运行做什么(6.2)。** runbook 副本与各工具的命令文件,只在 `apriori/managed.json` 证明它们由工具写下、且你此后没改过时才刷新(`updated` / `up-to-date`);本地改过的是 `modified (skipped — …)`,认不出来的是 `unmanaged (skipped — …)`。协议所需的脚手架逐项补齐、绝不修改:缺 `apriori/.gitignore` 就创建,单独缺 `apriori/tmp/` 也会创建(`apriori/tmp/  (created)`;那个位置上若是别的东西,只报告、绝不替换)。**规则文件是你的**;update 在 `CLAUDE.md` / `AGENTS.md` / `.cursor/rules/apriori.mdc` / … 里唯一可能改的,是工具自己写下的指针段落,且只在它与某个历史发布版本逐字相同时——该段落换成当前版本(`pointer updated`),文件其余部分逐字节不动;手改过的指针只报告(`pointer (skipped — not a shipped generation; hand-edited, left alone)`)、绝不改写;没有指针或已是当前指针的文件不算动作。**汇总是诚实的:** `N file(s) refreshed`;有任何被拒绝刷新的就是 `N modified (skipped) — locally modified, not refreshed; …`;只有真的什么都没动时才说 `everything already matches`。**唯一的认领例外,明说:** 由早于 `managed.json` 的 CLI 初始化的项目没有清单;它的 `apriori/runbook.md` 会在第一次 `update` 时被认领并覆盖一次(命令文件只在字节与某个发布版本一致时才认领),此后两者像任何受管文件一样受保护——如果你定制过那份旧 runbook,第一次 `update` 前先把你的笔记复制出来。

## 八、配置参考

### 8.0 process-config 配置键：id-pattern 与 cas

脚手架生成的 `apriori/process-config.md` 不带这两行：缺行**就是**默认值（`id-pattern` → 下述内置模式，`cas` → `required`），只有要改默认时才写。`| cas | optional |` 把 archive/gate 对未打戳**变更类**增量（MODIFIED/REMOVED/RENAMED）的拒绝改为可见警告——豁免信息指明配置来源；默认 `required` 即拒绝（gate C7 阻断，`archive` 在 preflight 拒绝；单次豁免是 `--no-cas` flag，它对任何配置状态保持显式至上）。

在 `apriori/process-config.md` 写一行 `| id-pattern | <裸 JS 正则源串> |`，一处声明项目的场景 ID 形状，处处生效。解析优先级：`--id-pattern` flag（仅 verify 与 gate；按存在性判定——空 flag 是错误，绝不回退）> 配置行 > 内置默认 `[A-Z]+(?:-[A-Z]+){0,}-\d+[a-z]{0,}`——它本身就认得多段（`AC-BIS-01`）与带小写后缀（`AC-30f`）的 ID，所以多数项目根本不需要写那一行。其量词写作 `{0,}` 而非等价的 `*`，是为了让脚手架写入的表格行能扛住 markdown 格式化器（表格单元格里成对的裸 `*` 会被当成强调，被改写成 `_`）。`check`（CK-04）与 `doctor`（D6）只吃配置行、无 flag。四个消费点用同一识别契约：从标题第一个字符开始匹配，后继为字母/数字/下划线则拒绝，不额外拼接 `\b`，源串按原样编译。

pipe 转义分两层，切勿混为一谈：表格单元格内属于值的每个 pipe 都写 `\|`（如 alternation 单元格 `(AC\|BR)-\d+` 解析为正则源串 `(AC|BR)-\d+`，裸 `|` 即 alternation）；正则要**匹配**字面 pipe 字符时用字符类——单元格里写 `[\|]`，解析为 `[|]`。该转义规则对全部配置键统一生效。

错误在消费时上浮且 fail-closed，消息指明来源（`--id-pattern` 或 `process-config`）：verify 与 gate 按既有文本/JSON 错误形状 exit 2；check 打印 `RESULT: ERROR`（exit 2）；doctor 报 D6 finding 并跳过 D5 探针（结果 FINDINGS，exit 1）——绝不静默回退默认。配置来源的 pattern 是 CI 自动消费的仓库输入，其匹配在可终止子进程内执行（超预算即杀——灾难性回溯的配置行无法挂死 CI）；flag 是操作者交互输入，进程内执行。

### 8.1 规格撰写规则

这些是 Specify 与 Build & Test 两个阶段所强制的规格质量规则。V3 里它们放在你的**项目规则文件**(§8.2)——没有独立的工具配置。以下为一份通用基线，可按项目增删：

```yaml
# 规格撰写规则——并入你的项目规则文件(§8.2)
context: |
  语言：中文（简体）
  所有产出物必须用简体中文撰写。

rules:
  specify:
    - 只写行为契约（变更 specs/ 下的增量规格），不得修改任何源代码文件
    - 完成后停下来，等待评审,然后进 Build & Test
    - 每个"用户可见的输出"必须有独立的 scenario；若同一个需求包含多个可见侧效果（如"过滤"与"展示被过滤结果"），必须分开写成两个 scenario，不得合并为一句描述
    - 给每个 scenario 一个稳定 ID（如 KV-03）——`apriori check` 拒绝无 ID 的 scenario。真正的覆盖是 Build & Test 自己的责任,不是 `verify` 的:`verify` 只确认测试确实跑过、且没有真实失败(UNBOUND 只是建议性提示);用 scenario ID 给测试命名是建议,不是强制
    - |
      凡 spec 中涉及"外部共享状态"（Redis、DB 字段、全局单例等），
      MUST 额外描述以下三个时机的行为：
      1. 初始化（run/session/请求开始时如何写入）
      2. 运行中更新
      3. 清理/失效（run 结束、超时、重置时如何处理）
      若缺少任一时机的描述，视为 spec 不完整。
  build:
    - 契约里的 scenario 就是工作本身——没有任务清单要照着走
    - `apriori verify` GREEN、每条 ## Open 条目都带稳定 id、`apriori gate --review-ready` 退出 0 之后停下
    - 凡代码中出现 continue / 静默忽略 / skip 分支，必须回查 spec 确认该分支的内容是否需要对用户可见；若 spec 有要求，则必须产出对应记录，不能只满足"排除主路径"而遗漏"展示侧"
    - 每个 scenario 都需要真实通过的测试证据;以其 scenario ID 命名测试(如 `test('KV-03 …')`)是便于追踪的建议,不是强制——`apriori verify` 是在真实失败或运行完全没有证据时阻断,不是单纯因为名字没带 ID
    - 代码中所有关键的分支或者函数开始，都需要打印日志，日志的格式是 `[UUID]-文字说明,XXX:[{}],YYY:[{}]`（该格式是示例——请换成你团队自己的日志规范，见 §8.2 规则文件）
```

### 8.2 项目规则文件（CLAUDE.md 及其它工具等价物）

规则文件是 Agent 的"常驻全局规范"，每个工具放置位置不同，但**内容一致**：

| 工具 | 规则文件位置 |
|---|---|
| Claude Code | `CLAUDE.md`（项目根目录） |
| Cursor | `.cursor/rules/*.mdc` |
| Windsurf | `.windsurf/rules`（或工作流文件） |
| Copilot | `.github/copilot-instructions.md` |
| Codex | `AGENTS.md` |

> 不管你用哪些工具，都在各自的规则文件里加一行，引用项目内那份 runbook（`apriori/runbook.md`，安装步骤见 [RUNBOOK_cn.md](../RUNBOOK_cn.md) §0）——正是这一行让每个会话自动加载协议。

> **建议把同一份规范同时落到你团队在用的几个工具里**，保证不同工具行为一致。规则文件的内容**与技术栈强相关**，应由你按自己的项目编写。下面是一份**与语言无关的骨架模板**，照着填进你团队的真实约定即可（示例条目仅作占位，请替换）。

````markdown
# 基础约定

* 全程用中文回复，包括思考过程
* 不确定的地方先提问，不要臆测

# 项目架构

## 目录 / 模块结构

* `<目录A>`: <职责说明>
* `<目录B>`: <职责说明>
* …（列出关键目录与各自职责，让 Agent 知道"代码该放哪里"）

## 模块依赖与约定

* <模块间如何引用、构建/发布的注意事项>
* <跨模块改动时需要同步做的操作>

# 代码规范

* 命名：<命名约定>
* 工具库选用：<优先使用的标准库/工具库及其常用方法，例如判空、时间处理、随机数>
* 分层约束：<例如：数据库操作只写在数据访问层，不写在业务层>
* 依赖注入 / 资源管理：<团队偏好>
* 其它团队习惯：<逐条列出"需要靠人反复口头提醒"的约定>

# 日志规范

统一格式，便于全局检索与定位：

```text
[UUID]-文字说明,XXX:[{}],YYY:[{}]
```

* `UUID` 为真实生成的唯一字符串，作为 code tag，保证代码内全局唯一
* UUID 与打印的对象用 `[]` 包裹，方便复制
* 对象用 JSON 序列化打印；非对象直接打印
* 大集合先提取关键 ID 再打印，避免日志爆炸
* 关键分支与函数入口都应打点，一个方法内不允许完全没有日志

# 测试规范

* 测试文件位置：<约定>
* 基类 / 框架：<约定>
* mock 策略：<哪些该 mock（如外部远程调用）、哪些尽量不 mock（如本地数据访问，尽量真实操作）>
* 用例编号 / 命名：<约定，例如成功场景与失败场景的编号区间>
* 覆盖率要求：<有真实测试证据的 scenario 覆盖是硬性标准——每个 spec scenario 都真的被测试执行到；把它绑定/命名到其 ID 是便于追踪的建议,不是强制;行/分支覆盖率只作排查信号（如低于 85% 就去看看），绝不当追逐目标——被要求冲数字的模型会拿无断言测试凑数>
* 测试方法体模板：<给出一个空壳示例，统一风格>
````

> 填写建议：把团队里"需要靠人反复口头提醒"的约定,逐条沉淀进规则文件——从观察中生长,绝不预置大全、绝不自动生成(自动生成的指令文件实测*有害*:约 −2% 成功率、+23% 成本;人写的约 +4%)。目标个位数 KB,用官方删除测试无情修剪:*"删掉这一行会让 agent 出错吗?不会就删"*——臃肿的文件会让指令被忽略。六类内容稳定有效:构建/测试命令、与默认不同的代码风格、项目结构、测试说明、git 惯例、边界。**规则越具体、越可执行,Agent 产出越稳定。**

---
