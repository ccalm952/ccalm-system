export type WechatCode2SessionResult = {
  openid: string;
  sessionKey: string;
  unionid?: string;
};

export type WechatCode2SessionError = {
  errcode: number;
  errmsg: string;
};

export function parseWechatCode2SessionPayload(
  payload: unknown,
): WechatCode2SessionResult {
  if (!payload || typeof payload !== "object") {
    throw new Error("微信登录响应无效");
  }
  const data = payload as Record<string, unknown>;
  const errcode = Number(data.errcode ?? 0);
  if (errcode) {
    const errmsg =
      typeof data.errmsg === "string" && data.errmsg.trim()
        ? data.errmsg.trim()
        : "微信登录失败";
    throw Object.assign(new Error(errmsg), { errcode });
  }
  const openid = typeof data.openid === "string" ? data.openid.trim() : "";
  const sessionKey =
    typeof data.session_key === "string" ? data.session_key.trim() : "";
  if (!openid || !sessionKey) {
    throw new Error("微信登录响应缺少 openid");
  }
  const unionid =
    typeof data.unionid === "string" && data.unionid.trim()
      ? data.unionid.trim()
      : undefined;
  return { openid, sessionKey, unionid };
}

export function buildWechatCode2SessionUrl(opts: {
  appId: string;
  secret: string;
  code: string;
}): string {
  const params = new URLSearchParams({
    appid: opts.appId,
    secret: opts.secret,
    js_code: opts.code,
    grant_type: "authorization_code",
  });
  return `https://api.weixin.qq.com/sns/jscode2session?${params.toString()}`;
}
