# design — id-pattern-and-delta-notes

> 对应 `requirement/req-final.md` 与 `gap-report.md` 的 G1..G8 / R1..R5。行号取自 f415824。

---

## D1 `lib/config.js` — 一个常量

```
:16   const DEFAULT_ID = '[A-Z]+-\\d+';
   →  const DEFAULT_ID = '[A-Z]+(?:-[A-Z]+)*-\\d+[a-z]*';
```

**兼容性在哪一层成立（STEP2·r1 / SPEC-2 更正）**：**不是**裸正则层。
裸 `.match()` 上反例现成：`AC-30f` 旧式返回 `AC-30`、新式返回 `AC-30f`；`AC-BIS-01` 旧式能从 index 3 匹到 `BIS-01`。
**成立的是 `leadId` 层**：`leadId` 要求 `m.index === 0` 且拒绝尾随 `[A-Za-z0-9_]`，所以上面两个都**从来不是绑定**。契约因此写成——
**「对每个旧 `leadId` 返回非 null 的标题，新 `leadId` 返回逐字节相同的 ID」**。
已用本仓 store 实测（353/0/0，ID 集合逐个相同）。

**为什么后缀这一段是必要的**：`leadId` 在正则之后还查边界
（`next` 若是 `[A-Za-z0-9_]` 则作废），所以只放宽段数、不放宽后缀的话，`AC-30f` 仍然绑不上。

---

## D2 `lib/doctor.js` — 两处，互不相干

### D2.1 D5 解耦（G2）

```
:33   const idRe = new RegExp(DEFAULT_ID);
   →  const idRe = new RegExp(D5_TAP_ID);      // 模块内部常量，不导出
      const D5_TAP_ID = '[A-Z]+-\\d+';         // 冻结：D5 判管道不判身份
```

**冻结值就是本 change 前的旧默认式**，因此 D5 的分类**逐字节不变**（AC-IP-09 由此**结构上必然**成立）。
`:45` 的 `parsed` 算式**一字不动**——它那个「tagged SKIP/TODO 贡献 0」的既有怪癖不在本 change 范围（O8）。

> 不导出这个常量，是为了让「D5 不是 `DEFAULT_ID` 的消费者」成为一条可静态断言的事实。

### D2.2 D6 按类分流（G3）

分类谓词（req-final §B2 已定死，此处只写成实现形状）：

```
firstToken(title) = title.trim().split(/\s+/)[0] ?? ''
isIdShaped(tok)   = /\d/.test(tok) && /[-_]/.test(tok)
```

`collectScenarios` 返回的 `unidentified` 是 `[[file, title], …]`。按 `isIdShaped(firstToken(title))` 分两组：

| 组 | 条数 | detail | fix |
|---|---|---|---|
| pattern-mismatch | 非空时**恰一条** | 含 `boundedSource(idp.source)` 与 `idp.origin`，样例取**前 3 个**、各截 40 字符 | 指向 `apriori/process-config.md` 的 `id-pattern` 行 |
| missing-ID | 非空时**恰一条** | 沿用现状文案 | `add leading IDs`（**一字不改**） |

`:148` 的重复 ID finding 与两者互不影响（AC-IP-13）。

---

## D3 `lib/archive-merge.js` — 一个新状态 + 一条新判定

### D3.1 `IN_NOTES`（G4）

`NOTES_LINE_RE = /^##\s+Notes\s*$/`，**必须在 `SECTION_LINE_RE` 与 `H2_LINE_RE` 之间**判：

```
:126   if (sec) { … }                          // 四种法定操作段
       ← 在此插入：if (NOTES_LINE_RE.test(line)) { flush(); state='IN_NOTES'; kind=null; continue; }
:127   if (H2_LINE_RE.test(line)) { … }        // 其它 h2 → problem + SKIP_UNRECOGNIZED
```

放这个位置就自动满足三件事：
① `## Notes` 不再落进「未识别 h2」分支；
② 它**不置** `sectionSeen`（`sectionSeen=true` 只在 `sec` 分支里）；
③ 它能**终止** `SKIP_UNRECOGNIZED`——因为 `:133` 的 `continue` 在这两条之后。

`IN_NOTES` 的吞噬：紧接在 `:133` 之后加

```
if (state === 'IN_NOTES') continue;    // 段内一切不透明：Requirement / Scenario / 戳 / 自由文本
```

放在**戳处理之前**，才能保证「段内戳既不被采纳、也不报 problem」（req-final AC-IP-14d2）。
围栏判定在 `:118-125`，本来就在最前，所以段内未闭合围栏照旧使其后不透明。

**Notes 不是操作**：`deltaOpCount` 不动，Notes-only 的 delta 自然仍撞 `:375` / `:815` 的零操作拒绝。

### D3.2 非-Requirement h3（G5）

插在 `:166` 的 body 分支**之前**、`:145` 的 `REQ_LINE_RE` 分支**之后**：

```
if (state === 'IN_REQUIREMENT' && !blockDiscard && /^###\s/.test(line)) {
  problems.push(`line ${n}: '${line.trim()}' is not a requirement heading — put explanatory
                 content in a '## Notes' section`);
  blockDiscard = true;                 // P2：作废当前块，停留在 IN_REQUIREMENT
  continue;
}
```

**三条不可动的边界**：

| # | 约束 | 理由 |
|---|---|---|
| 1 | 必须在**戳处理（`:135-144`）之后** | 状态 A 保证「游离的戳绝不被当正文吸收」；放到戳之前会吞掉作废块内的戳，打破「RENAMED 逐字节不变」（r3 的教训） |
| 2 | `!blockDiscard` 是判定的一部分（**P1**） | 已作废的块内不再产出第二条 problem；同时让**既有的** RENAMED 作废块行为一字不变 |
| 3 | 只判 `IN_REQUIREMENT` | `FILE_PREAMBLE` / `IN_SECTION` / `SKIP_UNRECOGNIZED` / `IN_NOTES` 一律保持状态 A |

`blockDiscard` 已经存在（`:158` 的 RENAMED 非法块、`:161` 的重名块都在用），本 change 只是多一个来源。

---

## D4 `templates/process-config.md`（G6）

**三处**旧值都改：第 2 列 Value、第 4 列 Default、表下注释里的 `built-in default [A-Z]+-\d+`。
只改第 4 列的话，`init` 写出的新项目会带着**旧** pattern 的 active config 行，
把新 `DEFAULT_ID` 完全遮蔽，而静态文档验收却仍然通过（r1·REQ-2 的原话）。

---

## D5 外部共享状态的三个时刻

本 change **不引入**任何外部共享状态，也不新增测试 seam：
两个新常量是模块级不可变值，`IN_NOTES` 是解析期的局部状态。
唯一「跨调用可见」的是 `apriori/process-config.md` 的模板内容——它由 `init` 一次性写出，
之后归**人类**所有（R3），本 change 不改这个所有权。

---

## D6 测试策略要点

| 面 | 手法 |
|---|---|
| 兼容性（**leadId 层**，不是裸正则层） | 对每个**旧 `leadId` 返回非 null** 的标题，断言新 `leadId` 返回**逐字节相同**的 ID；三条路径各一遍（默认内联 matcher / config 来源子进程 / CK-04 默认参数）。再对本仓 store 断言三个计数与 ID 集合相同 |
| D5 解耦 | ① 构造 `ok 1 - AC-30f x # SKIP` 的 TAP，断言 D5 结论在默认式放宽前后**一致**；② 静态断言 `lib/doctor.js` 的 D5 路径不出现 `DEFAULT_ID` |
| D6 分流 | 两类各构造若干场景，断言**恰两条** finding、各自只点名自己的场景、pattern-mismatch 的 detail 含 bounded source 与 origin、样例 ≤3 且各 ≤40 字符 |
| `IN_NOTES` | 逐格走 req-final 的转移表：三个位置 × 重复 × 段内 Requirement/Scenario/戳 × 未闭合围栏 × 四种法定段的恢复 × Notes-only 零操作 |
| h3 收紧 | `IN_REQUIREMENT` 一条 problem；作废块内第二个 h3 不刷屏；作废块内的**戳**仍按状态 A 处理（两种作废来源各一）；其余状态一字不变 |
| 语料回归 | 既有的「每份归档 delta 零 problem」语料测试必须继续绿（实测语料中两种新构造各 0 处） |
| 模板 | fresh `init` 后不手改 config，断言 `resolveIdPattern` 返回新 source、`origin: 'config'`，且 config 子进程认得三种 ID 形状（标题与 TAP description 两侧） |
