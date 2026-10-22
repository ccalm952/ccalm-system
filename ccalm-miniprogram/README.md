# CCALM 考勤打卡小程序（原生微信小程序）

包含三个 Tab（打卡 / 排班 / 统计），使用自定义顶部导航与底部标签栏，支持浅色/深色主题、下拉刷新、自定义消息条与弹窗。头像、姓名、待办入口和退出登录放在打卡页，缺卡角标显示在统计 Tab。

项目已按原生小程序方式重新分层，不依赖 Vant Weapp，也不需要“构建 npm”，微信开发者工具直接编译即可。

## 配置

1. 后端 `ccalm-api/.env`：

```env
WECHAT_APPID=wxf9d517b49440cd79
WECHAT_APPSECRET=<AppSecret>
```

2. 高德 **Web服务** Key：复制 `config/local.example.js` 为 `config/local.js` 后填写（勿提交）。网页 `VITE_AMAP_KEY` 若是 JS API 类型，逆地理会 `USERKEY_PLAT_NOMATCH`。

3. 微信公众平台 request 合法域名：

- `https://www.ccalm.xyz`
- `https://restapi.amap.com`（逆地理）

## 打开项目

用微信开发者工具导入本目录（`ccalm-miniprogram`，不是上一级）。不需要执行“构建 npm”。

开发阶段可勾选「不校验合法域名」。

微信审核测试账号见仓库根目录 README「小程序审核测试账号」：账号 `test`，密码 `123456`。该账号每次进入都会先绑定再打卡。

## 目录结构

```text
ccalm-miniprogram/
├── pages/                        # 页面
│   ├── home/                     # 主壳：导航 + 三个 Tab + 底栏
│   │   ├── home.js               # 主壳逻辑
│   │   ├── home.json             # 页面配置
│   │   ├── home.wxml             # 主壳结构
│   │   └── home.wxss             # 主壳样式
│   └── login/                    # 微信登录 / 账号绑定
│       ├── login.js              # 登录逻辑
│       ├── login.json            # 页面配置
│       ├── login.wxml            # 登录结构
│       └── login.wxss            # 登录样式
├── components/                   # 自定义组件
│   ├── layout/                   # 页面骨架
│   │   ├── app-nav/              # app-nav.{js,json,wxml,wxss}
│   │   └── app-tab-bar/          # app-tab-bar.{js,json,wxml,wxss}
│   ├── profile/                  # 个人资料
│   │   └── profile-header/       # 头像、姓名、待办入口
│   ├── feedback/                 # 反馈类组件
│   │   ├── dialog/               # 通用弹窗：标题/内容/底部按钮，支持 slot
│   │   └── todo-drawer/          # 待办抽屉与审批
│   └── tabs/                     # 三个业务 Tab
│       ├── punch/                # punch.{js,json,wxml,wxss}，标签 <punch-tab>
│       ├── schedule/             # schedule.{js,json,wxml,wxss}
│       └── stats/                # stats.{js,json,wxml,wxss}
├── services/                     # 接口与微信能力，页面不直接发请求
│   ├── http.js                   # 请求封装、登录态、401 处理
│   ├── auth.js                   # 微信登录、账号绑定
│   ├── attendance.js             # 打卡、月汇总、排班、休息、补卡
│   ├── todo.js                   # 待办列表与审批
│   ├── unbind.js                 # 解绑申请与审批
│   ├── badge.js                  # 角标数量（缺卡数）
│   ├── amap.js                   # 逆地理
│   └── wechat.js                 # wx.login / wx.getLocation
├── store/                        # 登录态
│   └── session.js                # 登录态读写、是否管理员、requireSession
├── behaviors/                    # 组件复用行为
│   ├── toast.js                  # 消息条状态、自动关闭、showError
│   ├── pull-refresh.js           # 下拉刷新状态与指示器
│   └── makeup-time.js            # 补卡时间分段输入与数字键盘
├── constants/                    # 业务常量
│   ├── tabs.js                   # 三个 Tab 的 key / 标签 / 图标 / 角标
│   ├── routes.js                 # 页面路径
│   ├── review.js                 # 审批状态文案
│   └── ui.js                     # 消息条/角标/下拉刷新常量
├── config/                       # 环境配置
│   ├── index.js                  # API_BASE、AMAP_KEY
│   ├── local.example.js          # 高德 Key 示例
│   └── local.js                  # 本地高德 Key，勿提交
├── utils/                        # 纯函数
│   ├── time.js                   # 日期、月份、格式化
│   ├── punch-rule.js             # 打卡/补卡/休息规则
│   ├── attendance-table.js       # 统计页月表明细单元格
│   ├── avatar.js                 # 本地头像读写
│   ├── nav-metrics.js            # 状态栏/胶囊按钮/安全区
│   ├── theme.js                  # 明暗主题与状态栏
│   ├── badge.js                  # 角标数字格式化
│   └── review-account.js         # 审核测试账号判断
├── styles/                       # 样式分层
│   ├── theme.wxss                # 颜色变量、深色主题（只给页面用）
│   ├── base.wxss                 # 标签重置（只给页面用）
│   ├── common.wxss               # 公共类（组件可安全引用）
│   └── index.wxss                # 页面/全局汇总 import
├── assets/                       # 静态资源
│   ├── fonts/                    # Maple Mono 字体
│   └── icons/                    # 图标
├── app.js                        # 应用入口：字体、主题、审核账号清理
├── app.json                      # 页面注册、窗口、定位权限
├── app.wxss                      # 全局样式入口
├── theme.json                    # 原生导航/页面深浅色配置
├── project.config.json           # 微信开发者工具项目配置
├── project.private.config.json   # 本地工具配置，勿提交
├── eslint.config.mjs             # ESLint 规则
├── .prettierrc.json              # Prettier 规则
├── .prettierignore               # Prettier 忽略文件
├── package.json                  # 脚本与开发依赖
├── package-lock.json             # 依赖版本锁定
└── README.md                     # 项目说明
```

## 命名与分层约定

- 目录、文件统一 kebab-case，例如 `app-nav`、`nav-metrics.js`
- 通用组件按职责放 `layout/`、`feedback/`；业务 Tab 目录用业务名，组件标签统一 `<业务>-tab`
- 数字索引统一 `activeIndex` 或 `current`；组件布尔可见状态统一 `active`
- 列表数据用复数：`rows`、`users`、`items`；今日数据用 `todayXxx`
- 常量用 `UPPER_SNAKE_CASE`，数据字段和方法用 camelCase
- 事件处理统一 `onXxx`；加载数据 `loadXxx`；视图计算 `applyXxx`；重置 `resetXxx`
- 页面只做编排：页面/组件不直接 `wx.request`，请求统一放 `services/`
- 登录态统一走 `store/session.js`（`getSession` / `hasSession` / `requireSession`），不各自读写 storage
- 消息条、下拉刷新、补卡时间输入统一使用 `behaviors/`；错误提示统一调用 `this.showError(error, fallback)`，内部会忽略 401
- 深色主题统一由页面根节点 `.app-root.dark` 切换，不使用组件级 `prefers-color-scheme` 媒体查询
- 纯函数放 `utils/`，常量放 `constants/`，环境配置放 `config/`
- 小程序 `require` 不会自动解析目录下的 `index.js`，引用 `config/index.js` 时必须写完整路径：`require("../config/index.js")`
- 组件 WXSS 不能出现 `page`、`view`、`button` 等标签选择器；组件只引用 `styles/common.wxss`，`theme.wxss` / `base.wxss` 只由 `app.wxss` 引入

## 页面与 Tab

`app.json` 只注册两个页面：

| 页面 | 文件 | 说明 |
|---|---|---|
| 主壳 | `pages/home/home` | 顶部导航 + 三个 Tab 组件 + 底部标签栏 |
| 登录 | `pages/login/login` | 微信登录、首次用现有账号绑定 |

三个业务 Tab 由 `pages/home/home` 控制显示，切换时不销毁状态。Tab 元数据统一在 `constants/tabs.js` 维护。头像、姓名、待办入口和退出登录位于打卡页，缺卡角标显示在统计 Tab。

## 样式

- `styles/theme.wxss`：浅色变量在 `.app-root`，深色变量在 `.app-root.dark`；页面根据系统主题添加 `dark` 类
- `styles/base.wxss`：标签级重置（`view`、`button` 等）
- `styles/common.wxss`：按钮、卡片、页面、表格、弹窗、消息条、加载、下拉刷新
- `styles/index.wxss`：汇总 `theme` + `base` + `common`，只由 `app.wxss` 引入
- 各组件只引用 `styles/common.wxss`，避免把标签选择器带进组件 WXSS

各 Tab 独有样式放在组件自己的 `.wxss` 中，例如 `components/tabs/punch/punch.wxss`。

## 字体

- 字体：Maple Mono 7.9，SIL OFL 1.1，许可证见 `assets/fonts/maple-OFL.txt`
- 字重：400 / 500 / 600，均为 Latin 子集
- 真机不能直接读取包内 `.woff2`，因此 `assets/fonts/maple-fonts.js` 保存 base64 字体数据，由 `app.js` 通过 `wx.loadFontFace` 以 data URI 加载
- 中文不在 Latin 子集内，会回退到 `PingFang SC` / `微软雅黑`
- 修改字体或字重时，需要重新生成 `maple-fonts.js`，不要直接手改 base64 字符串

## 数据与请求

Tab 内的操作（打卡、休息登记、补卡、审批）完成后会向主壳抛 `attendancechanged`，主壳刷新底部角标。

### 刷新策略

- 首次进入某个 Tab：加载一次数据
- 再次切换 Tab：不重新请求，直接复用组件内的数据
- 下拉刷新：刷新当前 Tab，并通过 `attendancechanged` 刷新底栏角标
- 首页从后台回到前台：只刷新当前 Tab
- 排班：按月份使用 `monthCache`，切月优先命中缓存
- 统计：首次进入加载，之后切换不重复请求
- 角标：首页 `onShow`、30 秒定时器、下拉刷新、操作成功后刷新；缺卡数 = 历史累计 + 当月，历史部分由后端缓存 5 分钟
