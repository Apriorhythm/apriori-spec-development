# Issue ledger — c6-truth-binding

Rows recorded on behalf of the reviewer (codex session 019f4b30-68f9-7222-9b64-17f52a333b4c; raws beside their docs in this dir).

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| C6-1 | 已覆盖模块+有效戳,source-files 指向不存在时仍能 PASS/n/a(note 不进 blocked)。 | 声明的 KB 覆盖从未被机械校验却静默通过。 | STEP0·r1 | verified |
| C6-2 | source-files 语法/containment/malformed/missing/symlink 分类欠说明。 | 路径逃逸或部分范围漏检。 | STEP0·r1 | verified |
| C6-3 | source-commit-looking 诊断触发规则不够可测(缺 matcher+样例)。 | 畸形戳仍拿到模糊/不一致诊断。 | STEP0·r1 | verified |
| C6SPEC-1 | GT-19/design 未绑定显式 source-files 全部不可校验 token 类(尤 malformed/dangling)与目录接受。 | 显式覆盖仍可能部分漏检或误拒目录。 | STEP2·r1 | verified |
| C6SPEC-2 | design 默认 source-files 用 lib/<truth-basename>.js 而非 lib/<store-module>.js。 | 别名 truth 校验错文件/静默漏。 | STEP2·r1 | verified |
| C6SPEC-ADV-1 | Advisory:GT-21 回退 oracle 精确化;design 触点把冲突误标 GT-21(实为 GT-18)。 | 低。 | STEP2·r1 | advisory-acked |
| C6IMPL-1 | 显式 source-files 缺 malformed token 语法校验(绝对路径经 path.join 被吞)。 | 错误写法被当另一 repo 内路径校验,掩盖覆盖问题。 | STEP5·r1 | verified |
