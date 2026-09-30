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
