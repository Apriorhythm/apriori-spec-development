# 需求:c6-truth-binding —— C6 的 KB 新鲜度校验不再静默失效 (v1)

> change: `c6-truth-binding` · tier: medium · track: harden
> lineage: v4;不合并 main/v1/v3
> 来源:4.0.2 双子代理实验(Opus/admin-reopen + Sonnet/kv-keys)三角度实测 gate C6 在真实项目上静默失效;与 GPT-5.6 四审前 P2「C6 硬编码 lib/<module>.js」同源。

## 目标

gate 的 C6(KB `source-commit` 新鲜度校验)对每个 delta 涉及的 store 模块 `m`,硬编码三处假设:①truth 文档必为 `apriori/truth/<m>.md`(同基名);②`source-commit` 必为行首裸行;③被比较的代码必为 `lib/<m>.js`。任一不成立即输出一条 `–` note 并 **continue** 跳过——KB 新鲜度对该模块**实际未被机械校验**,却不报错、不提示。在非默认布局项目(truth 文件名≠store 基名、代码在 `src/`、戳写进引用块/注释)上,C6 等于没跑。

## 现状事实(lib/gate.js 的 C6)

- `truth = apriori/truth/<m>.md`;不存在 → note "no truth doc"、continue。
- `/^source-commit:\s*(\S+)/m` 只认行首裸行;引用块 `> \`source-commit: …\``、HTML 注释、缩进、反引号包裹 → 报 "truth doc has no source-commit"、continue,无格式提示。
- `lib/<m>.js` 不存在 → note "no lib/<m>.js to compare"、continue。
- 三条 note 路径都不进 `blocked`,最终若无任何模块被真正 checked 则 C6 = n/a——静默。

## 行为需求

1. **truth 文档的可选声明字段**(向后兼容,缺省即现状):
   - `store-module: <name>[ <name>...]`(行首,truth 头部区):声明此 truth 覆盖哪些 store 模块;缺省 = 文档文件基名。
   - `source-files: <path>[ <path>...]`(行首):声明该模块的代码路径(空格分隔,仓库内 realpath 收容);缺省 = `lib/<module>.js`。
   - 两字段均只在 truth 文档**首个** `##` 标题之前的头部区识别(避免正文示例误命中)。
2. **module → truth 索引**:C6 扫描 `apriori/truth/*.md`,对每个读其 `store-module`(回退基名)建 `module → {truthPath, sourceFiles}` 映射;**两个 truth 声明同一 module → 冲突,C6 ERROR/blocked** 点名两文件(KB 不能对同一模块有两处真相)。
3. **`source-commit` 格式契约 + 诊断**:正式格式 = 行首 `source-commit: <ref>`(现状不变)。当某 truth 有映射但取不到合法裸行 `source-commit` 时,**若检测到 source-commit-looking 内容**(引用块/HTML 注释/缩进/反引号包裹的 `source-commit:`)→ note 明确指向"格式须为行首 `source-commit: <ref>`",而非泛泛的 "has no source-commit";文档写明该格式。
4. **必须校验 vs n/a 的边界**:
   - 某 store 模块**有** truth 覆盖(经声明或同名找到)**且** truth 有合法 `source-commit` → **必须**对其 `source-files` 跑 `git log <ref>..HEAD -- <source-files...>` 校验;`source-files` 中无一存在 → note 点名(不静默 pass——truth 声明了却指不到代码是坏状态,归 note 级但可见)。
   - 某 store 模块**无任何** truth 覆盖 → n/a(KB 是可选的,合法沉默)。
   - git 不可用/失败 → 现有 n/a-with-reason 不变(基础设施降级不诬告)。
5. **向后兼容(硬约束)**:无声明字段的 truth 文档回退到 module=基名、source-files=`lib/<module>.js`——**本仓库现有 truth 全部无声明字段,C6 行为字节级不变**(本仓库 C6 现为 pass/n/a 的模块保持原判)。
6. **文档**:runbook(双语)的 truth-doc/P9/P10 相关处写明 `store-module`/`source-files` 语义与 `source-commit` 行格式;两个受影响的真实布局(truth 异名、src 代码)各给一句示例。
7. **回归钉子**:三角度各一条场景——异基名 truth(`store-module` 声明后被正确校验并能 blocked)、src 布局(`source-files` 声明后 git log 对 src)、戳写进引用块(诊断 note 指向格式);外加同 module 冲突 → ERROR;外加本仓库回退不变。

## 非目标

- truth 文档的其它字段/结构改动(只加两个可选头部声明)。
- 从 truth Contract 正文自动解析代码路径(显式 `source-files` 声明,不猜)。
- C1–C5、C7 行为。

## 约束

- 零依赖;既有测试与本仓库 C6 判定不回归;新字段的解析为纯函数可单测。
- `source-files` 路径 realpath 收容仓库内(与既有 containment 一致)。

## 开放问题

- 无。
