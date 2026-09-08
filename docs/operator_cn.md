# 人类操作员附录

> 自 `RUNBOOK_cn.md`(原 §6)原文迁出;下文的 § 引用(§1、§4、§5)指向 `RUNBOOK_cn.md`。

> 本节的一切都**由人执行**。agent 绝不可执行或模拟 `/goal`(R3)。架构与注意事项见 apriori-cli 仓库里的 `docs/concepts_cn.md` §4.7(用 /goal 自动化整个流程)。
> **两个循环、两个上界。** *评审轮次*由派生循环按 family 治理(§1 R4 / `gate` C8);*实现与测试循环*的最坏情况是固定的 **25 轮**,写在下面的配方文本里。`process-config.md` 两个都不配置。

**Specify 循环(只在所有者要求提前判断某个具体方案、或需求仍有实质不确定性时才跑——默认直接进入 Build & Test):**
```text
/goal "Goal: apriori/changes/<change>/specs/ holds the behavior contract and the latest review verdict line is 'VERDICT: no major issues, ready to proceed to execution'. No round cap — §1 R4's derived loop governs: still revising after round 2, stop and report instead of opening round 3.
Each round:
1. Revise the delta specs per the latest review — never touch source code — and update the state's ## Open section.
2. Re-run the heterogeneous reviewer with the P3 prompt (round 1: codex exec, note the printed session id; later rounds: codex exec resume -c sandbox_mode=\"read-only\" <session-id>), producing apriori/changes/<change>/review/spec-review-v{N}.md.
3. Surface the reviewer's verdict line here.
Stop on 'VERDICT: no major issues, ready to proceed to execution', on 'VERDICT: escalate', or when §1 R4 stops the loop."
```

**Build & Test 循环:**
```text
/goal "Goal — ALL must hold: `npm test` exits 0 (naming a test with its scenario ID is a suggestion, never mandatory); lint/static analysis green (where configured); (UI projects only) the Playwright E2E suite passes and screenshot diffs are within threshold; every ## Open item in the flow-state carries a stable id (`- <ID>: <text>`) and says what is still unverified; AND `apriori gate --change <change> --review-ready --test-cmd \"npm test\"` exits 0. Safety bound: 25 turns.
Turn 1: derive a failing test that proves every scenario's behavior with real evidence (one parametrized test may cover a scenario's whole examples table; naming it with the scenario ID is a suggestion, never mandatory), and SHOW the failing run. Each later turn: implement the next scenario, then run `npm test` (and the Playwright run for UI projects) and SHOW the output so the result is in the transcript. When the code is complete, update ## Open and run the review-ready check.
Stop when every condition holds. If turn 25 ends with any condition still unmet, STOP anyway and report the failing evidence — which conditions failed, plus the last test output. Reaching the bound is a stopped loop for the human to judge, NEVER a pass."
```
> 文档项目没有替身:没有可执行测试证据的 change 就没有 C1 证据;想走这套流程的文档项目必须提供一个真正会输出 TAP 的检查(`apriori check` 不输出 TAP,当不了这个检查)。没有 UI 的项目去掉 Playwright 那一条。

**Review & Deliver:**
```text
/goal "Goal: IF this change owes a KB update (§4 Review & Deliver: an existing truth doc for the touched module, or an explicit decision to persist one), apriori/truth/<module>.md already reflects this change's new/changed facts with a refreshed source-commit stamp — a precondition of review-ready, never a step after archive; THEN an independent review by a DIFFERENT model (the P3 prompt) reports 'VERDICT: no spec-vs-code gaps'; THEN the change is archived (`apriori archive` merges the delta specs into the living store apriori/specs/ and never touches apriori/truth/).
If a KB update is owed, land it first and list exactly which files/sections changed. Then run the review-ready check; if it does not exit 0, go back to Build & Test — that is not a review round. Then run the consistency reviewer (codex exec / fresh claude) and paste its verdict. Then run the archive action.
Stop when all of it holds, or immediately if the verdict is 'VERDICT: escalate'."
```

**你亲自决定的事(只有五件,再没有别的):**

1. **一次 escalation** —— 一条 `VERDICT: escalate`,或某个 family 到了第 5 轮。`apriori status --change <name> --escalation` 打印它并以 3 退出。用 `gates:` 里的 `reframe <family> round <n> <split|tests|redo|accept-risk> — <理由>` 回答。要升级标准,绝不悄悄降低它。
2. **无法解决的 `## Open` 条目**(关键证据被挡住)—— 把证据做便宜、拆小 change、或在 `gates:` 里接受风险(`evidence-accept <ID>`)。接受它只结清那一条条目,别无其他。
3. **某个评审 family 在它的第 2 轮后停滞** —— 用 `gates:` 里的 `reframe <family> round <n> <split|tests|redo> — <理由>` 回答;只重开那个 family 的循环,别无其他。
4. **每一次外部副作用**(§1)—— 一次性、点名、原文记录。任何一揽子授权都永不覆盖它。
5. **放弃** —— 只凭你的一句话。

其余的事要么由 CLI 机械判定,要么根本不需要谁来判定:`apriori gate --change <name>` 是机器那一面,而 `apriori status --change <name> --escalation`(退出 3)是本仓库提供的唯一硬停。
