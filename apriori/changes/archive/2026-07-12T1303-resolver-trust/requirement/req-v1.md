# 需求:resolver-trust —— 信任根、目录项与语义名称全链验证 (v1)

> change: `resolver-trust` · tier: medium · track: harden
> lineage: v4;不合并 main/v1/v3
> 来源:GPT-5.6 四审 P0-3 + P0-4 + P1-3 + P2-1 + P2-2,均已复现;附 D 批 riders(P1-4 + 文档漂移四处)。

## 目标

`resolveChange` 验证了最终 candidate 的收容,却没验证**信任根本身**(archive 根可以是指向工作区外的符号链接)、**目录项形态**(悬空 active 符号链接被 `existsSync` 当"不存在"而静默回退归档)、**语义名称**(保留名 `archive` 被当普通变更;`9999-99-99T9999` 被当合法时间戳)。四条完整 `gate PASS` 绕过由此而来。

## 行为需求

1. **信任根验证(P0-3a)**:`resolveChange` 在 readdir 之前:`apriori/changes` 与 `apriori/changes/archive` 各自 lstat——符号链接、非目录 → 结构错误;archive 根 realpath 必须收容于 changes 根之内。结构错误 → `{error}`,消费方(gate exit 2 / status exit 2)不回退不猜测。
2. **目录项形态(P0-3b)**:active 候选用 **lstat**——悬空符号链接、指向非目录、任何 lstat 可见但不可用的条目 = **结构错误**,绝不静默回退到 archive;archive 候选项同样 lstat 优先(符号链接条目 → 跳过并入 error?决策:archive 内符号链接条目一律结构错误——归档是我们自己写的,出现链接即异常)。
3. **语义名称(P0-4)**:
   - 共享 `validateChangeName(name)`(供 new/gate/status/archive 使用):形状(既有 CHANGE_NAME_RE)+ **保留名 `archive` 拒绝** + 日期前缀形拒绝(与 new.js 现规则合一,单一来源);
   - resolver 对传入名先做完整校验;`gate --change archive`/`status --change archive` → exit 2。
   - **stamp 语义校验**:归档目录名的 `YYYY-MM-DDTHHMM` 捕获分组并做范围检查(月 01-12、日 01-31、时 00-23、分 00-59);非法 stamp 目录不参与"最新"选择且记结构错误(它出现即异常)。
4. **fileReadDefect 祖先区分(P1-3)**:leaf lstat ENOENT 时向上找最近存在祖先——若途中遇到符号链接/非目录祖先 → defect(不是 missing);真正的全链不存在才算 missing。status 对悬空 `review/` 祖先因此 exit 2 而非"0 open"。
5. **status 身份校验(P2-1)**:解析出的 flow-state `change:` 与查询名不符 → exit 2 具名错误(与 gate C3 同判但在 status 层就拦)。
6. **archive 根为普通文件(P2-2)**:结构错误 exit 2,不再未捕获 ENOTDIR exit 1。
7. **D 批 riders**:
   - `MIGRATING.md` 加入 npm `files`;doctor D8 / update 警告消息附稳定 URL(`https://github.com/Apriorhythm/apriori-spec-development/blob/v4/MIGRATING.md`)与本地路径双指(P1-4);
   - 文档漂移同步:MIGRATING 旧表补一句"4.0.1 起 archive 默认拒绝"(:40 矛盾);gate spec 的"waiver 不改变 archive 行为"陈述更新;archive-merge spec AM-25 收窄为 ADDED-only;doctor spec 头部 D1–D8、Node ≥22。(前两处在 living store,走本变更 delta 的 MODIFIED;后两处同。)
8. **回归钉子**:四个复现输入(archive 根外链、悬空 active、`--change archive`、9999 stamp)全部 exit 2;正常 in-flight/archived 解析零回归(全套 GT/ST 既有场景)。

## 非目标

- archive 锁/fingerprint 重读(挂条件项,维持);
- doctor 对 D8 之外新增检查。

## 约束

- 零依赖;resolver 语义变化对既有合法仓库零影响(本仓库 + 两沙盒 + ai-company 均应照常 PASS);validateChangeName 单一来源后 new.js 行为不变。

## 开放问题

- 无。
