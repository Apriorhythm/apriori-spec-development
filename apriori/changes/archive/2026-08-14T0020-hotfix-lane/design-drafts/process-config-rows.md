# process-config 模板新行草案（四列对齐现行模板；设计阶段）

| Field | Value | Legal range | Default |
|---|---|---|---|
| verification-profile | ui | ui / backend / fullstack / docs | (absent = undeclared; no escalation) |
| module-type-map | archive-merge: backend; spec-runner: backend | `<module>: frontend\|backend\|both` semicolon list; **module token grammar `/^[a-z0-9-]+$/`; derivation recognizes exactly two canonical shapes: `apriori/specs/<token>/spec.md` and `apriori/truth/<token>.md` (single level — nested spec paths are non-derivable → uncovered, conservative R3); specs and truth with the same token merge into one module; a derivation collision (two distinct paths yielding one token within a domain) = malformed F1**; each module at most once; empty entry / trailing semicolon / doubled separators = malformed F1; modules must be in store/truth vocabulary | (absent = no type table; declared touch fields required) |

- human-owned、agent 只读（同 test-cmd/id-pattern 语义）；pipe 转义沿现行注释规范。
- malformed（重复模块/未知类型值/词表外键/不可解析行）= F1；表存在但被触模块未覆盖 = 保守 R3。
