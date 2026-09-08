# gate-id-pattern STEP5 一致性评审 v3

## 评审结论

本轮逐项复验 IMPL-1、IMPL-2、IMPL-3、IMPL-9，并重新扫描全部 delta scenario、`design.md`、实现、错误分支及 hard guarantees。

接受生产环境提供的 `284/284` 与 `verify --change gate-id-pattern` GREEN 证据。本轮只读执行了所有相关 JS 文件的语法检查和 `git diff --check`，均通过。

四条待复验问题均已真正闭环，没有发现新的 spec-vs-code gap。

## 问题复验

### IMPL-1 — verified

`readConfig` 现在先执行 `readFileSync`：

- 非 `ENOENT` 错误一律形成 unreadable problem；
- `ENOENT` 后通过 `lstatSync` 区分真正不存在与仍存在的 dangling symlink；
- dangling symlink 被视为 present-but-unreadable，不再静默回退默认值。

新增 CF-11 用例同时观察 `getConfig` problem 与 verify exit 2；原有目录用例和四消费者矩阵继续覆盖 `EISDIR` 及各命令错误契约。实现符合“definite absence only”与 consumption-time fail-closed 语义。

### IMPL-2 — verified

child spawn 契约现由冻结常量定义：

```js
Object.freeze({
  timeout: 2000,
  killSignal: 'SIGKILL',
  shell: false
})
```

`defaultChildRunner` 将其直接展开进实际 `spawnSync` options。测试确定性断言三个值，真实灾难性回溯用例继续证明进程确实被终止并产生 termination error。

固定 budget、`SIGKILL` 与 `shell:false` 不再依赖宽松墙钟窗口推断。

### IMPL-3 — verified

SR-55 现在将 timeout、spawn error、signal、non-zero exit、malformed output 全部通过 `verify()` 的真实 title-batch failure path，逐类观察最终 `errors[]`：

- 命名 `process-config`；
- 无控制字符；
- 长度不超过 200；
- 400 字符的 dirty spawn detail 不会完整回漏。

doctor 的最终 D6 finding 与 check 的最终 CLI error output 也使用同一 dirty failure 注入，证明共享 `matcherFailureMsg` 确实贯穿消费者，而非仅在 matcher 单元层返回正确结果。D5 skip 与 `RESULT: ERROR` 同时被观察。

### IMPL-9 — verified

顺序 child seam 已覆盖第二次实际应用：

1. scenario-title batch 成功；
2. test command 运行并留下 marker；
3. TAP-description batch 分别注入 timeout 和 malformed output；
4. verify 通过 sanitized config-origin error fail closed。

这忠实覆盖了 config pattern 在 test command 后的第二个 matcher 分支。

SR-54 的正常对照也已改为同一个 adversarial-title store，仅替换为项目真实 multi-segment pattern；结果是普通 unidentified GAPS，且 `errors[]` 为空，证明 child 正常完成而非 matcher failure。

## 全量一致性复查

重新核对后，以下契约均有与 intent 相符的实现及测试证据：

- flag > config > default，且 flag 按 presence 判定并屏蔽坏配置；
- invalid pattern 在 spec content 和 test command 之前失败；
- `--change --json` error path 保留 projection/modules；
- config-origin 的 title 与 TAP 两批匹配均在固定 child 中执行；
- child 使用固定脚本、stdin data channel、`shell:false`、2 秒 budget 与 `SIGKILL`；
- 五类 child failure fail closed，response 严格为单键 `{ids}`；
- verify、gate、check、doctor 遵守各自错误矩阵；
- doctor 在 D5 前完成 D6 resolution/scan，坏配置或 child failure 均跳过 probe；
- 四消费者统一 `leadId` edge semantics；
- pipe parity、模板整表解析、HTML comment 指南及 EN/CN 文档一致；
- unreadable config 不抛异常、不静默按 absent/default 处理；
- continue/skip/silent-ignore 分支没有遗漏 spec 要求的用户可见结果。

## Advisories

1. `CHANGELOG.md` 仍记录 `276 tests`，而本轮证据为 `284/284`。该数字不属于 delta 的行为契约，不计正式问题；建议更新以避免发布说明漂移。

## Ledger delta

状态翻转：

| ID | Status |
|---|---|
| IMPL-1 | verified — `ENOENT` 经 `lstatSync` 区分真正缺席与 dangling symlink，CF-11 fail-closed evidence 完整（step5-review-v3）。 |
| IMPL-2 | verified — 冻结的 `CHILD_SPAWN_OPTS` 确定性约束 2000ms、`SIGKILL`、`shell:false`，并保留真实 termination evidence（step5-review-v3）。 |
| IMPL-3 | verified — 五类 failure 已穿透 verify 最终 sanitized channel，check 与 doctor 最终输出亦有 dirty failure 对抗断言（step5-review-v3）。 |
| IMPL-9 | verified — TAP-description 第二批次 timeout/malformed 均 fail closed，same-store real-pattern contrast 已忠实覆盖（step5-review-v3）。 |

Advisory batch：

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| IMPL-ADV-1 | Advisory batch acknowledged（1 item：CHANGELOG 的测试数量仍为 276，当前 suite evidence 为 284）。 | — | STEP5·r3 | advisory-acked |

无新增正式行，无 reopen。

VERDICT: no spec-vs-code gaps
