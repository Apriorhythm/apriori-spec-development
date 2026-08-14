# 疑难排查

先跑 `apriori doctor`——下面多数条目就是它的发现,按发现文本索引。

## Doctor 发现

### D1 —— Node 低于支持地板
apriori-cli 需要 Node ≥ 22。先升级 Node,否则一切免谈。

### D2 —— 没有 apriori/ / 脚手架缺口
未初始化(或半初始化:缺 `runbook.md`、`specs/`、`.gitignore` 的 `tmp/` 行、或 `tmp/` 目录)。修复:`apriori init`(缺脚手架)或 `apriori update`(gitignore/tmp 缺口)。目录位置上蹲着一个文件也会同样报出——换掉它。

### D3 —— runbook 副本与已装 CLI 不一致
`apriori/runbook.md` 过期(或被本地改过——它是工具所有的文件)。修复:`apriori update`。

### D4 —— 工具指针丢失 / 命令文件缺失
某个已检测到的 AI 工具,其规则文件不再指向 `apriori/runbook.md`,或命令文件没了。修复:重跑 `apriori init`(增量写入,绝不覆盖你的内容)。

### D5 —— 测试命令类发现
- *无法启动 / 被信号杀死*:命令行本身坏了;手动跑一遍。
- *无输出 / 非 TAP*:runner 在用人类报告器。Node 加 `--test-reporter=tap`;pytest 用 `pytest --tap-stream`(插件 `pytest-tap`)。
- *TAP 流截断或畸形*:出现了 version/plan 行但零结果行——运行中途死了。
- *退出码 N 无 TAP 解释*:命令失败却没有对应的 `not ok`——常见于崩溃的测试文件或配置错误的 runner。
- *未配置测试命令*:这是一条 **finding**,不是中性提示——没有它,`apriori gate` 的 C1(绑定检查)**根本跑不了**,其余检查全过时 gate 只会给出 `GATE: INCOMPLETE`(退出码 3);真有阻断仍报 `BLOCKED`(退出码 1),评估不可信仍压过前两者(退出码 2)。修法:往 `apriori/process-config.md` 加一行 `test-cmd`(那个文件归你,agent 只读),或每次调用传 `--test-cmd`。显式 `--no-run` 仍是 n/a:主动跳过不是缺陷。
- 测试红不是 doctor 发现——那是 `verify` 的事。

### D6 —— scenario 无可绑定 ID / ID 重复
每个 `#### Scenario:` 标题必须以形如 `KV-03` 的 ID 开头,且全库唯一。改规格文件;CI 里 `check` 强制同一规则。

### D7 —— flow-state 问题 / "gate ④ possibly pending"
活动变更目录缺可解析的 `flow-state.md`(或其 `change:` 与目录名不符)需手工修复。"gate ④ possibly pending" 一行是信息不是问题:归档后等人类 KB 签核正是设计内的时序。

## 经典陷阱

### verify 报 GAPS 且全部 UNBOUND,并附报告器提示
测试命令没输出 TAP。修法同 D5。

### 删除 requirement 后出现 ORPHAN 测试
REMOVED 增量归档后,其 scenario 不再被要求——但旧测试还带着那些 ID。删掉测试;ORPHAN 就是提醒。

### archive/verify 拒绝并报 "base mismatch … expects sha256:…"
增量里的 CAS 章不再匹配规格库——增量写成之后有人合并过。重读规格库、更新增量、用 `apriori stamp <store-file>` 重新盖章。绝不手改摘要。

### 本地 verify GREEN,CI 里 ORPHAN
通常是测试名/ID 漂移:测试标题里的 ID 必须在词边界上匹配 scenario ID(`XX-01b` 永远绑不上 `XX-01`)。

### 升级后出现 `unknown flag`
严格解析版本之后,打错的旗标会大声失败而不是被忽略——这个报错就是特性本身。`apriori <sub> --help` 打印可用旗标。
