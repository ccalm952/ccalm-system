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

## 服务器部署流程（Ubuntu + Nginx + PM2）

以下为单机部署示例：前端静态资源由 Nginx 托管，后端 NestJS 用 PM2 守护，PostgreSQL 可本机或独立数据库实例。

### 1) 服务器准备

```bash
sudo apt update
sudo apt install -y git curl nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pnpm pm2
```

确认版本：

```bash
node -v
pnpm -v
pm2 -v
```

### 2) 拉取项目并安装依赖

```bash
cd /srv
sudo mkdir -p shadcn && sudo chown -R $USER:$USER shadcn
cd shadcn
git clone <你的仓库地址> .
pnpm install
cd backend && pnpm install && cd ..
```

### 3) 配置生产环境变量

后端：`backend/.env`

```env
PORT=3000
DATABASE_URL="postgresql://postgres:<数据库密码>@<数据库地址>:5432/attendance?schema=public"
JWT_SECRET="<替换为高强度随机字符串>"
```

前端：根目录 `.env.production`

```env
VITE_API_BASE=https://<你的域名>/api
VITE_AMAP_KEY=
VITE_AMAP_SECURITY_JS_CODE=
```

### 4) 数据库迁移（生产）

```bash
cd /srv/shadcn/backend
pnpm exec prisma generate
pnpm exec prisma migrate deploy
```

首次部署请确保数据库里至少有 1 个 `role=admin` 的用户（可用 Prisma Studio、SQL 或 seed 脚本初始化）。

### 5) 构建前后端

```bash
cd /srv/shadcn
pnpm build
cd backend
pnpm run build
```

- 前端产物目录：`dist`
- 后端产物入口：`backend/dist/main.js`

### 6) 用 PM2 启动后端

```bash
cd /srv/shadcn/backend
pm2 start dist/main.js --name shadcn-backend
pm2 save
pm2 startup
```

查看状态与日志：

```bash
pm2 status
pm2 logs shadcn-backend
```

### 7) 配置 Nginx（前端 + /api 反代）

新建配置文件：

```bash
sudo nano /etc/nginx/sites-available/shadcn
```

写入以下内容（把 `your.domain.com` 换成你的域名）：

```nginx
server {
  listen 80;
  server_name your.domain.com;

  root /srv/shadcn/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:3000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

启用并重载：

```bash
sudo ln -s /etc/nginx/sites-available/shadcn /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8) HTTPS（推荐）

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your.domain.com
```

### 9) 更新发布流程

```bash
cd /srv/shadcn
git pull
pnpm install
cd backend && pnpm install && pnpm exec prisma migrate deploy && pnpm run build && cd ..
pnpm build
pm2 restart shadcn-backend
sudo systemctl reload nginx
```

### 10) 常见排查

- 后端起不来：先看 `pm2 logs shadcn-backend`，重点检查 `DATABASE_URL`、`JWT_SECRET`。
- 前端页面空白：确认 `dist` 是否更新、Nginx `root` 路径是否正确。
- 接口 404：检查 Nginx `location /api/` 转发和后端全局前缀 `/api` 是否一致。
