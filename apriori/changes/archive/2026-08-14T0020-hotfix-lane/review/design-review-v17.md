<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r17 transport=codex-exec-wsl-proxy -->

六条修订均已真实落盘；`ext-artifact` 第五域、并集 manifest、安全打开继承、URI `://` 拒绝及 HL-N-85..88 均已加入。不过仍有以下新问题。

- **DES-1｜高风险｜π3 二形态词法仍未机械闭合。**  
  “以 `/` 或盘符开头”为绝对路径没有给出盘符正则和判定次序：`C:\x`、`C:/x`、drive-relative `C:x` 的分类未区分；Windows UNC 路径 `\\server\share\x` 既非 `/` 开头也非盘符开头，却是绝对路径。URI 禁令仅检查 `://`，漏掉 `file:/x`、`urn:x`、`data:x` 等合法 URI 形态，它们会被误归仓根相对路径。需要封闭正则及顺序：URI scheme、POSIX absolute、drive-absolute、UNC、repo-relative，并明确其余拒绝。依据：[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)。

- **DES-2｜高风险｜`ext-artifact` 的“同路径集合去重”缺少 canonical path 函数。**  
  UTF-8 排序只定义了排序规则，没有定义去重前的路径规范化。`apriori/tmp/a.png` 与 `apriori/tmp/./a.png`、重复分隔符、Windows 的 `/` 与 `\`、大小写别名，可能指向同一文件却生成一条或多条记录；不同实现会得到不同 d1 token。还需定义同 canonical path 的多条截图记录若携不同 hash 是 F1，不能仅静默集合去重。依据：[design.md:133](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:133)、[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)。

- **DES-3｜中风险｜f2 的平台不可用后果未进入 owner 决策材料。**  
  design 已规定缺少 `O_NOFOLLOW` 能力的平台完全拒绝 f2；但 decision-summary 仍把 `{f2}`/`{f1+f2}`作为普通候选，未披露该选择会令相关平台的 hotfix 全部不可归档。state A 明确存在 Git-for-Windows 支持面，因此这是 gate③ 的实质取舍，不只是实现细节。至少应在 Q-6 摘要和 RUNBOOK 草案中披露“平台不支持时无 fallback、必须改裁非 f2”。依据：[design.md:56](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:56)、[design.md:133](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:133)、[decision-summary.md:41](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:41)、[README.md:22](/mnt/d/Workbench/misc/apriori-spec-development/README.md:22)。

- **DES-4｜中风险｜AC-I 未覆盖上述解析和去重边界。**  
  HL-N-82a/b 没有区分 POSIX absolute、drive-absolute、drive-relative、UNC 与无 `://` URI；HL-N-86 只断言字面同路径去重，没有 `./`、分隔符、大小写别名及同 canonical path 不同 hash 的例；HL-N-84 只验证运行时拒绝，没有验证 decision-summary/RUNBOOK 的平台后果披露。依据：[cli-checkpoints.md:68](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:68)、[cli-checkpoints.md:69](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:69)。

VERDICT: 4 issues open.