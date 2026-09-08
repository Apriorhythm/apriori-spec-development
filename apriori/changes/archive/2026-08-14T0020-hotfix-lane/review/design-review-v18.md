<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r18 transport=codex-exec-wsl-proxy -->

四条修订均已真实落盘；canonical 规则、平台后果披露以及 HL-N-82/86/84b 均存在。但词法次序与路径身份仍有以下问题。

- **DES-1｜阻断｜URI 分支会先吞掉所有 Windows 盘符路径。**  
  判定次序先执行 URI 正则 `/^[A-Za-z][A-Za-z0-9+.-]*:/`，因此 `C:\x`、`C:/x` 和 `C:x` 都在步骤①命中 URI 并 F1，永远到不了 drive-absolute/drive-relative 分支。正文中的 drive-absolute 合法分支和 HL-N-82d 正例均不可达。应把 drive 两分支置于通用 URI 分支之前，或让 URI 正则显式排除单字母盘符。依据：[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)、[cli-checkpoints.md:69](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:69)。

- **DES-2｜高风险｜canonical path 与实际文件解析路径没有绑定为同一输入。**  
  规范仅说 canonical path 用于去重与排序，没有规定安全打开也必须使用 canonical path。POSIX 下 `apriori/tmp/a\b.png` 可以是含反斜杠的真实文件，而 `apriori/tmp/a/b.png` 是另一文件；两者 canonical 后相同。若 hash 相同会去重，但 approve manifest 到底复核哪个 raw 路径没有唯一答案；若其中一个之后变化，结果依赖实现选择。应规定先 canonicalize，再以 canonical path 作为唯一解析与打开路径，或禁止 raw→canonical 多对一别名。依据：[design.md:133](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:133)。

- **DES-3｜中风险｜`O_NOFOLLOW`“能力探测”仍没有机械 oracle。**  
  未定义能力成立的判据：检查 `fs.constants.O_NOFOLLOW` 是否存在、尝试打开普通文件，还是必须验证对 symlink 返回拒绝。常量存在不等于平台/filesystem 真正执行 no-follow 语义；不同实现可能将同一平台分别判为支持或不支持。需定义行为探针及允许的错误谱，并说明探针自身无法创建 symlink时是否 fail-closed。依据：[design.md:56](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:56)、[design.md:133](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:133)。

- **DES-4｜中风险｜AC-I 含不可满足预期且缺关键别名/探测例。**  
  HL-N-82d 按当前首中次序必被 URI 分支拒绝，和“drive-absolute 正例”矛盾；缺少 `C:\x`、`C:/x`、`C:x` 对判定次序的独立断言；HL-N-86 未覆盖两个 raw path canonical 后相同但指向不同 POSIX 文件的情况；HL-N-84 也没有定义“常量存在但 symlink 仍被跟随”的能力探测反例。依据：[cli-checkpoints.md:68](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:68)、[cli-checkpoints.md:69](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:69)。

VERDICT: 4 issues open.