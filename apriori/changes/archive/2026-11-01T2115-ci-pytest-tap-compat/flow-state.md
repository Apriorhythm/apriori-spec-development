change: ci-pytest-tap-compat
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: 01a1973f-0576-70f0-a49e-f31a517e9c50 # the reviewer's resumable session id, the moment round 1 prints it

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/ci-pytest-tap-compat`（从 v6-dev@6efe97f 开出）；评审接受后 squash 合回 v6-dev，推 judge 与 GitHub；PR #2 的 CI 随之重跑，全绿后继续 6.1.0 的发布步骤
- observed: 触发——6.1.0 发布 CI（PR #2，run 41309720507）python-example 两个 OS 都失败：`python run_tap.py` 退出 3、0 条 TAP、PY-01..03 UNBOUND、verify 拒绝；runner 装的是 pytest-9.2.0 + pytest-tap-3.5（Successfully installed 行）；其余 test 矩阵与 golden-path 全过；PR #1（10-23，518b377）同一 job 全绿
- observed: 本机复现——全新 venv 装最新 pytest 9.2.0 + pytest-tap 3.5：`pytest --tap-stream` 在插件加载时报 `ValueError: option dest 'tap_stream' already used by ['--tap']`，rc=3；同 venv 降到 pytest 8.4.2：run_tap.py 输出 PY-01..03 三条 ok，rc=0
- decision: approach——外部发布导致，与 apriori 代码无关；最小修法是 CI 的 python-example 安装行与示例 README 都钉 `pytest<9`，README 写明原因；golden 规格加一条 requirement（WN-02，WN-01 已占用）与守卫测试；pytest-tap 支持 pytest 9 后再放开
- observed: Review 第 1 轮（Astra，P3 逐字）= `VERDICT: no spec-vs-code gaps`；advisory：守卫可把 python-example job 的截取范围收紧、按完整命令匹配（非阻塞，未改）
- observed: Build——test/ci-pytest-tap-compat.test.js 先红（安装行未钉）后绿；全新 venv 按 CI 原样跑 `apriori verify --specs apriori/specs --test-cmd "python run_tap.py"` → RESULT: GREEN

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- P3（Astra）→ check / gate / archive --write（不接管道）→ 合回 v6-dev → PR #2 CI 重跑

gates:
  - 2026-11-01T21:12 note: change scaffolded by `apriori new`
  - 2026-11-01T21:13 note: Ground + Specify + Build：PR #2 python-example 失败归因于外部 pytest 9.2 与 pytest-tap 3.5 冲突（本机复现，8.4.2 下 GREEN）；CI 与 README 钉 pytest<9，golden 加 WN-02 与守卫测试（先红后绿）；全新 venv 按 CI 原样 verify GREEN
  - 2026-11-01T21:15 note: Review 第 1 轮（Astra）接受：no spec-vs-code gaps，advisory 1（守卫截取范围，非阻塞）；CHANGELOG 6.1.0 节补条目；进入 check / gate / archive
