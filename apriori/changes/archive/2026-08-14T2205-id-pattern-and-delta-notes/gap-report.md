# gap-report — id-pattern-and-delta-notes（STEP1 / P3）

> 输入：`requirement/req-final.md`、`apriori/truth/{config,doctor,archive-merge,check,spec-runner}.md`、
> `apriori/specs/…`、`lib/`、`test/`、`templates/`
> 规矩：本步不写代码，只对齐事实。行号取自 `brownfield-round2` @ f415824。

---

## 一、状态 A — 组件级清点

### A1 `lib/config.js` — 常量与解析

| 位置 | 事实 |
|---|---|
| `:16` | `const DEFAULT_ID = '[A-Z]+-\\d+';` —— **唯一**的默认值定义处 |
| `:119-132` | `resolveIdPattern(cwd, flagValue)` → flag（**按存在性**，空 flag 是错误）> config `id-pattern` 行 > `DEFAULT_ID`；返回 `{source, origin}` 或 `{error}` |
| `:156` | 导出 `DEFAULT_ID` 与 `resolveIdPattern` |

### A2 `DEFAULT_ID` 的全部消费者（grep 实证，共 4 个真实消费点）

| 消费者 | 位置 | 用途 | 本 change |
|---|---|---|---|
| `resolveIdPattern` 兜底 | `lib/config.js:131` | verify / gate C1 / doctor D6 的生效 pattern | **放宽**（B1） |
| `check` CK-04 | `lib/check.js:163` `checkScenarioIds(specText, name, idPattern = DEFAULT_ID)` | 结构一致性 | 随之放宽 |
| `doctor` D5 探针 | `lib/doctor.js:33` `const idRe = new RegExp(DEFAULT_ID)` | **TAP 行解析** | **解耦**（B1b） |
| `spec-runner` 再导出 | `lib/spec-runner.js:18, :829` | 供 doctor 等取用 | 不变 |

### A3 D5 的计数为什么会被牵连（req-final §1.5 的源码定位）

```
lib/doctor.js:45   const parsed = [...results.values()].reduce((s, r) => s + r.pass + r.fail, 0)
                                + untagged.length + unattributedFailures.length;
lib/doctor.js:50   if (parsed === 0) { … 'TAP stream truncated or malformed' … }
```

`parseTap` 把带 `# SKIP`/`# TODO` 的行记成 `skip`，**既不进 pass/fail、也不进 untagged**。
于是「一个被识别了 ID 的 tagged skip」贡献 0。放宽默认式 ⇒ 更多行被识别 ⇒ 更多行落进这一格。

**解耦点就是 `:33` 这一行**：把它换成本模块自己的冻结常量即可，`:45` 的算式一字不动。

### A4 `lib/doctor.js` — D6 的 finding 构造

| 位置 | 事实 |
|---|---|
| `:147` | `d6Entries.push({ id:'D6', status:'finding', detail: \`scenario(s) without a bindable ${boundedSource(idp.source)} ID${src}: …\`, fix: 'add leading IDs' })` |
| — | detail **已经**回显 bounded source 与来源标记 `src`；本 change 要加的是**按类分流**与第二条 fix |
| `:148` | 重复 ID 的 finding 与本 change 无关，须保持不变（AC-IP-13） |

### A5 `lib/archive-merge.js` — delta 解析器的真实状态机

| 位置 | 事实 |
|---|---|
| `:81` | `SECTION_LINE_RE = /^##\s+(ADDED\|MODIFIED\|REMOVED\|RENAMED)\s+Requirements\s*$/` —— **四种**，不是三种 |
| `:82` | `H2_LINE_RE = /^##\s/` |
| `:83` | `REQ_LINE_RE = /^###\s+Requirement:\s+(.+?)\s*$/` |
| `:100` | `let state = 'FILE_PREAMBLE';  // \| 'IN_SECTION' \| 'IN_REQUIREMENT' \| 'SKIP_UNRECOGNIZED'` —— **四个 state**；`kind` 是**正交**变量 |
| `:118-125` | 围栏优先：`inFence` 时一切不透明 |
| `:126` | `SECTION_LINE_RE` 命中 → flush、`state='IN_SECTION'`、`kind=…`、`sectionSeen=true` |
| `:127-132` | 其它 h2 → problem + `state='SKIP_UNRECOGNIZED'`、`kind=null` |
| `:133` | `if (state === 'SKIP_UNRECOGNIZED') continue;` —— **戳也被跳过**（注释明写 "stamps included"） |
| `:135-144` | **`STAMP_ATTEMPT_LINE_RE` 在此**——先于 `REQ_LINE_RE`、先于 body 分支，在**每一个非跳过状态**都生效。这正是 r3 指出的、P1 不得覆盖的那一段 |
| `:145-165` | `REQ_LINE_RE`：段前 → problem；`kind==='RENAMED'` → problem + **作废块**（`blockDiscard=true`）；否则开块（重名 → problem + 作废） |
| `:166` | **`if (state === 'IN_REQUIREMENT') { blockLines.push(line); continue; }`** —— 静默并入的那一行；本 change 要在它**之前**插入新的 h3 判定 |
| `:167` | `SCENARIO_LINE_RE` 在块外 → problem |
| `:168-172` | `IN_SECTION` + `RENAMED` → 解析 `- Old -> New`；其余自由文本 |
| `:375` / `:815` | `deltaOpCount(delta) === 0` → 零操作拒绝（Notes-only 必须仍走这条） |

**插入点因此非常局部**：`:166` 之前加一条「`state==='IN_REQUIREMENT'` 且 `blockDiscard===false`
且行匹配 `/^###\s/` 且不匹配 `REQ_LINE_RE`」的判定；加一个 `IN_NOTES` 状态与其转移。

### A6 `templates/process-config.md`（r1·REQ-2 的实证）

```
| id-pattern | [A-Z]+-\d+ | bare JS regex source …；pipe escaping: … | [A-Z]+-\d+ |
                ^^^^^^^^^^ 第 2 列 Value：init 原样写进新项目，resolveIdPattern 优先消费
                                                                      ^^^^^^^^^^ 第 4 列 Default：说明
```

表下注释另有一处 `built-in default [A-Z]+-\d+`。**三处旧值都要改**。

### A7 语料与回归面（实测）

| 面 | 数字 |
|---|---|
| 本仓 store 在新旧 pattern 下的 identified / unidentified / duplicates | 353 / 0 / 0 —— **两者相同，且 ID 集合逐个相同** |
| 棕地样本 151 个场景在新 pattern 下仍绑不上的 | **0**（旧 pattern 下 50 个） |
| 归档 delta 语料里非 `### Requirement:` 的 h3 | **0** 处 |
| 归档 delta 语料里非四种法定 h2 的段 | **0** 处 |
| store 里非 `### Requirement:` 的 h3 | **0** 处 |

**没有任何存量产物需要迁移。**

---

## 二、状态 B

见 `requirement/req-final.md` §二（B1 放宽默认式 / B1b D5 解耦 / B2 D6 按类分流 / B3 `## Notes` + h3 收紧）。

---

## 三、差距（G1..G8）

| # | 差距 | 影响面 | 风险 |
|---|---|---|---|
| **G1** | `DEFAULT_ID` 的值 | `lib/config.js:16` 一行 | 低（本仓零影响，已实测） |
| **G2** | D5 借用 `DEFAULT_ID` | `lib/doctor.js:33` 一行 + 一个新常量 | 低但**必做**，否则 G1 会把合法 TAP 打成 FINDINGS |
| **G3** | D6 只有一条 fix | `lib/doctor.js:147` 附近分流 | 中——分类谓词要按 req-final §B2 的定义写死 |
| **G4** | 无 `IN_NOTES` 状态 | `lib/archive-merge.js` 状态机 | **中**——转移面最大的一块，但契约已逐格钉死 |
| **G5** | 非-Requirement h3 静默并入 | `:166` 之前插一条判定 | 中——须受 P1 约束，且**绝不**改戳的处理顺序 |
| **G6** | 模板三处旧值 | `templates/process-config.md` | 低但**易漏**（漏了新项目就拿不到新默认式） |
| **G7** | RUNBOOK / docs / CHANGELOG 未提 `## Notes` 与新默认式 | 文档四处 | 低 |
| **G8** | 无测试覆盖上述任一 | `test/` | 工作量主体 |

---

## 四、风险与 STEP2 需定夺

| # | 事项 |
|---|---|
| R1 | **G5 的插入位置**：必须在 `:166` 的 body 分支**之前**、但在 `:135-144` 的戳处理**之后**——顺序写反就会吞掉戳（r3 的教训） |
| R2 | **G4 的 `IN_NOTES` 与 `SKIP_UNRECOGNIZED` 的关系**：`:133` 的 `continue` 让跳过态吞掉一切（含戳）；`## Notes` 作为 h2 必须能终止它 |
| R3 | **G2 的新常量该叫什么、放哪**：放 `lib/doctor.js` 内部（不导出）最简单，且天然保证「不是 `DEFAULT_ID` 的消费者」 |
| R4 | 既有测试里凡断言「某标题 unidentified」的，可能因 G1 变色——STEP5 第一件事是全量基线 + 逐条核对 |
| R5 | 本 change 归档后 change 2 的 archive-merge delta 需换戳（已记在其 flow-state） |

---

## 五、KB 新鲜度（STEP1 出口）

| truth | source-commit | `git log <stamp>..HEAD -- lib/<m>.js` | 结论 |
|---|---|---|---|
| `config.md` | 6dc5f98 | 空 | 新鲜 |
| `doctor.md` | 3d32d6f | 空 | 新鲜 |
| `archive-merge.md` | 4127653 | 空 | 新鲜 |
| `check.md` | 6dc5f98 | 空 | 新鲜 |
| `spec-runner.md` | 3d32d6f | 空 | 新鲜 |

**但 `truth/doctor.md` 有一处内容陈旧**：它称 D5 的计数分类 "pattern-insensitive"，
而 req-final §1.5 已用反例推翻。STEP6 的 KB 写回必须改正它（与 change 1 修 "seven checks" 同类）。

---

## 六、STEP1 出口

Large tier → **gate ②**，已被 kickoff 的关卡合并授权覆盖，不停，直接进 STEP2。
top risks（R1 / R2 / R4）并入下一次向人类的汇报。
