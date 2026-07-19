<p align="center">
  Languages:
  <a href="./README.md">English</a> ·
  <a href="./README_cn.md">中文</a>
</p>

# 规格驱动开发实战手册

## What is this & how to use it

**apriori** 是一套面向 AI 编程的规格驱动工作流,外加一个零依赖 CLI(`apriori-cli`),让你的规格**可执行**:每条 scenario 都绑定到一个测试,"写了规格没实现"由一条命令抓出来,而不是靠肉眼看 diff。你驱动 AI agent 走一个状态机——精化规格、由*另一个*模型对抗评审、实现、归档——在真正要紧的人工闸口停下。

人类从下面的 Quickstart 开始;AI agent 读自包含的 [RUNBOOK_cn.md](./RUNBOOK_cn.md),不需要本手册。apriori **用你书写的语言干活**(想固定语言就 `apriori init --language 中文`)。

<p align="center">
  <img src="docs/demo.gif" alt="apriori CLI 循环:verify 报 GAPS(红),绑定到场景的测试让它变 GREEN,gate PASS,archive 归档" width="820">
  <br><sub><b>规格 → 红 → 绿 → gate → 归档。</b> 每个场景没绑定到通过的测试,<code>verify</code> 就不给绿——一句“搞定了”的假绿由命令抓出来,而不是靠肉眼看 diff。<br><i>(CLI 输出按设计恒为英文,中英文档共用此图。)</i></sub>
</p>

## Quickstart

apriori 天生就是**让 AI agent 来驱动**的——你说话,它跑循环,你在闸口点头。**路线 A** 是你实际会怎么用;**路线 B** 把同一个循环手敲一遍,让你看清(并信任)agent 替你下的每一条命令。需要 Node ≥ 22 和 POSIX shell。

### 路线 A —— 你实际会怎么用它(Claude Code)

<p align="center">
  <img src="docs/onboard-goal-demo-cn.gif" alt="Claude Code 全流程:装 apriori、apriori init 选 Claude Code、/apriori 造一个命令行加法器、/goal 自动跑完整条 apriori 流水线并归档,最后运行生成的工具" width="880">
  <br><sub>真实录制(等待已剪):<code>npm i</code> → <code>apriori init</code>(选 Claude Code)→ <code>/apriori</code> 提一个小需求 → <code>/goal</code> 自动跑完 规格→评审→实现→verify→gate→归档,只在唯一的人工闸口停下等你点头,最后你亲手运行它造出来的工具。你只需说要什么、点一次头。</sub>
</p>

先装一次(`npm i -g apriori-cli`),然后在你的项目里跑 `apriori init`。它会问你要接哪些 AI 工具——用方向键选 **Claude Code**(↑/↓ 移动,空格勾选,enter 确认):

```text
  Select AI tools  (↑/↓ move · space toggle · a all · enter confirm):
❯ ◉ Claude Code
  ◯ Codex
  ◯ Cursor
  ◯ GitHub Copilot
  ◯ OpenCode
  ◯ Windsurf
  selected: Claude Code
```

它会预览要写哪些文件,问 `Proceed? (Y/n)`,然后搭好 `apriori/`,并给 Claude Code 写两个指针:一份 `CLAUDE.md` 规则和一个 `/apriori` 斜杠命令。现在启动 Claude Code(`claude`),用大白话驱动它:

- **想法还模糊** → 直接敲 `/apriori`(不带参数)。它先和你脑暴——追问你没想到的边界问题——**在你点头前什么都不落盘**。
- **变更已清楚** → 敲 `/apriori add-reopen`(任意变更名)。agent 读 runbook,在后台跑 `apriori new` / `verify` / `gate` / `archive`,拉一个*不同的*模型做对抗评审,并**在每个人工闸口停下来**汇报、等你点头。

你只做两件事:**说出你要什么,在闸口点头**——你从不手写规格文件或状态文件。(同一套协议在 Codex / Cursor / Windsurf / Copilot 里一样跑;`init --tools <工具>` 只是给每个工具写各自的指针。)

### 路线 B —— 看看引擎(手敲一遍这个循环)

路线 A 的 agent 跑的正是下面这些命令。自己手敲一遍——十分钟,从空目录到规格绑定的绿——是信任 agent 所作所为的最快方式,而且它是确定性路径,每个输出都可核对。

```shell
npm i -g apriori-cli
mkdir hello-apriori && cd hello-apriori
apriori init --tools claude --test-cmd "node --test --test-reporter=tap" --yes
apriori doctor --no-run
```

这里的 `init` 用了 `--tools claude --yes`——就是路线 A 那个菜单的非交互形式(方便脚本和 CI);`doctor` 确认接缝健康(预期 `DOCTOR: HEALTHY`,退出码 0)。

```shell
apriori new hello
cat > apriori/changes/hello/flow-state.md <<'EOF'
change: hello
tier: trivial
track: harden
track-rationale: quickstart demo
lineage: main
current-step: STEP5
round: 0
next-action: verify, then archive
gates:
  - 2026-01-01T00:00 note: quickstart demo
EOF
mkdir -p apriori/changes/hello/specs/hello
cat > apriori/changes/hello/specs/hello/spec.md <<'EOF'
## ADDED Requirements

### Requirement: greeting
The module SHALL greet by name.

#### Scenario: HL-01 greets by name
- WHEN greet('World') is called
- THEN it returns 'Hello, World'
EOF
apriori verify --change hello
```

每个变更带一个小状态文件(`flow-state.md`——tier 决定流程规模;通常由 agent 替你维护)和它的增量规格。`verify --change` 对**投影**规格库(本变更合并后规格库的样子)做绑定。一条 scenario、零测试 → `RESULT: GAPS`,退出码 1。fail-closed 正是要点。现在把它变绿:

```shell
mkdir -p test
cat > hello.js <<'EOF'
module.exports = { greet: (name) => `Hello, ${name}` };
EOF
cat > test/hello.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert');
const { greet } = require('../hello');
test('HL-01 greets by name', () => assert.strictEqual(greet('World'), 'Hello, World'));
EOF
apriori verify --change hello
```

测试名携带 scenario ID——绑定契约就这一条。预期 `RESULT: GREEN — spec is the test suite`,退出码 0。

```shell
apriori gate --change hello --json
apriori archive --change hello --write --changes-dir apriori/changes
apriori verify --specs apriori/specs
apriori check
```

`gate` 把机械检查合成一个退出码(它的 PASS 绝不替代人工闸口)。`archive --change` 把增量并入 living 规格库 `apriori/specs/` 并归档变更;普通 `verify` 现在证明合并后的库,`check` 是 CI 守卫。这正是路线 A 替你自动跑的循环:**规格 → 红 → 绿 → gate → 归档**。

## Where everything else lives

| 文档 | 内容 |
|---|---|
| [docs/concepts_cn.md](./docs/concepts_cn.md) | 为什么这么设计:核心概念、AI 工具箱、完整 STEP0–STEP6 工作流、mini-kv 实例、提示词库 |
| [docs/legacy_cn.md](./docs/legacy_cn.md) | 存量代码库:知识库循环、doctor 先行的接入法 |
| [docs/ci_cn.md](./docs/ci_cn.md) | 可直接粘贴的 CI 片段:`check` / `verify` / `gate`,退出码表 |
| [docs/cli_cn.md](./docs/cli_cn.md) | 全部十个子命令:精确用法行、旗标、退出码、配置参考 |
| [docs/troubleshooting_cn.md](./docs/troubleshooting_cn.md) | 每类 doctor 发现与经典陷阱,各配修法 |
| [RUNBOOK_cn.md](./RUNBOOK_cn.md) | 面向 agent 的可执行协议(两者不一致时以它为准) |

### Command Cheat Sheet

| `apriori` 命令 | 何时 | 用途 |
|---|---|---|
| `apriori init` | 每项目一次 | 搭建 `apriori/` + 各工具指针 |
| `apriori doctor` | 接入时/任何时候 | 体检项目与 apriori 的接缝;每个发现指名修复命令 |
| `apriori new <name>` | 变更启动 | 搭建 `apriori/changes/<name>/` + flow-state 骨架 |
| `apriori status` | 任何时候 | 每个变更走到哪了:步骤、下一动作、台账 open 项(`--json`) |
| `apriori verify` | STEP5 退出闸口 | 把每条 scenario ID 绑定到绿测试;`--change <name>` = 投影的、变更进行中的形式 |
| `apriori stamp <store-file>` | 写增量规格时 | 打印 CAS 基线章——库分叉后 verify/archive 会拒绝 |
| `apriori gate --change <name>` | STEP5/6、CI | 机械检查合成一个退出码(PASS ≠ 人工闸口) |
| `apriori archive` | STEP6 | 把增量规格并入 living 规格库;`--change <name>` = 整变更、失败原子(直到提交点为止) |
| `apriori check` | CI / pre-commit | 结构一致性(scenario ID 可绑定) |
| `apriori update` | CLI 升级后 | 刷新 runbook 副本 + 命令指针(绝不动你的文件) |

## Acknowledgments

本工作流建立在其上的产物接口——增量规格(`ADDED` / `MODIFIED` / `REMOVED`)、带稳定 ID 的 Requirement/Scenario 块、archive 合并语义、多工具 `init` 脚手架模式——直接受 **[OpenSpec](https://github.com/Fission-AI/OpenSpec/)** 启发,V1 与 V2 线曾直接使用它。V3 把该接口原生重实现为零依赖的 `apriori` CLI,不再依赖它——但接口的形状来自 OpenSpec,此谢郑重致上。
