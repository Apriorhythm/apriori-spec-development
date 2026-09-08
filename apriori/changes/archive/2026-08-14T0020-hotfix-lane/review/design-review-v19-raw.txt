<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r19 transport=codex-exec-wsl-proxy -->

四条修订均已真实落盘；drive/URI 次序、canonical 唯一打开路径、行为探针及 HL-N-82/86/84 新例均存在。但新探针和路径规范仍有以下问题。

- **DES-1｜高风险｜O_NOFOLLOW 行为探针违反 F1 全局零写入契约。**  
  探针在归档 preflight 中创建目标文件和 symlink；即使随后删除，也已经发生写入，且进程崩溃时会留下产物。req-v41 与 adopted prior art 均要求确定性 F1 检查全部前置、任一失败全局零写入；HL-T-05 也仍作此断言。探针失败恰会把流程判为不可用，却已写过 `apriori/tmp/`。须明确修改零写入边界并呈 owner 裁定，或把能力探测移出归档事务、使用预先缓存的受信能力结果。依据：[design.md:133](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:133)、[req-v41.md:54](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v41.md:54)、[req-v13.md:43](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:43)、[cli-checkpoints.md:50](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:50)。

- **DES-2｜高风险｜探针临时对象的安全生命周期未定义。**  
  没有固定唯一命名算法、`O_EXCL` 创建要求、目标/symlink 的 realpath containment、并发探针隔离及“只删除本进程所有对象”的规则。两个归档并发可能互相影响探针；预置同名对象还可能导致误判或被 cleanup 删除。“即刻清理”也没有规定打开成功时先关闭 fd，以及部分创建、异常退出后的清理错误谱。依据：[design.md:133](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:133)。

- **DES-3｜高风险｜canonical path 会破坏 UNC 根。**  
  UNC raw path 以 `\\server\share` 进入合法绝对分支；随后 canonical 函数先把 `\` 转成 `/` 得到 `//server/share`，再“折叠重复分隔符”会变成 `/server/share`，丢失 UNC 身份并被当成 POSIX absolute 打开。需要 root-aware normalization：先提取并保留 UNC、drive 或 POSIX root，只折叠 root 后的分隔符。依据：[design.md:133](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:133)、[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)。

- **DES-4｜高风险｜π3 的 `..` 输入仍无唯一语义。**  
  canonical 函数声称“`..` 已被路径安全 F1 拒”，但 D6.3 的 `..` 禁令明确只适用于 π1/π2；π3 不做 containment。于是 π3 的 `foo/../bar.png` 到底应 F1、保留 `..` 打开，还是解析为 `bar.png` 未定义。绝对路径中的 `..` 同样如此。需要将 `..` 禁令扩展至 π3，或在 canonical 函数中定义根感知消解及越根拒绝。依据：[design.md:133](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:133)、[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)。

- **DES-5｜中风险｜截图记录的顶层语法仍与 π3 绝对路径矛盾。**  
  记录行仍声明 `path=<相对路径>`，而 π3 分支允许 UNC、drive-absolute 和 POSIX absolute。实现若先按记录 grammar 校验，会在进入六分支前拒绝全部绝对路径；HL-N-82b/d/f 正例因此依赖实现忽略顶层定式。应改为中性的 `path=<路径字面>`，再由 π 分支决定词法。依据：[design.md:138](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:138)、[cli-checkpoints.md:69](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:69)。

- **DES-6｜中风险｜AC-I 未覆盖新探针与 root-aware 规范化边界。**  
  缺少探针执行后 F1 零写入断言、并发探针、预存同名对象、部分创建/清理失败例；HL-N-82f 只覆盖 UNC 词法，没有验证 canonical 后仍保持 UNC；也没有 π3 `..` 正反例或“顶层 grammar 接受绝对 path”的断言。依据：[cli-checkpoints.md:68](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:68)、[cli-checkpoints.md:69](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:69)。

VERDICT: 6 issues open.