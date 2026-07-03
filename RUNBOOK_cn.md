<p align="center">
  Languages:
  <a href="./RUNBOOK.md">English</a> ·
  <a href="./RUNBOOK_cn.md">中文</a>
</p>

# Apriori RUNBOOK —— 给 AI Agent 的可执行协议

> `runbook-version: 1.1` · 上游:`https://github.com/Apriorhythm/apriori-spec-development`
> 项目本地状态只存在于 `process-config.md` 与 flow-state 文件——本文件无状态,因此**升级=用上游新版整文件覆盖**。

> **读者:AI Agent**(§6 除外,那节给操作它的人)。本文件自包含:Agent 运行时需要的一切都在这里——铁律、状态机、产物路径、提示词。
> **Why**——理念、工具搭建、实例教学——在人类手册([README_cn.md](./README_cn.md))里,Agent 不需要读它。两者在操作细节上不一致时,**以本 RUNBOOK 为准**。

---

## 0. 安装与会话启动

**安装(人做,每个项目一次):**

1. 把本文件复制进项目,如 `docs/apriori-runbook.md`。
2. 在项目规则文件(`CLAUDE.md` / `AGENTS.md` / `.cursor/rules/*.mdc` / `.github/copilot-instructions.md`)里加一行:
   > 开发流程遵循 `docs/apriori-runbook.md`。每次会话开始,先读它和 `doc/changes/<change>/flow-state.md`,从记录的位置继续。
3. 把 `templates/process-config.md` 复制到项目根目录为 `process-config.md`——**人类持有;agent 视其为只读**(R3)。缺失时,§4 打印的默认值生效。
4. 项目还没有 OpenSpec 的话:`openspec init`(手册 §3.3);`templates/config.yaml` 是一份现成的 `openspec/config.yaml` 起点。(OpenSpec 是可选的——见 §4 末尾的无 OpenSpec 映射。)
5. 可选(Claude Code):把 `templates/claude-command-apriori.md` 复制为 `.claude/commands/apriori.md`,即可用 `/apriori <change>` 启动。

**会话启动(Agent,每个会话都做):**

1. 完整读一遍本 RUNBOOK。
2. 读 `doc/changes/<change>/flow-state.md`。若不存在且你被要求启动一个变更:先定级(§2),创建状态文件(§3),再从该级别的第一步开始。
3. 从 `next-action` 继续。状态文件是唯一权威——绝不凭记忆或猜测重建进度。

**启动提示词(人用——复制并填空):**

```text
按 apriori runbook(docs/apriori-runbook.md)推进变更 <change-name>,级别 <小型|中型|大型>,轨道 <加固|探索>(拿不准:加固)。
先读 runbook 和 doc/changes/<change-name>/flow-state.md,从记录的位置继续。
(产物根若外置:artifact-root=<路径>。否则省略——即项目根。)
只推进到下一个人工闸口,然后停下来汇报。
```

> **加固轨**上,这句 kickoff(或需求文档的签核)*就是*人对意图的认可——意图卡只在**探索轨**存在(§4)。产物根外置时,kickoff 必须写明它,因为 flow-state 文件本身就在它下面。

---

## 1. 铁律

**R1 —— 每个人工闸口必停。** 闸口清单:① STEP0 触顶时的定稿裁决 ② gap 报告过目(仅大型)③ STEP3 技术评审 ④ STEP6 知识库 diff 批准 ⑤ 任何触顶或振荡(台账 ID 被重开)。探索轨(§4)另有三个具备闸口地位的**命名决策点**:`intent-card sign-off`(意图卡签核)、`extraction review`(提取评审)、`STEP2 full review`(汇入后全量评审)。到达闸口:更新状态文件,汇报——当前步骤、评审方结论行**原文**、台账中 open/rejected 项、需要人做的决定——然后停下。绝不替人批准闸口;"人还没回复"绝不等于批准。

**闸口整合(显式授权)。** 默认逐闸必停。人可以显式把中间闸口整合到某个靠后的闸口(如"一路跑到终审");该决定必须记入 `gates:`(范围+撤销方式),且随时可撤销。三个闸口**永远不可**被此类授权覆盖:**收缩决策**(§6)、**知识库签核**(闸口④)、**意图卡签核**(`intent-card sign-off`)。

> 这条保护禁止的是*被一揽子授权静默覆盖*——不是所有者的显式选择。受保护闸口仍可由**显式代行**决定,须同时满足:① agent 先呈报待决闸口——**每个受保护闸口独立列项**(编号、批的是什么、产物路径、可选决定),绝不与进度性提问捆绑;② 人的授权答复发生在呈报*之后*,并**原文**记入 `gates:`,一闸一条;③ 代行是**一次性的**——只覆盖该次呈报中列项的闸口,绝不继承到未来同类闸口。一句答复可以覆盖多个受保护闸口,当且仅当每个都被独立列项;先前存在的一揽子授权永远不算数。

**R2 —— 评审必须真实外调。** 生产会话永远不出评审结论。真实调起异构评审方:`codex exec -s read-only "<提示词>"`(第 2 轮起:`codex exec resume -c sandbox_mode="read-only" <session-id> "..."`——codex CLI ≥0.14x 的 resume 子命令不接受 `-s`;旧版本在 session id 之前用 `-s read-only`);没有 Codex 就**新开**一个不同档位的 `claude` 会话,喂给它产物加问题台账(P0)。把评审方的结论行**原文**贴回。评审方通常跑在只读沙箱里、无法自己写台账:由评审方在输出末尾给出**台账增量**(新行+状态翻转),生产方原样落盘并注明"代评审方录入";评审方原始输出全文存档于 `doc/review/<change>-<stage>-raw.*`,代录增量随时可与其对照。非交互/后台调用 codex 时必须关闭 stdin——命令末尾加 `< /dev/null`——否则它会打印 "Reading additional input from stdin..." 并挂起。如果无法真实调起评审方,停下来说明——**禁止模拟评审**。

**R3 —— 一切落盘;`/goal` 属于人;配置也属于人。** 产物写到 §4 表格的确切路径;每完成一步、每轮评审后都更新状态文件。所有轮次上限读取项目根的 `process-config.md`——**人类持有,agent 绝不写它**;文件缺失时,§4 打印的默认值生效。**每个评审环节的上限有硬性地板:每变更 1 轮——配置值小于 1 或不可解析,一律按默认值生效并警告;任何评审环节绝不归零。** `/goal` 是人执行的命令(§6)——绝不声称自己在跑 `/goal`,也不模仿它的评估器。你在会话内自行驱动的循环,同样遵守上限。

---

## 2. 变更定级(启动时做一次)

| 级别 | 典型形态 | 要跑的步骤 |
|---|---|---|
| **小型** | bugfix / 单文件;无新的用户可见行为;不动共享状态 | 轻量 explore(只对齐事实)→ STEP5 带测试 + 一轮一致性评审 → 有事实变化则 STEP6 回写 |
| **中型** | 单模块;有新的用户可见行为 | STEP0(1–2 轮)→ STEP1 → STEP2(1–2 轮)→ STEP5 → STEP6;STEP3 缩为异步设计过目 |
| **大型** | 跨模块 / 外部共享状态 / 数据迁移 / 新子系统 | 完整 STEP0–STEP6,所有闸口都过 |

凡触及外部共享状态或跨模块边界,不管 diff 多小,一律**大型**。拿不准先按低一级起步,遇到第一个意外就升级;级别(及任何升级)记入状态文件。

**第二轴——目标确定性**(启动时判定;以 `track` + `track-rationale` 记入状态文件;下一个人工闸口必报):

| 情形 | 轨道 |
|---|---|
| 目标与验收说得出来(哪怕粗糙) | **加固轨**——STEP0 循环负责精化 |
| 目标明确、技术方案未知 | **加固轨**——方案不确定是设计问题,不是目标问题 |
| 目标和验收都说不清 | **探索轨**(§4 的探索轨) |
| 探索中发现目标其实明确 | 立即转**加固轨** |

**绊线优先于确定性轴**:凡触及外部共享状态 / 生产数据 / 模块边界 / 迁移的变更,不管多模糊都禁止探索轨——走加固轨,可选用**调研 spike**(STEP1 变体,§4)。拿不准时默认:**加固**——与尺寸轴的方向相反,因为两轴的风险方向相反。

---

## 3. 状态文件

`doc/changes/<change>/flow-state.md`:

```markdown
change: <change-name>
tier: trivial | medium | large
track: harden | explore
track-rationale: <一行:为什么走这条轨——下一个人工闸口必报>
current-step: STEP0 | STEP1 | STEP2 | STEP3 | STEP4 | STEP5 | STEP6 |
              INTENT-CARD | SPIKE | EXTRACTION |     # 探索轨位置
              DONE | ABANDONED
round: 0                # 当前步骤内的评审轮次 / apply 轮次
next-action: <一行具体动作,如 "对 req-v2.md 调起 P1 评审">
artifact-root: .        # 可选;默认=项目根(v1.0 路径逐字不变)。
                        # 只作用于过程产物:requirement/、doc/review/、
                        # doc/explore/、doc/changes/。绝不作用于 docs/truth/
                        # (同仓原子性)与 openspec/(工具持有)。外置时
                        # kickoff 提示词必须写明——本文件自己就在它下面。
gates:                  # 只增不改的人工决定日志
  - <日期> <闸口>: <人的决定,原文>
```

每步、每轮完成后立即更新;每个闸口决定都追加记录;新会话信这个文件,不信自己的推断。

---

## 4. 状态机

**产物路径**(每一步都写到这里——绝不自行发明路径):

| 产物 | 路径 |
|---|---|
| 需求文档 | `requirement/req-v{N}.md` → 定稿 `requirement/req-final.md` |
| 需求评审 | `doc/review/<change>-req-review-v{N}.md` |
| 问题台账 | `doc/review/<change>-issues.md` |
| gap 报告 | `doc/explore/<change>-gap-report.md` |
| 规格 / 设计 / 任务 | `openspec/changes/<change>/specs/`、`…/design.md`、`…/tasks.md` |
| 规格评审 | `doc/design/<change>-review-v{N}.md` |
| 知识库(TRUTH-DOC) | `docs/truth/<module>.md`——必须带 `source-commit` 标记(只覆盖契约节,§5 P9/P10) |
| 流程状态 | `doc/changes/<change>/flow-state.md` |
| 意图卡(探索轨) | `requirement/intent-card.md` |
| 提取评审(探索轨) | `doc/review/<change>-extraction-review-v{N}.md` |
| 原型(探索轨) | `spike/`——archive 时删除或隔离;tasks.md 绝不引用 |
| 评审方原始输出 | `doc/review/<change>-<stage>-raw.*` |

### STEP0 —— 需求精细化 · 对抗循环 · 上限:`step0-cap`(默认 5)

- **输入:**`requirement/req-v{N}.md`;知识库(如有)。
- **每轮:**(1)若已有评审,据其修订 → `req-v{N+1}.md`,逐条注明采纳/拒绝+理由并更新台账;(2)用 **P1** 调起评审方(R2)→ 评审文档 + 台账;(3)记录结论行。
- **退出:**结论 =「无重大问题」→ 复制为 `requirement/req-final.md`,前进。触顶 → **闸口 ①**。发现目标根本说不清 → 提议 harden→explore(经人工闸口确认后切轨)。

### 探索轨(EXPLORE)—— §2 把变更分到这里时

0. **意图卡先行(不可豁免):**≤15 行,路径 `requirement/intent-card.md`——目标假设 / 成功判据 / spike 要回答的问题。须经**人签核**(`intent-card sign-off`;异构评审可作为签核前的参考,但不能替代)。在这条轨上,意图卡是独立评审基准——提取出的规格绝不只对照原型自证。
1. **spike(有界):**在 `spike/` 下自由做原型;上限:`spike-cap`(默认 10)轮;退出=意图卡问题逐条有答案。触顶 → **闸口 ⑤**。
2. **P11 —— 规格提取:**输入=意图卡+原型+spike 结论;输出=`requirement/req-final.md` + spec 草案(OpenSpec 项目:`openspec/changes/<change>/specs/`;无 OpenSpec:`doc/changes/<change>/specs/`)。
3. **P12 —— 提取评审(异构,R2):**上限:`extraction-review-cap`(默认 2)。结论 `extraction accepted` → 第 4 步;`extraction rejected` + 提取不忠实 → 重跑 P11;`extraction rejected` + 意图假设被证伪 → 回 SPIKE,或 `ABANDONED`(归档意图卡与结论;记台账)。
4. **汇入:**进入 STEP2 的 P5/P6 全量循环——此后两轨完全无差别。
5. **原型是一次性的,且机器可查:**STEP5 从失败测试重建;tasks.md 不得引用 `spike/`;`spike/` 在 archive 时删除(或隔离归档)。
6. **轨道转移:**explore→harden(提取通过,或目标已然明确);harden→explore(STEP0 发现目标说不清——经人工闸口);explore→ABANDONED(假设证伪)。每次转移保留意图卡、结论与台账;只丢弃 `spike/`。

### 知识库前置检查 —— STEP1 之前,凡项目已有代码就做

知识库文档有两个**真相方向相反**的小节(§5 P9/P10):`契约(code-is-truth)` 与 `决策(doc-is-truth)`。

- **契约节:**`docs/truth/<module>.md` 有契约节吗?新鲜吗——`git log --oneline <source-commit>..HEAD -- <模块目录>` 是否为空?(`source-commit` 只覆盖契约节。)新鲜 → STEP1。过期 → 用 **P10** 校对**契约节**(在那里代码是真相),刷新标记。缺失 → 用 **P10** 反向沉淀;产出的文档必须先经人或异构模型复核,**之后**下游才能使用。
- **决策节:**永远不从代码校对。若代码违反其中 `active` 状态的不变式,那是**要上报的 bug,不是要改的文档**;决策只因被后继决策取代而过期(`superseded-by: <id>`)。

### STEP1 —— explore

- **动作:**用 **P3** 执行 `/opsx:explore`。**产出:**gap 报告。
- **调研 spike 变体**(模糊但触绊线的变更,§2):允许在 `spike/` 下写探针代码——探索轨的全部隔离规则适用——上限 `spike-cap`(默认 10);结论作为 gap 报告的"调研结论"附录。P3 带对应变体条款。
- **退出:**大型 → **闸口 ②**(人过目 gap 报告)。其余级别:把报告的主要风险并入下次汇报,继续前进。

### STEP2 —— propose · 对抗循环 · 上限:`step2-cap`(默认 4)

- **动作:**用 **P4** 执行 `/opsx:propose`;然后循环:评审方 **P5**(R2)→ 生产方用 **P6** 修订(只改 spec/design——绝不动源码);每轮更新台账。
- **退出:**结论 =「无重大问题,可进入执行阶段」→ 前进。触顶或振荡 → **闸口 ⑤**。

### STEP3 —— 技术评审 —— **闸口 ③(人工)**

- **Agent 的职责:**备齐材料——设计文档、规格、台账(拒绝项置顶)——呈上,停下。把结论记为 DESIGN-REVIEW-DOC 并写入 `gates:`。重大设计变更 → 回 STEP2。
- 中型:异步过目替代会议——结论照样记录。个人开发者:决策记录仍须来自生产方上下文之外(全新会话评审)。

### STEP4 —— 更新文档

- 按 DESIGN-REVIEW-DOC 修订 spec/design;可选再来一轮 P5/P6。STEP3 无改动则跳过。

### STEP5 —— apply · 上限:`step5-cap`(默认 25)

- **动作,按序:**(1)每个 spec scenario 一条失败测试,测试名带 scenario ID——展示失败运行;(2)用 **P7** 按 tasks.md 顺序实现,随做随标 `[x]`;(3)跑到全绿;(4)异构一致性评审 **P8**(R2);更新台账。
- **按项目类型的验证矩阵:**后端/库——单测+属性测试+变异抽查;UI——另加 E2E/视觉回归;有部署面的服务——另加运行时契约、金丝雀+回滚;**纯文档项目——`python3 scripts/check_docs.py` 全绿 + 示例命令静态检查 + P8 一致性评审,替代 `npm test` 作为退出条件。** 项目类型不具备某种可执行仪器时,LLM 评审在该处就是主力仪器——这不是降级。
- **退出——以下全部:**测试全绿(按上述矩阵);每个 scenario ID 至少出现在一个测试名里(纯文档:由校验脚本的结构检查顶替);tasks.md 全 `[x]`;一致性结论 =「无 spec-vs-代码缺口」。设计不可行 → 回 STEP2;需求本身错了 → 回 STEP0(两者都要:更新状态文件并告知人)。触顶 → **闸口 ⑤**。

### STEP6 —— 归档 + 知识库回写

- **动作:**用 **P9** 执行 `/opsx:archive`;更新 `docs/truth/<module>.md`(契约节按最终实现更新+刷新 `source-commit`;决策节追加本次变更的新决策/不变式);列出改了哪些文件/段落。探索轨变更:在此删除或隔离 `spike/`。
- **退出:**增量规格已合并 + 知识库已更新 → **闸口 ④**:人批准知识库 diff(同仓库布局下就是 PR 评审)。然后置 `current-step: DONE`。

**无 OpenSpec 时**(任何项目类型):`/opsx:explore` → 按 P3 直接撰写 gap 报告;`/opsx:propose` → 直接撰写 spec/design 文档(P4 的要求照旧约束),spec 草案放 `doc/changes/<change>/specs/`;`/opsx:archive` → 把规格归档进项目约定目录。不强制安装 OpenSpec。

---

## 5. 提示词

### P0 —— 问题台账(下面每条提示词都读写它)

`doc/review/<change>-issues.md`:

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
* 需求文档: requirement/req-v{N}.md
* 系统知识库(如有): docs/truth/<模块名>.md
* 问题台账(如有): doc/review/<change>-issues.md
【评审维度,逐条给结论】
1. 目标状态 B 是否清晰、无歧义
2. 边界条件与异常路径是否覆盖(空值、越界、并发、超时、失败回滚)
3. 是否存在"隐含但未声明"的状态变更或副作用
4. 每条验收标准是否可测(能写成「如果…那么…」)
5. 与系统现状 A 是否冲突(若提供了知识库)
【输出】
生成 doc/review/<change>-req-review-v{N}.md:按维度列问题清单(描述/风险/修改建议)。
按台账规则把每条问题同步进台账。末尾给出结论行:「无重大问题」与否。
不要修改需求文档本身。
```

### P2 —— STEP0 修订(生产方)

```text
按 doc/review/<change>-req-review-v{N}.md 修订需求文档,输出 requirement/req-v{N+1}.md。
逐条说明处理方式(采纳/拒绝+理由),并更新台账中各问题的状态(fixed / rejected+理由)。
```

### P3 —— STEP1 explore

```text
/opsx:explore
先对齐所有已知事实——不要写代码。
【输入】
* 需求文档: requirement/req-final.md
* 系统知识库: docs/truth/(相关模块: <模块名>;新项目注明"暂无")
* 技术详细设计文档: design.md(如有)
* 代码: 当前仓库
【输出】
doc/explore/<change>-gap-report.md:当前状态 A、目标状态 B,以及两者之间的差异点与风险。
【调研 spike 变体——仅限 §2 分派到此的"模糊但触绊线"变更】
允许在 spike/ 下写探针代码(探索轨隔离规则适用),上限 spike-cap;
结论作为 gap 报告的"调研结论"附录。其余情况:不要写代码。
```

### P4 —— STEP2 propose(生产方)

```text
/opsx:propose
基于已对齐的事实,编写提案、全部规格文档与设计文档。
* 每个用户可见的输出都有独立 scenario,并带稳定 ID(如 KV-03);可见侧效果不得合并;
* 凡外部共享状态(Redis/DB字段/全局单例/内存缓存),必须描述三个时机:初始化 / 运行中更新 / 清理失效。
完成后停下,等待评审。
```

### P5 —— STEP2 评审方(异构,R2)

```text
你是技术评审专家,重点找"会导致返工或线上事故"的问题。
【输入】
* SPEC-DOC: openspec/changes/<change>/specs/   * DESIGN-DOC: openspec/changes/<change>/design.md
* 知识库: docs/truth/   * 需求文档: requirement/req-final.md   * 台账: doc/review/<change>-issues.md
【检查清单】
1. scenario 是否覆盖全部可见行为,有无遗漏的失败/边界场景
2. 外部共享状态的三个时机是否完整
3. 是否与现状 A 冲突、是否破坏既有约定
4. spec 写了设计没落实,或设计引入了 spec 未声明的行为
5. 安全(变更触及外部输入或权限时):未校验输入、缺鉴权、日志中密钥/敏感信息、注入面
【输出】
doc/design/<change>-review-v{N}.md:逐条问题(描述/风险/建议);按台账规则同步进台账。
末尾给出结论行:「无重大问题,可进入执行阶段」与否。
```

### P6 —— STEP2 修订(生产方)

```text
另一个模型评审了你的规格与设计:doc/design/<change>-review-v{N}.md。
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
* 凡 continue/skip/静默忽略分支,回查 spec 确认是否需要对用户可见。
(纯文档项目:"测试套件"= `python3 scripts/check_docs.py` + 示例命令静态检查——可行处同样先失败后通过。)
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
逐条列出不一致项与修复建议;末尾给出你的台账增量(按 P0 规则)。
(纯文档项目:第 1 条机械核对 = 校验脚本的输出;"测试"读作文档检查。)
末尾给出结论行:「无 spec-vs-代码缺口」与否。
```

### P9 —— STEP6 archive(生产方)

```text
/opsx:archive
归档本次变更,并同步更新知识库。知识库文档有两个真相方向相反的小节:
* "## 契约(code-is-truth)":按最终实现更新;刷新 source-commit 标记(只覆盖本节);
* "## 决策(doc-is-truth)":追加本次变更做出的决策/不变式/被否决方案,各带状态(active / superseded-by: <id>)。绝不为迁就代码改写 active 不变式——代码违反它就报 bug;
列出你更新了哪些知识库文件、哪些段落。
```

### P10 —— 知识库反向沉淀 / 校对(旧项目)

```text
你是系统知识库工程师。阅读该模块代码,产出/校对其知识库文档。
【输入】代码范围: <目录或文件清单>。现有知识库(如有): docs/truth/<模块名>.md
【任务】抽象:对外职责/接口、核心数据流、关键状态与副作用(三个时机)、依赖、约定与坑。若已有知识库,按下述小节规则逐条标出不符/过时/缺失并修订。
【输出】docs/truth/<模块名>.md,放在变更分支上(让 PR diff 成为评审现场),固定两小节、真相方向相反:
* "## 契约(code-is-truth)"——接口、三时机、代码派生的坑;此节代码是唯一真相:从代码校对,并带上你所读 commit 的 source-commit 标记(标记只覆盖本节);
* "## 决策(doc-is-truth)"——决策、不变式、被否决方案,各带状态(active / superseded-by: <id>);此节绝不从代码校对——代码与 active 不变式冲突时,在输出里标记为 bug,不改条目。
【约束】契约节只写代码里确实存在的事实;决策节只写被明确确认过的意图。不确定处标"待人工确认";绝不编造抽象意图。
```

### P11 —— 探索轨:规格提取(生产方)

```text
【输入】requirement/intent-card.md;spike/ 下的原型;spike 结论。
【任务】提取原型的*已验证*行为所蕴含的规格——绝不发明意图卡与 spike 观察都不支持的行为。产出:
* requirement/req-final.md——目标+验收标准,逐条可溯源到意图卡;
* 带 scenario ID 的 spec 草案(OpenSpec 项目:openspec/changes/<change>/specs/;无 OpenSpec:doc/changes/<change>/specs/)。
【约束】未验证的假设标"待确认"。原型是观察来源,不是权威来源:意图与原型冲突处,以意图卡为准并显式列出分歧。
完成后停下,等待提取评审(P12)。
```

### P12 —— 探索轨:提取评审(异构,R2)

```text
【输入】requirement/intent-card.md;P11 的产出;问题台账。
【检查表】P1 的五个维度,另加:
6. 意图卡符合性——每个目标与成功判据都出现在提取出的规格里;
7. 无凭空发明——每条规格可溯源到意图卡或某次 spike 观察(抽查溯源)。
【输出】doc/review/<change>-extraction-review-v{N}.md——问题按 P0 列出;末尾给出你的台账增量,
然后是严格二选一的结论行:「extraction accepted」或「extraction rejected」。
上限:extraction-review-cap(默认 2)。rejected+提取不忠实 → 生产方重跑 P11;
rejected+意图假设被证伪 → 回 SPIKE 或 ABANDONED(状态机的失败分支)。
```

---

## 6. 人类操作员附录

> 本节内容全部**由人执行**。Agent 绝不执行或模拟 `/goal`(R3)。架构原理与注意事项:手册 §4.10。
> 以下配方中的所有上限都是**默认值**——`process-config.md` 可覆盖(地板:每评审环节 1 轮)。

**STEP0 循环:**
```text
/goal "目标:requirement/req-final.md 存在,且最新一轮评审判定为「无重大问题」。上限:step0-cap 轮(默认 5)。
每一轮:
1. 若 doc/review/<change>-req-review-v{N}.md 存在,据其修订 requirement/req-v{N}.md,升到 v{N+1},逐条注明 采纳/拒绝+理由,并同步更新 doc/review/<change>-issues.md 里对应问题的状态。
2. 用一个不同的模型对当前版本跑评审,输出存到 doc/review/<change>-req-review-v{N}.md,例如:
   codex exec -s read-only \"<P1 提示词> —— 目标:requirement/req-v{N}.md\"
   (没有 Codex?新开一个 claude,把 P1 连同问题台账一起交给它)
3. 把评审方的结论行贴回本对话。
当判定为「无重大问题」时停(并复制为 requirement/req-final.md),或触顶停。"
```

**STEP2 循环:**
```text
/goal "目标:openspec/changes/<change>/ 有 SPEC-DOC+DESIGN-DOC,且最新评审判定为「无重大问题,可进入执行阶段」。上限:step2-cap 轮(默认 4)。
每一轮:
1. 据最新评审修订 spec/design 文件——绝不动源码——并同步更新 doc/review/<change>-issues.md 里已处理问题的状态。
2. 重跑异构评审,用 P5 提示词(第 1 轮:codex exec,记下打印的 session id;之后各轮:codex exec resume -c sandbox_mode=\"read-only\" <session-id>——codex ≥0.14x 的 resume 不接受 -s;旧版在 id 前用 -s read-only),产出 doc/design/<change>-review-v{N}.md 并更新台账。
3. 把评审结论行贴回这里。
当判定为「无重大问题,可进入执行阶段」时停,或触顶停。"
```

**STEP5 循环:**
```text
/goal "目标 —— 以下全部成立:`npm test` 退出码 0;openspec/changes/<change>/specs/ 里每个 scenario ID 至少出现在一个测试名里(列出缺失的 ID);openspec/changes/<change>/tasks.md 每项均为 [x];(仅 UI 项目)Playwright E2E 套件通过且截图差异在阈值内;并且由一个不同模型做的一致性评审(P8 提示词)报告无 spec-vs-代码 缺口。上限:step5-cap 轮(默认 25)。
第 1 轮:为每个 spec scenario 派生一条失败测试(以其 scenario ID 命名),并把失败运行结果打印出来。之后每一轮:按 tasks.md 顺序实现下一项,然后跑 `npm test`(有界面再跑 Playwright)并把命令输出打印出来,让结果进 transcript。代码完成后,跑一致性评审(codex exec / 新开 claude)并把结论贴回。
当全部条件成立时停,或触顶停。"
```
> 纯文档项目:`npm test` 换成 `python3 scripts/check_docs.py`,去掉 Playwright 条款,保留一致性评审。

**STEP6:**
```text
/goal "目标:本次变更已归档(增量规格合并进 openspec/specs/),且模块 <module> 的知识库文件已反映本次新增/变更的事实、并刷新了 source-commit 标记。上限:step6-cap 轮(默认 4)。
执行 /opsx:archive,然后更新 docs/truth/<module>.md,并列出究竟改了哪些文件/段落。
当两者都成立时停。"
```

**闸口清单(由你亲自决定的事):**① STEP0 触顶时的定稿裁决 ② gap 报告过目(大型)③ STEP3 技术评审 ④ 知识库 diff 批准 ⑤ 任何触顶 / 台账 ID 重开——升级处理,绝不悄悄放低标准。探索轨另加:`intent-card sign-off` 与 `extraction review` 的结论裁决。闸口整合(§1)由你授予——但永远不覆盖收缩决策、知识库签核、意图卡签核。

**收缩治理(新陈代谢规则)。** 每 N 个变更(默认 5,`shrink-proposal-freq`)由 agent **汇报——绝不自行执行**——一份收缩/恢复建议,数据包必含:verified 数、rejected 数(附理由抽样)、reopened ID 数。收缩任何评审环节都是**人工闸口决策**;rejected 占比超过 `rejected-ratio-guard`(默认 50%)或变更类别触绊线(共享状态/迁移/安全/生产数据)时一律不得收缩。收缩=下调该环节轮次上限——**地板 1,任何环节绝不归零**。合并后复查(采样率 `post-merge-review-freq`,默认每 5 个合并变更抽 1 个)发现 ≥1 个高风险漏网 → 恢复该环节原上限,同样记档。两个方向都要提防:生产方靠拒单可以把指标压零(rejected 占比守卫防的就是这个);评审方轻率 verify 只会推迟收缩(方向安全)。

---

> 本 RUNBOOK 提炼自手册 §4(工作流)、§6(知识库)、§7(提示词)。手册讲 *why*,本文件讲 *what*。执行时,以本文件为准。
