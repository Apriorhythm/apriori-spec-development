# vote-dedup req-v1 需求评审

## 结论摘要

本轮发现 7 个正式问题。需求方向与现状 A 基本一致，目标 lineage 声明正确，但仍有若干目标态、异常路径、数据模型与验收表述不够精确，尚不适合直接交给 AI 无歧义实现。

| 维度 | Verdict | 关联问题 |
|---|---|---|
| 1. 目标态 B 是否清晰无歧义 | 不通过 | REQ-001, REQ-002, REQ-006 |
| 2. 边界与异常路径是否覆盖 | 不通过 | REQ-003, REQ-004 |
| 3. 是否存在隐含但未声明的状态变化/副作用 | 不通过 | REQ-005 |
| 4. 验收标准是否可测试 | 不通过 | REQ-007 |
| 5. 是否与当前状态 A 冲突 | 通过 | 未发现直接冲突 |
| 6. 目标 lineage 是否声明且匹配现实 | 通过 | 当前分支为 `master`，HEAD 与 KB `source-commit` 一致 |

## 正式问题

### 维度 1：目标态 B 是否清晰无歧义

#### REQ-001 — 文档仍保留开放问题，目标态未封版

**Description:**  
第 4 节仍列出 Q1/Q2/Q3。尤其是无标识 POST 的状态码、是否在 `/poll/:id` HTML 请求下发 cookie、领域层 `polls.vote()` 签名如何变化，都会直接影响实现和测试。

**Risk:**  
不同实现者可能选择不同状态码、cookie 下发入口和内部 API 形态，导致实现虽各自合理但验收不一致。

**Suggested fix:**  
把开放问题改成明确决定。例如：无/非法标识 POST 固定返回 `403`；仅 `GET /api/polls/:id` 下发/刷新投票者 cookie；领域层接口明确为 `getView(id, voterId?)`、`vote(id, choices, voterId)` 或等价签名。

#### REQ-002 — `voted` 字段的公开视图契约不完整

**Description:**  
B6 只声明“携带已投标识的请求返回 `voted: true`”，但未说明以下情况：无 cookie、非法 cookie、有效 cookie 但未投过、投票成功响应、404 响应、管理视图是否包含 `voted`。当前代码的 `view(poll)` 是无身份上下文的公共投影视图，这一接口变化需要明确。

**Risk:**  
实现可能让 `voted` 缺省、返回 `false`、只在 GET 返回、或误加到 admin view；前端和测试会产生分歧，也可能意外扩大接口暴露面。

**Suggested fix:**  
声明公共投票视图的完整契约：`GET /api/polls/:id` 和成功 `POST /vote` 均返回布尔 `voted`；有效标识且已投为 `true`，否则为 `false`；无/非法 cookie 的 GET 视同新标识并返回 `false`；admin view 是否不包含该字段也要明确。

#### REQ-006 — Cookie 与签名密钥生命周期不够精确

**Description:**  
B1 的“长有效期”和 B2 的“签名密钥持久化在数据目录”没有定义具体可验收行为：cookie 名称、有效期下限或精确 `Max-Age/Expires`、密钥文件位置、首次生成、重启复用、密钥文件缺失/损坏时的处理。

**Risk:**  
实现可能选择一天、一年或会话级有效期；密钥重建策略不同会让已有 cookie 是否失效不可预测。密钥损坏时如果静默重建，也会造成所有既有 cookie 失效但无明确验收依据。

**Suggested fix:**  
补充固定契约。例如：cookie 名为 `poll_voter`；`Max-Age=31536000`；密钥文件为 `<dataDir>/cookie-secret`；文件不存在时生成并保存；存在时复用；读取失败返回 500 或启动失败；非法 cookie 在 GET 上按无标识处理，在 POST 上拒绝。

### 维度 2：边界与异常路径是否覆盖

#### REQ-003 — 同一 cookie 并发投票的结果未定义

**Description:**  
AC2/AC3 覆盖了串行重复提交，但没有覆盖两个相同 cookie 对同一 poll 近同时提交的行为。

**Risk:**  
如果实现把“检查是否已投”和“写入投票/标记已投”拆开且中间存在异步边界，可能两个请求都通过检查并双计票，核心防重复目标失效。

**Suggested fix:**  
增加并发验收：同一有效 cookie 对同一 poll 同时发起两个合法 `POST /vote`，则最多一个返回 200，其余返回 409，最终 `total` 只增加 1。并声明检查、计票、标记已投必须作为一个原子逻辑步骤完成。

#### REQ-004 — 持久化失败时的回滚/一致性未定义

**Description:**  
B4 要求首次投票成功时“已投过该 poll”随 poll 数据一起落盘，但未说明 `store.put()`/文件写入失败时，内存中的票数和去重标记应如何处理。当前 store 是先改内存对象再写整个 JSON 文件，失败路径尤其需要明确。

**Risk:**  
实现可能返回 500 但内存中已经计票，或计票成功但去重标记未持久化，导致重启前后行为不一致、重复投票漏拦或票数异常。

**Suggested fix:**  
声明失败语义：计票和去重标记必须对调用者表现为 all-or-nothing；持久化失败时返回 500，且活动进程内的票数与去重状态不得改变。至少增加可注入失败 store 的单测，断言失败后再次读取视图不变。

### 维度 3：隐含但未声明的状态变化/副作用

#### REQ-005 — 新旧投票数据模型兼容规则未声明

**Description:**  
当前 poll 记录是 `votes: [[choiceIndex,...]]`。需求要求新增“该标识已投过该 poll”的持久状态，并且 out of scope 声明历史旧投票无标识、保持原样计票，但没有定义新字段/新 schema 与旧 `votes` 数组如何共存。

**Risk:**  
实现可能把 `votes` 从数组改成对象数组，破坏现有 `counts`/`total` 语义、旧数据加载或 `view()` 裁剪规则；也可能把投票者标识和选择直接绑在同一结构中，增加隐私暴露风险。

**Suggested fix:**  
明确持久化形态和兼容规则。例如：旧 `votes` 数组保持有效；新增 `voters`/`votedBy` 存防重用的标识摘要；`counts` 和 `total` 继续只按 `votes` 计算；公开视图不得返回 `votes`、`voters`、cookie 原值或标识摘要；不做历史迁移但必须能读取旧 poll。

### 维度 4：验收标准是否可测试

#### REQ-007 — AC7 的“无 cookie 直连 POST 拒绝文案对用户可见”不可按字面做浏览器端到端断言

**Description:**  
AC7 把“浏览器端到端”和“无 cookie 直连 POST”放在一起，但直连 POST 没有页面承载错误文案；正常浏览器访问 `/poll/:id` 后又会先 GET 领取 cookie。

**Risk:**  
测试作者无法判断应通过 curl/API 断言 JSON 错误，还是构造浏览器页面态断言 `#error` 可见，导致验收实现不一致。

**Suggested fix:**  
拆成两个可测 AC：API 层无 cookie POST 返回指定 4xx 和 `{error}`；浏览器层在页面已加载后删除投票者 cookie，再点击投票按钮，页面 `#error` 显示该错误文案且表单不被静默隐藏。

### 维度 5：是否与当前状态 A 冲突

未发现直接冲突。需求确认了当前无服务端 cookie、无服务端去重、`view()` 不泄露 `adminToken`/`votes`、store 无 fsync 保证，这些与 KB 和代码现实一致。需注意 REQ-005 中的数据模型兼容规则补齐后，才能确保不破坏现有旧数据与计票语义。

### 维度 6：目标 lineage 是否声明且匹配现实

通过。需求声明目标 lineage 为 `master`；当前仓库分支为 `master`，HEAD 为 `3f1d30954a9d5b500f8a6708b9070d51e045aac5`，与 KB 的 `source-commit` 一致。

## Advisories

- ADV-001：若继续保持项目“零运行时依赖”的现实约束很重要，建议在需求中显式声明 cookie 解析、签名、随机值生成使用 Node 内建能力，不新增 npm 依赖。
- ADV-002：现有测试会精确断言中文错误文案。新错误如“未获得投票标识”“你已经投过”等，建议在需求中给出固定文案，减少实现和测试反复。
- ADV-003：AC3 的 `N 次` 建议落成具体测试值，例如 N=3，便于测试用例稳定表达。

## LEDGER DELTA

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-001 | 文档仍保留开放问题，目标态未封版 | 状态码、cookie 下发入口和领域层接口可能被不同实现者选择成不同结果 | req-v1 | open |
| REQ-002 | `voted` 字段的公开视图契约不完整 | 前端、API 响应和测试可能对字段存在性/真假值产生分歧 | req-v1 | open |
| REQ-003 | 同一 cookie 并发投票的结果未定义 | 并发重复提交可能双计票，破坏服务端防重复目标 | req-v1 | open |
| REQ-004 | 持久化失败时的回滚/一致性未定义 | 可能出现返回失败但内存已计票，或计票与去重标记不一致 | req-v1 | open |
| REQ-005 | 新旧投票数据模型兼容规则未声明 | 可能破坏旧 `votes` 数据、`counts`/`total` 语义或隐私边界 | req-v1 | open |
| REQ-006 | Cookie 与签名密钥生命周期不够精确 | cookie 有效期、密钥复用和损坏处理不可预测，重启后行为可能不一致 | req-v1 | open |
| REQ-007 | AC7 的无 cookie 直连 POST 用户可见文案不可按字面端到端测试 | 测试作者无法确定应断言 API JSON 还是浏览器页面错误状态 | req-v1 | open |

VERDICT: 7 issues open

> (recorded on behalf of the reviewer — codex gpt-5.5, session 019f4127-1cdf-7e32-a569-e568fe86ff58, read-only sandbox; raw output: vote-dedup-req-review-v1-raw.txt)
