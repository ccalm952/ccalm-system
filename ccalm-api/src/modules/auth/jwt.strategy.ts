import { Injectable } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"
import type { Request } from "express"

type JwtPayload = {
  sub: string
  username: string
  role: "user" | "admin"
}

/** EventSource 无法自定义 Authorization，SSE 用 ?token= */
function jwtFromQuery(req: Request): string | null {
  const token = req.query?.token
  return typeof token === "string" && token.trim() ? token.trim() : null
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new Error("Missing JWT_SECRET")
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        jwtFromQuery,
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    })
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload
  }
}
