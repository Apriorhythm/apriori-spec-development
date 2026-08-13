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

每个变更走到哪了:步骤、下一动作、台账 open 项

```text
usage: apriori status [--change <name>] [--json]
```

示例:`apriori status --change add-playback --json`

退出码:成功路径恒为 0(status 只报告,不守门)。

## apriori verify

把每条 spec scenario ID 绑定到绿的 TAP 测试——STEP5 闸口;`--change` 对投影(合并后)规格库验证,变更进行中用这个形式

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
usage: apriori archive --store <f> --delta <f> --change <name> [--write] [--changes-dir <dir>]
   or: apriori archive --change <name> [--write] [--changes-dir <dir>]
```

示例:`apriori archive --change add-playback --write --changes-dir apriori/changes`

退出码:0 已合并/幂等空转 · 1 冲突/CAS/格式坏/暂存-提交-移动失败 · 2 用法/未找到/路径越界。

## apriori stamp

打印规格库文件的 CAS 基线章——贴在增量顶部;库若分叉,verify/archive 会拒绝

```text
usage: apriori stamp <store-file>
```

示例:`apriori stamp apriori/specs/kv/spec.md`

退出码:0 已打印(文件不存在 → `new` 形式)· 2 用法/目录/不可读。

## apriori gate

把一个变更的机械闸口检查合成一个退出码(绑定 verify、tasks、flow-state、台账、verdict↔raw 证据、KB 新鲜度);PASS ≠ 人工闸口

```text
usage: apriori gate --change <name> [--test-cmd "<cmd>"] [--id-pattern <re>] [--cwd <dir>] [--json] [--no-cas]
```

示例:`apriori gate --change add-playback --json`

退出码:0 PASS · 1 BLOCKED · 2 评估不可信。

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

在 `apriori/process-config.md` 写一行 `| id-pattern | <裸 JS 正则源串> |`，一处声明项目的场景 ID 形状，处处生效。解析优先级：`--id-pattern` flag（仅 verify 与 gate；按存在性判定——空 flag 是错误，绝不回退）> 配置行 > 内置默认 `[A-Z]+-\d+`。`check`（CK-04）与 `doctor`（D6）只吃配置行、无 flag。四个消费点用同一识别契约：从标题第一个字符开始匹配，后继为字母/数字/下划线则拒绝，不额外拼接 `\b`，源串按原样编译。

pipe 转义分两层，切勿混为一谈：表格单元格内属于值的每个 pipe 都写 `\|`（如 alternation 单元格 `(AC\|BR)-\d+` 解析为正则源串 `(AC|BR)-\d+`，裸 `|` 即 alternation）；正则要**匹配**字面 pipe 字符时用字符类——单元格里写 `[\|]`，解析为 `[|]`。该转义规则对全部配置键统一生效。

错误在消费时上浮且 fail-closed，消息指明来源（`--id-pattern` 或 `process-config`）：verify 与 gate 按既有文本/JSON 错误形状 exit 2；check 打印 `RESULT: ERROR`（exit 2）；doctor 报 D6 finding 并跳过 D5 探针（结果 FINDINGS，exit 1）——绝不静默回退默认。配置来源的 pattern 是 CI 自动消费的仓库输入，其匹配在可终止子进程内执行（超预算即杀——灾难性回溯的配置行无法挂死 CI）；flag 是操作者交互输入，进程内执行。

### 8.1 规格撰写规则

这些是 propose 动作(STEP2)与 apply 动作(STEP5)所强制的规格质量规则。V3 里它们放在你的**项目规则文件**(§8.2)——没有独立的工具配置。以下为一份通用基线，可按项目增删：

```yaml
# 规格撰写规则——并入你的项目规则文件(§8.2)
context: |
  语言：中文（简体）
  所有产出物必须用简体中文撰写。

rules:
  proposal:
    - 只创建 artifacts（proposal.md/design.md/specs/tasks.md），不得修改任何源代码文件
    - 完成后停下来，等待评审,然后进 apply 步骤(STEP5)
    - 每个"用户可见的输出"必须有独立的 scenario；若同一个需求包含多个可见侧效果（如"过滤"与"展示被过滤结果"），必须分开写成两个 scenario，不得合并为一句描述
    - 给每个 scenario 一个稳定 ID（如 KV-03）；后续测试必须引用这些 ID(`apriori verify` 据此绑定,`apriori check` 拒绝无 ID 的 scenario)
    - |
      凡 spec 中涉及"外部共享状态"（Redis、DB 字段、全局单例等），
      MUST 额外描述以下三个时机的行为：
      1. 初始化（run/session/请求开始时如何写入）
      2. 运行中更新
      3. 清理/失效（run 结束、超时、重置时如何处理）
      若缺少任一时机的描述，视为 spec 不完整。
  tasks:
    - 每条任务粒度不超过一个文件或一个功能点
    - 所有任务必须逐条列出，不得合并
  apply:
    - 严格按 tasks.md 中的任务顺序执行
    - 每条任务完成后立即标记为 [x]，再继续下一条
    - 全部完成、`apriori verify` GREEN 后停下,变更就绪待归档(STEP6)
    - 凡代码中出现 continue / 静默忽略 / skip 分支，必须回查 spec 确认该分支的内容是否需要对用户可见；若 spec 有要求，则必须产出对应记录，不能只满足"排除主路径"而遗漏"展示侧"
    - 每条测试都以其覆盖的 scenario ID 命名（如 `test('KV-03 …')`）；存在没有对应测试的 spec scenario,即视为未通过 `apriori verify`
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
* 覆盖率要求：<scenario 覆盖是硬性标准——每个 spec scenario ↔ 至少一条带其 ID 的测试；行/分支覆盖率只作排查信号（如低于 85% 就去看看），绝不当追逐目标——被要求冲数字的模型会拿无断言测试凑数>
* 测试方法体模板：<给出一个空壳示例，统一风格>
````

> 填写建议：把团队里"需要靠人反复口头提醒"的约定,逐条沉淀进规则文件——从观察中生长,绝不预置大全、绝不自动生成(自动生成的指令文件实测*有害*:约 −2% 成功率、+23% 成本;人写的约 +4%)。目标个位数 KB,用官方删除测试无情修剪:*"删掉这一行会让 agent 出错吗?不会就删"*——臃肿的文件会让指令被忽略。六类内容稳定有效:构建/测试命令、与默认不同的代码风格、项目结构、测试说明、git 惯例、边界。**规则越具体、越可执行,Agent 产出越稳定。**

---
