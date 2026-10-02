# 人类操作员附录

> 自 runbook(原 §6)原文迁出;下文的 § 引用(§1、§4、§5)指向 `RUNBOOK.md`(runbook 只有英文一版)。

> 本节的一切都**由人执行**。agent 绝不可执行或模拟 `/goal`(R3)。架构与注意事项见 apriori-cli 仓库里的 `docs/concepts_cn.md` §4.7(用 /goal 自动化整个流程)。
> **两个循环、两个上界。** *评审轮次*由派生循环按 family、对照所有者在 `process-config.md` 里的 `review-round-limit`(默认 8;到了上限,agent 对每条未决发现逐条裁决,随后做一次复核)治理(§1 R4 / `gate` C8);*实现与测试循环*的最坏情况是固定的 **25 轮**,写在下面的配方文本里——`process-config.md` 不为它配任何数字。

**Specify 循环(只在所有者要求提前判断某个具体方案、或需求仍有实质不确定性时才跑——默认直接进入 Build & Test):**
```text
/goal "Goal: apriori/changes/<change>/specs/ holds the behavior contract and the latest review verdict line is 'VERDICT: no major issues, ready to proceed to execution' — OR you stopped at a human stop (§1 R1: the reviewer escalates, a round would go past the one re-review, an item is the owner's) and your last message names it, what is still open and the decision the owner must make; that outcome hands the change back and is never a pass. No round number here — §1 R4's derived loop governs: below the owner's review-round-limit (process-config.md, default 8) keep revising, logging the review-progress note in gates: before round 3 and every later round; at the limit do not stop — write one `note: ruling …` line per open finding and run the one re-review (§1 R4); stop and report when the reviewer escalates, when a round would go past that one re-review, or when an item is the owner's.
Each round:
1. Revise the delta specs per the latest review — never touch source code — and update the state's ## Open section.
2. Re-run the heterogeneous reviewer with the P3 prompt (round 1: codex exec, note the printed session id; later rounds: codex exec resume -c sandbox_mode=\"read-only\" <session-id>), producing apriori/changes/<change>/review/spec-review-v{N}.md.
3. Surface the reviewer's verdict line here.
Stop on 'VERDICT: no major issues, ready to proceed to execution', on 'VERDICT: escalate', or when §1 R4 stops the loop."
```

**Build & Test 循环:**
```text
/goal "Goal — ALL must hold: `npm test` exits 0 (naming a test with its scenario ID is a suggestion, never mandatory); lint/static analysis green (where configured); (UI projects only) the Playwright E2E suite passes and screenshot diffs are within threshold; every ## Open item in the flow-state carries a stable id (`- <ID>: <text>`) and says what is still unverified; AND `apriori gate --change <change> --review-ready --test-cmd \"npm test\"` exits 0 — OR you stopped at the 25-turn bound or at a human stop (§1 R1) and your last message names it, the conditions still unmet and the decision the owner must make; that outcome hands the change back and is never a pass. Safety bound: 25 turns.
Turn 1: derive a failing test that proves every scenario's behavior with real evidence (one parametrized test may cover a scenario's whole examples table; naming it with the scenario ID is a suggestion, never mandatory), and SHOW the failing run. Each later turn: implement the next scenario, then run `npm test` (and the Playwright run for UI projects) and SHOW the output so the result is in the transcript. When the code is complete, update ## Open and run the review-ready check.
Stop when every condition holds. If turn 25 ends with any condition still unmet, STOP anyway and report the failing evidence — which conditions failed, plus the last test output. Reaching the bound is a stopped loop for the human to judge, NEVER a pass."
```
> 文档项目没有替身:没有可执行测试证据的 change 就没有 C1 证据;想走这套流程的文档项目必须提供一个真正会输出 TAP 的检查(`apriori check` 不输出 TAP,当不了这个检查)。没有 UI 的项目去掉 Playwright 那一条。

**Review & Deliver:**
```text
/goal "Goal: IF this change owes a KB update (§4 Review & Deliver: an existing truth doc for the touched module, or an explicit decision to persist one), apriori/truth/<module>.md already reflects this change's new/changed facts with a refreshed source-commit stamp — a precondition of review-ready, never a step after archive; THEN an independent review by a DIFFERENT model (the P3 prompt) reports 'VERDICT: no spec-vs-code gaps'; THEN the change is archived (`apriori archive` merges the delta specs into the living store apriori/specs/ and never touches apriori/truth/) — OR you stopped at a human stop (§1 R1: an escalate verdict, a round past the one re-review, a pending item only the owner can settle) and your last message names it, what is still open and the decision the owner must make; that outcome hands the change back and is never a delivery.
If a KB update is owed, land it first and list exactly which files/sections changed. Then run the review-ready check; if it does not exit 0, go back to Build & Test — that is not a review round. Then run the consistency reviewer (codex exec / fresh claude) and paste its verdict. Then run the archive action.
At the review-round limit, rule on each open finding and run the one re-review (§1 R4) instead of stopping. Stop when all of it holds, or immediately if the verdict is 'VERDICT: escalate' or a round would go past that one re-review."
```

**Build → Review → Archive,一条 goal(推荐用它把一个 change 从头跑到尾):**
```text
/goal "Goal — this change is archived: `apriori archive --change <change> --write` has succeeded (it merges the delta specs into apriori/specs/; an archive is not a release) — OR you stopped at one of the human stops listed below (§1 R1) or at the Build & Test stage's 25-turn bound, and your last message names it, what is still open (at the bound: the conditions still unmet and the failing evidence) and the decision the owner must make; that outcome hands the change back and is never a pass or a delivery.
Work in stages, and when a stage fails go back to that stage:
1. Build & Test — derive a failing test that proves every scenario's behavior with real evidence and SHOW the failing run; then implement scenario by scenario, running `npm test` (and the Playwright run for UI projects) and SHOWING the output; update ## Open; `apriori gate --change <change> --review-ready --test-cmd \"npm test\"` must exit 0 (a failure here is Build & Test work, not a review round). Safety bound for this stage: 25 turns.
2. Review — if a KB update is owed, land it first. Run the independent reviewer with the P3 prompt (round 1: codex exec, note the printed session id; later rounds: codex exec resume -c sandbox_mode=\"read-only\" <session-id>, the message scoped as §4 Review & Deliver says) and land each round as apriori/changes/<change>/review/code-review-v{N}.md; on REVISE fix per the Fix Packet and review again. At the review-round limit do not stop: write one `note: ruling …` line per open finding and run the one re-review, exactly as §1 R4 says.
3. Archive — `apriori gate --change <change> --test-cmd \"npm test\"`, then `apriori archive --change <change> --write`. The final report lists every ruling (§1 R4).
Stop and report only at §1 R1's stops: an escalation (a `VERDICT: escalate`, or a round past the one re-review), a pending ## Open item only the owner can settle, an external side effect without its authorization, or abandonment. Reaching the Build & Test bound is a stopped loop for the human to judge, NEVER a pass."
```

**需求级独立核对(可选——一个需求拆成了几个 change、交付之前):** 每个 change 的评审(P3)只拿这个 change 对照它自己的契约;逐 change 的流程里,没有哪一步把整个需求从头到尾看一遍。这一步在需求的最后一个 change 归档之后做这件事。它由独立于写代码那个会话的评审方执行——不同的模型或全新的会话,与 R2 对 P3 的要求相同——输入与 P3 的默认输入分开列出:需求来源及其版本、这个需求所有 change 的已归档契约、所有者已记录的决定、来源清单(做过原型走查就用走查清单,见 `apriori/guides/prototype-walk.md` §5;否则按来源里的每条需求一行)。**落在哪里:** 报告、每次复核和唯一的当前清单,都放在该需求的文档目录(来源所在处)——不进任何已归档的 bundle,也不进任何 change 的 `review/`(放在那里会被当成一个评审族,可能被误当作那个 change 的独立评审)。报告钉住被核对的代码提交、来源版本和核对范围;之后代码有变化,受影响的部分要复核。发现按 §4 的处置规则走:必要修复落到一个或多个 change,每个都在 Ground 把这份报告登记为来源材料、承接该发现的 id、走自己的 P3;之后需求级评审方复核这些修复及其影响到的路径,结果写回需求目录。各 change 的 P3 与这次复核分别闭合,先前核对的结论永远不进 P3 的默认输入。新诉求登记带落点的 follow-up;所有者的口径留作 pending 条目。核对干净时不开 change,报告和清单照样保留。之后,如果你愿意,可以接一段**所有者验收剧本**:剧本从清单和契约派生,预期写成页面上看得到的样子;配一套 kit(造数、命令、任何真实副作用之前的守卫、清理);真实副作用只凭一次性授权;问题先记下、事后再分类(剧本、数据、代码或配置)——只有人能确认的,由你确认。
```text
/goal "Goal — requirement <requirement> has passed the requirement-level independent check in docs/operator.md: the agreed scope is checked, every necessary fix and its re-check are closed, every follow-up has its landing spot, nothing blocking is left open, and the owner has the report — OR you stopped at a human stop (§1 R1), at an actual capability block or at a set execution bound, and your last message names it, what is still open and the decision the owner must make; that outcome hands the requirement back and is never a delivery. While what remains can be advanced within your delegation, continue.
1. In the requirement's document directory <dir>, start the report: the code commit checked, the sources and their versions, the scope, and the inputs listed apart from P3's default input — the archived contracts of <changes>, the owner's recorded decisions, the source checklist (a successor of an archived walk checklist lives here, keeping its ids and naming its predecessor).
2. Run the independent reviewer (not this session's model or context: codex exec, or a fresh session) on those inputs. It reconciles every `in` row of the checklist against the built code — corrected rows against their ruling — filling `implementation` and `verification` and listing every row left open; traces the end-to-end paths the sources describe across the changes; checks every delivery dependency handed outside the workflow; and checks the assertion and run conditions behind each tick (an assertion true on an empty set, a log check at a level that hides its line, a row ticked against the wrong item prove nothing). It reads the code; it does not fix it. Land its report verbatim in <dir>, recorded on its behalf.
3. Dispose every finding per §4 Review & Deliver: a necessary fix → one or more changes, each registering the report in Ground, carrying the finding's id and passing its own P3; then resume the requirement-level reviewer on the fixes and what they affect, its re-check landing in <dir>; a new ask → a follow-up with its landing spot; an owner call → a pending ## Open item. Never mark a row reconciled the reviewer did not check."
```

**原型走查(可选,在写契约之前):** 需求带有可运行的 UI 原型时,agent 会在登记需求来源时提议一次走查;你也可以自己发起:*「按 `apriori/guides/prototype-walk.md` 走查原型 `<路径>`,对照 `<PRD>`,范围 `<页面>`。」* agent 会系统遍历原型,留下一份对照清单——列、字段、选项及其取值、状态、逐字文案、原型自身的缺陷——契约和后面的独立核对都以它为准。它需要本机有本地服务和浏览器自动化工具(Playwright 或同类);没有时,它会如实报告哪些没能实际操作。清单是来源材料:它不授权任何事;原型缺陷照不照做,需求没有定的,由你决定。

**你亲自决定的事(只有五件,再没有别的):**

1. **一次 escalation** —— 一条 `VERDICT: escalate`,或某个 family 未经你放行就越过了它唯一一次自动复核(§1 R4)。`apriori status --change <name> --escalation` 打印它并以 3 退出。用 `gates:` 里的 `reframe <family> round <n> <split|tests|redo|accept-risk> — <理由>` 回答。要升级标准,绝不悄悄降低它。
2. **无法解决的 `## Open` 条目**(关键证据被挡住)—— 把证据做便宜、拆小 change、或在 `gates:` 里接受风险(`evidence-accept <ID>`)。接受它只结清那一条条目,别无其他。
3. **某个评审 family 越过了它唯一一次自动复核** —— 到了你的 `review-round-limit`(`process-config.md`,未配置为 8)agent 不停:它对每条未决发现逐条裁决,随后做一次复核;那次复核仍未解决的问题作为 pending 的 `## Open` 条目交给你(第 2 件)。越过复核的轮次要你在 `gates:` 里用 `reframe <family> round <n> <split|tests|redo|accept-risk> — <理由>` 回答;只重开那个 family 该轮的循环,别无其他。之后越过复核的 `revise` 会再次停下——若希望它不必每轮问你就继续跑,在 `process-config.md` 里提高 `review-round-limit`;那里的 `accept` 自行继续。上限之下的 `revise` 不会为你停下——agent 从第 3 轮起记 `review-progress` 并继续。全部裁决列在最终报告与归档声明里;它们不保证方法本身正确。
4. **每一次外部副作用**(§1)—— 一次性、点名、原文记录。任何一揽子授权都永不覆盖它。
5. **放弃** —— 只凭你的一句话。

其余的事要么由 CLI 机械判定,要么根本不需要谁来判定:`apriori gate --change <name>` 是机器那一面,而 `apriori status --change <name> --escalation`(退出 3)是本仓库提供的唯一硬停。
