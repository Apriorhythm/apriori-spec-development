<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r31 transport=codex-exec-wsl-proxy -->

核验结果：v29 为真实新字节，lineage 准确，五处参数化基本落盘；但 REQ-70 的能力描述仍自相矛盾，并新增一处向正式流程外溢的 state A 冲突。

- **REQ-70｜风险：高｜“非验证豁免、无机械载体”的声明不诚实。**  
  **依据：**保留案称 `no-test` 是“非验证豁免”、不豁免任何机械判定，却同时明确“替代 R1 的 scoped verify 义务”，并把验证下限从 GREEN 降为理由行 [req-v29.md:33](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v29.md:33)；AC 也直接断言 scoped verify 义务免除 [req-v29.md:117](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v29.md:117)。这就是 hotfix 准入层的验证豁免，只是不是对 state A verify verdict 的第四态豁免。  
  同段又称“可观察债务无机械载体”，但 `no-test:` 是 preflight 可解析、摘要绑定并归档的定式行，本身就是机器可检索载体；真正缺少的是跨 bundle 的机械逼偿机制。应准确改为：“豁免 hotfix R1 的 scoped-GREEN 前提，但不改变 verify 的 verdict 语义；债务有归档载体、无 living-store 投影及自动逼偿。”

- **REQ-71｜风险：阻断｜Q-4 的 hotfix 降级会通过正式表泄漏到正式 trivial 流程。**  
  **依据：**Q-4 明称只处理 hotfix 通道 [req-v29.md:124](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v29.md:124)，但正式流程的 R0/R1 行仍规定 trivial 验证下限“同 hotfix 对应行” [req-v29.md:100](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v29.md:100)。因此选择保留案后，可解释为正式 trivial 也能以 `no-test` 理由替代 GREEN。state A 明确要求 Trivial 走 STEP5 with tests，且退出必须测试及 `apriori verify` GREEN [RUNBOOK.md:93](/mnt/d/Workbench/misc/apriori-spec-development/RUNBOOK.md:93)、[RUNBOOK.md:249](/mnt/d/Workbench/misc/apriori-spec-development/RUNBOOK.md:249)。应在正式表明确：Q-4 参数化仅作用于 hotfix R1；正式 trivial 永远保持 state A 的 tests + verify GREEN，并补回归 AC。

VERDICT: 2 issues open