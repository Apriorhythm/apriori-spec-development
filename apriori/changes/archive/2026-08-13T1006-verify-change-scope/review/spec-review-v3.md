# spec-review-v3 — verify-change-scope

## 复审结论

Round 2 唯一遗留问题已关闭，未发现新的正式问题。

### SPEC-1：verified

fail-closed 规则现已完整传播到全部 normative artifacts：

- SR-56、SR-61 明确只有 bound 到已知 out-of-scope projection scenario 的 red 可豁免。
- GT-27 已删除对 `unattributed` 的豁免，并加入反向 oracle：ID-less `not ok` 或 failing true orphan 必须使 C1 BLOCKED。
- req-final AC1 已改用已绑定的范围外 red 作为 GREEN fixture，并分别规定 ID-less failure 与 failing orphan 为 GAPS exit 1。
- design G3 保持 `verdict.unattributed` 和 failing true-orphan 为 blocking classes。
- proposal 已将可豁免范围限定为 provably-attributed out-of-scope gaps。

这些规则与 state A 的 fail-closed 原则及当前 `infraErrors` 行为一致：known out-of-scope red 可解释 non-zero status，但无法归属的 failure signal 不可能产生 clean change verdict。

## P5 checklist 回归

1. 场景覆盖完整：change scope、操作组合、duplicate/unidentified 边界、known/unknown failure provenance、零 scope、四类 JSON outcome、matcher failure、single-run 和 gate C1 均有 oracle。
2. 未新增持久化 external shared state；test command 仍是唯一副作用。projection 与 scope provenance 使用同一 delta parse snapshot，不再引入额外 filesystem observation window。
3. 与 state A 一致：matcher title batch 仅一次并复用 match table；`infraErrors` 无需修改；`--specs` 由实现前 state-A byte goldens保护。
4. SPEC、design、proposal、requirement 与 tasks 之间未发现会造成返工的未设计行为或未声明设计。
5. 外部输入安全边界未被削弱：config-origin matcher 的隔离预算和 fail-early 顺序保持；未知 failure provenance 继续 fail-closed。

## Advisories

### ADV-1：STEP6 折叠 amendments

已接受在归档时将 STEP2 amendments 折叠回 req-final 原始条款。该动作有助于消除历史 precedence 阅读成本，不影响当前执行放行。

### ADV-2：实施测试名称

T1 已通过 SR-56、SR-61、SR-63、SR-64 和 GT-27 的 normative wording 覆盖新增保障。实施时显式命名 failing-orphan、unattributed、single-snapshot 与 byte-golden cases 可提高可维护性，但不构成执行前缺口。

## Ledger delta

| ID | Status delta | Reason |
|---|---|---|
| SPEC-1 | fixed (v3) → verified | GT-27、req-final AC1 与 proposal 已完整传播 fail-closed 裁定；unknown-provenance failures 均阻断 verify verdict 和 gate C1 |
| SPEC-2 | verified → verified | single delta parse snapshot 契约保持完整 |
| SPEC-3 | verified → verified | matcher child 恰好两次的可执行 oracle 保持完整 |
| SPEC-4 | verified → verified | state-A `--specs` byte-golden 契约保持完整 |
| SPEC-5 | verified → verified | 六类 gate store suffix 契约保持统一 |

VERDICT: no major issues, ready to proceed to execution
