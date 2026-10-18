const { LOGIN_PAGE } = require("../constants/routes");

const AUTH_KEY = "ccalm:auth";

let redirectingToLogin = false;

/**
 * 读取本地登录态。
 * @returns {{accessToken:string, deviceToken:string, user:object}|null}
 */
function getSession() {
  try {
    return wx.getStorageSync(AUTH_KEY) || null;
  } catch (_) {
    return null;
  }
}

/**
 * 写入登录态。
 * @param {{accessToken:string, deviceToken:string, user:object}} session
 */
function setSession(session) {
  wx.setStorageSync(AUTH_KEY, session);
}

function clearSession() {
  try {
    wx.removeStorageSync(AUTH_KEY);
  } catch (_) {
    // ignore
  }
}

/**
 * 是否存在完整登录态（token + deviceToken）。
 */
function hasSession() {
  const session = getSession();
  return !!(session && session.accessToken && session.deviceToken);
}

/**
 * 判断是否管理员。
 * @param {{user?:{role?:string}}|null} [session]
 */
function isAdmin(session) {
  const target = session || getSession();
  return !!(target && target.user && target.user.role === "admin");
}

/**
 * 回到登录页，短时间内的重复调用只执行一次。
 */
function redirectToLogin() {
  if (redirectingToLogin) return;
  redirectingToLogin = true;
  wx.reLaunch({
    url: LOGIN_PAGE,
    complete() {
      setTimeout(() => {
        redirectingToLogin = false;
      }, 300);
    },
  });
}

/**
 * 页面进入时校验登录态；未登录会 reLaunch 到登录页。
 * @returns {{accessToken:string, deviceToken:string, user:object}|null}
 */
function requireSession() {
  const session = getSession();
  if (!session || !session.accessToken || !session.deviceToken) {
    redirectToLogin();
    return null;
  }
  return session;
}

module.exports = {
  getSession,
  setSession,
  clearSession,
  hasSession,
  isAdmin,
  requireSession,
  redirectToLogin,
};
