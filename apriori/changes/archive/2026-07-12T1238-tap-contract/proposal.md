# Proposal — tap-contract

**为什么**:verify 的 TAP 解析是"碰巧的子集"——接受任意版本却按残缺子集解析,四审复现了 `\#` 假绿、`bAiL OuT!` 无视、lone-CR 失败消失、流中 plan 放行、stderr 噪声误拦、dashless/SKIPPED 合法形误拦。TAP 是发布闸口的输入协议,必须按协议对待。

**做什么**:版本感知的行级词法器(封闭版本矩阵 12/13/14/absent,其余 ERROR)、TAP14 转义与指令顺序表、YAML 未闭合 fail-closed、pragma 唯一白名单、bail-out 大小写/缩进、plan 位置与编号范围、stdout/stderr 分离(行为变更,CHANGELOG 点名)、doctor D5 状态矩阵同步。

**不做什么**:TAP14 pragma/subtest 的结构化解析、YAML 内容解析。

**规模**:large。核心判定器重写 + 全形状回归 + doctor 联动。
