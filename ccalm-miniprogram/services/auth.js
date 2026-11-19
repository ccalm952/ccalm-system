const { getLoginCode } = require("./wechat");
const { get, post } = require("./http");
const { getSession, setSession } = require("../store/session");

function buildSession(response) {
  if (
    !response ||
    !response.accessToken ||
    !response.deviceToken ||
    !response.user
  ) {
    return null;
  }
  return {
    accessToken: response.accessToken,
    deviceToken: response.deviceToken,
    user: response.user,
  };
}

/**
 * 用 /auth/me 刷新本地 user（roles / permissions），供已登录用户对齐新权限模型。
 */
async function refreshCurrentUser() {
  const session = getSession();
  if (!session || !session.accessToken) return null;
  const me = await get("/auth/me");
  const next = {
    accessToken: session.accessToken,
    deviceToken: session.deviceToken,
    user: me,
  };
  setSession(next);
  return next;
}

/**
 * 微信登录；已绑定时直接写入登录态。
 * @returns {Promise<{status:string, session?:object|null, bindTicket?:string}>}
 */
async function loginWithWechat() {
  const code = await getLoginCode();
  const response = await post(
    "/auth/wechat/login",
    { code },
    { skipAuth: true },
  );
  if (response.status === "bound") {
    const session = buildSession(response);
    if (session) setSession(session);
    return { status: "bound", session };
  }
  return {
    status: response.status,
    bindTicket: response.bindTicket || "",
  };
}

/**
 * 首次使用：用现有账号绑定微信，成功后写入登录态。
 * @param {{bindTicket:string, username:string, password:string}} body
 */
async function bindWechatAccount(body) {
  const response = await post("/auth/wechat/bind", body, {
    skipAuth: true,
  });
  const session = buildSession(response);
  if (!session) throw new Error("登录数据不完整");
  setSession(session);
  return session;
}

module.exports = {
  loginWithWechat,
  bindWechatAccount,
  refreshCurrentUser,
};
