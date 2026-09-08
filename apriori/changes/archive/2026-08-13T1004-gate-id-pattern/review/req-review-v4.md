# req-v4 需求复评（第 4 轮）

评审基线：

- 需求：`apriori/changes/gate-id-pattern/requirement/req-v4.md`
- 台账：`apriori/changes/gate-id-pattern/review/issues.md`
- 同前轮知识库及 `lib/` 实现
- lineage：`main` / v4

## 维度 1：目标态 B 是否清晰且无歧义

结论：通过。

### REQ-8：已验证关闭

B6 已将两层语义明确分开：

- regex alternation 的 `|` 在 Markdown 配置单元格中写作 `\|`，解析后传给 `RegExp` 的 source 为裸 `|`
- regex 若要匹配 literal pipe 字符，则使用字符类 `[|]`

B6 还明确禁止“字面 pipe 写 `\|`”这类混淆表述，并要求 `templates/process-config.md` 与 `docs/cli*.md` 使用相同措辞。

该规则与 B5 的逐字符奇偶算法、真值表以及 `[|]` 规范形式完全一致，不再存在相互冲突的实现要求。

## 维度 2：边界与异常路径是否覆盖

结论：通过。

v4 保留了此前已收口的边界：

- 配置缺失、空值、重复及冲突
- 配置文件不可读或类型错误
- flag 覆盖非法配置
- 非法 regex 的逐命令错误矩阵
- 校验失败时不读取 specs、不启动 test command
- pipe 前连续反斜杠的奇偶规则
- timeout、retry、concurrency 和 rollback 保持现状

本轮文案修订没有改变或遗漏任何异常路径。

## 维度 3：是否存在暗示但未声明的状态变化或副作用

结论：通过。

本 change 仍为配置与 specs 的只读消费。模板、文档、config-contract spec/KB 和 CHANGELOG 的更新范围均已显式声明；没有新增文件写入、持久状态、并发状态或失败回滚行为。

## 维度 4：每条验收标准是否可测试

结论：通过。

AC7 新增了确定的静态 oracle：

- 模板与 `docs/cli*.md` 必须说明 alternation `|` 在单元格中写 `\|`
- 必须说明 regex literal pipe 写 `[|]`
- 必须不存在“字面 pipe 写 `\|`”类混淆表述

结合 AC5 的解析真值表和 `[|]` 识别用例，既能验证解析行为，也能验证面向用户的配置说明。REQ-8 的修复因此不仅是文案调整，而且具备可执行的回归条件。

其余 AC 仍保持确定：

- 四消费点分别具有结果 oracle
- flag/config/default 优先级可测
- 错误 exit code、消息和 JSON shape 可测
- 真实样本双路径及不可变身份有记录要求
- 文档文件清单穷尽

## 维度 5：是否与 state A 冲突

结论：通过。

v4 没有引入新的 state A 冲突：

- `leadId` 边界语义保持不变
- `check` 不增加 flag
- `verify`、`gate` 保持既有 JSON shape
- `doctor` 沿用 D6 finding 模型
- 普通配置行保留回归测试
- `\|` 的全键解析变化作为 config-contract 扩展被明确声明、测试并记录于 CHANGELOG

## 维度 6：target lineage 是否声明且符合仓库现实

结论：通过。

`target lineage: main（v4 产品线；不合并 v1/v3）` 与当前仓库主线及 `4.0.7` 产品现实一致。

## 新正式问题检查

未发现新正式问题。v4 只修正了模板和文档的术语契约，没有扩大公共接口、改变错误分类或引入新的不可测试行为。

## Advisories（不计入 verdict）

### ADV-1：AC7 的禁止性断言宜采用语义检查

“不得含混淆表述”不宜只 grep 一个固定中文短语。建议测试至少覆盖 EN/CN 模板及文档中的关键 token 组合，或断言规范说明完整存在；这样可避免同义改写重新引入混淆却绕过单一字符串检查。

### ADV-2：台账 REQ-1 行存在多余表格单元格

当前 `issues.md` 的 REQ-1 行在 `verified` 后还有 `反转义+spec/KB同步`，使其比表头多一列。该问题不影响需求正确性或本轮 verdict，但后续维护台账时宜把说明并入 Status 单元格或删除。

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-8 | B6 模板文案“字面 pipe 写 `\|`”与 B5 语义冲突：`\|` 经解析产出裸 `|`（alternation），非 regex literal pipe。 | 用户或 AI 照模板会得到与文字承诺相反的正则，扩大匹配范围。 | STEP0·r3 | verified |

VERDICT: no major issues
