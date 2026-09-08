# Design — resolver-trust(事实对齐)

## 现状事实
- resolveChange(lib/resolve.js):existsSync(inflight) 判 active(悬空链接=不存在→回退);readdir(archRoot) 前无 root lstat;stamp 只有 `\d{4}-\d{2}-\d{2}T\d{4}` 形状;name 校验散落(new.js 有 NAME_RE+date-prefix+reserved,resolver 只有 CHANGE_NAME_RE 且在调用方)。
- fileReadDefect 字符串返回,status 靠 `missing:` 前缀分支。
- package.json files 无 MIGRATING.md;D8/update 消息只指本地文件。

## 方案
- lib/resolve.js:`validateChangeName(name)` → {ok}|{ok:false,kind}(shape/date/reserved;new.js 改为消费它,按 kind 保留三条现文案);`resolveChange` 头部:两 root lstat(symlink/非目录/文件→{error, structural:true}),archive root containsReal(changesRoot);active 候选 lstat(任何 symlink→structural error);archived 候选 lstat + stamp `stampValid()`(捕获组→Date 构造→字段回读相等 + 时分范围)——匹配名的非法 stamp → structural error;`fileReadDefect` 改返回 {kind,path}|null,ENOENT 时在 bundle 根内向上 walk(lstat 每级:symlink/非 dir→bad-ancestor)。
- gate/status:resolver {error} 一律 exit 2(gate 现 err() 已是;status guardedResolve 已是);status 增身份校验(state.change !== 查询名 → exit 2);optional-ledger 分支改 kind==='missing'。
- archive 高层/单文件按名表面接 validateChangeName。
- riders:package.json files += MIGRATING.md;D8 fix / update 警告消息 = 本地路径 + blob URL。
- 回归矩阵(req-final)在 T4 逐条执行并记 flow-state。

## SPEC 触点
ADDED resolve 模块(RS-01..05)+ protocol(PR-23);MODIFIED status 资源需求(+ST-09)、archive-merge CAS 需求(AM-25 收窄)、doctor 头部需求(D1-D8/Node22,场景 verbatim 保留)。
