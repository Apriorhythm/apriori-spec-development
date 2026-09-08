# spec-review-v2 — verify-change-scope

## 正式问题

### SPEC-1 reopen：fail-closed 修订未传播到全部 normative oracle

**描述**

SR-56、SR-61、design G3 和 req-final 修正案 #1 已统一为：

- 仅 bound 到已知 out-of-scope projection scenario 的 red 可不阻断；
- `unattributedFailures` 和 failing true-orphan 必须阻断。

但仍有两处相反的验收规则：

1. GT-27 仍规定失败为“tagged red or unattributed”且位于 change A scope 外时，C1 应 pass。`unattributed` 没有 ID/provenance，无法被证明在 scope 外；该 oracle 会要求 gate 放过它。
2. req-final AC1 仍以 ID-less `not ok` 为 fixture，并明确期待 `verify --change` GREEN exit 0、顶层 `clean=true`。这直接违反修正案 #1 和 SR-56 的新反例。

修正案虽然声明“spec delta 为准”，但 AC1 和 GT-27 本身仍是实施阶段要求执行的 acceptance scenarios，不能同时满足。

**风险**

实现和测试会在两套相反 oracle 之间分叉：按 SR-61 实现则 GT-27/AC1 失败；按 GT-27/AC1 实现则真实的无归属失败可能通过 C1，重新引入 round-1 的 false GREEN 生产风险。

**建议**

完整传播 fail-closed 裁定：

- GT-27 删除 `or unattributed`，仅允许“bound to a known out-of-scope projection scenario”的 tagged red；
- GT-27 增加反向断言：`unattributedFailures` 或 failing true-orphan 必须使 C1 blocked；
- req-final AC1 将 ID-less `not ok` 替换为已绑定的 out-of-scope red；
- 在 AC1 追加独立反例：ID-less `not ok` 和 failing orphan 均为 GAPS exit 1；
- 同步 proposal 中“历史缺口不伤害 verdict”的泛化措辞，明确未知 failure signal 不属于可豁免的历史缺口。

## Round-1 findings 核验

- SPEC-1：未完全关闭，因 GT-27 与 req-final AC1 保留旧 oracle，reopen。
- SPEC-2：verified。`deltaOps` 在 `am.buildProjection` 的同一次 `parseDeltaStrict` 快照中产生，设计明确禁止路径二次读取，并记录 KB 更新义务。
- SPEC-3：verified。SR-63 已规定 config-origin matcher child 恰好两次，并钉死 title/TAP payload、spawn 顺序及 scoped view 零额外调用。
- SPEC-4：verified。SR-64 与测试布局已要求实现前捕获 state-A goldens，并逐字节比较 human/JSON stdout、stderr、exit code及 `--specs` run-object own-properties。
- SPEC-5：verified。gate spec、design G4、req-final B6 与修正案 #5 已统一为六类 labeled suffix。

## 外部共享状态

未发现新增持久化 external shared state。运行期外部副作用仍只有 test command spawn。SPEC-2 所述隐藏 filesystem observation window 已由单次 delta read/parse snapshot 设计关闭。

## Advisories

### ADV-1：归档前宜把修正案折叠回原始条款

req-final 通过尾部 STEP2 amendments 覆盖 B/AC 正文，容易留下类似本轮 AC1 的陈旧 oracle。关闭 SPEC-1 时建议直接修正文中的 B、AC 与 gate scenario，并将修正案保留为历史记录，而非依赖读者自行应用 precedence。

### ADV-2：`tasks.md` 可同步点名新增保障

T1/T2 虽可通过 SR-56..64 和 design 间接覆盖，但可明确加入 failing-orphan/unattributed gate 反例、`deltaOps` single-snapshot 以及 state-A golden capture-before-implementation，降低执行时遗漏概率。

## Ledger delta

| ID | Status delta | Reason |
|---|---|---|
| SPEC-1 | fixed (v2) → open (reopened STEP2·r2) | SR/design amendment 已正确 fail-closed，但 GT-27 与 req-final AC1 仍要求 unattributed failure 下 PASS/GREEN，存在相反 normative oracle |
| SPEC-2 | fixed (v2) → verified | `deltaOps` 来自 projection 使用的同一次 strict parse，不再二次读取 delta |
| SPEC-3 | fixed (v2) → verified | SR-63 已钉死恰好两次 matcher child call、payload 与 spawn 顺序 |
| SPEC-4 | fixed (v2) → verified | state-A human/JSON/diagnostics byte goldens及 module own-properties 均纳入 oracle |
| SPEC-5 | fixed (v2) → verified | gate suffix 已在 SPEC、design 与 req-final 统一为六类精确 wording |

VERDICT: 1 issues open
