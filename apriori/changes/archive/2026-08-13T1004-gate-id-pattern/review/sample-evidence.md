# 真实样本前后对比证据 — gate-id-pattern（AC6）

## 不可变身份

- 样本仓（只读）：`/mnt/d/agent-base/t_just-projects/apriori`；`git rev-parse HEAD` = `f63b7f4ca29852aba76b63c509185b059a21a27a`
- 本 CLI：apriori-cli 4.0.7 + 本 change 工作区改动（基线 main @ `10aef212dfa4b060eabc4824717108ba5e57afb9`，未提交）
- 副本：`~/tmp/sample-replica`（`cp -r` 自样本；配置路径验证用，唯一差异 = process-config.md 追加一行 `| id-pattern | [A-Z]+(-[A-Z]+)*-\d+[a-z]* |`）
- 测试结果来源：样本 tmp/ 内当次落地的真实 TAP 存档 `apriori/tmp/all-full.tap`（483 条结果行），test-cmd = `cat apriori/tmp/all-full.tap`（复放，零写入）
- 项目 pattern：`[A-Z]+(-[A-Z]+)*-\d+[a-z]*`（样本 tools/ 桥接脚本注释所载）

## 改前（本 change 之前的 CLI 语义）

命令（样本原地）：
`apriori gate --change dashboard-launch-surface-slim --test-cmd "cat apriori/tmp/all-full.tap"`

```
✗ C1 BLOCKED — verify GAPS: 31 unbound, 36 unidentified, 42 unattributed-failures
✓ C2 ✓ C3 ✓ C4 ✓ C5 – C6 – C7
GATE: BLOCKED (1 item(s))
```

- **36 UNIDENTIFIED**：字母后缀（AC-08a…）与多段式（AC-BIS-*）ID 全部不被默认 pattern 识别——复盘"C1 恒 BLOCKED"的复现（复盘当时为 12 个；store 其后增长至 36，以实测为准）。
- gate 无任何 id-pattern 通道（无 flag、不读配置）。
- `apriori check` 同样 36 条 CK-04 误报（exit 1）。

## 改后

### flag 路径（样本只读原地）

`apriori gate --change dashboard-launch-surface-slim --id-pattern '[A-Z]+(-[A-Z]+)*-\d+[a-z]*' --test-cmd "cat apriori/tmp/all-full.tap"`

```
✗ C1 BLOCKED — verify GAPS: 61 unbound, 2 orphan, 42 unattributed-failures
```

### config 路径（副本，无 flag）

同命令去掉 `--id-pattern`，副本 process-config.md 含 id-pattern 行：

```
✗ C1 BLOCKED — verify GAPS: 61 unbound, 2 orphan, 42 unattributed-failures
```

### 全 store verify（副本，无 flag，config 生效）

```
specs: 6 file(s), 107 identified scenario(s)
✓ BOUND-GREEN: 46
✗ UNBOUND: 61   ✗ ORPHAN: 2   ✗ UNATTRIBUTED FAILURES: 42
RESULT: GAPS
```

## 结论

- **unidentified：36 → 0**（107 场景全部识别）；flag 路径与 config 路径逐数字一致。
- 剩余缺口全部为**真实缺口**，非工具噪音：61 UNBOUND（历史场景在该次 TAP 存档中无对应测试——落地时靠 human 联调/E2E 覆盖的部分）、2 ORPHAN、42 条无 ID 的真实失败行（TAP 存档中的实况 not ok）。这正是"gate 信号恢复价值"的形态：红得有名有姓，而不是被 pattern 噪音淹没。
- 验收 AC6 达成：改前 C1 因 unidentified 恒 BLOCKED；改后只剩真实缺口，且双路径必须一致、已一致。
