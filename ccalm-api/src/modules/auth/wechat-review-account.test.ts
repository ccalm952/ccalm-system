import { describe, expect, it } from "vitest";

import {
  WECHAT_REVIEW_USERNAME,
  isWechatReviewUsername,
} from "./wechat-review-account";

describe("wechat-review-account", () => {
  it("仅识别审核账号用户名", () => {
    expect(WECHAT_REVIEW_USERNAME).toBe("test");
    expect(isWechatReviewUsername("test")).toBe(true);
    expect(isWechatReviewUsername("admin")).toBe(false);
    expect(isWechatReviewUsername("Test")).toBe(false);
    expect(isWechatReviewUsername("")).toBe(false);
  });
});
