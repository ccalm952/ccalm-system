import { describe, expect, it } from "vitest"

import {
  buildWechatCode2SessionUrl,
  parseWechatCode2SessionPayload,
} from "./wechat-session"

describe("wechat-session", () => {
  it("builds jscode2session url", () => {
    const url = buildWechatCode2SessionUrl({
      appId: "wxapp",
      secret: "sec",
      code: "abc",
    })
    expect(url).toContain("https://api.weixin.qq.com/sns/jscode2session?")
    expect(url).toContain("appid=wxapp")
    expect(url).toContain("secret=sec")
    expect(url).toContain("js_code=abc")
    expect(url).toContain("grant_type=authorization_code")
  })

  it("parses successful payload", () => {
    expect(
      parseWechatCode2SessionPayload({
        openid: "oid",
        session_key: "sk",
        unionid: "uid",
      })
    ).toEqual({ openid: "oid", sessionKey: "sk", unionid: "uid" })
  })

  it("rejects errcode payload", () => {
    expect(() =>
      parseWechatCode2SessionPayload({ errcode: 40029, errmsg: "invalid code" })
    ).toThrow("invalid code")
  })

  it("rejects missing openid", () => {
    expect(() => parseWechatCode2SessionPayload({ session_key: "sk" })).toThrow(
      "微信登录响应缺少 openid"
    )
  })
})
