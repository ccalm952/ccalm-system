const { getStoredAuth, clearStoredAuth } = require("./utils/auth");
const { isWechatReviewUsername } = require("./utils/review-account");

function loadInterFaces() {
  const faces = [
    {
      weight: "400",
      source: 'url("/assets/fonts/inter-400.woff")',
    },
    {
      weight: "500",
      source: 'url("/assets/fonts/inter-500.woff")',
    },
    {
      weight: "600",
      source: 'url("/assets/fonts/inter-600.woff")',
    },
  ];
  faces.forEach(({ weight, source }) => {
    wx.loadFontFace({
      global: true,
      family: "Inter",
      source,
      desc: { weight },
    });
  });
}

function clearReviewSessionIfNeeded() {
  const auth = getStoredAuth();
  const username = auth && auth.user && auth.user.username;
  if (username && isWechatReviewUsername(username)) {
    clearStoredAuth();
  }
}

App({
  onLaunch() {
    loadInterFaces();
    clearReviewSessionIfNeeded();
  },
});
