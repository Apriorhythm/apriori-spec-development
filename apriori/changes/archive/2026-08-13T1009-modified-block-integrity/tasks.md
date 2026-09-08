# tasks — modified-block-integrity（STEP5 按序执行）

- [x] T1 冻结 fixture：change 2 的 MODIFIED 块与 store 原块复制入 test/fixtures/modified-integrity/；人工推导 AC7 期望清单（先于任何实现）
- [x] T2 红测试：AM-43..AM-45（引擎：真值表八行表驱动、子序列各例、结构边界四例）+ SR-68（fixture 期望）
- [x] T3 实现引擎：buildProjection 增 modifiedBlocks、compareModifiedBlock、formatIntegrityHuman；AM-43..45 + SR-68 绿
- [x] T4 红测试：SR-65..SR-67（verify 面：verdict 不动、存在性矩阵、单批第 4 类 tag 零污染）
- [x] T5 实现 verify 面：pairs 第 4 类、idOf 查表、run.modifiedIntegrity、json/human；SR 全绿 + change 2 全量 oracle 仍绿
- [x] T6 红测试：AM-46..AM-47（archive 面五路径 + warning 全串 oracle + 字节不变）
- [x] T7 实现 archive 面：archiveChange 可选注入、bin 组装、warning 降级；AM 全绿
- [x] T8 docs/cli 双语 + RUNBOOK 双语一句 + CHANGELOG；check --self 绿
- [x] T9 全量 npm test 绿（基线 306+新增）；--specs byte golden 复核
- [x] T10 ~/terra 新 lab 端到端（真实 CLI 三面演示：verify 报告、archive dry-run 报告、warning 降级）
- [x] T11 样本证据 → review/sample-evidence.md（副本 batch3 的 MODIFIED delta 实跑报告 + identity）
- [x] T12 `apriori verify --change modified-block-integrity --test-cmd "node scripts/run-tests.mjs --test-reporter=tap"` GREEN
