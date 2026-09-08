# tasks — verify-change-scope（STEP5 按序执行）

- [x] T1 红测试：SR-56..SR-64（test/change-scope.test.js，fixture 工厂 + JSON 四类 oracle + 单次执行 sentinel + 零范围真值表五行）
- [x] T2 实现 lib/spec-runner.js：buildChangeProjection 附 scopeOps、computeChangeScope、verdict 拆分（matcher 单次批复用）、storeReport、vacuousNote、verifyJson/formatReport 两段；SR-56..64 全绿
- [x] T3 红测试：GT-26..GT-27 + 既有 gate C1 detail 断言同步
- [x] T4 实现 lib/gate.js checkBinding detail（change-scoped 文案 + store 六类尾缀）；GT 全绿
- [x] T5 RUNBOOK.md/RUNBOOK_cn.md §4 STEP5 段 + 验证矩阵句；check --self 绿
- [x] T6 docs/cli.md/cli_cn.md verify/gate 节；CHANGELOG 三处行为变化条目
- [x] T7 全量 npm test 绿（284+新增）
- [x] T8 ~/terra 新 lab 端到端：两活 change 并行独立变绿实演
- [x] T9 副本对比证据 → review/sample-evidence.md（batch3：改前 107 场景淹没 vs 改后 change 段 9 场景 + storeReport 计数一致；identity）
- [x] T10 `apriori verify --change verify-change-scope --test-cmd "node scripts/run-tests.mjs --test-reporter=tap"` GREEN
