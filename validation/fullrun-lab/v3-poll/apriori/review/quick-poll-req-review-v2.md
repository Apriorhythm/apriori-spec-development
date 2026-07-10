# quick-poll req review v2

## 修复核验

| ID | Verdict | 核验说明 |
|---|---|---|
| REQ-1 | verified | §4.2 与 AC1 已定义 CSPRNG、≥128 bit 熵、URL-safe 编码，并限制管理密钥不得出现在公开面。 |
| REQ-2 | verified | §4.1 与 AC2 已定义 trim、长度、选项数量、重复选项、顺序保持。 |
| REQ-3 | verified | §4.3 与 AC7/AC9 已定义 per-poll 串行化、关闭持久化后才成功、在途投票语义。 |
| REQ-4 | verified | §4.4 与 AC11/AC12 已定义临时文件 + rename、成功响应等价于已落盘、写入失败和损坏 JSON 行为。 |

## 维度结论

| Dimension | Verdict | 说明 |
|---|---|---|
| 1. Target state B clear and unambiguous | Fail | 主流程已清楚；但 pollId 的生成、格式、碰撞处理和路由参数边界未定义。 |
| 2. Edge cases and exception paths covered | Fail | 仍缺少 malformed JSON、错误字段类型、`null` 等请求体异常路径。 |
| 3. Implied but undeclared state changes or side effects | Pass | 文件写入、票数变更、关闭状态、本地标记、轮询行为均已声明。 |
| 4. Acceptance criteria testable | Fail | pollId 安全/碰撞与请求体异常当前没有可验收标准。 |
| 5. Conflict with current state A | Pass | 当前态 A 为空仓库；未发现冲突。 |
| 6. Target lineage declared and matches repo reality | Pass | 需求声明落在 `master` 主线；仓库当前分支为 `master`。 |

## 正式问题

### Dimension 1 / 2 / 4

#### REQ-5 — pollId 的生成、格式校验和碰撞处理未定义

- Description: 需求使用 `data/<pollId>.json` 和多条 `/<pollId>` 路由，但没有定义 pollId 的生成方式、允许字符/长度、服务端是否接受客户端提供的 id、路径参数不合法时如何处理，以及创建时若目标文件已存在是否重试或拒绝。
- Risk: high。实现可能使用可预测或碰撞风险高的 id，也可能把未校验的路由参数拼入文件路径，造成投票文件覆盖、错误读取，甚至路径穿越类安全问题；同时无法测试“创建不会覆盖已有投票”。
- Suggested fix: 明确 pollId 只能由服务端生成，使用 URL-safe 白名单格式，例如 `[A-Za-z0-9_-]{16,64}`；创建时若 `data/<pollId>.json` 已存在必须重新生成，不得覆盖；所有路由参数必须先通过同一 regex 校验，不合法时返回 404 或 400，且不得访问 `data/` 外路径。增加 AC：并发/多次创建不会产生重复 pollId 或覆盖已有文件；恶意或非法 pollId 不会读写 `data/` 外文件。

### Dimension 2 / 4

#### REQ-6 — POST 请求体异常路径未定义

- Description: 路由表定义了 JSON 请求体，但未说明 malformed JSON、空 body、字段缺失、字段类型错误、`title: null`、`options` 非数组、`optionIndex` 非整数、`key` 非字符串等情况如何响应。§4.1 的 `trim` 规则也没有说明非字符串输入是否先拒绝。
- Risk: med。AI 实现可能在 `trim`、数组遍历或 JSON parse 时崩溃，也可能把错误类型隐式转换后接受，导致 AC2/AC4/AC8 的测试结果不稳定。
- Suggested fix: 增加统一请求体规则：JSON parse 失败、body 缺失、字段缺失或类型错误均返回 400，且不改变状态；`title` 和每个 `options[]` 元素必须是字符串；`optionIndex` 必须是整数；`key` 必须是字符串；可选地声明最大请求体大小，超限返回 413。

## Advisory

- 建议声明有效管理密钥关闭一个已关闭投票时的行为，例如返回 200 幂等成功或 409 已关闭，避免重复点击关闭按钮时实现分歧。
- 建议声明 Node.js 最低版本，确保 `crypto`、URL 解析和文件 API 使用范围一致。
- 建议明确响应错误体的基本形状，例如 `{error: "..."}`，方便测试断言而不绑定文案细节。

VERDICT: 2 issues open
