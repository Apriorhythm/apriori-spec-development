# req-review-v4 — archive-preflight requirement review（Round 4）

评审基于静态读取；未运行测试，未修改文件。

## Round-3 findings verification

### REQ-1 — REOPEN

V4 的 N0、N1 及大部分 N2 修复是正确的：

- N0 将检查时间与实际 move 使用的时间绑定，关闭分钟切换和时钟回拨窗口；
- N1 的 `>=` 方向正确，覆盖未来时间戳、回拨排序反转和目的地撞名；
- N2 覆盖既存 archive-root defect、同名 symlink 和非法 Gregorian stamp；
- N3 正确避免 no-move 路径上的 phantom block。

因此，B2 中“若后续 gate 确实解析到刚移动的 bundle，则 C2/C3/C4 不 BLOCK”这个条件命题本身已经成立。

但需求同时声称 N0..N3 会机械保证“gate 解析到刚移动的 bundle”，且 AC-AP-17 的前件没有单列该解析假设。这个更强的承诺仍存在可达反例：

1. **待移动的 active entry 本身可以是 symlink。**  
   当前 `discoverDeltas()` 和 `archiveChangeDir()` 都使用 archive-merge 的 realpath containment；一个指向 changes root 内部真实目录的 `<changes-dir>/<name>` symlink 可以通过，并在 move 时被重命名成 `<archiveBasename>` symlink。就绪度读取也可能全部通过，但随后 `resolveChange()` 会把该 archived symlink 判为结构错误。N2 与 AC-AP-17d 只覆盖既存 archived entries，没有要求 active source 使用 resolver 的 active-entry 判据（lstat、非 symlink、必须为目录、contained）。

2. **并发前置条件没有覆盖 resolver 的 trust roots。**  
   §六把“整个解析命名空间”明确展开为 active entry 加同名 archived entries，但没有包含 `<changes-dir>` 与 `<changes-dir>/archive` 本身。检查后替换或改名 archive root，仍满足当前字面前置条件，却可令 move 或后续 gate 使用不同的解析结构。

3. **“采用 resolver 自己的判据”与 §9.2 的触及范围不可同时实现。**  
   `rootDefect` 在 state A 中是 `lib/resolve.js` 的私有函数，未导出；`resolveChange()` 又会在 active entry 存在时提前返回，不能借它扫描同名 archived entries。与此同时 §9.2 明说 `lib/resolve.js` 不动。实现者只能自行复制判据或违反触及范围，无法按要求唯一实现“resolver 自己的判据”。

风险：**high**。一个结构异常的正式 bundle 仍可能通过 readiness、写入 store 并移动，而后续 gate 无法解析它；这同时破坏 B2 的机械保证和 AC-AP-17。

建议修复：

- 把 active candidate 加入 N2：移动前必须用 resolver 相同的 lstat/目录/containment规则确认 `<changes-dir>/<name>` 是真实目录，至少增加“指向 changes 内部的 active symlink”验收。
- 将 `<changes-dir>` 与 `<changes-dir>/archive` 两个 trust root 纳入 §六的稳定性前置条件和并发 seam。
- 在 `resolve.js` 导出一个明确的共享 predicate，最好是覆盖 trust roots、active entry 和 archived candidates 的结构化 `archiveNamespaceDefect(...)`；或者明确导出所需 primitives。相应删除“`lib/resolve.js` 不动”的限制，禁止 readiness 复制 resolver 规则。
- 扩充 AC-AP-17d，覆盖 active symlink、active 非目录及 trust-root 在 N 检查后的替换。

### REQ-3 — REOPEN

§4.3 的总体方向正确：正式 bundle 内的 delta 应按 bundle 身份执行 readiness，复制到 bundle 外的内容可合理列为调用方责任。

但 V4 内部仍有直接冲突和未定义的路径分类：

1. **AC-AP-13 与 AC-AP-13d 自相矛盾。**  
   AC-AP-13 仍规定所有“不带 `--changes-dir`”的单文件调用“完全不受影响”；AC-AP-13d 则要求其中指向正式 ABANDONED bundle 的调用必须失败。两者可由同一次调用同时命中，无法共同验收。

2. **§9.2 仍保留旧 discriminator。**  
   它只说高层形式与“带 `--changes-dir` 的单文件形式”共用 readiness 入口，遗漏了本轮明确要求的“不带 `--changes-dir`、但 delta 属于正式 bundle”路径。

3. **仅凭 realpath 无法同时满足三分表的第一行和第三行。**  
   若词法路径位于 `<bundle>/specs/`，但某个 symlink 令 realpath 落到 bundle 外：
   - 按“实路径在 changes root 外”，它属于第一类外科手术，应保持旧行为；
   - 按“symlink 出界”，它又属于第三类，必须拒绝。  
   实现必须同时检查词法候选归属和 realpath containment，不能只按 realpath 三分。

4. **已归档正式 bundle 的显式 delta 路径没有唯一分类。**  
   `<changes-dir>/archive/<stamp>-X/specs/...` 仍是正式 bundle 内的 delta，但不符合字面上的 `<changes-dir>/<change>/specs/...`。需求没有规定应识别并检查它、无条件拒绝它，还是当作外科手术输入。若其 flow-state 为 ABANDONED，选择第三种会再次形成 store 写入绕过。B5 的“不回溯扫描”不妨碍对调用方显式提交的 archived-bundle delta 做判断。

风险：**high**。同一个正式 bundle delta 可因实现者选择 AC-AP-13、realpath 第一行或 §9.2 的旧入口而绕过 readiness，包括 ABANDONED 硬禁令。

建议修复：

- 将 AC-AP-13 改成：“不带 `--changes-dir`，且 delta 经规定的归属算法确认不属于任何正式 bundle时，保持原行为。”
- 更新 §9.2：所有被归属为正式 bundle 的单文件调用都进入同一 readiness 入口，与 `--changes-dir` 是否存在无关。
- 明确分类算法同时使用：
  - 规范化后的词法路径，用于判断调用是否声称位于 bundle；
  - realpath，用于证明路径仍包含在该 bundle 的 `specs/` 下。  
  词法上属于 bundle、realpath 却出界时必须拒绝。
- 明确覆盖 active 与 archived 两种 bundle 布局。最简单的安全规则是：显式读取 archived bundle delta 一律拒绝；若允许，则需从合法 stamp basename 推导 change identity，并执行相应 readiness。
- 为上述 symlink 出界和 archived ABANDONED delta 各增加一条 acceptance criterion。

### REQ-8 — VERIFIED

AC-AP-16d、16e、16f 现在可以同时满足：

- 非抛错输入比较完整返回对象和 `detail` 字节；
- 抛错输入只比较稳定的 error class、code、message 或退出类别，明确排除搬迁必然改变的 stack 文件名和行号；
- 静态断言将 gate 固定在基础层、archive 固定在安全 wrapper；
- 三个 wrapper 的名称以及“guard 必须先于基础层任何读取”的顺序均已声明。

`containsReal` 不搬迁的测量论证也成立。`reviewDirDefect` 在 containment 前已经确认 `<dir>/review` 存在、非 symlink 且为目录；该 target 不可能等于 bundle root，因此两份实现于此可达调用形态下等价。当前共享基础层没有其他需要 archive-merge 版“容忍目标不存在”语义的调用者。

REQ-1 中 resolver predicate 的共享问题不推翻这个结论；它需要的是明确的 namespace predicate，而不是搬迁 `containsReal`。

## Fresh P1 review

### 1. 目标状态 B 是否清晰、无歧义

**结论：未通过。**

B1 的两层 checker 结构、readiness 判据、STEP6 overlay、force 矩阵和 failure ordering 已经清晰。

剩余歧义是：

- N2 没有覆盖待移动 active entry，且“使用 resolver 自身判据”与“resolve.js 不动”冲突（REQ-1）；
- 单文件 bundle 归属规则被 AC-AP-13、AC-AP-13d 和 §9.2 三种表述拉向不同实现，symlink/archived 布局也未唯一化（REQ-3）。

### 2. 边界、异常及回滚路径是否覆盖

**结论：未通过。**

Artifact 缺失、格式错误、读异常、read race、force 分类、move/no-move 前置区间和既有 commit/move failure semantics 已覆盖。

仍缺少：

- active change entry 为 symlink或非目录；
- resolver trust root 在检查后的变化；
- 词法 bundle path 经 symlink 逃逸；
- 显式消费 archived formal bundle delta。

见 REQ-1、REQ-3。

### 3. 是否存在隐含但未声明的状态变化或副作用

**结论：未通过。**

Store 写入、bundle move、dry-run 变化、force 输出和测试迁移都已声明。

但 AC-AP-13 仍允许把“不带 `--changes-dir`”理解成完全保留原始 store-write 行为，而 §4.3 对同一调用要求新增 readiness。这使正式 bundle delta 是否可在没有 readiness 的情况下改写 store 成为未决副作用，见 REQ-3。

### 4. 验收标准是否均可测试

**结论：未通过。**

- AC-AP-13 与 AC-AP-13d 对同一输入给出相反结果。
- AC-AP-17 的无条件结论未覆盖 active-source symlink；当前 N2 测试组不足以证明 gate 一定解析到刚移动的 bundle。
- 没有验收 lexical-inside/realpath-outside 或 archived-bundle delta。

其余 criteria 均可表达为明确的 if/then。

### 5. 是否与 state A 冲突

**结论：未通过。**

- State A 的 `archiveChangeDir()` 会接受并移动一个指向 changes 内部的 active symlink，而 `resolveChange()` 会拒绝移动后形成的 archived symlink。
- State A 的 `rootDefect` 未导出，`resolveChange()` 也不能在 active entry 存在时替 readiness 完成 archived namespace 扫描；这与“复用 resolver 自己的 predicates”及“resolve.js 不动”冲突。
- State A 的单文件形式接受任意 delta 路径，且不带 `--changes-dir` 仍可消费正式 bundle delta；AC-AP-13 的旧行为承诺与新规则冲突。

### 6. lineage 是否声明且符合仓库现实

**结论：通过。**

仓库当前分支是 `brownfield-round2`，HEAD 为 `f415824`；其与 `main` 的 merge-base 及当前 `main` 均为 `235a121`。V4 声明的分支来源、产品线版本、最终目标 main 和禁止合并到旧需求版本均符合实际。

## Out-of-scope 检查

存在明确的 O1–O9 out-of-scope 表。

O9 对“已复制到 bundle 外、无法机械归属的 delta”划为调用方责任是合理边界。O3 的“不回溯扫描存量 archives”也可保留，但不应被解释为忽略调用方显式传入的 archived-bundle delta；后者仍须按 REQ-3 明确定义。

## Advisories

无新增 advisory。REQ-9 保持 `advisory-acked`。

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | AC-AP-15 的充分性承诺不成立：R1/R2/R3 未覆盖 gate 完整 C2/C3/C4 判据 | high | 1 | open |
| REQ-2 | tasks/ledger 缺失及 readiness 文件的 unsafe/unreadable 路径语义未定义 | high | 1 | verified |
| REQ-3 | `--force` 的证据协议和可豁免范围不明确，并可能 force 掉 ABANDONED 硬禁令 | high | 1 | open |
| REQ-4 | 允许 STEP5 归档与 RUNBOOK 的 STEP5→STEP6 状态机及实际 precedent 冲突 | high | 1 | verified |
| REQ-5 | 共享分类器归位、完整共享 API 和 readiness 相对既有 preflight guards 的顺序未定 | med | 1 | verified |
| REQ-6 | readiness 检查到 commit/move 之间的并发修改与 TOCTOU 未覆盖 | high | 1 | verified |
| REQ-7 | B5 与现有 AM-13/AM-46/AM-47 测试及 living spec 冲突，迁移范围未声明 | med | 1 | verified |
| REQ-8 | 共享安全读取 checker 会改变 gate C2/C4 的现有行为，但该 side effect 未声明、未验收 | med | 2 | verified |
| REQ-9 | advisory batch acknowledged (1 item) | low | 3 | advisory-acked |

VERDICT: 2 issues open
