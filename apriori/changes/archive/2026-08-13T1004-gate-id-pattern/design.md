# design — gate-id-pattern

## 模块与依赖方向

`config.js`（零依赖）←被 spec-runner / resolve / check / doctor 依赖。为避免环：

- `DEFAULT_ID` 常量**迁至 `lib/config.js`**；`lib/spec-runner.js` 改为 `require('./config').DEFAULT_ID` 并**保持 re-export**（`module.exports` 仍含 `DEFAULT_ID`，公共 API 不变）。
- 新函数 `resolveIdPattern(cwd, flagValue)` 落在 `lib/config.js`：
  ```js
  // → { source, origin: 'flag'|'config'|'default' } | { error }
  // flag 判定用"存在性"而非 truthiness（SPEC-5）：cli 层用 ('--id-pattern' in f) 传入
  // flagValue（可为 ''），未给 flag 时传 null/undefined。空串 flag = flag 来源校验错误，
  // 绝不回退配置。错误文案唯一出口是 sanitizeMsg（见"安全契约"节）：固定类别文案 +
  // boundedSource(source)，绝不拼接引擎 e.message（SPEC-6）。
  function resolveIdPattern(cwd, flagValue) {
    if (flagValue !== null && flagValue !== undefined) {
      if (flagValue === '') return { error: 'empty --id-pattern' };
      try { new RegExp(flagValue); } catch { return { error: sanitizeMsg(`invalid --id-pattern '${boundedSource(flagValue)}' (regex does not compile)`) }; }
      return { source: flagValue, origin: 'flag' };
    }
    const { value, problem } = getConfig(cwd, 'id-pattern');
    if (problem) return { error: problem };                    // CONFLICT/读取失败文本已含 process-config
    if (value != null) {
      try { new RegExp(value); } catch { return { error: sanitizeMsg(`process-config id-pattern row is invalid: '${boundedSource(value)}' (regex does not compile)`) }; }
      return { source: value, origin: 'config' };
    }
    return { source: DEFAULT_ID, origin: 'default' };
  }
  ```

## G1 config.js：单元格切分与读取兜底

- `splitCells(line)`：逐字符扫描，`\` 后紧跟内容时计数连续反斜杠；遇 `|` 时按奇偶决定"转义入值（去掉转义者）/分隔（反斜杠全保留）"。替换 `parseConfig` 中的 `t.split('|')`。行首判定 `trimStart().startsWith('|')` 不变（行首 `|` 前无反斜杠场景不受影响）。
- `readConfig`：`readFileSync` 包 try/catch → 返回哨兵 `{ values: new Map(), conflicts: new Set(), unreadable: '<msg>' }`；`getConfig` 见 `unreadable` 即返回 `{ value:null, problem: 'apriori/process-config.md exists but cannot be read (...) — fix the file' }`（文本含 process-config）。

## G2 spec-runner.js：verify 接入

- cli：`idPattern: ('--id-pattern' in f) ? f['--id-pattern'] : null`（存在性判定，SPEC-5；不再预填 DEFAULT_ID）。※需先确认 args.js withStrict 对空值 flag 的返回形态，测试覆盖 `--id-pattern ''`。
- `verify()` 开头：`const r = resolveIdPattern(opts.cwd || '.', opts.idPattern)`；`matcher = makeIdMatcher(r)`（config→child、flag/default→inline，见安全契约节）；collect 与 parseTap 均走 matcher 批量通道；`r.error` →
  - 普通 `--specs` 模式：返回 errors-run（`errors:[r.error]`，不 collect、不 spawn）；
  - `--change` 模式（SPEC-4）：仍构造 `projection` 字段——先 `discoverDeltas`（仅目录枚举，不读内容）填 `projection.modules`，`conflicts:[]`、`unstampedMutations:[]`，再返回 errors-run；`--change --json` 的 SR-23 projection 契约保持（错误类新增但 shape 不变）。校验顺序：resolve pattern（纯内存）→（--change）discoverDeltas 枚举 → 早退；spec 内容零读取、test command 零 spawn。
  - 否则 `idRe = new RegExp(r.source)`。
- 直接调用 `verify({idPattern})` 的库调用方（gate）语义不变：传了 flag 即 flag 优先；没传走配置。
- USAGE 补一句 `(--id-pattern may be omitted when apriori/process-config.md has an id-pattern row)`。

## G3 gate.js

- flags 表 + USAGE 加 `--id-pattern`；`a.idPattern = ('--id-pattern' in f) ? f['--id-pattern'] : null`（存在性判定，SPEC-5）。
- `checkBinding(cwd, name, stage, testCmd, idPattern)`：两条 verify 调用都传 `idPattern`。resolve 错误经 `run.errors` → 既有 `b.infra` 路径 → `res.errors` + exit 2（JSON 契约自动继承）。

## G4 check.js

- `checkScenarioIds(specText, name, idPattern = DEFAULT_ID)`：保留兼容签名（inline 判定用 `leadId` 语义）；cli 的 CK-04 主路径改走共享 matcher 抽象（config 来源→child 批量；错误/失败→`error:`+`RESULT: ERROR` exit 2），保证与 verify/doctor 同一执行通道。
- cli：CK-04 前 `const r = resolveIdPattern(root, null)`；`r.error` → `console.error('error: '+r.error)` + `RESULT: ERROR` + return 2（复用 store-missing 通道）；否则传 `r.source`。
- 依赖新增：check → spec-runner（leadId）。无环（spec-runner 不 require check）。

## G5 doctor.js

- **顺序（SPEC-3）**：`runDoctor` 在 D5 之前先 `const idp = resolveIdPattern(cwd, null)` 并缓存。`idp.error` 时：D5 push `{id:'D5', status:'n/a', detail:'probe skipped (invalid id-pattern config)'}`（test command 不 spawn），D6 push finding（点名 process-config，fix: 修行）且跳过扫描。
- idp 合法时：D6 扫描经共享 matcher（config 来源→child 批量；child 失败→D6 finding + D5 sentinel 跳过，DR-18）；D5 照旧跑（classifyProbe 内部解析保持 DEFAULT_ID——对计数不敏感，KB 注明）；D6 detail 尾缀 `(id-pattern: config)` / `(id-pattern: default)`，unidentified finding 文本用实际 source（bounded）替代硬编码 DEFAULT_ID。

## 安全契约（SPEC-2 r3 定案：config 来源匹配整体进可杀子进程）

r2 的固定电池探针被驳倒（同仓可同时投毒 pattern 与 titles 绕过电池）；64 字符上限被驳倒（破坏 leadId 公共契约与自家范围声明，且不解 SPEC-2）——两者撤销。定案 = 评审员方案 2 的轻量形态：

- **flag 来源 = 操作者交互输入**：仅编译校验，匹配在进程内（文档声明信任假设）。leadId 公共语义对一切来源不动。
- **config 来源 = CI 自动消费的仓库输入**：**每次实际应用都在可终止子进程内执行**。
  - **子进程协议（SPEC-7）**：固定脚本 `lib/id-match-child.js` 随 CLI 发布（绝不 `-e` 插值外部 source）；`spawnSync(process.execPath, [childPath], { input: JSON.stringify({pattern, texts}), timeout: 2000, killSignal: 'SIGKILL', shell: false, encoding: 'utf8', maxBuffer: 8*1024*1024 })`；pattern 与文本批一律走 **stdin 数据通道**（无 argv 长度/前导 dash/注入问题）；子进程对每条 text 执行 leadId 并输出 JSON `{ids:[...]}` 到 stdout。
  - **失败分类全 fail-closed**：timeout（SIGKILL）、spawn error、signal、非零 exit、stdout 非合法 JSON/形状不符——一律折算为 config 来源净化错误：verify/gate/check exit 2、doctor D6 finding（各命令走既有矩阵；GT-25/CK-16/DR-18/SR-54 断言）。
  - **两个批次**：场景标题批在 test command **之前**匹配（失败即早退，命令不 spawn）；TAP 描述批在命令产出后匹配（该文本来自项目自己的 test-cmd——能投毒 TAP 者已能执行任意命令，威胁模型注明）。
  - doctor 执行序：resolve + D6 扫描（子进程）先于 D5；任一失败 → D5 = n/a sentinel 语义（DR-17/18）；报告显示顺序不变。
- **共享匹配抽象（SPEC-2 r4 贯穿）**：
  ```text
  makeIdMatcher(resolved) → matcher    ← 归属 lib/spec-runner.js 并导出（leadId/collect/parseTap 的持有者；check/doctor 已依赖它，无环）
    resolved.origin === 'config' → child 模式（经 lib/id-match-child.js）
    'flag' / 'default'           → inline 模式（进程内 leadId）
  matcher.batch(texts: string[]) → { ids: (string|null)[] } | { failure: '<class>: <detail>' }
  ```
  - **成功响应的唯一合法形状**：child stdout 是单个 JSON 文档 `{ids:[...]}`，`ids.length === texts.length`，每项为 `string | null`；任何偏离（多文档、长度不符、元素类型不符）= `malformed-output` failure。失败类枚举：`timeout` / `spawn-error` / `signal` / `non-zero-exit` / `malformed-output`（maxBuffer 超限表现为 spawn error 或截断→malformed，两者均已覆盖）。
  - **测试 seam**：child 模式的 spawn 封装为可注入函数（`matcher._spawn` 或模块级 `_childRunner`，测试替身可模拟五类失败），SR-55 逐类断言。
  - **贯穿改造**（导出签名兼容）：`scanText` 拆为"结构收集"（收集 `(label, title)`，不做 ID 提取）+ `bindIds(pairs, matcher)`（批量匹配后重建 byId/idFiles/unidentified/duplicates）；`collectScenarios`/`collectScenariosFromTexts` 保留既有 `(targets, idRe)` 签名作为 inline 包装，新增可选 `matcher` 参数（缺省=由 idRe 构造 inline matcher）。`parseTap` 同理：lex/decode 出 points 后，描述批量匹配再分流 results/untagged/unattributedFailures；保留 `(out, idRe)` 签名 + 可选 matcher。matcher failure 上浮：verify → `run.errors.push(sanitized config-origin msg)`（标题批失败在 test command 前早退；TAP 批失败在命令后同类上浮）；gate 经 verify 继承；check → `error:` + `RESULT: ERROR` exit 2；doctor → D6 finding + D5 sentinel 语义。`leadId` 导出原样不动。
- **性能**：每次 config 来源 run 增加 1-2 个 node 子进程（~50-100ms）；flag/default 来源零开销。KB Decision 记录取舍。
- **错误消息整体净化（SPEC-6 r3 定稿，唯一实现路径）**：
  ```js
  // sanitizeMsg 是唯一出口：原始 e.message 与原始 source 绝不直接拼接
  const sanitizeMsg = (msg) => {
    const clean = msg.replace(/[\x00-\x1f\x7f]/g, '·');
    return clean.length > 200 ? clean.slice(0, 199) + '…' : clean;   // 200 含省略号
  };
  // 组装规则：固定类别文案 + boundedSource(source)，不含 e.message：
  //   flag:   sanitizeMsg(`invalid --id-pattern '${boundedSource(src)}' (regex does not compile)`)
  //   empty:  'empty --id-pattern'
  //   config: sanitizeMsg(`process-config id-pattern row is invalid: '${boundedSource(src)}' (regex does not compile)`)
  //   terminated: sanitizeMsg(`process-config id-pattern matching terminated (budget exceeded or child failure)`)
  const boundedSource = (s) => {
    const clean = s.replace(/[\x00-\x1f\x7f]/g, '·');
    return clean.length > 80 ? clean.slice(0, 79) + '…' : clean;      // 80 含省略号
  };
  ```
  测试断言：flag/config 两来源的完整输出无控制字符、总长 ≤200、原始 source 不经引擎消息二次泄漏。

## G6–G8 文档

- **模板（SPEC-1 r2 定案）**：表格单元格一律**无 pipe 散文**（解析后的单元格值无法显示单独的 `\|`，任何含 pipe 的示例文字都写不进单元格）；id-pattern 行形如 `| id-pattern | [A-Z]+-\d+ | bare JS regex source; pipe escaping: see comment below | [A-Z]+-\d+ |`；紧邻表格的 **HTML 注释**（parseConfig 非内容，零转义负担）承载完整指南：alternation 的 pipe 在单元格里写 `\|`（解析为正则裸 `|`）；匹配字面 pipe 字符写 `[\|]`（解析为 `[|]`）；禁称 `\|` 为"字面 pipe"。CF-12 对模板整表做端到端解析断言（结构 + id-pattern 值）。
- docs/cli*.md：verify/gate/check/doctor 四节 + "Configuration keys" 处补 id-pattern（优先级、错误矩阵、`\|`/`[|]` 两层语义）；EN/CN 成对。
- CHANGELOG：一条，含 `\|` 全键语义变化与 check/doctor 行为变化声明。

## 测试布局（G9/G10）

- `test/config.test.js`：CF-08..CF-12（真值表逐行、回归样本、EISDIR 兜底、模板静态断言含正反两个 grep）。
- `test/spec-runner.test.js`：SR-50..55（fixture：3 场景 spec + `printf` TAP 桩；SR-55 表驱动五类 child 失败 + success shape + inline origins）。
- `test/gate.test.js`：GT-22..25（复用既有 gate fixture 工厂；in-flight+archived 两 stage）。
- `test/check.test.js`：CK-13..16；CK-14 一致性表驱动（两消费点同表断言）。
- `test/doctor.test.js`：DR-16..18。
- 测试名一律携带场景 ID（`test('CF-08 …')`）。

## 端到端与样本证据（STEP5 收尾）

- `~/terra/p0-gate-id-pattern-lab/`：新 lab，`apriori init` 出的新项目 + 配置行，四命令全跑一遍。
- 样本：flag 路径原地只读跑（gate/verify）；配置路径在 `~/tmp/sample-replica` 加配置行跑；输出 + identity 存 `review/sample-evidence.md`。
