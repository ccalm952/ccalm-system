import { Injectable, MessageEvent } from "@nestjs/common"
import { Observable, Subject, filter, interval, map, merge, of } from "rxjs"

export type MakeupSsePayload = {
  type: "makeup-changed"
  action: "created" | "approved" | "rejected" | "cleared"
  /** 申请人 userId */
  userId: string
  requestId?: string
}

type MakeupSseClientEvent =
  MakeupSsePayload | { type: "connected" } | { type: "ping" }

@Injectable()
export class MakeupEventsService {
  private readonly bus = new Subject<MakeupSsePayload>()

  publish(event: MakeupSsePayload) {
    this.bus.next(event)
  }

  stream(userId: string, role: "user" | "admin"): Observable<MessageEvent> {
    const filtered = this.bus.pipe(
      filter((e) => role === "admin" || e.userId === userId),
      map((e): MessageEvent => ({
        data: e satisfies MakeupSseClientEvent,
      }))
    )
    const keepalive = interval(25_000).pipe(
      map((): MessageEvent => ({
        data: { type: "ping" } satisfies MakeupSseClientEvent,
      }))
    )
    return merge(
      of({
        data: { type: "connected" } satisfies MakeupSseClientEvent,
      } as MessageEvent),
      filtered,
      keepalive
    )
  }
}
