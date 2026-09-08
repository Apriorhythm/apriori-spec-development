# 真实样本证据 — modified-block-integrity（AC 实证）

## 不可变身份

- 样本仓（只读）HEAD = f63b7f4ca29852aba76b63c509185b059a21a27a；副本 ~/tmp/sample-replica（batch3 复活 + 重打 stamp + id-pattern 行，同前两 change 证据）
- 本 CLI：4.0.7 + 本批三 change 工作区改动；命令：`apriori verify --change dashboard-bugfix-batch3 --test-cmd "cat apriori/tmp/all-full.tap"`

## 实测（真实 MODIFIED delta：dashboard-list.md 的「CSV 导出（直流下载）」块整块重述）

```
— MODIFIED INTEGRITY —
  dashboard-list.md · CSV 导出（直流下载）:   dashboard-list.md · CSV 导出（直流下载）: retained 4, added 0
  ! missing 共 23 行；dropped 0
```

代表性丢失行（全部逐行列出于报告）：
- AC-15 名下：**38 行码值矩阵**（含 sha256-16 指纹行）、`projectStatus=7 → 「签约中」` 的完整产品确认理由链（枚举复制粘贴漏改 desc 的考据、跨模块共享枚举不动 desc 的决策、CSV 与页面空值口径差异表）——即复盘里"评审逐行子序列比对才确认没丢"的那类内容，这次的重述**真的丢了一大段**；
- AC-51a 名下：码值矩阵引用 AND 子句等。

## 结论

- 复盘 P0-3 所求的机械化完成：这类丢失从"靠评审注意力"变为"CLI 逐行列出"。本例在真实归档材料上抓到成段文档性内容在整块重述中消失（当年是否有意删减留给人判断——informative 定位即为此设计）。
- verdict/exit 与无报告时完全一致（GREEN/GAPS 判定不动）；archive dry-run 同段输出（lab 实录 ~/terra/p0-modified-block-integrity-lab）。
