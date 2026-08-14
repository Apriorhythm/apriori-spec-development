# CI 接入

三个确定性命令可直接挂进任意 CI。退出码即契约:0 = 放行,1 = 需要人看一眼的缺口,2 = 这次运行本身不可信(按失败处理,但要读消息——它通常指向环境问题而非代码问题)。

## check —— PR 闸口

规格库结构一致性:每条 scenario 都带可绑定 ID。开销小;每个 PR 都跑。

```yaml
- name: apriori check
  run: npx apriori-cli check
```

## verify —— 合并后的绑定闸口

living 规格库里每条 scenario 都有绿测试、无孤儿。跑你自己的测试命令;必须输出 TAP(node 加 `--test-reporter=tap`)。

```yaml
- name: apriori verify
  run: npx apriori-cli verify --specs apriori/specs --test-cmd "node --test --test-reporter=tap"
```

## gate —— 按在途变更

把一个变更的机械退出条件合成一个退出码:阶段感知的绑定 verify、tasks 全勾、flow-state 合法、台账干净、verdict↔raw 证据、KB 新鲜度。`PASS` 只覆盖机械面——人工闸口仍归人。

```yaml
- name: apriori gate
  run: npx apriori-cli gate --change ${{ inputs.change }} --test-cmd "node --test --test-reporter=tap" --json
```

## 退出码速查表

| 码 | check | verify | gate |
|---|---|---|---|
| 0 | PASS | GREEN | PASS(机械面) |
| 1 | FAIL(n) | 缺口:unbound/red/orphan/重复 | BLOCKED(n) |
| 2 | 规格库路径缺失 | 运行不可信(非 TAP、崩溃、冲突、CAS) | 评估不可信 |
| 3 | — | — | INCOMPLETE — 能跑的检查都过了,但至少一项被跳过(没有测试命令 → C1 跑不了)。按"未通过"对待。

接入新 runner?`npx apriori-cli doctor --no-run` 不执行你的测试命令就能体检整条接缝。
