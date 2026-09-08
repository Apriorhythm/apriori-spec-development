# Proposal — config-contract

**为什么**:process-config 读取是全文首匹配 regex——fenced 示例授予 CAS 豁免、生效行反被忽略(四审 P0-2 复现)。配置是闸口输入,必须结构化。

**做什么**:共享 readConfig(fence/HTML 注释跳过、首二格取值、同值容忍/异值冲突、未闭合块惰性化),全部消费方(cas/test-cmd/language)切换,消费时点 fail-closed 矩阵,--no-cas 至上;usage 与模板可发现性。

**不做什么**:新配置格式、未消费 key 的值域校验。

**规模**:medium。一个新纯函数模块 + 消费方改线 + 全边界回归。
