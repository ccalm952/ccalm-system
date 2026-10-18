const { getLoginCode } = require("./wechat");
const { post } = require("./http");
const { setSession } = require("../store/session");

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
};
