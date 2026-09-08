<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r16 transport=codex-exec-wsl-proxy -->

四条修订均已真实落盘；π1×f2 的强制 hash、π3 本地目标错误谱、平台 fail-closed 触点及 HL-N-80..84 均可核实。但新引入的 `ext-artifact` 与 URI 分支还未形成闭合机械契约。

- **DES-1｜高风险｜`ext-artifact` 未进入 d1 的正式序列化函数。**  
  D6.2 仍只枚举 `store:`、`truth:`、`artifact:` 三类扩展记录，总序仍是 core→store→truth→artifact；`ext-artifact:` 只在后面的截图段出现。其相对 artifact 的域序、域内排序、多个截图引用同一路径时按集合去重还是逐行重复，均未定义。不同实现会算出不同 token。依据：[design.md:133](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:133)、[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)。

- **DES-2｜高风险｜`ext-artifact` 没有明确继承 f2 的安全打开与终核 manifest。**  
  O_NOFOLLOW/fstat/dev-inode 三件套和 evidence manifest 的量词仍限定于 bundle `evidence/` 树；π1 图片位于该树外。截图段只要求重算 hash 并加入 token，没有规定 approve 终核的 manifest 是否为 `evidence tree ∪ ext-artifact`，也未规定外部项使用同一安全 fd 算法。因此 π1×f2 可能重新出现路径替换或终核漏项。依据：[design.md:133](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:133)、[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)。

- **DES-3｜高风险｜π3 URI 分支与同段 hash oracle 正面矛盾。**  
  前文仍规定“π3 hash 必须等于 path 所指文件字节的 SHA-256”；后文却规定 URI 不取字节、hash 只是作者声明且机器不校验。一个 URI 输入到底应通过还是因无法重算而拒绝，没有唯一结果。若要保留 URI，需要把 π3 明确拆成本地可验证与 URI 自报两个子型，并将弱化交 owner 裁定，而不能共用同一 oracle。依据：[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)。

- **DES-4｜高风险｜`f2×π3-URI` 会绕过 req-v41 的截图哈希约束。**  
  Q-6a 与 Q-6b 当前独立组合，因此 π3 URI 可与 f2 合法共存；但 URI 图片不在 evidence 树内，声明 hash 又不校验，f2 实际只绑定 `screenshots.md` 文本，未绑定或验证截图字节。这与 req-v41“f2 工件哈希明确含截图”矛盾。须为 URI 提供可读取/下载后散列的机制，或将 `f2×π3-URI` 列为非法联合选择。依据：[design.md:98](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:98)、[design.md:110](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:110)、[req-v41.md:73](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v41.md:73)。

- **DES-5｜中风险｜π3“三形态”仍不是机械词法。**  
  行定式依旧写 `path=<相对路径>`，随后又允许绝对路径和 URI；没有给出三分支正则、判定次序或 URI scheme 白名单。Windows 的 `C:\...`、`file:` URI、含冒号的相对路径等输入可能被不同解析器归入不同分支。URI 的不可读、malformed、`file://` 是否按本地目标处理也未定义。依据：[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)。

- **DES-6｜中风险｜AC-I 未覆盖新交叉面。**  
  HL-N-80/81 覆盖 hash 缺失与内容变化，但没有覆盖 ext-artifact 域序、重复路径基数、安全打开及 approve manifest 漏项；HL-N-82a-c 只是三类正例，没有形态歧义或 malformed URI；也没有 `f2×π3-URI` 必须验证截图字节或判非法的断言。依据：[cli-checkpoints.md:68](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:68)。

VERDICT: 6 issues open.