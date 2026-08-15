# 📚 稍后阅读（Read It Later）

自建的「稍后阅读」链接收集工具，解决**手机上看到链接 → 保存 → 电脑上打开阅读**的问题。

- 手机上：在任意网页的**分享菜单**里选「稍后阅读」，链接即保存（PWA Web Share Target）
- 电脑上：打开网页看已保存的列表，点击跳转阅读
- 保存时**自动抓取网页标题**，支持 UTF-8 / GBK 等常见编码
- 数据存在本机 SQLite，零第三方服务，完全自控

## 功能

| 能力 | 方式 |
| --- | --- |
| 保存链接 | 手机分享菜单 / 网页手动输入 / HTTP API / 书签小工具 |
| 自动标题 | 保存时抓取 `<title>`，抓不到则回退为链接本身 |
| 列表浏览 | 全部 / 未读 / 已读 三个视图，显示域名与相对时间 |
| 标记已读 | 列表上点 ✓，可撤销（再点恢复未读） |
| 删除 | 列表上点 ✕ |
| PWA | 可安装到主屏幕，离线可打开应用壳 |
| 分享本站 | 页顶「分享」按钮，把本站入口分享给别的设备 |

## 快速开始

要求 Node.js ≥ 18.17（推荐 20+）。

```bash
npm install
npm start          # 默认监听 http://localhost:3000
# 或
PORT=8080 npm start
```

浏览器打开 `http://localhost:3000` 即可。

> 开发模式：`npm run dev`（文件变更自动重启）。
> 数据文件存放在 `data/bookmarks.db`（自动创建，已加入 .gitignore）。

## 手机保存方式

### ① Android（推荐）：PWA 分享目标

1. 用 **Chrome** 打开本站（局域网内用 `http://<电脑IP>:3000`，需保证手机能访问到；公网部署见下文）
2. 浏览器菜单 → **添加到主屏幕 / 安装应用**
3. 之后在**任意网页**（Chrome、App 内嵌浏览器均可）点 **分享**，分享面板里选择「稍后阅读」，链接就保存了

> Web Share Target 要求站点为 **HTTPS**（`localhost` 除外）。局域网/公网部署请配 HTTPS，否则分享菜单里不会出现本应用。

### ② iPhone / iPad：书签小工具（Bookmarklet）

iOS Safari 暂不支持 Web Share Target，可用书签小工具代替：

1. 先在电脑浏览器打开本站任意页，把下面这段**完整代码**收藏为书签（收藏后编辑书签地址粘贴进去）：

   ```
   javascript:location.href='<你的站点地址>/share-target?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title)
   ```

   例如站点地址是 `https://read.example.com`，则粘贴：

   ```
   javascript:location.href='https://read.example.com/share-target?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title)
   ```

2. Safari 里打开任意网页 → 点书签 → 即保存当前页
3. 配合 iCloud 同步书签，手机电脑通用

### ③ 电脑端：书签小工具

同上，把书签小工具放进浏览器书签栏，看文章时点一下即可收藏。

## HTTP API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/` | 列表页（`?filter=all\|unread\|read`） |
| `GET` | `/share-target?title=&text=&url=` | PWA 分享目标入口 |
| `POST` | `/api/bookmarks` | 保存链接，body：`{ "url": "...", "title"?: "...", "source"?: "..." }` |
| `PATCH` | `/api/bookmarks/:id/read` | 标记已读/未读，body：`{ "isRead": true\|false }` |
| `DELETE` | `/api/bookmarks/:id` | 删除 |
| `GET` | `/api/stats` | 各状态数量 |
| `GET` | `/healthz` | 健康检查 |

命令行示例：

```bash
curl -X POST http://localhost:3000/api/bookmarks \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/article","title":"可选的标题"}'

curl -X PATCH http://localhost:3000/api/bookmarks/1/read \
  -H 'Content-Type: application/json' -d '{"isRead":true}'
```

## 部署

### 本机 / 家庭局域网

```bash
npm ci && npm start
```

局域网内手机访问 `http://<电脑IP>:3000`。注意：Web Share Target 需要 HTTPS，局域网内想让 Android 分享菜单出现「稍后阅读」，可在电脑上用 Caddy / nginx 反代加自签证书（手机需信任证书），或用公网部署。

### 公网服务器（systemd 示例）

1. 准备域名并配置 HTTPS（Caddy 自动申请证书最省事，推荐）
2. 上传代码，`npm ci --omit=dev`

   ```bash
   npm ci --omit=dev
   ```

3. 用 `BASE_URL` 指定对外地址（影响页面里的链接与分享）：

   ```bash
   BASE_URL=https://read.example.com PORT=3000 node server.js
   ```

4. systemd 服务 `/etc/systemd/system/read-it-later.service`：

   ```ini
   [Unit]
   Description=Read It Later
   After=network.target

   [Service]
   WorkingDirectory=/opt/read-it-later
   ExecStart=/usr/bin/node server.js
   Restart=always
   Environment=PORT=3000
   Environment=BASE_URL=https://read.example.com

   [Install]
   WantedBy=multi-user.target
   ```

   ```bash
   sudo systemctl enable --now read-it-later
   ```

5. Caddy 反代示例（`/etc/caddy/Caddyfile`）：

   ```
   read.example.com {
       reverse_proxy 127.0.0.1:3000
   }
   ```

## 目录结构

```
├── server.js            # Express 入口与全部路由
├── db.js                # SQLite 数据层（better-sqlite3）
├── lib/
│   ├── fetch-title.js   # 网页标题抓取（内置 fetch，零额外依赖）
│   └── url-utils.js     # 从分享文本中提取链接
├── views/               # EJS 模板（列表页 / 保存成功页 / 错误页）
├── public/
│   ├── style.css        # 移动端优先样式（含深色模式）
│   ├── app.js           # 列表交互、时间相对化、SW 注册
│   ├── manifest.webmanifest  # PWA 清单 + share_target 声明
│   ├── sw.js            # Service Worker（离线壳）
│   └── icons/           # 应用图标（scripts/gen-icons.py 生成）
├── scripts/gen-icons.py # 图标生成脚本（需 Python3 + Pillow）
└── data/                # 运行时生成，SQLite 数据库
```

## 技术栈

- **Node.js + Express 4**：Web 服务
- **better-sqlite3**：SQLite 数据存储（同步 API，零配置）
- **EJS**：服务端模板
- **PWA（manifest + Service Worker + Web Share Target）**：手机分享入口

## 已知限制

- 自动抓标题只读取页面前 512KB、超时 4 秒；需要登录、JS 渲染的页面抓不到标题（会以链接本身作为标题，不影响保存）
- Web Share Target 仅 Android Chrome 等支持；iOS 请用书签小工具
- 单机单用户设计，不面向多用户与鉴权（如需对外暴露，建议加一层反向代理的 Basic Auth）
