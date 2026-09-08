# req-v3 需求复评（第 3 轮）

评审基线：

- 需求：`apriori/changes/gate-id-pattern/requirement/req-v3.md`
- 台账：`apriori/changes/gate-id-pattern/review/issues.md`
- 同前两轮知识库及 `lib/` 实现
- lineage：`main` / v4

## 维度 1：目标态 B 是否清晰且无歧义

结论：REQ-7 已关闭，但发现 1 个新的正式问题 REQ-8。

### REQ-7：已验证关闭

B5 已给出唯一的逐字符算法：

- 对每个候选 `|` 统计紧邻其前的连续反斜杠数量 `n`
- `n` 为奇数时，最后一个反斜杠作为转义符被移除，pipe 进入当前单元格
- `n` 为偶数时，pipe 作为单元格分隔符，全部反斜杠保留
- 其他反斜杠序列不做折叠或反转义

四行真值表覆盖了 `n=1..4`，AC5 要求逐行断言，并补充了 regex literal pipe 使用 `[|]` 的规范形式。因此算法、边界与测试 oracle 均已唯一，REQ-7 可以转为 `verified`。

### REQ-8：模板规定的“字面 pipe”写法与 B5 冲突

**描述**

B5 明确区分了两层语义：

- 配置源中的 `\|` 经 `parseConfig` 后变成 regex source 中的裸 `|`
- 裸 `|` 在 regex 中表示 alternation
- 若 regex 要匹配 literal pipe，规范写法必须是 `[|]`

但 B6 强制模板预置以下说明：

`裸 JS 正则源串；字面 pipe 写 \|`

在 `id-pattern` 的 regex 上下文中，“字面 pipe”通常表示要匹配字符 `|`。按照 B5 算法，用户照模板写 `\|` 后，传给 `RegExp` 的却是裸 `|`，形成 alternation，而不是 literal pipe。这与 B5 的“字面 pipe 用 `[|]`”直接冲突。

**风险**

模板是新项目最直接的配置说明。用户或 AI 按模板操作会得到与文字承诺相反的正则，可能扩大匹配范围；AC7 又要求模板必须按 B6 修改，因此实现无法同时忠实满足 B5 和 B6。

**建议修复**

将模板说明拆开表述两层含义，例如：

`裸 JS 正则源串；alternation pipe 在 Markdown 单元格中写 \|；匹配 literal pipe 写 [|]`

同步检查 `docs/cli*.md` 中“字面 pipe”的用词。AC7 应断言模板同时说明：

- 配置单元格内 alternation `|` 的编码为 `\|`
- regex literal pipe 的规范形式为 `[|]`

## 维度 2：边界与异常路径是否覆盖

结论：通过。

v3 保留了既有完整边界矩阵，并补齐了连续反斜杠：

- 配置缺失、空值、同值重复、异值冲突
- 配置不可读或错误类型
- flag 覆盖非法配置
- 非法正则的逐命令结果
- 校验发生在 spec 读取及 test command 启动之前
- `\|`、`\\|`、`\\\|`、`\\\\|` 的确定结果
- timeout、retry、concurrency、rollback 保持现状

没有发现新的未覆盖异常路径。

## 维度 3：是否存在暗示但未声明的状态变化或副作用

结论：通过。

需求继续明确四个消费点和配置文件均为只读。共享解析器的全键语义变化、模板变化、文档及 CHANGELOG 更新均已声明。非法 pattern 不得启动 test command，也避免了隐含的外部进程副作用。

## 维度 4：每条验收标准是否可测试

结论：除 REQ-8 的冲突外通过。

AC5 已将 REQ-7 转换为确定测试：

- 四个奇偶边界各有解析断言
- alternation 的解析结果及场景识别有 oracle
- `[|]` 的 literal-pipe 识别有用例
- 非 regex 键和普通配置行为有回归样本

AC1 增加了 `doctor` 来源 detail 的明确断言；AC6 增加了样本 commit、CLI 版本、完整命令、配置差异和确切计数，前轮 advisories 均已有效吸收。

REQ-8 修正后，还应为模板文案增加静态断言，避免模板再次把 Markdown escape 与 regex literal 混为一谈。

## 维度 5：是否与 state A 冲突

结论：通过。

v3 没有改变已经收口的兼容性边界：

- `leadId` 语义保持不变
- `check` 改为复用统一识别函数
- `verify`、`gate` 的 JSON shape 保持不变
- `doctor` 的配置错误仍属于 D6 finding
- `check` 不增加 flag
- 普通 `test-cmd`、`cas`、多列表格、fenced/comment 行必须保持原行为

B5 是显式声明并测试的 config-contract 扩展，不属于未声明的 state A 冲突。

## 维度 6：target lineage 是否声明且符合仓库现实

结论：通过。

`target lineage: main（v4 产品线；不合并 v1/v3）` 与当前 `main`、版本 `4.0.7` 及仓库发布历史一致。

## Advisories（不计入 verdict）

### ADV-1：真值表测试宜直接使用原始字符串构造

测试代码中的 JavaScript string literal 自身也有反斜杠转义层。建议使用 `String.raw` 或从 fixture 文件读取原始文本，并同时断言输入、解析值的字符长度，避免测试意外验证了 JS literal，而非 process-config 原文。

### ADV-2：文档应避免单独使用“转义 pipe”

建议在所有说明中固定使用以下术语：

- “Markdown/config cell escape”：`\|`
- “regex alternation”：`|`
- “regex literal pipe”：`[|]`

这能避免配置语法与正则语法的两层转义再次混淆。

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-7 | `\|` 全键解析规则未定义 pipe 前连续反斜杠的奇偶语义，也未说明如何表达最终 regex source 中的 literal pipe。 | 不同实现可能产生不同的 cell 边界和配置值，并影响 regex 与 `test-cmd` 等所有键。 | STEP0·r2 | verified |
| REQ-8 | B6 模板写“字面 pipe 写 `\|`”，但 B5 规定该输入会解析为 regex alternation；真正的 regex literal pipe 必须写 `[|]`。 | 模板会指导用户产生与承诺相反、匹配范围可能扩大的正则，且无法同时满足 B5 与 B6。 | STEP0·r3 | open |

VERDICT: 1 issues open
