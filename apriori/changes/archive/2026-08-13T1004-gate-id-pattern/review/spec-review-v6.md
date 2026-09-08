# gate-id-pattern 规格复审 v6

## 结论

本轮未发现会导致返工或生产事故的新问题。`SPEC-7` 已真正闭环，可由 `fixed` 转为 `verified`。

## P5 复审结果

1. 场景覆盖完整：`SR-55` 通过 injectable child-runner seam 表驱动覆盖 `timeout`、`spawn-error`、`signal`、`non-zero-exit`、`malformed-output`，同时验证唯一 success shape，以及 `flag`/`default` 来源不访问 child。`GT-25`、`CK-16`、`DR-18` 覆盖各消费命令的实际接线和失败矩阵。
2. 未发现隐藏的持久化外部共享状态。child 的 stdin/stdout 和进程生命周期均为单次调用状态，超时及异常路径 fail-closed。
3. `makeIdMatcher` 明确归属并导出自 `lib/spec-runner.js`；G2、G4、G5 统一经过该抽象，且保留 `collectScenarios`、`collectScenariosFromTexts`、`parseTap` 的既有导出签名兼容性。
4. spec、design、tasks 的场景编号和实现范围已一致：`SR-50..SR-55`、`GT-22..GT-25`、`CK-13..CK-16`、`DR-16..DR-18` 均已进入测试布局和任务清单。
5. 安全契约闭合：固定 child script、`shell:false`、stdin 数据通道、`SIGKILL` budget、`maxBuffer`、严格 response shape 和五类失败处理均已声明；config 来源受隔离，operator-trusted flag 来源的剩余风险已明确记录。

## 正式问题

无新增正式问题；无 reopen。

## Advisories

当前 `review/issues.md` 仍有两处纯格式残留：`SPEC-1` status cell 中存在未转义的 `[|`，`SPEC-7` status cell 中存在未转义的 `string|null`，使两行分别被拆成额外单元格。现有 `parseLedger` 恰好按最后一列读取，未改变当前 gate 判断，因此不计正式问题；建议在转录下述 ledger delta 时使用 pipe-free wording 一并规范化。

## Ledger delta

格式同步，不改变 `SPEC-1` 状态：

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SPEC-1 | `[\|]`（正则字符类中的 pipe）含未转义表格分隔符，无法按文档原样写入 process-config；模板与 literal-pipe AC 不可实现。 | high | STEP2·r1 | verified — v3 将 pipe guidance 移至 HTML comment，CF-12 端到端断言整表；记录保留 SPEC-1 于 r2 reopened 后最终关闭。 |

`SPEC-7` 状态变更：

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SPEC-7 | child probe 的输入传递与失败分类未定义（`-e` 插值形成 injection surface；spawn、signal、non-zero exit、malformed output 无契约；三消费点缺 probe-failure 场景）。 | high | STEP2·r3 | verified — child protocol、唯一 success shape、五类失败、injectable runner seam 及共享 matcher 传播完整；T3 和 design 测试布局覆盖 SR-50..SR-55、GT-22..GT-25、CK-13..CK-16、DR-16..DR-18。 |

VERDICT: no major issues, ready to proceed to execution
