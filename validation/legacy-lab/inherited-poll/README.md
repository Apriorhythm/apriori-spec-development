# 快速投票

开会/群里征集意见用的小工具：建投票 → 发链接 → 匿名投票 → 实时看结果。

## 运行

    node server.js          # http://localhost:3000，局域网用本机 IP 访问
    PORT=8080 node server.js

零依赖，不需要 npm install。数据存 `data/polls.json`。

## 使用

1. 打开首页建投票（问题 + 选项，可多选、可设截止时间）
2. 把**投票链接**发到群里；**管理链接**自己收好（可关闭投票，丢了找不回）
3. 大家点开即投（匿名，浏览器标记防重复），结果实时可看

## 测试

    npm test                # 单测 + 集成（零依赖）
    npm run test:e2e        # Playwright 浏览器冒烟（需全局安装 playwright）
