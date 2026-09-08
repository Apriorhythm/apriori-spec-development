<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r14 transport=codex-exec-wsl-proxy -->

五条修订均已真实落盘。终核窗口已从虚假保证改为诚实的 o1 级残余，π2 归档后路径正例和 HL-N-74..77 也已加入；但有以下新问题。

- **DES-1｜高风险｜bundle-relative 被错误扩展到 π1/π3。**  
  D6 规定所有截图记录 `path=` 一律相对 bundle 根，只有 π2 复制入 bundle 后满足该模型。req-v41 明确 π1 图片留在 `apriori/tmp/`，π3 是“哈希+外部路径”；两者在 bundle 根下都不存在，会被 containment/普通文件检查拒绝。D3 又仍将 `d×π1`、`a/b/c/d×π3` 列为合法，形成正文内部不可达组合。路径根应按 π 参数化：π2=bundle 根，π1=仓根下 `apriori/tmp/`，π3=所裁外部路径域及其诚实弱保证。依据：[design.md:98](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:98)、[design.md:109](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:109)、[design.md:137](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:137)、[req-v41.md:74](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v41.md:74)。

- **DES-2｜高风险｜三件套只封堵最终叶节点，未封堵祖先目录替换。**  
  `O_NOFOLLOW` 只约束最终打开项；逐项 `lstat` 后，祖先真实目录仍可在 `open` 前被换成 symlink 或另一目录。此时叶文件的 `fstat` 仍可能是 regular，dev/inode 也会与替换后路径的 lstat 一致，三项检查全部通过却读取了 bundle 外内容。不能宣称完整封堵 lstat→open 竞态；需要目录 fd 链/openat-style anchoring，或把祖先竞态纳入诚实残余并确保最终 containment 基于已打开对象。依据：[design.md:132](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:132)。

- **DES-3｜中风险｜“并发可修复收敛”仍是无依据的保证。**  
  “并发不受支持、last-writer”是诚实的；但 F1 网并不保证发现 last-writer 覆盖。两个进程基于不同版本的 `screenshots.md` 生成结果时，较旧进程后 rename 可静默丢掉较新观察行，且不会留下 temp，也未必违反最低截图基数，因此没有自动检测或恢复输入。“可修复收敛”应降为“若人工发现，可重新编辑并串行重跑”，并披露记录可能静默丢失。依据：[design.md:137](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:137)。

- **DES-4｜中风险｜新增 AC 仍非一例一 ID，且漏掉关键回归。**  
  HL-N-74 把 `O_NOFOLLOW`、`fstat regular`、dev/inode 一致三个独立失败面合在一个 ID，复活此前已收敛的一例一 ID 问题；HL-N-75 仅覆盖 π2，没有 π1/π3 根域正例；也缺祖先目录在遍历后被替换的拒绝/残余例，以及并发 last-writer 静默丢行例。依据：[cli-checkpoints.md:68](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:68)。

VERDICT: 4 issues open.