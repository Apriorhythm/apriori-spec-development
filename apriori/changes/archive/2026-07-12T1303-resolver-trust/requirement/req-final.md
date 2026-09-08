# 需求:resolver-trust —— 信任根、目录项与语义名称全链验证 (final = v3)

> change: `resolver-trust` · tier: medium · track: harden
> lineage: v4;不合并 main/v1/v3
> 来源:GPT-5.6 四审 P0-3 + P0-4 + P1-3 + P2-1 + P2-2,均已复现;附 D 批 riders。
> v2 修订:RT-1..6(候选级作用域、Gregorian round-trip、validator kind、结构化 defect、riders 拆类、回归矩阵)。

## 目标

`resolveChange` 验证了最终 candidate 的收容,却没验证**信任根本身**(archive 根可以是指向工作区外的符号链接)、**目录项形态**(悬空 active 符号链接被 `existsSync` 当"不存在"而静默回退归档)、**语义名称**(保留名 `archive` 被当普通变更;`9999-99-99T9999` 被当合法时间戳)。四条完整 `gate PASS` 绕过由此而来。

## 行为需求

1. **信任根验证(P0-3a)**:`resolveChange` 在 readdir 之前:`apriori/changes` 与 `apriori/changes/archive` 各自 lstat——符号链接、非目录 → 结构错误;archive 根 realpath 必须收容于 changes 根之内。结构错误 → `{error}`,消费方(gate exit 2 / status exit 2)不回退不猜测。
2. **目录项形态(P0-3b,作用域 RT-1)**:resolver 只对**三类对象** fail-closed——两个信任根、当前查询名的 active 候选、匹配 `<stamp>-<name>` 形状的 archived 候选;**无关 archive 条目 resolver 不管**(doctor/check 的业务)。作用域内:**当前查询名的 active 候选只接受 lstat 为真实目录——任何符号链接候选,无论目标存在与否/类型/是否收容,一律结构错误(RT-7)**,绝不静默回退 archive;匹配的 archived 候选是符号链接 = 同样结构错误。
3. **语义名称(P0-4)**:
   - 共享 `validateChangeName(name)` **返回机器分类**(RT-3):`{ok:true}` 或 `{ok:false, kind: 'invalid-shape'|'date-prefixed'|'reserved'}`——各 CLI 按 kind 保留**现有文案**(new 的三类消息零回归);date-prefix 覆盖 `YYYY-MM-*` 与 `YYYY-MM-DDT*` 等 date-looking 形;保留名现仅 `archive`;
   - **全部按名消费面**接入:new/gate/status + archive 的高层与单文件形式;`gate --change archive`/`status --change archive`/`archive --change archive` → exit 2/具名拒绝。
   - **stamp 语义校验(RT-2)**:捕获年月日时分,**Gregorian round-trip**——构造 Date 后逐字段回读必须相等(闰日合法,2/31、4/31、13 月非法)+ 时 00-23、分 00-59;**匹配当前查询名**的非法 stamp 目录 → 结构错误 exit 2,不得被较旧合法目录掩盖;不匹配查询名的目录照旧无关。
4. **fileReadDefect 结构化契约(P1-3 + RT-4)**:返回 `null`(安全)或 `{kind: 'missing'|'symlink'|'not-file'|'bad-ancestor'|'escape', path}`;leaf lstat ENOENT 时**仅在 bundle 根内**向上 walk 最近存在祖先——遇符号链接/非目录祖先 → `bad-ancestor`;纯缺失链才是 `missing`。消费方按 kind 判:status 的 optional ledger 仅在 `missing` 时按 0 open,其余 kind 一律 exit 2。字符串前缀判别废除。
5. **status 身份校验(P2-1)**:解析出的 flow-state `change:` 与查询名不符 → exit 2 具名错误(与 gate C3 同判但在 status 层就拦)。
6. **archive 根为普通文件(P2-2)**:结构错误 exit 2,不再未捕获 ENOTDIR exit 1。
7. **D 批 riders(RT-5 拆类)**:
   - **plain edits**:`package.json` files += `MIGRATING.md`;doctor D8/update 消息本地路径 + 稳定 URL 双指(P1-4);MIGRATING 旧表补"4.0.1 起 archive 默认拒绝"一句;
   - **store deltas(本变更 specs/ 下 MODIFIED)**:archive-merge spec 的 AM-25 收窄为 ADDED-only、doctor spec 头部 D1–D8 + Node ≥22(gate spec 的过时 waiver 句由并行的 config-contract 在其 C7 MODIFIED 中一并修正,本变更不touching同一 requirement);protocol spec ADDED 一条场景绑定"MIGRATING 在 npm files 中 + D8/update 消息带稳定 URL"。
8. **回归钉子**:四个复现输入(archive 根外链、悬空 active、`--change archive`、9999 stamp)全部 exit 2;正常 in-flight/archived 解析零回归(全套 GT/ST 既有场景)。

## 非目标

- archive 锁/fingerprint 重读(挂条件项,维持);
- doctor 对 D8 之外新增检查。

## 约束

- 零依赖;validateChangeName 单一来源后 new.js 用户可见行为不变。
- **回归验收矩阵(RT-6/RT-8,命令级)**:本仓库 `npm test`、`npm run verify`、`node bin/apriori.js check --self`;外部语料逐条执行并记 flow-state note(路径不可达 → manual-skip,绝不算自动 PASS):
  - `~/terra/fullrun-lab/v3-poll-r3`:change `results-csv`,test-cmd `node --test --test-reporter=tap`;
  - `~/terra/mini-kv`:change `kv-snapshot`,test-cmd `node --test --test-reporter=tap`;
  - `~/ai-company`:change `config-multi-env`(归档),`apriori status --change` 即可(其 test-cmd 取自其 process-config,若无则 status-only)。
  每条跑 `apriori status --change <name>` + (有 test-cmd 时)`apriori gate --change <name> --test-cmd "<cmd>"`。

## 开放问题

- 无。
