/** 与后端 wechat-review-account.ts 保持一致 */
const WECHAT_REVIEW_USERNAME = "test";

function isWechatReviewUsername(username) {
  return username === WECHAT_REVIEW_USERNAME;
}

module.exports = {
  WECHAT_REVIEW_USERNAME,
  isWechatReviewUsername,
};
