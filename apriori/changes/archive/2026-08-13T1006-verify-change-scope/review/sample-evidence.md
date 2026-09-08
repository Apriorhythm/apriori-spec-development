# 真实样本前后对比证据 — verify-change-scope（AC6）

## 不可变身份

- 样本仓（只读）：`/mnt/d/agent-base/t_just-projects/apriori`；HEAD = `f63b7f4ca29852aba76b63c509185b059a21a27a`
- 副本：`~/tmp/sample-replica`（差异：①process-config 追加 `| id-pattern | [A-Z]+(-[A-Z]+)*-\d+[a-z]* |` 行；②归档 change `2026-08-05T1058-dashboard-bugfix-batch3` 复制回 `changes/dashboard-bugfix-batch3` 并按当前 store 重打 apriori-base stamp——复原"活 change"状态）
- 本 CLI：4.0.7 + 本批工作区改动（基线 main @ 10aef212）；TAP 复放：`cat apriori/tmp/all-full.tap`（483 行，当次真实存档）
- 命令：`apriori verify --change dashboard-bugfix-batch3 --test-cmd "cat apriori/tmp/all-full.tap"`

## 改前（收窄之前的语义，同一副本实测）

- `verify --change`：**107 个场景全部被要求**——46 BOUND-GREEN / **61 UNBOUND** / 2 ORPHAN / 42 unattributed → GAPS。batch3 自己的 9 个场景淹没其中，不可分辨。
- `verify --specs apriori/changes/dashboard-bugfix-batch3/specs`：9 场景（2 green/7 unbound）+ **46 个 ORPHAN 误报**（别人的测试）→ GAPS。
- 结论需两命令 + 人工解释——复盘 P0-2 现场复现。

## 改后（change-scoped verdict + store report，一条命令）

```
specs: 6 file(s), 9 identified scenario(s)        ← change 段只算 batch3 的 9 个
✓ BOUND-GREEN: 2   (AC-15 23p/0f, AC-44 2p/0f)
✗ UNBOUND: 7       (AC-50 AC-50a AC-51 AC-51a AC-52 AC-53 AC-54)
✗ UNATTRIBUTED FAILURES: 42                        ← 无 ID 的真实失败，fail-closed 照旧阻断
— STORE REPORT (informative) —
    bound-green: 46 · unbound: 61 · orphan: 2 · unattributed: 42
RESULT: GAPS （exit 1）
```

## 结论

- "本 change 达标"一条命令可答：change 段 9/9 全是 batch3 自己的场景，7 个 UNBOUND 是**它自己的真实缺口**（该批的测试在此 TAP 存档中缺席），不再是 61 个历史缺口的噪音。
- store report 六类计数与改前全局数完全一致（46/61/2/42）——零信息丢失。
- 42 条无 ID 的失败照旧阻断（fail-closed）：它们是存档当时真实的红（surefire 方法名未带场景 ID），机械上无法归属——正确地拒绝豁免。若当时的桥接为它们加上 ID 或对应场景，即可各归其主。
- ORPHAN 误报（46 个）从"达标判定"中消失——`--specs <delta>` 不再是必要步骤。
- 并行独立变绿另见 lab 实录（~/terra/p0-verify-change-scope-lab）：feat-b 红测试在场时 feat-a 的 gate C1 PASS（兄弟归因），feat-b 自身 BLOCKED。
