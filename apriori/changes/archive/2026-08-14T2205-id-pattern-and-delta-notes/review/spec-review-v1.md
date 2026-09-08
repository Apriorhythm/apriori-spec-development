# spec-review-v1 — id-pattern-and-delta-notes technical review

评审对象：delta specs、design、proposal、tasks、冻结需求、state-A KB/source/tests  
评审轮次：STEP2·r1  
评审角色：P5 technical reviewer  
评审方式：只读；未修改任何文件。

## 1. 场景是否覆盖全部可见行为及失败/边界路径

**结论：2 个问题。**

### SPEC-3 — D6 delta spec遗漏样例数量、顺序和截断契约

| Field | Finding |
|---|---|
| Description | `specs/doctor/spec.md` 的 Requirement 与 DR-20规定了分类、每类恰一条 finding、pattern source/origin和类别隔离，却没有声明 req-final §B2、design D2.2及tasks T16共同要求的输出边界：pattern-mismatch最多3个样例、按store顺序取前3个、每个截断到40字符。 |
| Risk | med |
| Suggested fix | 把这三项加入doctor delta的规范正文，并在DR-20或独立场景中给出可执行断言。明确该上限适用于pattern-mismatch detail，避免实现正确但合并后的living spec丢失契约。 |

### SPEC-4 — fresh-init/template端到端行为只存在于design/tasks，不存在于delta spec

| Field | Finding |
|---|---|
| Description | design D4/D6和tasks T37～T39要求模板Value列、Default列和注释全部更新；fresh `apriori init`后解析结果必须为新source、`origin: 'config'`；config child必须同时识别scenario title和TAP description；check/D6/verify/gate必须一致。但三个delta spec中没有规范fresh-init行为。现有CF-12只抽象要求模板parsed value等于built-in default，并未钉死Default列、注释、新source、fresh-init origin或四消费者端到端结论。 |
| Risk | med |
| Suggested fix | 为config/init增加delta场景，声明模板三处值及fresh-init结果；再用一条端到端场景钉死config-origin child在title/TAP两侧的识别和四消费者一致性。同步更新proposal中的“三份living spec”触及范围。 |

其余新增边界覆盖充分：D5 tagged SKIP反例、两类D6 finding、Notes位置/重复/fence/CAS/zero-op、四类operation恢复、unknown h2、h3 discard/recovery以及stamp优先级均有测试任务。

## 2. 外部共享状态的init/runtime-update/cleanup-invalidation是否完整

**结论：通过。**

三个时刻均可由design D5和out-of-scope边界确定：

- **Init：** fresh init一次性复制更新后的active Value、Default和注释。
- **Runtime update：** `process-config.md`写出后归人类所有；已有文件不自动迁移。无配置行时才使用升级后的built-in default，已有active旧值继续覆盖default。
- **Cleanup/invalidation：** 没有缓存、注册表、远端状态或后台任务；两个常量和`IN_NOTES`均为进程内状态，因此没有清理或失效动作。

archive的并发CAS、preflight拒绝和失败原子性保持state A；config matcher的timeout/kill/fail-closed路径也未改变。

## 3. 是否与state A冲突或破坏既有约定

**结论：2 个问题。**

### SPEC-1 — widening后仍保留多条与新default矛盾的living scenarios

| Field | Finding |
|---|---|
| Description | 当前delta和未触及的living specs无法同时成立：① delta SR-13仍断言`XX-01b` unidentified/untagged，但新default的`leadId`返回完整`XX-01b`；② SR-50仍断言无config时`AC-08a`和`AC-BIS-01` unidentified；③ SR-53仍要求无flag/config时“behaves exactly as before this change”；④ CK-13仍断言无config row时`AC-08a`和`AC-BIS-01`均失败；⑤ 新SR-08仅以“`--id-pattern` omitted”为前提便宣称使用default，忽略了config row优先于default。对应state-A tests确实会变色。 |
| Risk | high |
| Suggested fix | 修改所有受影响的normative blocks，而不只SR-08：SR-08前提改成flag和config均不存在；SR-13明确`XX-01b`现在绑定为完整ID，并用`XX-01b2`/`XX-01_x`验证不得截成较短ID；SR-50改用真正不同于新default的config pattern来验证优先级；SR-53只保留resolution/channel不变，不再声称行为逐字节不变；CK-13删除无row失败的旧结论或改用default不识别的形状。同步修改相关测试和完整性预期。 |

### SPEC-2 — “逐字节相同子串”的strict-superset测试oracle按裸RegExp解释时为假

| Field | Finding |
|---|---|
| Description | 正则语言的包含关系成立，且对旧`leadId`成功识别的输入，绑定结果确实保持逐字节相同；但design D1/D6、delta SR-08和tasks T2写成了对“旧式能匹配的任一输入”比较裸匹配子串。反例：`AC-30f`上旧RegExp返回`AC-30`、新RegExp返回`AC-30f`；`AC-BIS-01`上旧RegExp可从index 3返回`BIS-01`，新RegExp从index 0返回完整ID。实现者若按T2字面写`.match()`属性测试，会得到必然失败的测试。 |
| Risk | med |
| Suggested fix | 将oracle统一改为：“对每个旧`leadId`返回非null的title，新`leadId`返回逐字节相同ID。”分别覆盖default inline matcher、config-origin child和CK-04 default parameter。另保留`AC-30f`、`AC-BIS-01`作为新识别输入，而不是旧绑定兼容样本。 |

实际消费者路径本身是相容的：

- `leadId`要求`m.index === 0`并检查尾随`[A-Za-z0-9_]`；
- config-origin child同样调用`leadId`；
- CK-04默认参数取得同一`DEFAULT_ID`；
- 因此旧`leadId`成功绑定的ID不会被新default延长。

## 4. 是否存在spec未设计或design未被spec声明的行为

**结论：2 个已列问题，无额外问题。**

- SPEC-3：D6输出边界已设计、已列任务，但living spec未声明。
- SPEC-4：模板和fresh-init端到端行为已设计、已列任务，但living spec未声明。

其余设计与delta spec一致。特别是archive parser的两个插入顺序均正确：

- `## Notes`判定位于legal-section与generic-h2之间，因此不会落入unknown-h2分支、不设置`sectionSeen`，且能在`SKIP_UNRECOGNIZED`的`continue`之前结束跳过态。
- `IN_NOTES`吞噬位于stamp处理之前，因此段内stamp既不采纳也不报problem。
- 新h3判定位于stamp和合法Requirement处理之后、body分支之前，并带`!blockDiscard`，因此不会吞掉discarded block内的游离stamp，也不会破坏RENAMED既有顺序。

## 5. Security

**结论：通过。**

- 新default是可信内建常量，不扩大可配置正则的执行权限；config-origin仍经固定child、`shell:false`、stdin数据传递和既有timeout/SIGKILL预算。
- `## Notes`中的stamp被忽略，但mutation在没有其它stamp时仍进入CAS default-deny，不形成绕过。
- h3错误使整个delta fail-closed，discarded block不进入buckets或store。
- 没有新增文件权限、外部写入、shell拼接或回滚路径。

## Advisories

### ADV-1 — tasks的基线/影响清点顺序正确

M0先证明全绿基线，M1再清点default widening会改变的既有断言，最后才写新测试，顺序合理。M1至少应记录：

- `test/spec-runner.test.js`的SR-13 suffix断言；
- `test/id-pattern.test.js`中的SR-50 bare-default、GT-22 bare、CK-13 bare、DR-16 bare和CF-12模板值断言。

显式注入旧regex的modified-integrity/change-scope测试是测试seam，不应仅因默认值变化而机械改写。

### ADV-2 — 三个MODIFIED block的机械完整性报告准确

当前delta相对state A的结构比较结果为：

- spec-runner：14 retained，SR-08 title/THEN改变，无added/dropped/ambiguous；
- doctor：3 retained，DR-19/DR-20新增；
- archive-merge：4 retained，AM-71/72/73新增。

SPEC-1修复后，这些计数和“one MODIFIED block each”声明必须相应更新。

### ADV-3 — “pattern-insensitive”残留已定位

目标delta已删除doctor block中的错误句。目标外仍存在的有效残留是：

- `apriori/truth/doctor.md`的state-A断言，tasks已明确安排STEP6修正；
- 当前living doctor block中的旧句，将由本delta替换。

未发现另一份目标spec或KB继续把D5声明为消费`DEFAULT_ID`且pattern-insensitive。

### ADV-4 — `blockDiscard`还有same-section duplicate来源

设计使用通用条件`!blockDiscard`，所以同section重复Requirement产生的discarded block也会正确抑制新h3问题并保留stamp优先级。T31/T34只显式测试新h3和RENAMED两个discard来源；建议再覆盖duplicate来源，但现有实现形状已确定，不单列阻断问题。

### ADV-5 — bundling仍可接受

default/doctor与delta-parser的风险面不同，但实现触点局部、共享状态很少、任务分组清楚。当前组合本身未造成额外正确性或发布原子性缺陷。

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SPEC-1 | widening后仍保留SR-13、SR-50、SR-53、CK-13等旧default结论，且SR-08遗漏config优先前提；合并后的living specs相互矛盾 | high | STEP2·r1 | open |
| SPEC-2 | strict-superset的逐字节oracle被写成裸RegExp匹配；`AC-30f`和`AC-BIS-01`可直接反证，T2按字面无法通过 | med | STEP2·r1 | open |
| SPEC-3 | doctor delta未声明pattern-mismatch样例最多3个、store顺序、每个40字符的输出契约 | med | STEP2·r1 | open |
| SPEC-4 | template三处更新及fresh-init config-origin/四消费者端到端行为只在design/tasks中，living delta spec未声明 | med | STEP2·r1 | open |

VERDICT: 4 issues open
