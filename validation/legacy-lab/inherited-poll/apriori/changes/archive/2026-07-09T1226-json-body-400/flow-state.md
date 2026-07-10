change: json-body-400
tier: trivial
track: harden
track-rationale: goal fully stateable — "POST body that isn't a JSON object must get 400 + clear
    message, never 500"; single-file bugfix (server.js readJsonBody), no shared-state change.
lineage: master (single-branch repo; no merge taboo)
current-step: DONE
round: STEP5·r1 (round-started 2026-07-09T04:40, round-ended 2026-07-09T04:55 — failing RB-01 run
    shown (500 !== 400), readJsonBody fixed, npm test 42/42, e2e 3/3, apriori verify GREEN over
    store + delta; consistency review verdict "VERDICT: no spec-vs-code gaps", 0 formal findings,
    2 advisories batch-acked) — STEP5 CLOSED; STEP6: fix committed as 8699ca8, delta archived
    (REQUEST-BODY-VALIDATION merged into apriori/specs/polls.md, change dir moved here), KB
    error-semantics paragraph updated + source-commit refreshed to
    8699ca84e2e829934c08a38640db5e94e3e35a15; gate④ approved — CHANGE CLOSED
reviewer-session: 019f451e-a96d-7001-b405-a13f218f3275 (codex, STEP5 consistency — closed)
next-action: none — change complete (KB writeback committed at gate④ approval)  # 2026-07-09T05:00
artifact-root: .
gates:
  - 2026-07-09T04:35 note (kickoff, verbatim from the human at vote-dedup's gate④): "现在 POST 接口
    如果收到空 body 或者不是 JSON 的东西,服务器直接 500,应该是 400 给个明白的错误提示——这算个小
    bug,你按流程顺手修一下"。
  - 2026-07-09T04:40 note (light-explore facts, reproduced empirically against a live server):
    empty body → already 400 (问题不能为空 / 请至少选择一个选项); non-JSON → already 400
    请求格式不正确; the REAL 500 is a body of JSON literal `null` — both POST endpoints throw
    TypeError (create reads input.question, vote route reads body.choices of null). Arrays/strings/
    numbers don't crash but produce misleading validation messages. Fix scope: readJsonBody rejects
    any parse result that is not a plain object → 400 请求格式不正确, uniformly.
  - 2026-07-09T05:00 gate④: "批准,收尾吧。谢谢,两件都做得干净" — KB diff + spec-store merge
    approved; STEP6 writeback committed, change closed.
