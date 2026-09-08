# Proposal — runbook-version-sync

**为什么**:RUNBOOK 头部自标 runbook-version 3.0,由 4.x CLI 分发/刷新却不改该串,读者困惑(4.0.2 实验摩擦点)。

**做什么**:RUNBOOK 双语头部 3.0→4.0 + 新增 CK-11(`check --self`)守 RUNBOOK 的 major 恒等于 package.json major,以后不再漂。

**不做什么**:minor 语义化、update 逻辑、其它版本串。

**规模**:medium。两行文档改 + 一个纯函数 check + check spec delta。
