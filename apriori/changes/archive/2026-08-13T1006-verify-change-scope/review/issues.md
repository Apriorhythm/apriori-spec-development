# Issue ledger — verify-change-scope

<!-- recorded on behalf of the reviewer (codex read-only sandbox), R2 transcription rule; raws: review/*-raw.txt -->

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | `RENAMED` 被写成产生新场景 ID，与现有 Requirement-only rename 语法冲突 | high | 1 | verified |
| REQ-2 | change scope 缺少 scenario occurrence provenance，duplicate/unidentified 边界及 idempotent operation 未定义 | high | 1 | verified |
| REQ-3 | store report 未声明 `BOUND-RED`、duplicate、`UNIDENTIFIED`，会丢失范围外问题 | high | 1 | verified |
| REQ-4 | human、JSON、module API 与 gate summary 的目标 shape 未定，Q1 仍开放 | high | 1 | verified |
| REQ-5 | 范围外失败导致 non-zero exec 时的 exit 规则未定，并与 D-SR-x 冲突 | high | 1 | verified |
| REQ-6 | 空 change scope、removal-only 和全 projection 零场景的 verdict 未定义 | medium | 1 | verified |
| REQ-7 | 两视角是否共享一次 projection/TAP/test invocation 未声明，存在新增副作用与并发不一致风险 | high | 1 | verified |
| REQ-8 | 合法 RENAMED+MODIFIED 组合无法用单值 operation 表达，provenance 不确定。 | med | STEP0·r3 | verified |
| REQ-ADV-1 | Advisory batch acknowledged (r2-r4 各advisory：gate store summary 六类计数建议——采纳进 spec；runbook-version 4.0 保持合理——确认；其余展示细节吸收进 AC)。 | — | STEP0·r4 | advisory-acked |
| SPEC-1 | `unattributed` 与 failing true-orphan 无 provenance，不能证明在 change scope 外；当前规则可在真实测试失败时 false GREEN。 | high | STEP2·r1 | verified |
| SPEC-2 | scopeOps 二次读取 delta，使 projection 与 scope provenance 来自不同 filesystem snapshot，并扩大 TOCTOU 窗口。 | high | STEP2·r1 | verified |
| SPEC-3 | full-projection title matcher 单批复用没有调用次数 oracle；现有 `call >= 2` 会放过第三次 scoped matcher child。 | med | STEP2·r1 | verified |
| SPEC-4 | `--specs` byte-identical 是明确兼容保证，但测试计划没有完整 stdout/stderr/JSON byte golden。 | high | STEP2·r1 | verified |
| SPEC-5 | req-final 规定四项 slash gate suffix，SPEC/design 规定六项 labeled suffix，机器 detail 契约冲突。 | med | STEP2·r1 | verified |
| SPEC-ADV-1 | Advisory batch acknowledged (2 items: 归档前把修正案折叠回原条款——记为 STEP6 note；tasks 点名新增保障——实现时落实)。 | — | STEP2·r3 | advisory-acked |
| SPEC-6 | STEP5 实现中发现：无兄弟归因时 GT-26 独立变绿与 SPEC-1 fail-closed 相互矛盾（并行 change 的红测试在本投影中是 failing orphan）。 | high | STEP5·r0(producer) | verified |
| IMPL-1 | sibling attribution 接受 malformed、conflicting、REMOVED/非 scope 标题并可 false GREEN | high | STEP5·r1 | verified |
| IMPL-2 | sibling scan 缺少 containment/type guard，且 unreadable 分支 silently skip | high | STEP5·r1 | verified |
| IMPL-3 | human store report 未输出六类完整清单 | medium | STEP5·r1 | verified |
| IMPL-4 | cross-boundary scoped duplicate 的 `files` 不完整 | medium | STEP5·r1 | verified |
| IMPL-5 | SR-63/SR-64/GT guarantees 缺少所承诺的完整 adversarial oracle | medium | STEP5·r1 | verified |
| IMPL-6 | RUNBOOK verification matrix 未补两视角，且 active/sibling 口径不一致 | low | STEP5·r1 | verified |
| VCS-ADV-1 | Advisory batch acknowledged (P8 各轮：未用 stamp 变量清理建议、basename 歧义展示（传统一致）、read-only 沙箱动态测试以 producer evidence 采信声明)。 | — | STEP5·r4 | advisory-acked |
