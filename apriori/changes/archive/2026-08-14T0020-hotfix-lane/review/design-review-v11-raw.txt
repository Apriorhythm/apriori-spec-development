<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r11 transport=codex-exec-wsl-proxy -->

七项修订均已实际落盘；DES10-1..7 的主修复方向成立。但复审发现以下新问题。

- **DES-1｜高风险｜k2 的 `n` 仍有两套冲突定义。**  
  D6 先规定新增尾部 occurrence “按 delta 文件中的出现次序”编号，随后又规定 `n` 统一为“requirement 块内出现次序”。例如两个 ADDED 块各含同一裸 ID，前者得到 `#1/#2`，后者得到 `#1/#1`；canonical key 因此不唯一。HL-N-54 只验证后一口径，没有消除正文冲突。依据：[design.md:125](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:125)、[cli-checkpoints.md:196](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:196)。

- **DES-2｜高风险｜module-token 推导函数不是全输入域单值函数。**  
  “strip 目录与 `.md`/`spec.md`”没有定义剥离哪一级目录；state A 的 spec walker 允许递归嵌套，因此 `specs/foo/spec.md`、`specs/bar/foo/spec.md` 可能同得 `foo`，也可能后者得到不符合 token grammar 的 `bar/foo`。同时示例中的 `dashboard` 当前不在 store/truth 模块词表中，与“必须由现存 suffix vocabulary 推导”自相矛盾。缺少碰撞拒绝以及 spec/truth 同 token 的归并规则。依据：[design.md:156](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:156)、[archive.js:294](/mnt/d/Workbench/misc/apriori-spec-development/lib/archive.js:294)、[process-config-rows.md:25](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/process-config-rows.md:25)。

- **DES-3｜高风险｜π2 固定临时文件方案既非“只读计划”，也没有并发安全性。**  
  步骤①被称为“全量只读计划校验”，却在开始时删除 `screenshots.md.tmp`，已经发生写操作。更严重的是，“无并发写者”只是声明，没有锁、进程所有权或互斥前提；两个 evidence 命令并发时，后启动者可删除前一个正在使用的固定临时文件。该行为也主动偏离 state A 对预存临时文件 fail-closed 的做法，却没有等价安全机制。依据：[design.md:134](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:134)、[archive.js:699](/mnt/d/Workbench/misc/apriori-spec-development/lib/archive.js:699)。

- **DES-4｜高风险｜f2 的 `evidence/` 全树绑定缺少 fail-closed 遍历契约。**  
  “所有普通文件”没有规定遇到 symlink、symlink 目录、FIFO、不可读文件或遍历期间文件变化时是拒绝还是忽略。若 `results.txt` 或 `screenshots.md` 是 symlink，证明消费者可能读取其目标，但 artifact 摘要器因其不是普通文件而漏绑，形成证据内容未进入摘要的通道。需要明确 `lstat`/realpath containment、非普通项一律拒绝及一致快照边界。依据：[design.md:137](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:137)。

- **DES-5｜高风险｜decision-summary 仍允许 D3 已判非法的组合。**  
  D3 明确规定 `d×π2` 若未同步调整 AC1 阈值就是非法联合选择；decision-summary 却仍写成“同步调阈值或接受超限”。后者允许 owner 在 gate③ 选择一个设计正文和 HL-N-59 必须拒绝的组合。依据：[design.md:83](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:83)、[decision-summary.md:41](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:41)、[cli-checkpoints.md:201](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:201)。

- **DES-6｜中风险｜verdict digest 的机械词法仍不封闭。**  
  定式只写 `digest=<hex>`，没有规定 SHA-256 对应的“恰 64 位小写十六进制”。截图 hash 已有该约束，verdict digest 却没有；实现可分别采用大小写归一、任意长度 hex 或严格 64 位，错误谱与跨实现行为不一致。依据：[design.md:141](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:141)。

- **DES-7｜中风险｜AC-I 没有覆盖上述新增边界。**  
  HL-N-53..59 验证了本轮声明的正常修复，但没有覆盖：delta 文件序与块内序产生不同 k2、module-token 推导碰撞、两个 π2 命令并发、f2 树内 symlink/非普通/不可读项，以及 verdict digest 长度和大小写错误。因此当前“全谱”仍无法防止实现选择错误口径。依据：[cli-checkpoints.md:195](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:195)。

VERDICT: 7 issues open.