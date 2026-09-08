<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r13 transport=codex-exec-wsl-proxy -->

六条修订均已真实落盘；DES12-1/2/3/5 的正文修复成立，旧检查点冲突已消除，HL-N-69..73 也存在。DES12-4 仅部分收口，并发现以下新问题。

- **DES-1｜高风险｜evidence manifest 终核仍不是最终归档边界。**  
  CAS 发生在“三段写集合开始前”，随后还要执行 stores→truth→bundle move。终核后至 bundle move 前，evidence 仍可被修改，最终归档字节因此可能不同于签署 manifest；“签署字节与归档字节一致”声明不成立。需要从终核到 move 持有排他锁，或归档不可变 staging snapshot。依据：[design.md:51](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:51)、[design.md:132](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:132)。

- **DES-2｜高风险｜`lstat`→打开 fd 之间仍有路径替换竞态。**  
  “逐项 lstat + 以打开 fd 散列”没有规定 `O_NOFOLLOW`、打开后 `fstat` 必须为 regular、以及打开前后设备号/inode 一致性。攻击者或并发写者可在 lstat 后把 regular file 换成 symlink；open 随后读取域外目标，绕过“symlink=F1”。manifest CAS 两次都采用同一不安全算法时也无法补偿。依据：[design.md:132](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:132)。

- **DES-3｜高风险｜π2 记录路径在 bundle 归档后失效。**  
  截图 `path=` 被规定为仓根相对路径，evidence 命令在在途 bundle 内改写为 `apriori/changes/<name>/evidence/screenshots/...`；归档随后把整个目录移动至 `apriori/changes/archive/<stamp>-<name>/`，记录中的旧路径不再存在，π2 的持久可查证目标落空。需要定义 bundle-relative path 语义及归档后解析规则，或在 move 时重写并纳入摘要/令牌重新绑定。依据：[design.md:137](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:137)、[archive-merge.js:634](/mnt/d/Workbench/misc/apriori-spec-development/lib/archive-merge.js:634)。

- **DES-4｜高风险｜进程唯一 temp 名没有消除 π2 并发争用。**  
  两个 evidence 进程可同时完成步骤①，此时彼此 temp 尚未出现；之后虽然写不同 `screenshots.md.tmp.<pid>`，却会竞争同一个 `screenshots.md` 和相同截图目标，最终 last-writer-wins。“进程唯一名——无并发争用”因此不诚实。需 bundle 级互斥锁或明确禁止并机械拒绝并发调用。依据：[design.md:137](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:137)。

- **DES-5｜中风险｜AC-I 未覆盖上述终态与并发边界。**  
  HL-N-72 只覆盖“hash 后、approve 终核前”的变化；未覆盖终核后至 move 前变化、lstat/open 间 symlink 替换、两个 evidence 命令同时通过计划步，以及 archive 后 π2 路径仍可解析。现有 HL-N-63/73 仅覆盖已经残留的 temp，不能证明并发互斥。依据：[cli-checkpoints.md:68](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:68)、[cli-checkpoints.md:69](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:69)。

VERDICT: 5 issues open.