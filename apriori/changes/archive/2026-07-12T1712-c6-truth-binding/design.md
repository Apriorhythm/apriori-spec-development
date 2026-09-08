# Design — c6-truth-binding(事实对齐)

## 现状事实
- lib/gate.js checkKB:modules = walk(changes/<name>/specs/) 的顶层目录名;对每个 m 硬编码 truth/<m>.md、/^source-commit:\s*(\S+)/m、lib/<m>.js;三处不成立各 continue+note(不进 blocked)。
- truth 文档:头部区(首个 ## 前)+ Contract/Decisions 节;source-commit 现为 ## Contract 之后的裸行。

## 方案
- **truth 索引**:新纯函数 parseTruthHeader(text) 提取头部区(首个 ## 之前)的 `store-module:`(空格分隔,默认文件基名)与 `source-files:`(空格分隔,默认 lib/<store-module>.js——按覆盖的 module 名,非 truth 文件基名);扫 apriori/truth/*.md 建 module→{truthPath, declaredSourceFiles|null} 映射;两 truth 声明同 module → 冲突,checkKB blocked 点名。
- **source-commit**:canonical = 全文围栏外行首 `/^source-commit:\s+(\S+)/m`(现状,本仓库裸行继续认);malformedAttempt = 围栏外任意行含 `source-commit:` 但不匹配裸形 → 格式诊断 note(四样例:引用块/HTML 注释/缩进/反引号;围栏内豁免)。
- **checkKB 循环**:对每个 touched module m:查索引找 truth(声明或同名);无 → n/a note(合法)。有 truth:取 source-commit(无合法裸行但有 attempt → 格式诊断 note;真无 → 现状 note)。有合法戳:算 source-files(声明→每 token 必须可校验:存在/常规文件**或目录**/realpath 收容/非 symlink(悬空或解析皆拒)/非 malformed,任一不可校验→blocked 点名;逃逸→blocked;回退默认 lib/<m>.js 不存在→note)。可校验集非空 → git log <ref>..HEAD -- <files...>,>0 commit → blocked。
- **兼容**:本仓库 truth 无声明字段 → module=基名、source-files=lib/<m>.js,行为字节不变。
- **文档**:runbook 双语在 truth-doc/P9 处写 store-module/source-files 语义 + source-commit 行格式,两句真实布局示例。

## SPEC 触点
gate MODIFY「gate aggregates…」requirement:正文加 C6 truth-binding 契约句,GT-10 重写为索引驱动+分级,新增 GT-18(store-module 绑定 + **同 module 冲突 block**)/GT-19(source-files token 分级 + 目录接受)/GT-20(格式诊断)/GT-21(回退字节不变);GT-01..09/11/12 verbatim。
