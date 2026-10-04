const AUTH_KEY = "ccalm:auth";

function getStoredAuth() {
  try {
    return wx.getStorageSync(AUTH_KEY) || null;
  } catch {
    return null;
  }
}

function setStoredAuth(auth) {
  wx.setStorageSync(AUTH_KEY, auth);
}

function clearStoredAuth() {
  try {
    wx.removeStorageSync(AUTH_KEY);
  } catch {
    // ignore
  }
}

module.exports = {
  getStoredAuth,
  setStoredAuth,
  clearStoredAuth,
};
