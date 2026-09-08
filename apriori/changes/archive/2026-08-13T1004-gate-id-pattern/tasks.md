# tasks — gate-id-pattern（STEP5 按序执行；每项完成即打 [x]）

- [x] T1 红测试：CF-08..CF-12（config 真值表/回归/不可读兜底/模板断言）——先跑出失败
- [x] T2 实现 lib/config.js：splitCells 奇偶算法、readConfig try/catch、DEFAULT_ID 迁入、resolveIdPattern + sanitizeMsg/boundedSource；新增 lib/id-match-child.js（固定子脚本）与 config 来源子进程匹配通道；CF 全绿
- [x] T3 红测试：SR-50..SR-55（含空串 flag、--change --json projection、全消息净化两来源、SR-54 pattern+titles 双投毒终止/真实 pattern 放行；SR-55 经可注入 child-runner seam 表驱动覆盖五类失败+success shape+inline origins 不触 child）
- [x] T4 实现 lib/spec-runner.js：cli 存在性传参、verify() 前置 resolve（--change 错误路径保 projection）、共享 matcher 贯穿 collect/parseTap（不得截断 title/TAP description，保持 leadId 完整输入语义）、DEFAULT_ID re-export、USAGE；SR 全绿
- [x] T5 红测试：GT-22..GT-25（GT-24 含空 flag 不回退；GT-25 终止匹配 ERROR）
- [x] T6 实现 lib/gate.js：--id-pattern flag、checkBinding 传参、USAGE；GT 全绿
- [x] T7 红测试：CK-13..CK-16（CK-16 终止匹配 ERROR）
- [x] T8 实现 lib/check.js：checkScenarioIds→leadId、CK-04 消费配置、错误通道；CK 全绿
- [x] T9 红测试：DR-16..DR-18（DR-17/18 含 sentinel 命令未执行断言）
- [x] T10 实现 lib/doctor.js：resolve 提前至 D5 前、坏配置 D5=n/a+D6 finding、D6 来源 detail、unidentified 文本用实际 source（bounded）；DR 全绿
- [x] T11 templates/process-config.md 预置行（两层语义文案）
- [x] T12 docs/cli.md + docs/cli_cn.md 同步；CHANGELOG 条目；`apriori check --self` 绿
- [x] T13 全量 npm test 绿（254+新增）；lint 无（仓库未配 linter——保持现状）
- [x] T14 ~/terra 新 lab 端到端：init 新项目 + 配置行，verify/gate/check/doctor 四命令实跑
- [x] T15 真实样本双路径对比证据 → review/sample-evidence.md（flag 原地只读；config 副本；identity+确切计数）
- [x] T16 `apriori verify --change gate-id-pattern --test-cmd "node scripts/run-tests.mjs --test-reporter=tap"` GREEN（仓库既有 npm run verify 惯例的 --change 形态）
