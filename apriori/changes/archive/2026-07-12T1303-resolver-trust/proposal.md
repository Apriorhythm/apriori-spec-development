# Proposal — resolver-trust

**为什么**:resolver 验证了终点却没验证信任根、目录项形态与语义名称——四条完整 gate PASS 绕过(archive 根外链、悬空 active 回退、保留名 archive、伪时间戳)全部由此而来(四审 P0-3/P0-4)。

**做什么**:三类对象 fail-closed(信任根 lstat、active/archived 候选任何 symlink 皆结构错误、Gregorian round-trip stamp)、validateChangeName 单一来源(kind 分类,保留名全表面拒绝)、fileReadDefect 结构化 kind、status 身份校验;D 批 riders(MIGRATING 进 npm files + 双指消息、AM-25 收窄、doctor 头部 D1-D8/Node22)。

**不做什么**:archive 锁、无关 archive 条目治理(doctor/check 业务)。

**规模**:medium。lib/resolve.js 强化 + 多表面接线 + 命令级回归矩阵。
