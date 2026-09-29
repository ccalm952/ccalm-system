# CCALM 考勤打卡小程序

MVP：微信登录、首次用现有账号绑定、上下班打卡、查看当日记录。

## 使用

1. 后端 `ccalm-api/.env` 配置：

```env
WECHAT_APPID=wxf9d517b49440cd79
WECHAT_APPSECRET=<你的 AppSecret>
```

2. 部署后端并执行迁移（含 `User.wechatOpenId`）。

3. 微信公众平台 → 开发管理 → 服务器域名 → request 合法域名填 `www.ccalm.xyz`。

4. 用微信开发者工具打开本目录；开发阶段可在详情里勾选「不校验合法域名」。

API 基址见 `utils/config.js`（默认 `https://www.ccalm.xyz/api`）。
