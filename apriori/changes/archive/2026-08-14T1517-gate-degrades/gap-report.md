# gap-report — gate-degrades（STEP1 / P3）

> 输入：`requirement/req-final.md`、`apriori/truth/{gate,doctor,spec-runner,config,args}.md`、
> `apriori/specs/{gate,doctor,spec-runner}/spec.md`、`lib/`、`test/`、`docs/`
> 规矩：本步不写代码，只对齐事实。行号取自 `brownfield-round2` @ 235a121。

---

## 一、状态 A — 组件级清点

### A1 `lib/gate.js`（399 行）

| 位置 | 现状事实 |
|---|---|
| `:11` | `const { verify, configTestCmd } = require('./spec-runner');` —— **只引了 `verify`，没有 projection-only 入口**（因为没有导出） |
| `:12` | `const { CHANGE_NAME_RE, containsReal } = require('./archive-merge');` —— gate 对 archive-merge 的**全部**依赖就这两个符号，**不含**任何 projection 原语。故 AC-GD-15a 的否定断言（不出现 `discoverDeltas`/`buildProjection`）不会误伤既有代码 |
| `:22` | `function err(res, msg) { res.errors.push(msg); res.result='ERROR'; res.code=2; return res; }` —— 唯一的 ERROR 出口，**所有** exit 2 都经过它 |
| `:251-270` | `checkBinding(cwd, name, stage, testCmd, idPattern)` —— in-flight 走 `verify({change,...})`，archived 走 `verify({specs:[apriori/specs],...})`；返回 `{check, projection}` 或 `{infra:[...]}` |
| `:275-289` | `checkCas(projection, stage, noCas, cwd)` —— **archived 直接 `return {id:'C7',status:'n/a'}`，根本不看 projection**（这印证 req-final M8「归档态不需要建 projection」）；in-flight 读 `projection.unstampedMutations` |
| `:293-306` | 判定次序：`--change` → 名字合法性 → `resolveChange` → **`:301` hotfix 判定** → **`:306` flow-state 存在性** → 解析 flow-state |
| `:310-316` | 测试命令解析：`opts.testCmd` → `configTestCmd(cwd)`（`{error}` → ERROR）→ **`:316` 缺席即 ERROR**。这一行就是本 change 的靶心 |
| `:318-320` | `checkBinding` 的 `infra` 错误 → `res.result='ERROR'; res.code=2; return res;`（不经 `err()`，但同样是 exit 2） |
| `:321-334` | C2..C7 依次 push |
| `:336-338` | **结果计算共三行**：`blocked = checks.filter(status==='blocked').length` → `result = blocked ? 'BLOCKED':'PASS'` → `code = blocked ? 1:0` |
| `:342-344` | `toJson(res)` = `{change, stage, checks, result, blocked, errors}` —— **确无 `code` 字段**（req-final §1.4 已据此勘误） |
| `:349-352` | `withStrict` 的 `jsonError` seam：错误 JSON 硬编码 `result:'ERROR', blocked:0` |
| `:353` | `testCmd: f['--test-cmd'] \|\| null` —— **真值判定**，把 `''` 塌缩成 `null`（T2 不可区分的根因） |
| `:354` | `idPattern: ('--id-pattern' in f) ? ... : null` —— **存在性判定**，正是 `--test-cmd` 要照抄的写法 |
| `:359` | `const mark = { pass:'✓', blocked:'✗', 'n/a':'–' };` —— **没有 `skipped` 键**；直接加状态会打印 `undefined C1 …` |
| `:361` | `if (res.code !== 2) console.log(res.code === 0 ? 'GATE: PASS …' : 'GATE: BLOCKED (n)')` —— **二分支**，INCOMPLETE 无处落脚 |

### A2 `lib/doctor.js`（250 行）

| 位置 | 现状事实 |
|---|---|
| `:154-156` | `const cfgCmd = opts.testCmd ? null : configTestCmd(cwd); const testCmd = opts.testCmd \|\| (cfgCmd && cfgCmd.error ? null : cfgCmd);` |
| `:157` | id-pattern 坏 → D5 `n/a`「probe skipped (invalid id-pattern config)」（**优先级最高**，AC-GD-19 要求保持） |
| `:158` | config 冲突/错误 → D5 `finding`「config: …」 fix「keep one live test-cmd row」（AC-GD-18 要求保持且文案可区分） |
| `:159` | **`else if (!testCmd) → D5 'n/a'`** —— 本 change 的第二个靶心 |
| `:160` | `--no-run` → `n/a`「probe skipped (--no-run)」（AC-GD-17 要求保持） |
| `:161` | 否则跑 `classifyProbe(runTestCommand(testCmd, cwd))` |
| `:206-210` | **D8** legacy 3.x 布局根检测 —— 实现存在、living spec 有 DR-13 绑定，而 `truth/doctor.md` 仍写「The seven checks」并只列 D1..D7（AC-GD-24 要修的就是它） |
| `:230` | `mark = { ok:'✓', finding:'✗', 'n/a':'–' }` —— doctor 不引入新状态，本 change 不动它 |
| `:232-234` | 结果行：`UNUSABLE` / `${findings} finding(s)` / `HEALTHY`；`findings` = finding 条数。**`n/a` 不计入**，所以缺 test-cmd 时整体 HEALTHY |

### A3 `lib/spec-runner.js`（812 行）

| 位置 | 现状事实 |
|---|---|
| `:44` | `function _setChildRunner(fn) { childRunnerOverride = fn; }` —— **只**被 `makeIdMatcher` 内 `childRunnerOverride \|\| defaultChildRunner` 消费，作用域是 **config 来源 id-pattern 的匹配子进程**，与测试命令无关 |
| `:509-523` | `function buildChangeProjection(change, cwd)` —— **不接受 testCmd 参数**；内部 `am.discoverDeltas` → `am.buildProjection`；返回 `{projection:{modules,conflicts,unstampedMutations,notes}, errors, texts, deltaOps, modifiedBlocks}`；`errors` = `[...validation, ...hygiene, ...casMismatches]` + conflict 汇总行 |
| `:603-663` | `verify(opts)`：`buildChangeProjection`（`:615`）→ 场景收集（`:617-639`）→ **`:642` `runTestCommand(opts.testCmd, cwd)`** → 评估。**projection 早于测试执行 33 行**，这是本 change 全部可行性的支点 |
| `runTestCommand` | `spawnSync(cmd, {shell:true, cwd, encoding:'utf8'})` —— **无任何注入点** |
| `:810-812` | `module.exports` 里**没有** `buildChangeProjection`，**没有** test-runner seam |

### A4 `lib/config.js`

| 位置 | 现状事实 |
|---|---|
| `:67` | `if (!key \|\| value === undefined \|\| value === '') continue;`（单元格已 `trim()`）—— 空值行 ≡ 无该行，**对所有 key 一视同仁**。这是 T7 必须吞掉「`test-cmd` 行值为空」的唯一原因，也是本 change **不碰** config.js 的原因 |
| `readConfig` | 只有确定的 ENOENT 算「缺席」，其余读失败（目录/权限/不可达祖先）都是 unreadable-config 问题 → 支撑 T4 |

### A5 living spec / KB / 文档 / 测试的受影响面

| 文件 | 受影响处 | 性质 |
|---|---|---|
| `apriori/specs/gate/spec.md`（133 行，6 个 Requirement） | `### Requirement: gate aggregates …` 的正文枚举了「0/1/2」三个退出码；`GT-11` 的 JSON schema 枚举了 `result: "PASS"\|"BLOCKED"\|"ERROR"` 与 `checks[].status` | **MODIFIED**（两处），外加一个 **ADDED** Requirement 承载降级语义 |
| `apriori/specs/doctor/spec.md`（86 行，5 个 Requirement） | `### Requirement: doctor diagnoses the project-apriori seam` 内的 D5 描述 | **MODIFIED** 一处 |
| `apriori/specs/spec-runner/spec.md`（12 个 Requirement） | 无现存 Requirement 描述 projection 的导出面 | **ADDED** 一个小 Requirement（导出入口 + 两个 seam） |
| `apriori/truth/gate.md` | Contract 的退出码句、`runGate` 返回形状、`checks[].status` 取值、「七项检查」段的 C1 前置条件；Decisions 追加本 change 决策 | STEP6 更新 |
| `apriori/truth/doctor.md` | 「The seven checks」→ D1..D8（AC-GD-24）；D5 分支描述；Decisions 追加 | STEP6 更新 |
| `apriori/truth/spec-runner.md` | Contract 记录新导出面与两个 seam（K5） | STEP6 更新 |
| `test/gate.test.js`（633 行） | 现有断言几乎都走「有测试命令」路径，受 AC-GD-09 保护；**需确认**是否有断言「缺 test-cmd → exit 2」 | 待 STEP5 逐条核 |
| `test/doctor.test.js`（328 行）`:168` `DR-07` | 断言「缺配置 → `n/a`」，**与 AC-GD-16 直接冲突，必须改写** | 已知必改项 |
| `docs/ci.md` / `docs/ci_cn.md` | exit-code cheat table 只有 0/1/2 三行 | AC-GD-21 |
| `docs/cli.md:136` / `docs/cli_cn.md` | `Exit: 0 PASS · 1 BLOCKED · 2 untrustworthy evaluation.` | AC-GD-22 |
| `docs/troubleshooting.md:19` / `_cn.md` | `### D5 — test command findings` 小节 | AC-GD-23 |
| `CHANGELOG.md` | Unreleased 段 | AC-GD-25 |
| `.github/workflows/ci.yml` | **不调用 gate** —— 无影响 | 已核 |
| `scripts/golden-path.mjs` | 流程由 `init --test-cmd` 写入配置，走的是有命令路径 | 无影响（B4 保护） |

---

## 二、状态 B（目标）

见 `requirement/req-final.md` §二/§三。摘要：

1. gate 在「测试命令缺席（T7）」时 C1 报 `skipped`、C2..C7 照跑、整体 `INCOMPLETE` / exit 3；
2. 优先级 `ERROR(2) > BLOCKED(1) > INCOMPLETE(3) > PASS(0)`，判定式唯一；
3. doctor 在「完全未配置」时 D5 从 `n/a` 升为 `finding` 并点明后果；
4. 有配置的路径**按 `step5-amendment.md` 的记名修正范围守恒**——解析器无 override 时落到原函数、
   配置齐备路径的完整公共结果在三态下结构相等（含反向守卫）、配置齐备路径上的既有测试一字未动且全绿。
   **「与改动前逐字节相同」不再声称**：本仓内没有状态 A 的冻结 golden，该命题观察不到（STEP5·r7 勘误）；
5. `spec-runner` 导出 projection-only 入口并新增两个测试 seam，gate 与 verify 共用同一引用。

---

## 三、差距（G1..G10）

| # | 差距 | 现状 → 目标 | 影响面 | 风险 |
|---|---|---|---|---|
| **G1** | `gate.js:316` 的提前返回 | 缺席即 ERROR → 缺席标记 c1-skipped 并继续 | gate.js | 低（删一行 + 一个布尔） |
| **G2** | 结果计算只认 blocked | `:336-338` 三行二分支 → 四分支判定式（errors → blocked → skipped → pass） | gate.js | 低。**但必须保证 `blocked` 字段仍只数 blocked**，否则 GT-02 等既有断言的计数会漂 |
| **G3** | `mark` 表缺 `skipped` 键 | `:359` → 增一个符号；`:361` 的二分支 → 三分支 | gate.js | 低但**易漏**：漏了会打印 `undefined C1 …`，且不会有任何测试自然失败（除非专门断言输出行） |
| **G4** | `--test-cmd` 用真值判定 | `:353` `f['--test-cmd'] \|\| null` → `('--test-cmd' in f) ? … : null` | gate.js | **中**。改成存在性后，`--test-cmd ""` 由「回落 config」变成 ERROR ——这是**行为变更**，须确认无既有测试依赖旧行为 |
| **G5** | `runGate` 的 `testCmd` 类型域未封闭 | 无校验 → 非字符串即 ERROR/2 并点明类型 | gate.js | 低 |
| **G6** | `buildChangeProjection` 未导出 | 词法私有 → 导出，且 gate 在 T7 路径调用它 | spec-runner.js + gate.js | **中**。导出即扩大公共面（K5）；且必须**只**在 T7 路径用，有命令时仍走 `verify()` 整条路（否则 B4 破） |
| **G7** | 无 projection-builder 注入 seam | 无 → `_setProjectionBuilder(fn)`，`verify()` 与 gate 共用同一可替换引用 | spec-runner.js | **中**。CommonJS 下必须改 `verify()` **内部**的调用点为经由该引用，否则包不住（req-final §1.4 已记录该事实） |
| **G8** | 无 test-runner 注入 seam | 无 → `_setTestRunner(fn)` 包住 `runTestCommand` 的调用点 | spec-runner.js | 低。默认值即现函数 |
| **G9** | doctor D5 缺席分支是 `n/a` | `:159` → `finding` + 后果文案 + fix | doctor.js + test/doctor.test.js `DR-07` | **中**。四个分支的**优先级**必须保持：id-pattern 坏 > config 冲突 > `--no-run` > 缺席。注意现状里 `--no-run` 在 `:160`、**排在缺席分支之后**——缺席分支升级为 finding 后，「无配置 + `--no-run`」会先命中缺席分支变成 finding，**违反 AC-GD-17**。必须调整分支次序或条件 |
| **G10** | 文档/KB 六个文件 + CHANGELOG 未反映新语义 | — | docs ×6, truth ×3, CHANGELOG | 低但条目多，靠 AC-GD-21..25 的可 grep 断言兜底 |

---

## 四、风险与需要在 STEP2 定夺的事

| # | 事项 | 说明 |
|---|---|---|
| R1 | **G9 的分支次序**是本次唯一一个「现状代码结构会主动咬人」的地方 | 见上表。gap-report 在此点名，STEP2 的 design 必须给出明确的分支顺序表 |
| R2 | G4 的存在性改造是既有行为变更 | STEP5 前须先跑一遍全量测试基线，确认没有测试依赖 `--test-cmd ""` 回落 config |
| R3 | 退出码 3 与 `withStrict` 的 `jsonError` seam | 参数错误路径硬编码 `result:'ERROR'`，本 change 不改它；须确认新分支不会误入该路径 |
| R4 | `checkBinding` 的 `infra` 分支不经 `err()` | 两条 ERROR 出口（`err()` 与 `:318-320`）都必须继续产出 exit 2；新增的 skipped 路径不得绕过任一条 |
| R5 | AC-GD-15c 的 6 个 fixture | clean / 未打戳 mutation / delta 畸形 / CAS 偏移 / merge conflict / 无 delta 文件 —— 现有 `test/fixtures/` 是否已有可复用的，STEP2 清点 |
| R6 | 归档态不建 projection（M8） | `checkCas` 在 archived 直接 `n/a`（`:275`），所以「不建」是**已经成立的事实**，实现只要不主动去建即可 |

---

## 五、KB 新鲜度复核（STEP1 出口）

| truth 文档 | source-commit | `git log <stamp>..HEAD -- lib/<m>.js` | 结论 |
|---|---|---|---|
| `gate.md` | 6dc5f98 | 空 | Contract 新鲜 |
| `doctor.md` | 4127653 | 空 | **戳新鲜，正文陈旧**（写 seven checks，实为 D1..D8）——AC-GD-24 在 STEP6 修正 |
| `spec-runner.md` | 6dc5f98 | 空 | Contract 新鲜 |
| `config.md` | 6dc5f98 | 空 | Contract 新鲜（本 change 不改 config.js，仅引用其契约） |

四份 truth 的 Contract 段按 commit-range 判定**全部新鲜**，无需 P10 reconcile。
`doctor.md` 是唯一一份「机械判定新鲜、正文实际陈旧」的——这正是新鲜度检查只看 commit range
而看不见内容的局限（req-final O7 记为不做，但本 change 顺手把这一份改对）。

---

## 六、STEP1 出口

Large tier → **gate ②**（人类过目 gap report）。
本 change 的 gate② 已被 kickoff 的**关卡合并**授权覆盖（flow-state `gates:` 2026-08-14T12:24），
故不停，直接进 STEP2；本报告的 top risk（**R1 / G9 的分支次序**）按合并授权的要求，
并入下一次向人类的汇报。
