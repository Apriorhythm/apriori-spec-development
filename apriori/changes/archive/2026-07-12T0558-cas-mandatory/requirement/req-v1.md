# 需求:cas-mandatory —— CAS 兑现 4.0 承诺 + 三个对齐小面 (v1)

> change: `cas-mandatory` · tier: medium · track: harden
> lineage: v4 分支;不合并到 main/v1/v3
> 来源:GPT-5.6 对 4.0.0 的外部评审 P0-2(前半)、P1-6、P1-8(homepage)、P0-3(检测部分),均已复现或确认。

## 目标

四个"事实层"对齐,一个变更收口:①archive 兑现"4.0 起 stamp 强制"的书面承诺;②status 学会看归档变更并获得路径保护;③doctor/update 对 3.x 旧布局不再沉默;④homepage 指向 v4。

## 行为需求

### 1. archive 硬拒无 stamp 的 mutation delta(P0-2 前半)

- 现状:无 stamp 的 MODIFIED/REMOVED/RENAMED 仅警告仍写入(exit 0 覆盖 store,已复现);警告文案自称"stamps become mandatory in 4.0"——自相矛盾。
- **两种 archive 形式**(`--change` 高层与 `--store/--delta` 单文件)对 mutation 操作数 > 0 且无 stamp 的 delta:**报错 exit 1,任何东西都不写**(preflight 级,先于一切 stage/commit),错误点名 delta 文件并给 stamp cure(`apriori stamp <store-file>`)。
- **可见豁免**(复用 gate C7 的既有词汇):archive CLI 新增 `--no-cas` flag,或 `apriori/process-config.md` 的 `| cas | optional |` 行(flag 优先)→ 降级为既有警告行为(写入 + WARN)。豁免生效时输出必须可见说明(哪个豁免源)。
- ADDED-only delta(mutation 操作数 = 0)不受影响,照旧无需 stamp。
- `verify --change` 保持现状(投影只读,警告即可);gate C7 行为不变。
- RUNBOOK 双语中"stamps become mandatory in 4.0 / 4.0 起强制"措辞改为现在时(4.x 已强制,豁免途径点名)。

### 2. status 归档解析 + 路径保护(P1-6)

- 现状:`status --change <name>` 只读 active 路径,归档后报 "no flow-state file found" exit 0;无名称校验与 containment,symlink 可读工作区外文件(已复现前半)。
- **复用 gate 的 `resolveChange()`**(名称正则 + realpath containment + archived stamp-dir 解析):active 优先,其次 archive 最新 stamp;读该 bundle 的 flow-state 与 `review/issues.md`。
- 输出增加 `stage: in-flight|archived`(与 gate 同词);`--json` 增加 `stage` 与 `path`。
- 名称非法、不存在、越界(symlink 逃逸)→ **exit 2** 并给具名错误;`status`(无参列表)行为不变。

### 3. doctor/update 旧布局检测(P0-3 的检测部分,不做迁移器)

- **doctor 新检查 D8**:发现任一 3.x 旧布局根——`apriori/review/`、`apriori/design/`、`apriori/explore/`、顶层 `requirement/`(目录)——→ finding,列出命中的根,fix 指向迁移指引(MIGRATING.md 的 4.0 小节,本变更补一节"检测到旧布局怎么办"的手动迁移步骤;完整 migrate 命令明确不在本变更范围)。
- **update**:同样检测,命中时打印警告(不阻断更新本身)——update 刷协议文件后 agent 读到 4.0 协议而产物还在旧根,必须有人看见这件事。
- 全部检测只 lstat/existsSync,零写入;symlink 形态的"根"按存在处理(检测不跟随)。

### 4. homepage(P1-8 部分)

- `package.json` homepage `tree/v3#readme` → `tree/v4#readme`。

## 非目标(及理由)

- 完整 `apriori migrate` 事务化命令:等第一个外部用户/pilot(owner 既有裁决)。
- archive 仓库级锁 / 提交阶段 fingerprint 重读(P0-2 后半):单操作者 + §4.11 协议串行,挂条件缓修。
- transition engine / review matrix / artifact hash 绑定 / 事务 journal:owner 2026-07-12 裁决维持(不固定化)。
- GitHub 默认分支切换:owner 裁决维持。

## 约束

- 零依赖;既有测试不回归;status 的 resolver 复用而非复制(gate 导出或共享模块)。
- 双语文档同步(runbook CAS 措辞、MIGRATING 4.0 检测小节)。

## 开放问题

- 无。
