/** 微信小程序审核用账号：每次进入都重新绑定，不长期占用 openid。 */
export const WECHAT_REVIEW_USERNAME = "test";

export function isWechatReviewUsername(username: string): boolean {
  return username === WECHAT_REVIEW_USERNAME;
}
