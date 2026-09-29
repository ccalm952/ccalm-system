import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common"

import {
  buildWechatCode2SessionUrl,
  parseWechatCode2SessionPayload,
  type WechatCode2SessionResult,
} from "./wechat-session"

@Injectable()
export class WechatService {
  private credentials() {
    const appId = (process.env.WECHAT_APPID ?? "").trim()
    const secret = (process.env.WECHAT_APPSECRET ?? "").trim()
    if (!appId || !secret) {
      throw new ServiceUnavailableException(
        "未配置微信小程序登录（WECHAT_APPID / WECHAT_APPSECRET）"
      )
    }
    return { appId, secret }
  }

  async code2Session(code: string): Promise<WechatCode2SessionResult> {
    const trimmed = code.trim()
    if (!trimmed) throw new UnauthorizedException("微信登录凭证无效")

    const { appId, secret } = this.credentials()
    const url = buildWechatCode2SessionUrl({
      appId,
      secret,
      code: trimmed,
    })

    let payload: unknown
    try {
      const res = await fetch(url)
      payload = await res.json()
    } catch {
      throw new ServiceUnavailableException("微信登录服务暂不可用")
    }

    try {
      return parseWechatCode2SessionPayload(payload)
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : "微信登录失败"
      throw new UnauthorizedException(message)
    }
  }
}
