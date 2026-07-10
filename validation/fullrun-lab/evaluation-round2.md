# 第二轮评估 · V3 重跑(quick-poll,alpha.10,Sonnet)

改进 #1(alpha.10)后重跑 V3 完整全流程。OpenSpec/Superpowers 不重跑,用第一轮基线对照。

## 三条 alpha.10 改进的实战兑现(全部命中)

| 改进 | 第一轮的问题 | 第二轮实证 |
|---|---|---|
| **保证声明纪律(PR-11)** | KB 承诺"成功即落盘"但无 fsync/崩溃测试——唯一真缺口 | STEP2 设计把三条硬保证各配"注入对抗条件"测试:PC-10 并发 50 票守恒、PC-11 写到一半 kill 不半写、PC-13 注入 rename 失败无假成功。gate② 时 V3 **主动**把这三条保证摆上桌要求人确认前提。缺口从"漏网"变"提前在设计闸口暴露并测试" |
| **reviewer-session 落盘(PR-12)** | 中断后 session id 只能去 ~/.codex 考古 | 本次 3 个评审会话中途掉线(provider wss 404 + 一次自己超时 SIGTERM),每次都靠 round1 记进 flow-state 的 session id resume 同一会话续跑,零代填。归档 flow-state 里 reviewer-session 字段有值 ✓ |
| **P7 UI 别盲飞(alpha.9)** | — | E2E 真渲染抓到一个单测漏掉的真 bug:分享链接 origin 写死 localhost,真机点链接连不上。绑定门全绿 ≠ 端到端能用,实证 |

## 硬数据(对照第一轮 V3)

| 维度 | 第一轮 V3 | 第二轮 V3 |
|---|---|---|
| 黑盒闯关 | 11/12(G4) | 11/12(G4) |
| codex 静态缺陷 | 3(med3) | 6(high1 med4 low1) |
| 崩溃/DoS | 无 | 无(超大体优雅、畸形 JSON 400、未崩溃) |
| 三条硬保证 | 声明了但**未测**(fsync 缺口) | **真·对抗测试**(PC-10/11/13) |
| verify / P8 | GREEN / 一次过 | GREEN / P8 一次过"no spec-vs-code gaps" |
| 规格库+KB | 有 | 有(KB Contract 带 source-commit,D1 单进程不变量来自 gate②) |

## G4 定性:不是缺口

两轮里 G4 都"FAIL"(客户端 localStorage 防重,裸 API 可灌票)。但:V3 两次都**如实向用户描述了**"换设备/清缓存/无痕就能再投",用户在知情下明确选了浏览器软限(B)。这是知情批准的产品取舍,V3 规格诚实(D3 明记"仅浏览器软限"),无过度承诺。闯关的 FAIL 是拿绝对标准衡量用户没要的防护级别。在"匿名+不登录+浏览器级"约束内,localStorage 与 cookie 强度相当(都拦不住 curl)。→ 不计为 V3 流程缺陷。

## 第二轮新暴露的轻微摩擦(LAB-NOTES,均非质量缺陷)

1. scenario ID 后缀字母被并:`PC-13b` 在 `[A-Z]+-\d+` 下并入 `PC-13`(两测试聚合、不产 orphan;设计上需注意后缀语义)。
2. advisory 的 verdict N 与规范化 formal 计数可能不一致,靠 producer 落账纠偏(评审方侧行为,难完全约束)。
3. 归档后 flow-state 随 change dir 移入 archive/,之后在新路径更新易忘。
4. spec 里写 HTML 实体转义时 markdown 会吞实体,使转义描述显得像空操作(表达介质问题,codex 坚持写 \uXXXX 是对的)。

## 判决:6 缺陷不是退步,是挖到了更深一层 → 需改进 #2

缺陷数 3→6(含 1 high),但逐条看性质,这是实验在起作用,不是 V3 变差:

**① [high] 崩溃持久性——改进 #1 半兑现,暴露下一层。** 保证声明纪律(PR-11)确实驱动 V3 加了 fsync + 故障注入测试 PC-13。但**实现和测试都差一口气**:`writeAtomic` fsync 了临时文件、却没 fsync 承载目录——原子 rename 的元数据不落盘,确认后崩溃仍可能丢已 ack 的写;而 PC-13 注入的是 rename **失败**(证明错误路径不假成功),没测 rename **成功后 kill 进程再重启**的真持久性窗口。codex 评语一针见血:"durability injection stops before rename so it does not catch the missing directory fsync post-rename crash window。" → 第一轮是"崩溃持久性根本没做",第二轮是"做了、但测错了失败模式、实现漏了 dir-fsync"。**离正确更近,但 PR-11 的措辞不够狠**:它列了 "kill-after-ack" 却被 agent 当成"注入个 rename 错误"就算覆盖了。

**② [med×2] 创建 UI 欠实现规格——P7/E2E 只走了 happy path。** create.js 静默过滤空选项(规格要求"空选项拒绝创建"这条路从 UI 根本触发不到);创建页只有 4 个固定输入框、无"加选项"控件,而规格支持 2..20 个选项——用户做不出 5 选项的投票。两条都是规格-代码缺口,P7"渲染并看"和 E2E 本该抓到,但截图/E2E 只测了 2-3 选项的顺流。**P7 的 UI 自查必须压规格边界(每个区间的 min/max、每条 UI 可达的拒绝路径),不能只截一张 happy 图。**

**③ [med×1 low×1 + robustness] 边角输入。** deadline 校验过松(null/小数/无时区串都收)、请求体无大小上限(单进程内存耗尽风险,和 OpenSpec 那个 DoS 同类但 V3 有界)、结果轮询忽略 status(关闭后不刷新到已关闭态)。V3 评审抓了 10 条正式 + SPEC-1 XSS,但漏了这几条。

**结论:改进 #2 有两条高价值、可泛化的主线**——(A) 把崩溃持久性的保证纪律收紧:durable/persisted-on-success 类保证的必需测试是 **kill-进程-after-ack-再重启-验存活**(不是注入写错误),并点名 atomic-rename 需 fsync(file)+**fsync(dir)** 这个经典漏点;(B) P7 UI 自查 + E2E 必须**驱动规格边界与 UI 可达的拒绝路径**,而非 happy path 一张图。两条都直接延伸我在第一轮加的规则。→ 做改进 #2,再重跑第三轮。这正是循环实验的意义:每轮剥出下一层。
