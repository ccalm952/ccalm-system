const { API_BASE } = require("../config/index.js");
const {
  getSession,
  clearSession,
  redirectToLogin,
} = require("../store/session");

/**
 * 统一请求封装，自动携带登录态；401 时清理登录态并回到登录页。
 * @param {"GET"|"POST"|"PUT"|"DELETE"} method
 * @param {string} path 以 / 开头的接口路径
 * @param {object|undefined} data
 * @param {{skipAuth?:boolean, header?:object}} [options]
 */
function request(method, path, data, options = {}) {
  const session = getSession();
  const header = {
    "content-type": "application/json",
    ...(options.header || {}),
  };
  if (!options.skipAuth && session && session.accessToken) {
    header.Authorization = `Bearer ${session.accessToken}`;
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE}${path}`,
      method,
      data,
      header,
      timeout: 15000,
      success(res) {
        const status = res.statusCode || 0;
        const body = res.data;
        if (status >= 200 && status < 300) {
          resolve(body);
          return;
        }
        if (status === 401 && !options.skipAuth) {
          clearSession();
          redirectToLogin();
        }
        let message = `请求失败 (${status})`;
        if (body && body.message != null) {
          message = Array.isArray(body.message)
            ? body.message.join("；")
            : String(body.message);
        } else if (body && body.error) {
          message = String(body.error);
        }
        const error = new Error(message);
        error.status = status;
        error.body = body;
        reject(error);
      },
      fail(error) {
        reject(new Error(error.errMsg || "网络错误"));
      },
    });
  });
}

function get(path, data) {
  return request("GET", path, data);
}

function post(path, data, options) {
  return request("POST", path, data, options);
}

module.exports = {
  get,
  post,
};
