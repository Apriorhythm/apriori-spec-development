# spec-review-v3 — id-pattern-and-delta-notes technical review

评审对象：五个delta-spec模块、design、proposal、tasks、冻结需求及projected living spec  
评审轮次：STEP2·r3  
评审角色：P5 technical reviewer  
评审方式：只读；未修改任何文件。

## Round-2 finding verification

### SPEC-1 — verified

两处遗留均已修复：

- SR-08现在明确要求flag和live config row同时不存在，并声明built-in default是最后兜底；
- SR-53标题现在只承诺resolution经default channel，与其THEN一致。

SR-50、SR-53、SR-13和CK-13的target行为彼此一致：

- flag > config > default优先级不变；
- 更窄的config row能够使识别变严格；
- `XX-01b`按新default绑定为完整ID；
- `XX-01b2`和`XX-01_x`不会被截短绑定。

对projected living spec的最终扫查未发现其他因default widening而变假的Requirement prose或scenario。

### SPEC-2 — verified

proposal、delta SR-08、design D1/D6和tasks T2现在使用同一个oracle：

- 新regex的语言是旧regex语言的超集；
- 兼容性保证位于`leadId`层；
- 对每个旧`leadId`返回非null的标题，新`leadId`返回逐字节相同的ID；
- `AC-30f`和`AC-BIS-01`明确记录为裸`.match()`反例，不属于旧绑定兼容域。

最终artifact扫查结果：

- req-final中“recognises / binding”措辞由统一的`leadId`契约限定，并未要求裸RegExp返回相同子串；
- 所有提及裸`.match()`的实现输入均明确声明该oracle为假；
- 未发现“只要flag省略就应用default”的残留。无flag但有config的场景均明确由config row治理。

SPEC-2已关闭。

## 1. 场景是否覆盖全部可见行为及失败/边界路径

**结论：通过。**

目标场景现已覆盖：

- 新default的新增识别形状及旧`leadId`绑定兼容；
- flag/config/default优先级和三个执行channel；
- 完整suffix绑定、尾随digit/underscore拒绝、duplicate变化；
- D5冻结分类regex和既有异常分支；
- D6两类finding、输出上限、顺序、截断及失败路径；
- fresh-init模板、config-origin child和四消费者一致性；
- Notes位置、重复、CAS、fence、zero-op及四类section恢复；
- non-Requirement h3的状态矩阵、discard、恢复和stamp优先级。

未发现需要新增的生产行为或失败场景。

## 2. 外部共享状态的init/runtime-update/cleanup-invalidation是否完整

**结论：通过。**

- **Init：** CF-12/CF-18钉死模板三处值、fresh-init config origin及端到端识别。
- **Runtime update：** 人类持有的现有`process-config.md`不被自动改写；flag > config > default保持不变。
- **Cleanup/invalidation：** 没有新增缓存、远端状态或持久化parser状态，因此没有新增清理或失效步骤。

timeout、child termination、CAS并发和archive原子失败继续继承state A。

## 3. 是否与state A冲突或破坏既有约定

**结论：通过。**

所有state-A差异都是明确目标。以下既有约定保持不变：

- `leadId`的index-0和尾随字符边界；
- config-origin匹配必须进入可终止child；
- CK-04、D6、verify和gate共享effective pattern；
- D5的TAP分类结果与default widening解耦；
- unknown h2、fence、stamp和RENAMED处理顺序；
- malformed delta整体fail-closed；
- CAS default-deny及archive rollback语义。

## 4. 是否存在spec未设计或design未被spec声明的行为

**结论：通过。**

六个MODIFIED block与design/tasks一致。最终内存projection结果：

- 5个module全部成功；
- 无conflict、CAS mismatch、hygiene或validation问题；
- 无unstamped mutation；
- 无dropped或ambiguous scenario。

MODIFIED INTEGRITY结果：

- archive-merge：4 retained，AM-71～73 added；
- check：4 retained；
- config：5 retained，CF-18 added；
- doctor：3 retained，DR-19/20 added；
- spec-runner binding block：14 retained，SR-08 titleChanged；
- spec-runner resolution block：5 retained，SR-53 titleChanged。

SR-57～SR-64及其`change-scoped verify`Requirement边界保持完整。

## 5. Security

**结论：通过。**

- config regex继续通过固定child、`shell:false`、stdin数据和kill budget运行；
- malformed或终止的config matcher保持fail-closed；
- Notes内stamp不会绕过CAS default-deny；
- discarded requirement不会进入bucket或store；
- 未新增权限、shell插值、外部写入或非原子恢复路径。

## Advisories

### ADV-1 — tasks中的M-1仍位于M0之前

若M-1只是执行提醒，建议改成非checkbox说明；若要求实际修改测试，应移到全绿baseline M0及影响清点M1之后。当前实现任务仍足够明确，不阻断执行。

### ADV-2 — CF-12仍有一处run-on语句

“while a documentation-only check still passed and whose table cells…”的`whose`指代不顺。Value、Default、comment和pipe-free prose的实质要求仍然唯一，属于编辑性问题。

### ADV-3 — touched scope现已一致

proposal已正确声明5份living spec、5个module和6个MODIFIED block，不再与实际delta集合冲突。

## Ledger delta

| ID | Previous status | New status | STEP2·r3 result |
|---|---|---|---|
| SPEC-1 | fixed (r2) | verified | SR-08同时排除flag/config；SR-53标题与正文一致；最终living-spec扫查无其他旧default假设 |
| SPEC-2 | fixed (r2) | verified | proposal/delta/design/tasks统一采用leadId层oracle；两条裸RegExp反例明确记录 |
| SPEC-3 | verified | verified | 无变化 |
| SPEC-4 | verified | verified | 无变化 |

VERDICT: no major issues, ready to proceed to execution
