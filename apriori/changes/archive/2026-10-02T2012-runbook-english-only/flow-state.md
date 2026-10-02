change: runbook-english-only
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: 01a0fc7d-066c-7e11-adfa-c0235c81ce5d   # codex exec, round 1 (2026-10-02)

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/runbook-english-only`（从 v6-dev@5d3fc78 开出）；本地提交；评审通过后合回 v6-dev 并推 judge 与 GitHub；不进 release/v6 / preview 快照
- decision: requirement — 人类 10-02「Runbook 我觉得不需要多语言，直接用英文就行（我不确定这样好不好）」，经 Claude × Astra 讨论（`/root/asd-lab/work/astra-discuss/r59/` 第 6–7 轮，DISAGREEMENTS 0）定为计划 C-a（`/root/asd-lab/work/r59-1002/PLAN-改造计划.md` §一），人类 10-02「执行」：英文 RUNBOOK.md 成为唯一规则源；先逐项盘点 RUNBOOK_cn.md 与 CN 测试/检查的独有断言，语义移入英文或行为测试，再删镜像文件与镜像检查；其他中文文档及其检查保留；修死链与引用；不宣称 agent 执行更好；P3 英文字节不变（RIB-10）
- decision: 边界 — 历史记录不改：CHANGELOG 既有条目、`apriori/changes/archive/` 归档、`validation/` 实验目录、三个旧在途 change（archive-preflight、hotfix-channel、state-switch-completeness-principle）；规格库里已 deprecated 的两个块（PR-19、PR-20 所在）是历史文本，不 MODIFIED
- decision: producer — `apriori check --self` 在仓库里重新出现 `RUNBOOK_cn.md` 时失败（单一规则源的守卫，一行判断）：没有它，镜像会无声地回来并再次漂移
- observed: `apriori init` 只把包内 RUNBOOK.md 复制为项目的 `apriori/runbook.md`（lib/init.js:15,132）；package.json.files 不含 RUNBOOK_cn.md；init/update 从未把它装进任何项目（仓库里的 README_cn 曾把读者指向它——评审第 1 轮 advisory 纠正了「agent 从不读」的过度说法）
- observed: RUNBOOK_cn.md 的现役引用 —— lib/check.js:86（判定短语表）、:149（`< /dev/null` 提示）、:243（CK-11 版本头）、:372（CK-08 EN/CN 成对文件表）、:391（checkCodexCommands EN/CN 逐 token 对照）；RUNBOOK.md:4 头部语言栏链接（安装到项目后是死链）；README_cn.md:13,152；docs/operator_cn.md:3；docs/cli_cn.md:266；docs/concepts_cn.md:545；规格库 protocol 12 个现役需求块与 check 的 CK-11 块写着「both editions / RUNBOOK_cn.md」；23 个测试文件、80 个测试块读 RUNBOOK_cn.md
- observed: 判定短语表（lib/review.js:80 VERDICT_PHRASES）全为英文；RUNBOOK.md:45 已写「Machine tokens are ALWAYS English … and this runbook」
- observed: Specify —— delta protocol：12 个现役块 MODIFIED（「both editions / RUNBOOK_cn.md」改为只读英文 RUNBOOK.md；operator 指南与 concepts 手册的「both editions / both languages」保留——它们仍双语）+ ADDED PR-63；delta check：3 块 MODIFIED（CK-03 措辞、CK-08 块加 CK-23、CK-11/12 只查 RUNBOOK.md）；场景 id 全部保留
- observed: 盘点（`/root/asd-lab/work/next-improve-1002/C-a-盘点.md`）—— 80 个测试块读 RUNBOOK_cn.md；中英含义表逐对核对（shared-routing 32/32、RIB 8/8、SR2 4/4、DS-15 18/18、DS-17 7/7、PR-42 10/10）；逐测试「删 CN ≤ 留」，例外 6 项人工裁定：PR-51 四处义务与 PR-09 需求文档种子 → 语义移到英文断言；LN-09「到上限停在人」、PR-40「缺行默认 8」、MD-14「从该级别第一步开始」→ 英文侧已有同义断言；RC-02 → 整测试是 RC-01 的镜像，删除
- observed: Build 完成 —— 删 RUNBOOK_cn.md；lib/check.js：runbook 退出 EN/CN 成对表单独读入，判定短语 / `< /dev/null` / CK-11 只查 RUNBOOK.md，删 checkCodexCommands（EN/CN 逐 token 对照）及其导出，新增 CK-23 守卫；RUNBOOK.md 去掉头部语言栏；README_cn、docs/operator_cn、cli_cn、concepts_cn 的指针改为 RUNBOOK.md；23 个测试文件去 CN；新增 test/runbook-english-only.test.js（PR-63、CK-23，改前 2 红）；CHANGELOG Unreleased 一条；MIGRATING 一节 + 开头「both runbooks」改为「the runbook」；全套 872/872；`check --self` PASS；`verify --change` GREEN；P3 英文哈希 97a85ca560d41c70 不变
- observed: Review 第 1 轮（`review/code-review-v1.md`）= `VERDICT: 2 issues open`。CA-01：两份 delta 的戳被包了两层注释（`<!-- apriori-base: <!-- … --> -->`），解析不出，C7 阻断——修：第一行换成 `apriori stamp` 的原样输出，C7 通过。CA-02：契约仍要求被删的中文版——PR-51 的 THEN 仍写 CN kickoff/R3/Reality Check/follow-up，source-intake 块写「Both editions' Ground」，PR-60 写「both P3 blocks」，六处 WHEN 写「read in either language」，ledger 块写「neither runbook」，PR-40 THEN 写「each names … neither still says」，CK-17 块（「Both runbooks SHALL contain every canonical phrase」）不在 delta 里——修：逐处改为单一 runbook；不区分大小写重扫全部现役块，另查出漏抽的 PR-22 块（「Both runbook editions SHALL state the CAS rule」「the two runbook editions」）一并 MODIFIED；check delta 加 CK-17 块；现 protocol 13 块 MODIFIED + 1 ADDED、check 4 块 MODIFIED。Advisory（「agents never read the Chinese edition」超出证据，README_cn 曾指向它）已改为「init/update 从未安装它」（CHANGELOG、delta Notes、本文件）。落盘时略去评审方在输出顶部打印的两行占位 provenance（文档头部注明，raw 保留）
- observed: Review 第 2 轮（`review/code-review-v2.md`，resume 同一会话，消息按 §4 后续轮次范围写）= `VERDICT: no spec-vs-code gaps`；CA-01、CA-02 均 ADDRESSED；无新发现。Advisory：「no project ever carried the Chinese edition」仍超出证据——接受后按 advisory 删去该半句（CHANGELOG 与 protocol delta 的 Notes 只留「init/update only ever installed the English runbook」）；纯措辞，不改契约与执行，改后重跑 check / verify / gate

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- check → gate → archive --write → 合回 v6-dev

gates:
  - 2026-10-02T19:41 note: change scaffolded by `apriori new`
  - 2026-10-02T20:58 note: Ground、Specify 完成；Build 完成（盘点见 /root/asd-lab/work/next-improve-1002/C-a-盘点.md）；review-ready
  - 2026-10-02T21:38 note: Review 第 1 轮落盘（2 issues open）；已修；开第 2 轮
  - 2026-10-02T21:52 note: Review 第 2 轮接受（no spec-vs-code gaps）；advisory 措辞已改；进入 gate / archive
