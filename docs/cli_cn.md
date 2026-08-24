# CLI 参考

每个子命令都响应 `--help`(退出码 0);未知旗标与多余参数一律退出码 2——不存在静默忽略。下面的用法行与 `--help` 打印的字符串逐字一致。

## apriori init

搭建 apriori/ + 各工具的 runbook 指针(不带 --tools 时交互多选)

```text
usage: apriori init [--tools <a,b,...>] [--test-cmd "<cmd>"] [--language <lang>] [--yes]
```

示例:`apriori init --tools claude,cursor --test-cmd "npm test" --yes`

退出码:0 完成/你主动放弃 · 1 空选择 · 2 非交互且未给 --tools。

## apriori doctor

体检项目与 apriori 的接缝:Node 地板、脚手架、runbook 新鲜度、工具指针、TAP 管道探针(`--no-run` 跳过)、规格库健康、变更总览——每个发现指名修复命令

```text
usage: apriori doctor [--test-cmd "<cmd>"] [--no-run] [--cwd <dir>] [--json]
```

示例:`apriori doctor`

退出码:0 HEALTHY · 1 有发现 · 2 不可用(未初始化 / Node 过老)。

D6 用 `id-pattern` 配置行扫描 store(无 flag;detail 标注来源 `config` 或 `default`)。配置行非法或匹配被终止时 D6 报 finding 且 D5 探针跳过——坏 id-pattern 下 test command 绝不运行(§8.0)。

## apriori new

搭建变更目录 + flow-state 骨架

```text
usage: apriori new <change-name>   (bare kebab-case, e.g. add-playback)
```

示例:`apriori new add-playback`

退出码:0 已创建 · 1 名字非法/已存在 · 2 用法错误。

## apriori status

每个变更走到哪了:阶段、现实核对、证据行、开放问题、下一步、派生的评审轮次与 escalation

```text
usage: apriori status [--change <name>] [--json] [--escalation]
```

示例:`apriori status --change add-playback --json`

退出码:成功路径恒为 0(status 只报告,不守门)。

**唯一状态,原样读回。** `--change` 汇报 flow-state 承载的内容:`phase`;`reality` —— `## Reality Check` 按 `observed` / `decision` / `assumption` 拆开,外加任何没有点明类别的条目(报为不可读,绝不静默丢弃);`evidence` —— `## Evidence` 行及其推出的阻断项;`openIssues` —— `## Open` 条目;`next` —— `## Next` 动作,状态最多承载三条(超出时打印前三条并说明原本有几条);以及 `delivery`。每条未证实的 `assumption` 单独占一行:它是 Reality Check 里唯一还欠着东西的那一类。

**`--escalation` 就是硬停。** 它打印一切正在等人的理由——状态自己的 `escalation:` 行、每个升级中的评审 family、每条被阻断的证据行——有则以 **3** 退出,无则打印 `ESCALATION: none` 并以 **0** 退出。**archived** 的 bundle 永远不会引发升级:它的证据结论只打印为 `recorded, not re-judged`,增量也不再重新扫描——冻结的记录只作汇报,绝不变成一笔要人去还的债。这个退出码就是全部机制:想要 Stop hook 或 CI 就接它。本仓库不自带任何 hook。

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

退出码:0 GREEN · 1 有缺口 · 2 运行不可信(输入缺失、非 TAP 输出、崩溃、合并冲突、CAS 不匹配)。

`--change` 运行是**变更收窄**的:verdict(exit 0/1)只判本 change 的 Requirement 块(场景全绿、无收窄范围内重复/无 ID 场景、无不可归属失败信号——无 ID 的失败、任何兄弟活 change 都不认领的失败 ID 照旧阻断,fail-closed);绑定到范围外场景的 red、或可归因于兄弟 change **完整解析** delta 的失败(仅其 ADDED/MODIFIED 块内场景可授予豁免),不阻断。同一次运行打印信息性 **store report**(全投影六类)——并行 change 各自独立变绿,历史缺口持续可见。`--change --json` 在 GREEN/GAPS 附 `storeReport`、`changeScope` 与 `modifiedIntegrity`(一切 ERROR 缺省);`--specs` 输出与之前 byte 级一致。`modifiedIntegrity` 报告每个 MODIFIED 块的替换保真性(retained/titleChanged/dropped/added/ambiguous 场景与丢失行,含 requirement 散文)——仅信息性,绝不改判;human 的 `— MODIFIED INTEGRITY —` 段在存在风险类时打印。

## apriori archive

把变更的增量规格并入 living 规格库;`--change` 自动发现整个变更,默认 dry-run,`--write` 失败原子地提交

```text
usage: apriori archive --store <f> --delta <f> --change <name> [--write] [--no-cas]
   or: apriori archive --change <name> [--write] [--changes-dir <dir>] [--no-cas] [--force]
```

示例:`apriori archive --change add-playback --write --changes-dir apriori/changes`

**就绪度。** 高层形式会拒绝一个还没做完的变更(dry-run 与 `--write` 一视同仁),打印 `RESULT: NOT READY — nothing written`(退出码 1):**R1** flow-state 结构完好、通过 `gate` C3 的同一套合法性检查、且 `phase: review`;**R3** change 自己选择保留的台账里没有 `open` 行;**R4** 每个评审 family 的循环都已收敛或带着已记录的 reframe(与 gate 的 C8 同一套派生——见下文);**R5** 唯一的实质状态判定,与 `gate` 的 C9 是同一份代码、同样两个输入(增量扫描与生效 mode)——没有 `blocked` 行缺少所有者已记录的接受、没有未作答的 `contract-mutation`、没有读不出来的增量、没有开放问题或悬着的 assumption,standard 还欠那一条实质证据行。R5 永不可 force:`--force` 只覆盖进度,而缺失的现实不是进度。**不存在 R2** —— 6.0 不要任务清单,所以没有任何一次归档会被它挡住;5.x bundle 遗留的 `tasks.md` 由 `gate` 的 C2 作为诊断报告。R1 只报第一个命中项;其余规则一次报全。**真的不存在**的台账在两种模式下都判 `n/a`——但**读不出来**的永远不是:只有真正的 `ENOENT` 走"不存在"分支,其余错误码(EACCES、EIO、ELOOP……)一律结构性拒绝。就绪度排在其余所有 preflight 守卫之后,故既有诊断与退出码不变;它是**看一眼,不是上锁**——检查与提交之间不会重读。

**归档声明。** 它同时是一道**兜底**:一次运行如果自己的声明会写成 `implementation: INCOMPLETE`,即使就绪度放行了也会被拒(`RESULT: NOT READY — nothing written`)——成功的归档永远不可能声明活儿没干完。就绪的一次运行只打印三个状态,别无其他——实现是否完成(计入开放问题与未证实的 assumption)、关键证据是否完成(计入 blocked 行,点名所有者已接受的风险)、以及已发布还是仍待外部验收(`delivery:`)。已归档的 bundle 是**冻结**的:之后发现的缺陷记为一条简短 outcome 或一个新 change,绝不回改归档。

**`--force`** 只属于高层形式,且**只解进度类**:仍是 `open` 的台账行,以及所有者已回答的 escalation。它绝不解 R1(尤其 `abandoned`)、结构性缺陷、停在第 2 轮的循环、未满足的评审底线、或任何 R5 证据拒绝——从没跑过的关键证据不是"进度"。它生效的前提是 bundle 的 flow-state 里**已经**有一条锚定记录:

```text
  - <YYYY-MM-DDTHH:MM> owner: archive-force ledger — <人类的理由,逐字>
```

这与 §6 证据出口、以及循环的 `reframe` 决定是**同一条**规范所有者条目,由**同一个**解析器读取:真实时间戳、actor 正好是 `owner`、小写动词打头、目标整体匹配、破折号、以及理由。`producer:`、`note:`、`agent:` 和 `gate⑤ (owner):` 前缀在这三种文法里一律不构成授权;`ledger` 是唯一类别,`ledger2` 不是它,而 `do not archive-force ledger — …` 开头是散文不是动词。撤销是**追加**一条 `archive-force-revoke ledger — <理由>`(`gates:` 是只追加的日志),以最后一条为准。该授权在本 bundle 生命周期内**持续有效**,不是"本次运行"的证据。每一条被越过的阻断项都会连同记录的原始首行一起打印。

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

把一个变更的机械闸口检查合成一个退出码(绑定 verify、tasks、flow-state、台账、verdict 证据、KB 新鲜度、评审循环收敛);PASS ≠ 人工闸口

```text
usage: apriori gate --change <name> [--test-cmd "<cmd>"] [--id-pattern <re>] [--cwd <dir>] [--json] [--no-cas]
```

示例:`apriori gate --change add-playback --json`

退出码:0 PASS · 1 BLOCKED · 2 评估不可信 · 3 INCOMPLETE。

完全没有测试命令时(既无 `--test-cmd`,也无 `test-cmd` 配置行),C1 报 `skipped`,其余七项照常执行——总结果是 `GATE: INCOMPLETE`,退出码 3。测试命令来源**坏掉**(配置冲突/不可读、`--test-cmd` 传了空值)仍是退出码 2:坏掉不等于没有。已确证的阻断优先于跳过,所以退出码 1 仍压过 3。

**C2 与 C4 不再要求任何文档。** C2(任务清单)只可能报 `–`:6.0 不要 `tasks.md`,所以没有它是正常的,5.x 遗留的那份只作诊断读取——未勾选的框会被点名,永不阻断。C4(台账)没有台账时判 `–`,两种模式一致;change 自己保留了一份时,只有**一种**发现会阻断——仍写着 `open` 的行。未知状态词、没写理由的 rejected、没有记录的 `waived`、以及归档阶段停在 `fixed` 没到 `verified`,都作为记账类注记打印在结论旁边。

**C9 —— 唯一的实质证据判定。** 一次检查,一个问题:这个 change 自己的状态是否还欠着真东西?它读三样东西。

*`## Evidence` 行*(`- <风险>: done | blocked | owner-accepted | n/a — <细节>`)。`blocked` 行阻断:没跑过的关键证据,是任何额外评审和额外文档都填不上的那个缺口。行读不出来、状态词不在词表里,一律阻断——做不成的检查绝不能读作"没发现风险"。**一行都没有同样阻断**——沉默不是回答。`owner-accepted` 行会阻断,除非所有者本人的决定已记录在只追加的 `gates:` 日志里,且符合这条**封闭**文法:`- <YYYY-MM-DDTHH:MM> owner: evidence-accept <精确行 ID> — <理由>`(撤销靠**追加** `evidence-accept-revoke <ID> — <理由>`;`gates:` 只追加,故最后一条决定生效)。这行里每一部分都承重——真实时间戳、actor 必须正好是 `owner`、小写关键词必须**打头**、行 ID 整体且大小写敏感匹配、破折号、以及带任意文字或数字的理由。`producer:`、`note:`、`gate⑤ (owner):` 前缀、没有时间戳的行、缺破折号或理由、超串 ID(`data-schema-2` 顶不了 `data-schema`)、以及泛泛的接受措辞(`owner: data-schema evidence accepted — …`),一律**不构成授权**:生产方不能自己发给自己 §6 的出口。

*CLI 已经**证明**的增量事实。* 增量改动了已发布的 requirement(`## MODIFIED` / `## REMOVED` / `## RENAMED`)时,必须有一行正好叫 `contract-mutation` 来作答——`done`,或所有者真正记录过的接受。`n/a` 是在否认一个已证明的事实,会被拒绝。扫描**读不出来**的增量(`specs/` 解析不到、解析到 bundle 之外,或某个增量文件逃逸/读不出)一律 **fail-closed**:任何证据行和任何所有者接受都治不好它——排除不了风险的扫描,绝不能读作"没发现风险"。

*状态自己的声明。* `## Open` 条目、仍然悬着的 Reality Check `assumption`、或没点明类别的 Reality Check 行——每一条都是生产方用自己的话说这活儿还没完,而且都按原文读取。`## Next` 超过三条由 `status` 报告,永不阻断。

`standard` 另外还欠至少一条**不是** `producer-diff` 的实质证据行——读自己的 diff 是卫生习惯,不是关于产品的证据。没有机器可判风险的 `fast`,可以只用 C1 加 `producer-diff` 作答。接受只结清一条风险,永不改变 change 的 mode。**archived** 的 bundle 只汇报,绝不追溯重判。

**`--review-ready`** 把**同一次**评估换一张脸作为"能否进评审"的答复,并且什么也不写——没有 receipt 文件、没有状态字段、没有缓存裁决;下一次运行重新算。**三项**,每一项都是这次运行真正量到的事实:真实的测试/绑定结果(C1)、证据行(C9)、以及生产方自己的 diff 检查——保留行 `producer-diff`,而且必须是 **settled**(`done`,或所有者真正记录过的接受)。`n/a` 不算数:它说的是"根本没有 diff 可读"。曾经还有第四项,报告"评审方的默认上下文是否可得",它是从 C1 有没有跑推出来的——它没有量到关于评审方的任何东西,也不可能自己失败,所以它连同"评审方将得到什么"的结尾断言一起被删掉了。取而代之打印的是这次运行本来就握有的事实:它投影的增量 spec,以及 C1 自己的绑定计数。三项都成立时退出 0,任何一项不成立退出 1——没准备好的 change 回到 Build & Test,而不是进入一轮评审。C1 被跳过时永远读不成 ready:评审方不该是第一个跑测试套件的人。

**C8 —— 评审循环,逐 family。** 轮次由评审证据派生(与 C5 同一次目录扫描),并在每个 family 内部计数,绝不跨 family 相加。派生分两个阶段:结论**含义**从封闭词汇表里读得宽(接受/修订类措辞,加上 `N issues open` / `N issues found`,`0` 判 accept——但绝不做前缀匹配,所以带矛盾尾巴的接受措辞宁可拒绝也不误读);证据**完整性**判得严。任何 family 完成第一轮之前 C8 为 `n/a`;以下情形阻断:某 family 在它自己的第 2 轮后仍为 `revise` 且 `gates:` 里没有 `reframe <family> round <n> <split|tests|redo> — <理由>`;某 family 到达它自己的第 5 轮且所有者尚未以 `reframe <family> round <n> <split|tests|redo|accept-risk> — <理由>` 作答;以及任何证据 **problem**——结论行不可读、一篇文档声明两个不同结果、两份文档争同一 family 同一轮、摘要结论行被删而原始记录还在、以轮次命名的原始记录却没有摘要、或某 family 的 1..N 轮次出现断档。problem 一律 fail-closed 且没有任何 reframe 能豁免:处置是把证据修好,不是对它表决。**advisory 从不阻断**——正文粘贴两遍但结论相同、以及压根不是评审轮次的原始记录。已被确认的 escalation 放行,并依然打印 ESCALATION 行。`review/` 不可读时 C8 为 `n/a`:C4 与 C5 已经阻断了。

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

## 八、配置参考

### 8.0 process-config 配置键：id-pattern

在 `apriori/process-config.md` 写一行 `| id-pattern | <裸 JS 正则源串> |`，一处声明项目的场景 ID 形状，处处生效。解析优先级：`--id-pattern` flag（仅 verify 与 gate；按存在性判定——空 flag 是错误，绝不回退）> 配置行 > 内置默认 `[A-Z]+(?:-[A-Z]+)*-\d+[a-z]*`——它本身就认得多段（`AC-BIS-01`）与带小写后缀（`AC-30f`）的 ID，所以多数项目根本不需要写那一行。`check`（CK-04）与 `doctor`（D6）只吃配置行、无 flag。四个消费点用同一识别契约：从标题第一个字符开始匹配，后继为字母/数字/下划线则拒绝，不额外拼接 `\b`，源串按原样编译。

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
    - `apriori verify` GREEN、每条 ## Evidence 行填完、`apriori gate --review-ready` 退出 0 之后停下
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
