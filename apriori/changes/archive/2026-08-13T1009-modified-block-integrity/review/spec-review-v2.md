# spec-review-v2 — modified-block-integrity

## 结论

Round 1 的五项正式问题均已闭合。修订后的 SPEC/design 与 State A 的 projection、matcher 两批契约、archive preflight、JSON presence matrix 及 bin seam 一致；未发现会导致返工或生产事故的新缺口。

## Round 1 复核

### SPEC-1：verified

trim-equal FAST PATH 已明确先于结构扫描与 `idOf`：

- 六个 diff arrays 全空；
- repaired rerun 仍贡献 equal-text pair；
- 每个 MODIFIED 始终一条 JSON entry；
- archive 在仅有 fast-path entries 时无需 matcher；
- 空 formatter 结果不进入 `out[]`，不会产生空行。

算法、JSON presence 与 human 静默规则现已一致。

### SPEC-2：verified

“before write”已唯一裁定为 output-order guarantee，不再暗示物理 stdout 发生于写入前。

报告插入点位于全部 preflight guards 之后，包括：

- hygiene/CAS/conflict/denial；
- pre-existing `.tmp-archive`；
- explicit `--changes-dir` containment。

AM-46 已覆盖新增失败路径；成功时 section 位于 RESULT 文本之前。该设计兼容 State A 的 buffered `archiveChange() → {out,err}` 模型。

### SPEC-3：verified

捕获点现有直接 module oracle：

- rename-then-modify 的 `oldBlock` deep-equal 完整 pre-rename block；
- 捕获发生在 rename key swap 前；
- `newBlock` deep-equal delta block；
- ordinary unchanged 与 stamped repaired rerun 均贡献 equal-text pair；
- `buildProjection().modifiedBlocks` 的 raw text 直接受测。

这足以阻止仅靠最终 `missingLines=[]` 掩盖错误 baseline 的实现。

### SPEC-4：verified

依赖注入接口已闭合：

```js
archiveMerge.cli(argv, deps = {})
archiveChange({ ..., idMatcherFactory })
```

factory 为 `(cwd) => matcher | {error}`，由 bin 使用 `lib/config.resolveIdPattern` 与 `spec-runner.makeIdMatcher` 惰性组装。missing factory 与 factory error 同路降级；programmatic path 也有 module oracle。`archive-merge` 不新增对 `spec-runner` 的反向依赖。

### SPEC-5：verified

共享 human formatter 已规定：

- 所有 externally-sourced fields 均先执行 C0/DEL → `·`；
- 再按 119 UTF-16 units + `…` 截断；
- title、body line、file suffix 等均有 ESC/control injection oracle；
- JSON 保留原始全文，由 `JSON.stringify` 转义。

新增 human 输出路径不再允许 C0/DEL 伪造终端或 CI 日志结构。

## P5 checklist

### 1. 场景覆盖

AM-43..47 与 SR-65..68 已覆盖：

- 八行 cardinality truth table；
- duplicate/no-ID/ordering；
- missing/reordered/repeated/whitespace lines；
- prose、closed/unclosed fence 与多空格 heading；
- rename-then-modify raw capture；
- ordinary unchanged 与 repaired rerun；
- GREEN/GAPS/ERROR/`--specs` presence matrix；
- matcher 两批与零 binding pollution；
- archive dry-run/`--write`/全部 preflight guards；
- config/default/invalid/matcher failure/missing factory；
- unsafe human fields；
- frozen live specimen deep oracle。

未发现缺少的事故级 failure/edge scenario。

### 2. 外部共享状态

无新增持久化 shared state。

- archive store：init 为首次 `--write` 创建，update 为 temp+rename 全量替换，cleanup 仍为 none。
- verify：只读 filesystem，并执行既有 test child。
- integrity report 只消费 projection snapshot，不增加 filesystem observation。

### 3. State A 与约定兼容性

- `makeThenBind` 扩展为分段返回，不增加第三次 matcher batch。
- integrity titles 不进入 binding accumulation、scenario count、`changeScope` 或 `storeReport`。
- `modifiedBlocks` 不进入既有 `projection` JSON shape。
- GREEN/GAPS 只新增契约要求的 `modifiedIntegrity`；ERROR 与 `--specs` 保持 absent。
- rename baseline、unchanged、repaired capture points 均已钉死。
- archive report 位于所有 preflight guards 之后，且不改变 exit/write bytes。
- bin seam 保持 `archive-merge → spec-runner` 反向依赖不存在。

### 4. SPEC/design 映射

SPEC 中的 engine、verify、archive、failure degradation、安全渲染和 presence rules 均有对应 design 落点；design 未引入超出 SPEC 的事故级行为。

### 5. 新外部输入安全

config-origin regex 继续经过 terminable matcher channel；archive failure warning 继续整行 `sanitizeMsg`；human report 的 repository-derived fields 先清理控制字符再截断；JSON 不执行或解释输入文本。未发现新增 fail-open 路径。

## Advisories（P0）

### SPEC-ADV-2：建议固定完整 human grammar

现有契约已足以实现，但 entry header、`titleChanged`、`ambiguous` 和 `missingLines` 的逐字模板仍主要由 golden 决定。实现红测试时先手写完整 expected output，可避免以实现产物反向生成 golden。

### SPEC-ADV-3：建议固定 missing-factory reason token

missing factory 的 warning+skip 行为已经明确，不影响正确性。建议测试再固定 reason，例如 `id-pattern resolution failed: matcher factory unavailable`，便于 programmatic consumers 稳定诊断。

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SPEC-1 | identical MODIFIED 的全空 entry 契约与无条件基数分类冲突。 | med | STEP2·r1 | verified |
| SPEC-2 | archive 缓冲输出无法满足原“写前打印”表述，且报告插入点早于部分 preflight guards。 | high | STEP2·r1 | verified |
| SPEC-3 | 场景无法证明 rename 前 raw capture 与 repaired-rerun entry。 | med | STEP2·r1 | verified |
| SPEC-4 | bin→cli→archiveChange matcher DI 接口及 missing-factory 行为未定义。 | med | STEP2·r1 | verified |
| SPEC-5 | integrity human section 缺少 external-field control-character sanitization。 | high | STEP2·r1 | verified |
| SPEC-ADV-2 | 完整 human line grammar 可在红测试中进一步固定。 | P0 | STEP2·r2 | advisory |
| SPEC-ADV-3 | missing-factory warning reason token 可进一步固定。 | P0 | STEP2·r2 | advisory |

VERDICT: no major issues, ready to proceed to execution
