# spec-review-v2 — id-pattern-and-delta-notes technical review

评审对象：五个delta-spec模块、design、proposal、tasks、冻结需求及projected living spec  
评审轮次：STEP2·r2  
评审角色：P5 technical reviewer  
评审方式：只读；未修改任何文件。

## Round-1 finding verification

### SPEC-1 — REOPENED

大部分修复已正确落地：

- SR-13现在规定`XX-01b`绑定为完整ID，`XX-01b2`和`XX-01_x`仍拒绝；
- SR-50和CK-13使用更窄的`[A-Z]+-\d+`配置行证明config优先；
- SR-53的THEN只承诺resolution/channel不变；
- projected living spec中未发现其他旧default行为假设。

但仍有两处未完成：

1. `specs/spec-runner/spec.md:37`仍然只有：

   `WHEN --id-pattern is omitted`

   它没有要求config row也不存在。自定义config存在且flag省略时，THEN仍错误地要求使用built-in default。该行与本轮输入所称“BOTH the flag and the config row to be absent”不一致，也与同一delta的SR-50及effective-pattern precedence冲突。

2. SR-53的正文已修复，但标题仍是：

   `SR-53 absent flag and config the default binds unchanged`

   “binds unchanged”与正文明确声明recognised-title集合变宽相冲突。

**Risk：high**

**Suggested fix：**

- SR-08 WHEN改为“neither `--id-pattern` nor a live config `id-pattern` row exists”；
- SR-08末句分别写清flag/config/default三个来源，避免把flag称作“configured pattern”；
- SR-53标题改成例如“absent flag and config still resolve through the default channel”；
- 更新tasks M-1的完成声明及spec-runner完整性预期；SR-53标题修改后第二个block应出现一个`titleChanged`。

### SPEC-2 — REOPENED

delta SR-08、design D1/D6和tasks T2均已正确改为`leadId`层oracle，并包含两个裸RegExp反例。

但`proposal.md:20-21`仍保留旧说法：

> 严格超集，对旧式能识别的每一个输入返回逐字节相同的子串

这里没有限定`leadId`成功绑定域，仍可被理解为裸RegExp子串比较，而`AC-30f`和`AC-BIS-01`已经反证该说法。proposal是本次实现输入之一，因此同一change仍给出两个不同的测试oracle。

**Risk：med**

**Suggested fix：**

把proposal的WHAT改为与design一致：正则语言是超集；兼容性保证只针对旧`leadId`返回非null的标题，新`leadId`返回相同ID。保留两个裸匹配反例或明确引用design D1。

### SPEC-3 — verified

doctor delta的Requirement正文和DR-20均已明确：

- pattern-mismatch最多3个样例；
- 按store顺序选择；
- 每个最多40字符；
- detail同时携带bounded source和origin；
- 两类各产生恰一条finding。

该契约现在同时存在于spec、design和tasks中，oracle唯一。

### SPEC-4 — verified

config delta现在完整声明：

- CF-12：Value、Default和built-in-default comment必须携带同一pattern；
- CF-18：fresh init后返回`origin: 'config'`；
- 三种新ID形状在scenario-title和TAP-description两侧均被识别；
- config-origin child参与匹配；
- CK-04、D6、verify和gate C1结论一致。

该可见行为不再只存在于design/tasks。

## 1. 场景是否覆盖全部可见行为及失败/边界路径

**结论：1个问题，SPEC-1。**

除SR-08前提和SR-53标题外，projected living spec未发现其他被新default推翻的场景或Requirement prose。

D5、D6、config precedence、fresh init、Notes、CAS、fence、unknown h2、discard/recovery及zero-operation路径均有确定场景。

## 2. 外部共享状态的init/runtime-update/cleanup-invalidation是否完整

**结论：通过。**

- **Init：** CF-12/CF-18钉死fresh-init模板值和config origin。
- **Runtime update：** 已有`process-config.md`继续归人类所有，不自动迁移；active config仍覆盖built-in default。
- **Cleanup/invalidation：** 无缓存、远端状态或持久化parser状态，不需要新增cleanup或invalidation。

config matcher的timeout/kill/fail-closed、archive的CAS并发与原子失败路径均继承state A。

## 3. 是否与state A冲突或破坏既有约定

**结论：2个已重开问题，无新问题。**

- SPEC-1：SR-08仍与现有flag > config > default优先级冲突，SR-53标题与其新正文冲突。
- SPEC-2：proposal仍携带已被反例推翻的裸子串oracle。

其余目标差异均是明确、受测的行为变更。`leadId`边界、config-origin child、CK-04默认参数和D5冻结regex的约定保持一致。

## 4. 是否存在spec未设计或design未被spec声明的行为

**结论：通过。**

SPEC-3和SPEC-4的缺口已补齐。archive parser的三项既有插入顺序确认继续成立：

- Notes heading位于legal-section与generic-h2之间；
- `IN_NOTES`吞噬位于stamp handling之前；
- 新h3判定位于stamp/Requirement之后、body之前，并受`!blockDiscard`约束。

六个MODIFIED block均能clean projection，无conflict、CAS mismatch、hygiene或validation问题。

## 5. Security

**结论：通过。**

- config regex仍经固定child、`shell:false`、stdin数据和既有kill budget；
- Notes内stamp不会形成CAS绕过，unstamped mutation仍default-deny；
- bad h3使delta fail-closed，discarded block不进入store；
- 未新增权限、外部写入、shell插值或非原子回滚路径。

## Advisories

### ADV-1 — proposal的触及范围仍写“三份living spec”

当前delta实际为五个模块、六个MODIFIED block；`proposal.md:53`仍写“3份living spec”。实际文件发现和tasks已覆盖五个模块，因此暂不构成实现缺口，但建议改成准确数字，避免交付清单漂移。

### ADV-2 — M-1位于M0之前使执行顺序不够清楚

tasks声明严格按顺序执行，但M-1写着既有测试“必须一并改”，位置却在全绿基线M0之前。若M-1只是提醒，应改成非checkbox说明；若它要求实际修改测试，应移到M0/M1之后的测试阶段，确保baseline确实来自state A。

### ADV-3 — CF-12存在一处run-on语句

CF-12的“while a documentation-only check still passed and whose table cells…”连接不顺，`whose`的指代不清。三处值和pipe-free prose的实质要求仍可确定；建议拆成两个句子。

### ADV-4 — MODIFIED INTEGRITY结果已复核

当前结果与输入一致：

- archive-merge：4 retained，3 added；
- check：4 retained，0 added；
- config：5 retained，1 added；
- doctor：3 retained，2 added；
- spec-runner block 1：14 retained，SR-08 title changed；
- spec-runner block 2：6 retained；
- 所有block均无dropped或ambiguous，SR-57～SR-64保持在其原Requirement中。

## Ledger delta

| ID | Previous status | New status | STEP2·r2 result |
|---|---|---|---|
| SPEC-1 | fixed (r1) | open | SR-08仍只排除flag、未排除config；SR-53标题仍声称binding unchanged |
| SPEC-2 | fixed (r1) | open | delta/design/tasks已修，但proposal仍保留裸子串oracle |
| SPEC-3 | fixed (r1) | verified | D6样例数量、顺序及截断契约已进入Requirement正文和DR-20 |
| SPEC-4 | fixed (r1) | verified | CF-12/CF-18已覆盖模板三处及fresh-init端到端行为 |

VERDICT: 2 issues open
