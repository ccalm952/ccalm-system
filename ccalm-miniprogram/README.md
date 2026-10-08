# CCALM 考勤打卡小程序

Vant Weapp 版首页：刷新定位自动打卡、今日状态、月统计/月表、补卡与排休。

## 配置

1. 后端 `ccalm-api/.env`：

```env
WECHAT_APPID=wxf9d517b49440cd79
WECHAT_APPSECRET=<AppSecret>
```

2. 高德 **Web服务** Key：在 `utils/config.local.js` 填写（勿提交）。网页 `VITE_AMAP_KEY` 若是 JS API 类型，逆地理会 `USERKEY_PLAT_NOMATCH`。

3. 微信公众平台 request 合法域名：

- `https://www.ccalm.xyz`
- `https://restapi.amap.com`（逆地理）

## 打开项目

用微信开发者工具导入本目录。若组件找不到，执行：**工具 → 构建 npm**（仓库已带 `miniprogram_npm`，一般可直接编译）。

开发阶段可勾选「不校验合法域名」。

独立测试环境（另一套库，不进生产网页）见仓库根目录 README「小程序独立测试环境」。本地连测试 API 时，在 `utils/config.local.js` 增加：

```js
module.exports = {
  API_BASE: "http://127.0.0.1:3001/api",
};
```

绑定账号 `test`，密码 `123456`。不改这个文件时，小程序仍请求 `https://www.ccalm.xyz/api`。
