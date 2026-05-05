# 考勤 / 种植管理（React + Vite + NestJS）

## 本地开发（前端 + NestJS + PostgreSQL）

### 1) 启动 PostgreSQL

确保本机 PostgreSQL 已启动，且数据库已创建（例如：`attendance`）。

### 2) 启动后端（NestJS）

- 在 `backend/.env` 配置数据库与 JWT：

```
PORT=3000
DATABASE_URL="postgresql://postgres:<你的密码>@localhost:5432/attendance?schema=public"
JWT_SECRET="change_me"
```

- 初始化数据库表（开发库会按迁移创建表）：

```bash
cd backend
pnpm install
pnpm exec prisma generate
pnpm exec prisma migrate dev
pnpm run start:dev
```

首次部署需在数据库中自行插入至少一名 `role` 为 `admin` 的用户（例如用 `pnpm exec prisma studio` 或 SQL），否则无法登录后台管理人员。

### 3) 启动前端（Vite）

```bash
cd ..
pnpm install
pnpm dev
```

访问：

- 前端：`http://localhost:5173/`
- 后端：`http://localhost:3000/api`

### 4) 页面入口

- `/login`：登录
- `/`：考勤主页面
- `/users`：人员管理（仅管理员可见入口）

添加 UI 组件：`pnpm dlx shadcn@latest add <组件名>`（组件落在 `src/components/ui`）。

## 1Panel 部署流程（推荐）

推荐在 1Panel 中这样部署：PostgreSQL 用 1Panel 应用商店安装，前端由 1Panel 网站/OpenResty 托管 `dist` 静态文件，后端 NestJS 用 Node.js + PM2 守护，网站把 `/api` 反向代理到后端端口。

```mermaid
flowchart LR
  browser["浏览器"] --> site["1Panel 网站 / OpenResty"]
  site --> frontend["前端 dist 静态文件"]
  site -->|"/api 反向代理"| backend["NestJS :3000"]
  backend --> postgres["1Panel PostgreSQL"]
```

### 1) 安装 PostgreSQL

在 1Panel「应用商店」安装 PostgreSQL，创建数据库和用户，例如：

- 数据库名：`attendance`
- 用户名：`attendance`
- 密码：使用 1Panel 生成的强密码

记下 PostgreSQL 的连接地址、端口、用户名、密码。若后端直接运行在宿主机，通常可使用 `127.0.0.1` 和应用暴露端口；若 1Panel 给出了容器内服务名或映射端口，以 1Panel 页面显示为准。

### 2) 准备 Node.js、pnpm、PM2

在 1Panel「运行环境」安装 Node.js 20，或在服务器终端安装：

```bash
node -v
npm i -g pnpm pm2
pnpm -v
pm2 -v
```

### 3) 拉取项目

建议把项目放到 1Panel 网站目录之外，例如 `/opt/shadcn`：

```bash
cd /opt
git clone https://github.com/ccalm952/shadcn.git shadcn
cd shadcn
pnpm install
cd backend
pnpm install
cd ..
```

如果目录已存在，使用 `git pull` 更新即可。

### 4) 配置生产环境变量

前端生产环境：根目录 `.env`

```env
VITE_API_BASE=/api
VITE_AMAP_KEY=
VITE_AMAP_SECURITY_JS_CODE=
```

同域部署时建议使用 `VITE_API_BASE=/api`，由 1Panel 网站反向代理到后端，避免跨域配置复杂化。

后端生产环境：`backend/.env`

```env
PORT=3000
DATABASE_URL="postgresql://attendance:<数据库密码>@127.0.0.1:5432/attendance?schema=public"
JWT_SECRET="<替换为高强度随机字符串>"
```

不要提交真实 `.env`。`JWT_SECRET` 建议使用至少 32 位随机字符串。

### 5) 初始化数据库

```bash
cd /opt/shadcn/backend
pnpm exec prisma generate
pnpm exec prisma migrate deploy
```

首次部署请确保数据库里至少有 1 个 `role=admin` 的用户，否则无法登录后台管理人员。可以用 1Panel 数据库管理工具、Prisma Studio 或 SQL 初始化。

### 6) 构建前后端

```bash
cd /opt/shadcn
pnpm build
cd backend
pnpm run build
```

- 前端产物目录：`/opt/shadcn/dist`
- 后端产物入口：`/opt/shadcn/backend/dist/main.js`

### 7) 启动后端

```bash
cd /opt/shadcn/backend
pm2 start dist/main.js --name shadcn-backend
pm2 save
pm2 startup
```

查看状态和日志：

```bash
pm2 status
pm2 logs shadcn-backend
```

后端接口本机地址应为：`http://127.0.0.1:3000/api`

### 8) 配置 1Panel 网站

在 1Panel「网站」中新建站点：

- 类型：静态网站
- 主目录：`/opt/shadcn/dist`
- 运行目录：`/`
- 默认文档：`index.html`
- HTTPS：绑定域名后申请证书并开启强制 HTTPS

在站点的 OpenResty/Nginx 配置中确保前端路由回退到 `index.html`：

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

再新增 `/api` 反向代理：

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:3000/api/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

保存后在 1Panel 中重载 OpenResty。访问 `https://<你的域名>/login` 验证页面，访问 `https://<你的域名>/api/auth/me` 应返回未登录或未授权响应，而不是 404。

### 9) 更新发布流程

```bash
cd /opt/shadcn
git pull
pnpm install
cd backend
pnpm install
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm run build
cd ..
pnpm build
pm2 restart shadcn-backend
pm2 save
```

如果只改了前端，通常只需要 `pnpm build` 并重载网站；如果改了数据库 schema，必须执行 `pnpm exec prisma migrate deploy`。

### 10) 常见排查

- 后端起不来：先看 `pm2 logs shadcn-backend`，重点检查 `backend/.env`、`DATABASE_URL`、`JWT_SECRET`。
- 数据库连不上：确认 1Panel PostgreSQL 端口、账号、密码、数据库名和 `DATABASE_URL` 完全一致。
- 前端页面空白：确认 1Panel 网站主目录指向 `/opt/shadcn/dist`，并且已执行 `pnpm build`。
- 刷新子页面 404：确认网站配置里有 `try_files $uri $uri/ /index.html;`。
- 接口 404：确认 `/api/` 反向代理到 `http://127.0.0.1:3000/api/`，后端代码已设置全局前缀 `/api`。
- 登录接口跨域：同域部署时前端应使用 `VITE_API_BASE=/api`，不要写成另一个域名。
- 地图不可用：检查 `VITE_AMAP_KEY` 和 `VITE_AMAP_SECURITY_JS_CODE`，并在高德控制台配置生产域名白名单。

## 手动部署参考（Ubuntu + Nginx + PM2）

不用 1Panel 时，也可以沿用同样思路：Nginx 托管 `dist`，`/api` 反代到 `127.0.0.1:3000`，后端用 PM2 启动 `backend/dist/main.js`。
