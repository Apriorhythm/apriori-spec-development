# spec-review-v1 — archive-preflight technical review（STEP2 Round 1）

评审基于静态读取；未运行测试，未修改文件。

CAS 基线有效：

- archive-merge delta 的 base hash 与 living spec 一致；
- resolve delta 的 base hash与 living spec 一致；
- readiness 正确声明为新 store module。

STEP0 cap 后未经独立评审的三条修复中：

- canonical-root 限定已经写入需求、spec、design 和任务；
- active-first 已由 RS-07、D2.2、T9 明确守卫；
- lexical + realpath 双算已经进入 spec/design/tasks，但与单文件 move 路径组合后仍有缺口。

## 1. 场景是否覆盖全部可见行为及失败边界

**结论：未通过。**

### SPEC-1 — 单文件归属只检查 delta bundle，没有检查它实际会移动的 bundle

**描述**

`lib/archive-merge.js:860` 的单文件路径只要带 `--changes-dir`，就会移动：

```text
<changes-dir>/<change>
```

这个 move 与 `--delta` 归属到哪个 bundle 相互独立。D3.4 当前却只依据 delta 的 lexical/realpath 归属决定 readiness。

两个可达反例：

1. 真外科手术 delta + 正式 bundle move：

```text
archive --store S --delta /tmp/surgery.md --change X \
  --write --changes-dir apriori/changes
```

D3.4 第一行判为“不执行 readiness”，但成功路径仍会移动 `apriori/changes/X`。若 X 是 ABANDONED，它仍能被搬走，且 store 被写入。

2. Delta bundle 与 move bundle不是同一个目录：

```text
--delta <cwd>/apriori/changes/X/specs/m/spec.md
--changes-dir /tmp/other-changes
--change X
```

若两处都存在 X，当前设计会检查默认 root 的 X，却在 `:860` 移动 custom root 的 X；被移动者可以完全未就绪。

这与 req-final §四“单文件形式 + `--changes-dir` 同样要过就绪度”及 RUNBOOK 的 ABANDONED 硬规则冲突。现有 T22–T25 没有覆盖这两个组合。

N0 也有同一集成缺口：D3.2 只明确展示高层路径 `:753`，T17 未要求同时覆盖单文件 `:860`。实现者可能让高层 move 使用捕获时间，却让单文件 move 继续自行 `new Date()`。

**风险：high**

可导致未就绪或 ABANDONED bundle 被移动并写入 store；也可能让单文件 N1 检查的 basename 与实际 move 不同。

**建议**

- 单文件调用带 `--changes-dir` 时，首先定义独立的 `moveBundle = <changes-dir>/<change>`。
- `moveBundle` 必须执行完整 readiness 和 N0..N3，无论 delta 是 surgical 还是归属于其他 bundle。
- 若 delta 归属于正式 bundle，则其规范 bundle 路径必须与 `moveBundle` 相同；不同即拒绝，不要分别检查一个、移动另一个。
- N0 捕获值必须同时传给 `:753` 和 `:860` 两条 move 路径。
- 增加场景和任务：
  - surgical delta + `--changes-dir` + ABANDONED move bundle；
  - delta 归属默认 X、move 指向 custom-root X；
  - 单文件 move 的分钟前进/回拨 seam。

### SPEC-2 — 六行归属表没有覆盖 realpath 落入 archived bundle

**描述**

D3.4 的 archived 行只判断 lexical path：

```text
<changes-dir>/archive/<stamp>-X/specs/…
```

没有处理以下输入：

1. 词法在 changes roots 外，realpath 指向 archived bundle：

```text
/tmp/delta-link.md
  -> apriori/changes/archive/<stamp>-X/specs/m/spec.md
```

2. 词法归属 active X，realpath 经 symlink 指向 archived X。

第二种情况下，当前“属于 X / 同一个 X”一行甚至可能误判成可执行 readiness，因为归属结果只记录名字 X，没有把 stage 和 bundle directory 纳入身份。

这与 spec prose“delta inside an already-archived bundle SHALL be refused”冲突。T24 只覆盖直接 archived path，没有覆盖 realpath alias。

**风险：high**

已归档 bundle 可通过 symlink alias 再次成为 store 输入，绕过明确的 archived-bundle 禁令。

**建议**

- Attribution identity 不应只是 change name；至少应为：
  `{root, stage: active|archived, name, bundleDir}`。
- 任意一侧归属为 archived 都直接拒绝。
- 只有 lexical 与 realpath 都指向同一个 active `bundleDir` 时，才进入正常 readiness。
- 两种归属指向不同 stage、root 或 directory 时一律拒绝。
- 增加：
  - external symlink → archived delta；
  - active lexical path → archived realpath；
  - 同名但不同 root/stage 的归属冲突。

### SPEC-3 — `checkArchiveLedger` 的设计没有声明必须先执行 review-root guard

**描述**

AM-52 明确要求 `review/` 为 symlink、非目录、逃逸或悬空时拒绝；基础层也搬迁了 gate 的 `reviewDirDefect()`。

但 D1.3 对三个 wrapper 只规定：

1. 对 artifact 跑 `fileReadDefect`；
2. 调基础 checker；
3. 捕获读取竞态。

它没有规定 `checkArchiveLedger` 在 ledger 文件守卫之前执行 `reviewDirDefect(dir)`。

仅检查 `review/issues.md` 不等价：如果 `review/` 是指向 bundle 内另一目录的 symlink，leaf 可能是正常文件且仍通过 realpath containment，而 gate 会因 review root 本身是 symlink而阻断。Archive 可能因此通过 readiness，随后 post-archive gate 的 C4 阻断。

**风险：med**

会破坏 archive-pass ⇒ gate-C4-non-block 的核心保证，并使结构性 evidence root 被跟随。

**建议**

将 `checkArchiveLedger` 的顺序明确为：

1. `reviewDirDefect(dir)`；
2. `fileReadDefect(dir, review/issues.md)`；
3. 基础 `checkLedger(...)`；
4. 捕获 guard 后读取异常。

T4/T14 应显式包含一个“`review/` symlink 指向 bundle 内含合法 ledger 的目录”用例；仅测试向外逃逸的 symlink 不足以捕获此差异。

### SPEC-4 — 保留的 AM-19 与新增的单文件行为正面冲突

**描述**

MODIFIED block 的机械比对结果是：

- AM-14..AM-22 九个场景内容保持原样；
- AM-13 只增加 READY 前提；
- AM-48 新增；
- requirement prose 增加 readiness。

没有发生意外移动。

但原样保留的 AM-19 仍声明：

> the single-file form by itself keeps its 3.0.1 behavior unchanged

新增 AM-59..61、`--force` 和 bundle attribution 明确改变了部分单文件行为，因此这条兼容性承诺已不真实。实现者或测试作者无法同时满足其字面含义与新增场景。

同类的冻结需求 AC-AP-13f 仍以“词法在 changes root 外”单独承诺旧行为，而 AC-AP-13i 对其中 external-symlink 子集要求拒绝；spec/design 已正确收窄为 lexical 与 realpath 都在外，但最终 AC 对照任务 D3 仍可能据旧字面写出冲突测试。

**风险：med**

会在实现或 STEP5 evidence mapping 时产生相反测试和返工。

**建议**

- 将 AM-19 收窄为：single-file dispatch 仍存在；其 formal-bundle 输入按 AM-59..61，只有真正 surgical 的输入保留既有行为。
- 在 AC 对照说明中把 AC-AP-13f 解释/勘误为“lexical 与 realpath 均不属于正式 bundle”。
- 为兼容性测试使用这个收窄后的条件，不再使用“所有 single-file 行为不变”。

## 2. 外部共享状态的 init / runtime update / cleanup-invalidation

**结论：通过。**

本 change 不引入进程外共享状态。两个模块级测试 seam 的生命周期完整：

- init：模块加载时为 `null`；
- runtime update：仅测试通过 `_set*` 设置；
- cleanup：每次使用在 `finally` 中复位为 `null`。

T32/T33 覆盖两个并发注入位置，T34 明确要求所有 seam 使用点复位，I10 负责实现。move/no-move 两条并发路径也已列入任务。

## 3. 是否冲突 state A 或破坏既有约定

**结论：未通过。**

- SPEC-1 直接来自 state A 单文件 `:860` 的无条件 move 行为；设计没有把 move target 纳入 readiness identity。
- SPEC-2 中 realpath-to-archived alias 是现有任意 delta path 与 symlink 跟随语义下的可达输入。
- SPEC-4 的 AM-19 保留了已被本 delta 改写的旧兼容性承诺。

其余关键兼容面已正确处理：

- CAS stamps 与 delta 结构有效；
- D1.2/RY-01/RY-02/T1–T7 足以约束 BASE 层保留 gate 的裸 `existsSync`、返回对象、detail 和稳定异常面；
- resolve RS-07、D2.2、T9 明确禁止综合 predicate 进入 active-first 快路径；
- `classifyStatus` 的 gate re-export 已有独立任务。

## 4. 是否存在 spec 未设计或 design 未声明的行为

**结论：未通过。**

- 单文件 move bundle 与 delta attribution 的关系未设计，也没有测试任务，见 SPEC-1。
- Realpath archived attribution未进入六行表，见 SPEC-2。
- AM-52 spec 声明了 review-root guard，但 D1.3 没有把它放入 `checkArchiveLedger` 顺序，见 SPEC-3。
- AM-19 的旧兼容性声明与新增设计冲突，见 SPEC-4。

M0→M1→M2→M3 的迁移顺序正确：先建立绿基线，再穷举成功调用、只补 fixtures、在新增失败测试前确认 fixtures 本身没有破坏基线。11 文件清点位于任何实现之前，符合要求。

## 5. Security review

**结论：未通过。**

本 change 没有新增权限或外部服务，但单文件路径是外部输入边界：

- SPEC-1 允许用 surgical 或不同-root delta 掩护另一个正式 bundle 的 move，包含 ABANDONED 绕过。
- SPEC-2 允许 archived delta 通过 symlink alias 重新进入 living store。
- SPEC-3 可能跟随一个 gate 明确拒绝的 review-root symlink。

这三项都是 correctness/security findings，不属于 advisory。

## Advisories

### A-1 — 给两个模块级 seam 固定测试 API

D6 只写 `_set*`。建议在设计中固定 setter 名、参数形态、调用次数和 hook 位置，例如 clock supplier 与 after-readiness callback。生命周期已经完整，因此这是实现清晰度优化，不阻断。

### A-2 — 修正 composite predicate 的措辞

Resolve spec 一处说 composite predicate 诊断“所有会令当前 `resolveChange` 拒绝的结构”，archive AM-56 又称其为“resolver uses”的 predicate；RS-07/D2.2 则正确规定 composite 只由 readiness 调用，resolver 只共享更小的私有 predicates。

建议改成“诊断 active 被移动后 resolver 将面对的完整 namespace；resolver 与它共享 private predicates”，避免架构表述自相矛盾。RS-07 已把实际行为钉死，因此目前不计阻断。

### A-3 — `--force` 的 help/usage 回归测试

I8 要新增 parser flag，但没有任务明确检查两个 archive usage 字符串和 `--help` 输出包含 `[--force]`。建议补一个小断言，避免功能存在但帮助面不可发现。

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SPEC-1 | 单文件 `--changes-dir` 的实际 move bundle 未与 delta attribution/readiness 绑定，可移动未就绪或不同 root 的正式 bundle；N0 也未钉死 `:860` | high | STEP2·r1 | open |
| SPEC-2 | 六行 attribution 表未覆盖 realpath 指向 archived bundle或同名不同 stage 的路径，可经 symlink alias 重用 archived delta | high | STEP2·r1 | open |
| SPEC-3 | `checkArchiveLedger` 设计未要求先执行 `reviewDirDefect`，内部 review-root symlink 可令 archive 与 gate C4 分歧 | med | STEP2·r1 | open |
| SPEC-4 | AM-19 与 AC-AP-13f 的旧“行为不变”措辞和新增单文件归属场景冲突，会生成相反验收 | med | STEP2·r1 | open |

VERDICT: 4 issues open
