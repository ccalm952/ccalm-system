/**
 * 微信平台能力封装，便于页面/服务只关心业务结果。
 */

/**
 * 获取 wx.login 的 code。
 * @returns {Promise<string>}
 */
function getLoginCode() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        if (res.code) resolve(res.code);
        else reject(new Error("微信登录失败：无 code"));
      },
      fail(error) {
        reject(new Error(error.errMsg || "微信登录失败"));
      },
    });
  });
}

/**
 * 获取当前定位（gcj02）。
 * @returns {Promise<{latitude:number, longitude:number}>}
 */
function getLocation() {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: "gcj02",
      isHighAccuracy: true,
      success(res) {
        resolve({ latitude: res.latitude, longitude: res.longitude });
      },
      fail(error) {
        reject(
          new Error(error.errMsg || "获取定位失败，请在设置中开启位置权限"),
        );
      },
    });
  });
}

module.exports = {
  getLoginCode,
  getLocation,
};
