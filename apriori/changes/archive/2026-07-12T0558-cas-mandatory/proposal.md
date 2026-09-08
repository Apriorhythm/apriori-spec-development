# Proposal — cas-mandatory

**为什么**:①archive 对无 stamp mutation 仅警告仍写入,与"4.0 起强制"的书面承诺自相矛盾(已复现覆盖);②status 归档后失明且无路径保护(已复现);③doctor/update 对 3.x 旧布局沉默,升级即混合布局;④homepage 指 v3。全是事实层对齐(外部评审 P0-2 前半/P1-6/P0-3 检测部/P1-8 部分)。

**做什么**:archive 双形式硬拒无 stamp mutation(--no-cas/config 可见豁免);status 复用共享 resolver + 文件级 containment + stage 输出;doctor D8 + update 警告检测五个旧根;homepage → v4;runbook CAS 措辞改现在时;MIGRATING 补 4.0 检测小节。

**不做什么**:完整 migrate 命令、archive 锁、transition engine 等(owner 既有裁决,见 req-final 非目标)。

**规模**:medium。四个小表面,互不纠缠。
