# quick-poll — 内网快速投票小工具

建投票（标题 + 2–20 个选项）→ 发链接 → 同事朋友匿名点选（单选）→ 实时结果（3 秒自动刷新，可投影）→ 管理链接一键关闭。零 npm 依赖，文件存储。

## 部署（内网机器）

```shell
node server.js            # 默认 0.0.0.0:3000
HOST=192.168.1.10 PORT=8080 node server.js   # 自定义监听
```

- 需要 Node.js ≥ 20；无需 `npm install`、无需外网、无需数据库。
- 数据存在 `data/` 下（每个投票一个 JSON 文件，永久保留）。
- **单进程运行**：并发正确性依赖进程内串行化，不要跑多实例/cluster。
- 分享链接的域名取自访问时的 Host 头——用大家都能访问到的地址（IP:端口）打开创建页即可。

## 使用

1. 打开 `http://<内网地址>:3000/`，填标题和选项，生成投票。
2. **投票链接**发到群里；**管理链接**只留给自己（丢了就没人能关闭这个投票）。
3. 结果页所有人可见、自动刷新；管理页多一个"关闭投票"按钮（幂等）。

## 开发

```shell
npm test                                  # node:test 全量（TAP）
NPMROOT=$(npm root -g) node tests/e2e/e2e.mjs   # Playwright E2E（需全局 playwright）
```

规格与流程工件见 `apriori/`（开发遵循 `apriori/runbook.md`）。
