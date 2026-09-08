# issue ledger — archive-readiness

轮次标签：`STEP0·rN`（P1）/ `STEP2·rN`（P5）/ `STEP5·rN`（P8）。
状态词汇：`open` / `fixed` / `verified` / `rejected` / `rejected-verified` / `waived` / `advisory-acked`。
生产方只能 `open → fixed | rejected`；`verified` / `rejected-verified` 属评审方，`waived` 属人类。
重开（reopen）是**事件**不是状态：复现的问题回到原 ID 的 `open`，绝不新开一行。

本 change 是 `archive-preflight` 的收窄重开；前身的台账**不并入**本台账，
其 ID 空间（REQ-1..REQ-9 / SPEC-1..SPEC-4）与本台账无关，引用时须写全 `archive-preflight:REQ-N`。

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | G1 的结构安全读取层被随收窄一并删掉：flow-state/tasks/ledger 的 symlink、非文件、坏祖先、逃逸、读取异常未定义；外部「已完成」文件可让 ABANDONED bundle 通过 | high | 1 | verified |
| REQ-2 | `--force` 自称只解进度类，矩阵却把整个 R3 设为可 force（含非法 status、缺理由、waived 无人类证据、台账缺失）；且「只在 --write 下有意义」与「dry-run 同样改变结论」自相矛盾 | high | 1 | verified |
| REQ-3 | 单文件形式的 `--force` 语义不唯一：AM-86 要求 USAGE 两行都出现，AM-84 又要求该形式逐字节不变 | med | 1 | verified |
| REQ-4 | readiness 的插入点相对既有 guard 集合不唯一：B5 漏列 temp guard / destination containment / integrity report；B6 的「→ 合并」与源码不符（buildProjection 已在 preflight 内完成内存合并） | med | 1 | verified |
| REQ-5 | B2 的「词法/realpath 双量度」不足以实现：未定义 path.resolve、路径段边界、`.`/`..`、前缀兄弟目录、symlink root、缺失/悬空/权限失败；且「任何读取之前」与计算 realpath 本身冲突 | high | 1 | verified |
| REQ-6 | 单文件收窄的迁移面严重漏报：docs/concepts{,_cn}.md 的 STEP6 教程命令、SECURITY.md、living spec AM-12/AM-19、cli spec、CHANGELOG 均未纳入；§零-3 的成本断言据此不成立 | high | 1 | verified |
| REQ-7 | `DONE` 诊断与 R1 优先级矩阵冲突：高层 archive 读的是 in-flight 路径，`DONE` 不能断言「已归档过」；且 ABANDONED/DONE 可与其他 C3 错误同时出现，与「互斥」声明矛盾 | med | 1 | verified |
| REQ-8 | advisory batch acknowledged (A-1 TOCTOU 前置条件写法 / A-2 G3 findings 独立追踪入口 / A-3 收窄后的准确结论) | low | 1 | advisory-acked |
| REQ-9 | advisory batch acknowledged (r3: A-4 标题版本号 / A-5 standing authorization 的产品定性; r4: A-6 旧 helper 名 / A-7 force 语法的前置否定控制; r5: A-8 B7a 第 2 步按对象分流 / A-9 结构类枚举补齐 `not-dir`+`io-error`) — 并携带两条留给后续 change 的稳定 finding 标识: `finding:resolver-archive-tiebreak`（`resolveChange` 在同名归档中取字典序最后者）与 `finding:archive-move-clock`（phase 4 自行 `new Date()`，检查所用目录名与实际创建的可以不同） | low | 5 | advisory-acked |
| SPEC-1 | archive 的 ledger 判据被设计成第二份实现（另走 parseLedger+classifyStatus），与「同一份代码」冲突且会漂移；`readinessOf` 的签名未定义谁做安全读取与 state/tier/flowText 的来源 | high | S2·1 | verified |
| SPEC-2 | D2 的 force parser 自相冲突：裸 regex 会匹配 `do not archive-force …`，而补救用的「前一个词白名单」会**拒绝需求自己要求照抄的 canonical 模板**（前词是 `(owner):`）；且三条路径未声明哪条是规范 | high | S2·1 | verified |
| SPEC-3 | `containDefect` 的 `enoent` 哨兵不在声明的返回类型里，两个调用点也未处置；realpath 阶段的 ENOENT 无唯一实现与验收 | med | S2·1 | verified |
| SPEC-4 | RY-01/RY-02 的差分在 B2 之后退化为**自比较**（gate 已改为调用基础层），搬迁改坏 detail 也测不出；B0 未保存状态 A oracle | med | S2·1 | verified |
| SPEC-5 | AM-111 的 WHEN 用了无 reason 的 revoke 记录，按规范该被忽略，场景却要求它生效 | med | S2·1 | verified |
| SPEC-6 | acceptance 绑定不闭合：RY-03/RY-04 无测试任务；AM-99..AM-106 无 scenario 也无 task-only 声明；CL-03 引用不存在的 AM-99..AM-106；tasks 伪造 `AM-99b`（踩小写后缀陷阱） | med | S2·1 | verified |
| SPEC-7 | B1 的迁移判据不足（按 write/success 过滤，漏掉 dry-run 成功、编程式 `archiveChange()`、readiness 之后才注入失败的用例）；B3 又要求在 B4 接线之前通过 archive 端到端场景 → 会**假绿** | high | S2·1 | verified |
| SPEC-8 | advisory batch acknowledged (A-1 完整性报告的 `! missing` 是三条不是两条 / A-2 `AM-99b` 亦踩仓库刚记录的小写后缀陷阱) | low | S2·1 | advisory-acked |
| SPEC-9 | advisory batch acknowledged (S2·r2: A-3 D1.4 标题行残留 `tier` 参数 / A-4 D2 示例时间戳不是 RUNBOOK 的 `YYYY-MM-DDTHH:MM` 规范形态 / A-5 golden 的采集入口只能是 `runGate().checks`、且诊断里的绝对路径须占位符化) | low | S2·2 | advisory-acked |
| SPEC-10 | advisory batch acknowledged (S2·r3: A-1 req-final 的 AM-110 摘要残留 `\w` 字样 / A-2 D1.2 的 containDefect 摘要签名未带 `path` / A-3 D2 验算表的时间戳未含 RUNBOOK 规范形态) | low | S2·3 | advisory-acked |
