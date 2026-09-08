# Proposal — c6-truth-binding

**为什么**:gate C6(KB 新鲜度)三处硬编码(truth 同基名 / source-commit 裸行 / lib/<m>.js)在真实项目上三角度静默失效(4.0.2 双子代理实测)——KB 新鲜度对非默认布局项目等于没跑。

**做什么**:truth 文档加两个可选头部声明(store-module / source-files)、C6 建 module→truth 索引、显式声明即完整承诺(任一 token 不可校验即 blocked)、source-commit 格式契约 + 畸形诊断;本仓库无声明 truth 回退默认、C6 判定字节不变。

**不做什么**:truth 结构其它改动、从 Contract 正文猜代码路径。

**规模**:medium。gate checkKB 重写 + gate spec MODIFY + 双语 runbook 文档一句。
