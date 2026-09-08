<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r15 transport=codex-exec-wsl-proxy -->

四条修订均已真实落盘；路径根已按 π 分支、并发静默丢行已诚实披露，HL-N-74a-c 与 75b/c、78/79 也已加入。但仍有以下问题。

- **DES-1｜高风险｜合法的 `π1 × f2 × d+d1` 没有绑定截图字节。**  
  f2 的 artifact manifest 只枚举 bundle 的 `evidence/` 树；π1 图片却留在仓根 `apriori/tmp/`，且截图行的 `hash=` 在 f2 下仍可省略。因此 d1 只绑定 `screenshots.md` 的文字，不绑定实际图片，与 req-v41“f2 工件哈希明确含截图”及 decision-summary 的绑定声明冲突。π2 因图片已复制入 evidence 不受影响；π1×f2 需要强制 hash 并将其纳入 d1，或作为独立外部 artifact 记录。依据：[design.md:132](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:132)、[design.md:137](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:137)、[req-v41.md:73](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v41.md:73)、[decision-summary.md:36](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:36)。

- **DES-2｜高风险｜π3“外部路径域”仍没有机械词法和解析根。**  
  记录定式仍称 `path=<相对路径>`，π3 又允许外部路径、不做 containment。未定义相对外部路径以何处为根、是否允许绝对路径/URI、URI 如何取得文件字节，也未明确路径缺失、不可读或非普通文件时的结果。不同实现可分别按 cwd、仓根或绝对路径解释，导致 hash oracle 不唯一。依据：[design.md:137](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:137)。

- **DES-3｜中风险｜`O_NOFOLLOW` 机械保证缺少平台能力边界。**  
  v15 把 `O_NOFOLLOW` 定为必需机制，但没有规定运行平台不提供或不支持该 flag 时是 F1、拒绝启动，还是采用等价方案。state A 存在明确的 Windows/Git-for-Windows 支持与平台分支；在这种环境中不能假定 POSIX open flag 语义天然成立。需要定义能力探测及 fail-closed fallback，并将其列入 D1.4 触点。依据：[design.md:132](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:132)、[README.md:22](/mnt/d/Workbench/misc/apriori-spec-development/README.md:22)、[golden-path-resolve.test.js:44](/mnt/d/Workbench/misc/apriori-spec-development/test/golden-path-resolve.test.js:44)。

- **DES-4｜中风险｜AC-I 没覆盖新参数空间。**  
  缺少 `π1×f2×d+d1` 截图内容变化导致 token/manifest 拒绝例；π3 只有“不做 containment”正例，没有相对/绝对/URI 词法、缺失/不可读/非普通目标及 hash 失配的分支；也没有 `O_NOFOLLOW` 不可用时的 fail-closed 例。HL-E-08 的泛化“f2 截图哈希失配”无法证明 π1 当前可省 hash 的缺口已关闭。依据：[cli-checkpoints.md:36](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:36)、[cli-checkpoints.md:68](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:68)。

VERDICT: 4 issues open.