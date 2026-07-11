<p align="center">
  Languages:
  <a href="./RUNBOOK.md">English</a> ·
  <a href="./RUNBOOK_cn.md">中文</a>
</p>

# Apriori RUNBOOK —— 给 AI Agent 的可执行协议

> **读者:AI Agent**(§6 除外,那节给操作它的人)。本文件自包含:Agent 运行时需要的一切都在这里——铁律、状态机、产物路径、提示词。
> **Why**——理念、工具搭建、实例教学——在人类手册([README_cn.md](./README_cn.md))里,Agent 不需要读它。两者在操作细节上不一致时,**以本 RUNBOOK 为准**。

---

## 0. 安装与会话启动

**安装(人做,每个项目一次):**

1. 把本文件复制进项目,如 `docs/apriori/runbook.md`。
2. 在项目规则文件(`CLAUDE.md` / `AGENTS.md` / `.cursor/rules/*.mdc` / `.windsurf/rules` / `.github/copilot-instructions.md`)里加一行:
   > 开发流程遵循 `docs/apriori/runbook.md`。每次会话开始,先读它和 `docs/apriori/changes/<change>/flow-state.md`,从记录的位置继续。
3. 项目还没有 OpenSpec 的话:`openspec init`(手册 §3.3);`templates/config.yaml` 是一份现成的 `openspec/config.yaml` 起点。
4. 可选(Claude Code):把 `templates/claude-command-apriori.md` 复制为 `.claude/commands/apriori.md`,即可用 `/apriori <change>` 启动。

**会话启动(Agent,每个会话都做):**

1. 完整读一遍本 RUNBOOK。
2. 读 `docs/apriori/changes/<change>/flow-state.md`。若不存在且你被要求启动一个变更:先定级(§2),创建状态文件(§3),再从该级别的第一步开始。
3. 从 `next-action` 继续。状态文件是唯一权威——绝不凭记忆或猜测重建进度。

**启动提示词(人用——复制并填空):**

```text
按 apriori runbook(docs/apriori/runbook.md)推进变更 <change-name>,级别 <小型|中型|大型>。
先读 runbook 和 docs/apriori/changes/<change-name>/flow-state.md,从记录的位置继续。
只推进到下一个人工闸口,然后停下来汇报。
```

---

## 1. 铁律

**R1 —— 每个人工闸口必停。** 闸口清单:① STEP0 触顶时的定稿裁决 ② gap 报告过目(仅大型)③ STEP3 技术评审 ④ STEP6 知识库 diff 批准 ⑤ 任何触顶或振荡(台账 ID 被重开)。到达闸口:更新状态文件,汇报——当前步骤、评审方结论行**原文**、台账中 open/rejected 项、需要人做的决定——然后停下。绝不替人批准闸口;"人还没回复"绝不等于批准。

**R2 —— 评审必须真实外调。** 生产会话永远不出评审结论。真实调起异构评审方:`codex exec -s read-only "<提示词>"`(第 2 轮起:`codex exec resume -c sandbox_mode="read-only" <session-id> "..."`——codex CLI ≥0.14x 的 resume 不接受 `-s`,旧版在 id 前用 `-s read-only`;非交互调用须以 `< /dev/null` 关闭 stdin,否则 codex 挂起);没有 Codex 就**新开**一个不同档位的 `claude` 会话,喂给它产物加问题台账(P0)。把评审方的结论行**原文**贴回。只读沙箱写不了台账:评审方在输出末尾给出台账增量,生产方原样落盘(注明代录)并把原始输出**全文存档于 `docs/apriori/review/<change>-<stage>-raw.*`** 以备对照。评审方在结论行落盘前死亡(评审中途网络/服务故障)→ **resume 同一会话**让它续完——绝不代填结论行。只读评审方的**动态观测不可信**——跑测试、构建、任何需要写入的操作在其沙箱内都可能降级并产生幻影发现;只有它的静态阅读作数,生产方以真实环境的证据拒绝此类沙箱伪象发现。如果无法真实调起评审方,停下来说明——**禁止模拟评审**。

**R3 —— 一切落盘;`/goal` 属于人。** 产物写到 §4 表格的确切路径;每完成一步、每轮评审后都更新状态文件。`/goal` 是人执行的命令(§6)——绝不声称自己在跑 `/goal`,也不模仿它的评估器。你在会话内自行驱动的循环,同样遵守 §4 的轮次上限。

---

## 2. 变更定级(启动时做一次)

| 级别 | 典型形态 | 要跑的步骤 |
|---|---|---|
| **小型** | bugfix / 单文件;无新的用户可见行为;不动共享状态 | 轻量 explore(只对齐事实)→ STEP5 带测试 + 一轮一致性评审(P8;R2 照常适用——原始输出存档、发现记台账)→ 有事实变化则 STEP6 回写 |
| **中型** | 单模块;有新的用户可见行为 | STEP0(1–2 轮)→ STEP1 → STEP2(1–2 轮)→ STEP5 → STEP6;STEP3 缩为异步设计过目 |
| **大型** | 跨模块 / 外部共享状态 / 数据迁移 / 新子系统 | 完整 STEP0–STEP6,所有闸口都过 |

凡触及外部共享状态或跨模块边界,不管 diff 多小,一律**大型**。拿不准先按低一级起步,遇到第一个意外就升级;级别(及任何升级)记入状态文件。

---

## 3. 状态文件

`docs/apriori/changes/<change>/flow-state.md`:

```markdown
change: <change-name>
tier: trivial | medium | large
current-step: STEP0 | STEP1 | STEP2 | STEP3 | STEP4 | STEP5 | STEP6 | DONE
round: 0                # 当前步骤内的评审轮次 / apply 轮次
next-action: <一行具体动作,如 "对 <change>-req-v2.md 调起 P1 评审">
gates:                  # 只增不改的人工决定日志
  - <日期> <闸口>: <人的决定,原文>
```

每步、每轮完成后立即更新;每个闸口决定都追加记录;新会话信这个文件,不信自己的推断。

---

## 4. 状态机

**产物路径**(每一步都写到这里——绝不自行发明路径):

| 产物 | 路径 |
|---|---|
| 需求文档 | `docs/apriori/requirement/<change>-req-v{N}.md` → 定稿 `docs/apriori/requirement/<change>-req-final.md` |
| 需求评审 | `docs/apriori/review/<change>-req-review-v{N}.md` |
| 问题台账 | `docs/apriori/review/<change>-issues.md` |
| gap 报告 | `docs/apriori/explore/<change>-gap-report.md` |
| 规格 / 设计 / 任务 | `openspec/changes/<change>/specs/`、`…/design.md`、`…/tasks.md` |
| 规格评审 | `docs/apriori/design/<change>-review-v{N}.md` |
| 技术评审记录(DESIGN-REVIEW-DOC) | `docs/apriori/design/<change>-design-review.md` |
| 知识库(TRUTH-DOC) | `docs/apriori/truth/<module>.md`——必须带 `source-commit` 标记 |
| 流程状态 | `docs/apriori/changes/<change>/flow-state.md` |

### STEP0 —— 需求精细化 · 对抗循环 · 上限 5 轮

- **输入:**`docs/apriori/requirement/<change>-req-v{N}.md`;知识库(如有)。
- **每轮:**(1)若已有评审,据其修订 → `<change>-req-v{N+1}.md`,逐条注明采纳/拒绝+理由并更新台账;(2)用 **P1** 调起评审方(R2)→ 评审文档 + 台账;(3)记录结论行。
- **退出:**结论 =「无重大问题」→ 复制为 `docs/apriori/requirement/<change>-req-final.md`,前进。触顶 → **闸口 ①**。

### 知识库前置检查 —— STEP1 之前,凡项目已有代码就做

> 全新项目(尚无模块代码):本检查 **N/A**——直接跳过;绝不对不存在的代码做反向沉淀。

- 对每个涉及的模块:`docs/apriori/truth/<module>.md` 存在吗?若存在,新鲜吗——`git log --oneline <source-commit>..HEAD -- <模块目录>` 是否为空?
- 新鲜 → STEP1。过期 → 用 **P10** 校对(代码为真相),刷新标记。缺失 → 用 **P10** 反向沉淀;产出的知识库文档必须先经人或异构模型复核,**之后**下游才能使用。

### STEP1 —— explore

- **动作:**直接按 **P3** 产出 gap 报告。**产出:**gap 报告。(当前 OpenSpec 的 `/opsx:explore` 是*无必需产出*的自由思考模式——它不会产出 gap 报告;至多当可选的思考辅助用。)
- **退出:**大型 → **闸口 ②**(人过目 gap 报告)。其余级别:把报告的主要风险并入下次汇报,继续前进。

### STEP2 —— propose · 对抗循环 · 上限 4 轮

- **动作:**用 **P4** 执行 `/opsx:propose`;然后循环:评审方 **P5**(R2)→ 生产方用 **P6** 修订(只改 spec/design——绝不动源码);每轮更新台账。(OpenSpec 自身指引视 design.md 为按需产物;本 runbook 无条件要求它——以 runbook 为准。)
- **退出:**结论 =「无重大问题,可进入执行阶段」→ 前进。触顶或振荡 → **闸口 ⑤**。

### STEP3 —— 技术评审 —— **闸口 ③(人工)**

- **Agent 的职责:**备齐材料——设计文档、规格、台账(拒绝项置顶)——呈上,停下。把结论记为 DESIGN-REVIEW-DOC(`docs/apriori/design/<change>-design-review.md`)并写入 `gates:`。重大设计变更 → 回 STEP2。
- 中型:异步过目替代会议——结论照样记录。个人开发者:决策记录仍须来自生产方上下文之外(全新会话评审)。

### STEP4 —— 更新文档

- 按 DESIGN-REVIEW-DOC 修订 spec/design;可选再来一轮 P5/P6。STEP3 无改动则跳过。

### STEP5 —— apply · 上限 25 轮

- **动作,按序:**(1)每个 spec scenario 一条失败测试,测试名带 scenario ID——展示失败运行;(2)用 **P7** 按 tasks.md 顺序实现,随做随标 `[x]`;(3)跑到全绿;(4)异构一致性评审 **P8**(R2);更新台账。
- **退出——以下全部:**测试全绿;每个 scenario ID 至少出现在一个测试名里;tasks.md 全 `[x]`;一致性结论 =「无 spec-vs-代码缺口」。设计不可行 → 回 STEP2;需求本身错了 → 回 STEP0(两者都要:更新状态文件并告知人)。触顶 → **闸口 ⑤**。

### STEP6 —— 归档 + 知识库回写

- **P9 之前:**确保本变更的工作已**提交**——`source-commit` 必须指向一个真实存在、包含该实现的 commit(全新仓库同样:先提交,再盖标)。
- **动作:**用 **P9** 归档——自治 agent 用非交互 CLI `openspec archive <change> --yes`(`/opsx:archive` 命令是交互式流程);归档后把生成的 `Purpose: TBD` 占位填掉。然后更新 `docs/apriori/truth/<module>.md`,刷新 `source-commit`;列出改了哪些文件/段落。
- **退出:**增量规格已合并 + 知识库已更新 → **闸口 ④**:人批准知识库 diff(同仓库布局下就是 PR 评审)。然后置 `current-step: DONE`。

---

## 5. 提示词

### P0 —— 问题台账(下面每条提示词都读写它)

`docs/apriori/review/<change>-issues.md`:

```markdown
| ID | 问题 | 风险 | 发现轮次 | 状态 |
|---|---|---|---|---|
| REQ-3 | `ttlMs<=0` 行为未定义 | 中 | 1 | fixed (v2) |
| SPEC-1 | 内存 map 缺"清理"时机 | 高 | 1 | verified |
| SPEC-2 | 把 `del` 改名为 `delete` | 低 | 2 | rejected —— 纯外观,超出范围 |
```

- **评审方**:追加新行;确认修复落地后把 `fixed → verified`;再次发现的问题**重开旧 ID**——绝不另起新行。
- **生产方**:把 `open → fixed` 或 `open → rejected`;拒绝必须给理由——人工闸口最先看拒绝项。

### P1 —— STEP0 评审方(异构,R2)

```text
你是一名资深需求评审专家。请审查需求文档,目标是让它精确到可以直接交给 AI 实现。
【输入】
* 需求文档: docs/apriori/requirement/<change>-req-v{N}.md
* 系统知识库(如有): docs/apriori/truth/<模块名>.md
* 问题台账(如有): docs/apriori/review/<change>-issues.md
【评审维度,逐条给结论】
1. 目标状态 B 是否清晰、无歧义
2. 边界条件与异常路径是否覆盖(空值、越界、并发、超时、失败回滚)
3. 是否存在"隐含但未声明"的状态变更或副作用
4. 每条验收标准是否可测(能写成「如果…那么…」)
5. 与系统现状 A 是否冲突(若提供了知识库)
【输出】
生成 docs/apriori/review/<change>-req-review-v{N}.md:按维度列问题清单(描述/风险/修改建议)。
按台账规则把每条问题同步进台账。末尾给出结论行:「无重大问题」与否。
不要修改需求文档本身。
```

### P2 —— STEP0 修订(生产方)

```text
按 docs/apriori/review/<change>-req-review-v{N}.md 修订需求文档,输出 docs/apriori/requirement/<change>-req-v{N+1}.md。
逐条说明处理方式(采纳/拒绝+理由),并更新台账中各问题的状态(fixed / rejected+理由)。
```

### P3 —— STEP1 explore

```text
# 注意:当前 OpenSpec 的 /opsx:explore 是自由思考模式,不会产出本产物——直接按本提示词执行
先对齐所有已知事实——不要写代码。
【输入】
* 需求文档: docs/apriori/requirement/<change>-req-final.md
* 系统知识库: docs/apriori/truth/(相关模块: <模块名>;新项目注明"暂无")
* 技术详细设计文档: 已存在的设计文档,如上一轮变更的 openspec/changes/<change>/design.md(没有就注明)
* 代码: 当前仓库
【输出】
docs/apriori/explore/<change>-gap-report.md:当前状态 A、目标状态 B,以及两者之间的差异点与风险。
```

### P4 —— STEP2 propose(生产方)

```text
/opsx:propose
基于已对齐的事实,编写提案、全部规格文档与设计文档。
* 每个用户可见的输出都有独立 scenario,并带稳定 ID(如 KV-03)——以场景名前缀方式内嵌(`#### Scenario: KV-03 …`,OpenSpec 的 spec 格式没有独立 ID 字段);可见侧效果不得合并;
* 凡外部共享状态(Redis/DB字段/全局单例/内存缓存),必须描述三个时机:初始化 / 运行中更新 / 清理失效。
完成后停下,等待评审。
```

### P5 —— STEP2 评审方(异构,R2)

```text
你是技术评审专家,重点找"会导致返工或线上事故"的问题。
【输入】
* SPEC-DOC: openspec/changes/<change>/specs/   * DESIGN-DOC: openspec/changes/<change>/design.md
* 知识库: docs/apriori/truth/   * 需求文档: docs/apriori/requirement/<change>-req-final.md   * 台账: docs/apriori/review/<change>-issues.md
【检查清单】
1. scenario 是否覆盖全部可见行为,有无遗漏的失败/边界场景
2. 外部共享状态的三个时机是否完整
3. 是否与现状 A 冲突、是否破坏既有约定
4. spec 写了设计没落实,或设计引入了 spec 未声明的行为
5. 安全(变更触及外部输入或权限时):未校验输入、缺鉴权、日志中密钥/敏感信息、注入面
【输出】
docs/apriori/design/<change>-review-v{N}.md:逐条问题(描述/风险/建议);按台账规则同步进台账。
末尾给出结论行:「无重大问题,可进入执行阶段」与否。
```

### P6 —— STEP2 修订(生产方)

```text
另一个模型评审了你的规格与设计:docs/apriori/design/<change>-review-v{N}.md。
逐条处理(采纳/拒绝+理由),只修改 spec 与 design 文件——绝不动源码。
更新台账中各问题的状态,然后进入评审轮 v{N+1}。
```

### P7 —— STEP5 apply(生产方)

```text
/opsx:apply
测试先行:每个 spec scenario 派生一条失败测试,以其 scenario ID 命名(如 test('KV-03 …')),展示失败运行。
然后严格按 tasks.md 顺序实现,每条完成立即标 [x]。
* scenario 覆盖是硬性标准:每个 scenario 至少一条带其 ID 的测试。行覆盖率是信号不是目标——不许无断言凑数;
* 关键分支与函数入口按项目规范打日志;
* 凡 continue/skip/静默忽略分支,回查 spec 确认是否需要对用户可见——若 spec 有要求,必须产出对应的可见记录;绝不能只满足"排除主路径"而丢掉"展示侧"。
跑测试到全绿;停下等待 archive。
```

### P8 —— STEP5 一致性评审方(异构,R2)

```text
对照 SPEC-DOC 评审本次实现:
1. 先机械核对:列出没有出现在任何测试名里的 scenario ID;
2. spec 要求但代码未实现的行为;
3. continue/skip/静默忽略分支——spec 是否要求其对用户可见;
4. 测试是否断言真实结果(而非"能跑就行");
5. 触及外部输入或权限时:未校验输入、缺失鉴权、日志中密钥/敏感信息。
逐条列出不一致项与修复建议;同步进台账。
末尾给出结论行:「无 spec-vs-代码缺口」与否。
```

### P9 —— STEP6 archive(生产方)

```text
/opsx:archive
归档本次变更,并同步更新知识库:
* 把本次新增/变更的事实写入 docs/apriori/truth/<模块名>.md;
* 把该文档的 source-commit 标记刷新为当前代码 commit;
列出你更新了哪些知识库文件、哪些段落。
```

### P10 —— 知识库反向沉淀 / 校对(旧项目)

```text
你是系统知识库工程师。阅读该模块代码,产出/校对其知识库文档。
【输入】代码范围: <目录或文件清单>。现有知识库(如有): docs/apriori/truth/<模块名>.md
【任务】以代码为唯一真相,抽象:对外职责/接口、核心数据流、关键状态与副作用(三个时机)、依赖、约定与坑。若已有知识库,逐条标出不符/过时/缺失并修订。
【输出】docs/apriori/truth/<模块名>.md,放在变更分支上(让 PR diff 成为评审现场),带上你所读代码 commit 的 source-commit 标记。
【约束】只写代码里确实存在的事实;不确定处标"待人工确认";绝不编造抽象意图。
```

---

## 6. 人类操作员附录

> 本节内容全部**由人执行**。Agent 绝不执行或模拟 `/goal`(R3)。架构原理与注意事项:手册 §4.10。

**STEP0 循环:**
```text
/goal "目标:docs/apriori/requirement/<change>-req-final.md 存在,且最新一轮评审判定为「无重大问题」。上限:5 轮。
每一轮:
1. 若 docs/apriori/review/<change>-req-review-v{N}.md 存在,据其修订 docs/apriori/requirement/<change>-req-v{N}.md,升到 v{N+1},逐条注明 采纳/拒绝+理由,并同步更新 docs/apriori/review/<change>-issues.md 里对应问题的状态。
2. 用一个不同的模型对当前版本跑评审,输出存到 docs/apriori/review/<change>-req-review-v{N}.md,例如:
   codex exec -s read-only \"<P1 提示词> —— 目标:docs/apriori/requirement/<change>-req-v{N}.md\"
   (没有 Codex?新开一个 claude,把 P1 连同问题台账一起交给它)
3. 把评审方的结论行贴回本对话。
当判定为「无重大问题」时停(并复制为 docs/apriori/requirement/<change>-req-final.md),或满 5 轮停。"
```

**STEP2 循环:**
```text
/goal "目标:openspec/changes/<change>/ 有 SPEC-DOC+DESIGN-DOC,且最新评审判定为「无重大问题,可进入执行阶段」。上限:4 轮。
每一轮:
1. 据最新评审修订 spec/design 文件——绝不动源码——并同步更新 docs/apriori/review/<change>-issues.md 里已处理问题的状态。
2. 重跑异构评审,用 P5 提示词(第 1 轮:codex exec,记下打印的 session id;之后各轮:codex exec resume -c sandbox_mode=\"read-only\" <session-id>),产出 docs/apriori/design/<change>-review-v{N}.md 并更新台账。
3. 把评审结论行贴回这里。
当判定为「无重大问题,可进入执行阶段」时停,或满 4 轮停。"
```

**STEP5 循环:**
```text
/goal "目标 —— 以下全部成立:`npm test` 退出码 0;openspec/changes/<change>/specs/ 里每个 scenario ID 至少出现在一个测试名里(列出缺失的 ID);openspec/changes/<change>/tasks.md 每项均为 [x];(仅 UI 项目)Playwright E2E 套件通过且截图差异在阈值内;并且由一个不同模型做的一致性评审(P8 提示词)报告无 spec-vs-代码 缺口。上限:25 轮。
第 1 轮:为每个 spec scenario 派生一条失败测试(以其 scenario ID 命名),并把失败运行结果打印出来。之后每一轮:按 tasks.md 顺序实现下一项,然后跑 `npm test`(有界面再跑 Playwright)并把命令输出打印出来,让结果进 transcript。代码完成后,跑一致性评审(codex exec / 新开 claude)并把结论贴回。
当全部条件成立时停,或满 25 轮停。"
```

**STEP6:**
```text
/goal "目标:本次变更已归档(增量规格合并进 openspec/specs/),且模块 <module> 的知识库文件已反映本次新增/变更的事实、并刷新了 source-commit 标记。上限:4 轮。
执行 /opsx:archive,然后更新 docs/apriori/truth/<module>.md,并列出究竟改了哪些文件/段落。
当两者都成立时停。"
```

**闸口清单(由你亲自决定的事):**① STEP0 触顶时的定稿裁决 ② gap 报告过目(大型)③ STEP3 技术评审 ④ 知识库 diff 批准 ⑤ 任何触顶 / 台账 ID 重开——升级处理,绝不悄悄放低标准。

**上限调优:**跟踪*每轮评审被采纳的问题数*(台账白送这个数字)。第 2 轮就趋近 0 → 调短上限;第 5 轮还在冒真问题 → 修上游的需求质量,别调高上限。

---

> 本 RUNBOOK 提炼自手册 §4(工作流)、§6(知识库)、§7(提示词)。手册讲 *why*,本文件讲 *what*。执行时,以本文件为准。
