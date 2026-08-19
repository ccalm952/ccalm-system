import { Injectable, MessageEvent } from "@nestjs/common"
import { Observable, Subject, filter, interval, map, merge, of } from "rxjs"

export type MakeupSsePayload = {
  type: "makeup-changed"
  action: "created" | "approved" | "rejected" | "cleared"
  userId: string
  requestId?: string
}

export type DeviceUnbindSsePayload = {
  type: "device-unbind-changed"
  action: "created" | "approved" | "rejected"
  userId: string
  requestId?: string
}

export type AttendanceTodoSsePayload = MakeupSsePayload | DeviceUnbindSsePayload

type AttendanceTodoSseClientEvent =
  AttendanceTodoSsePayload | { type: "connected" } | { type: "ping" }

@Injectable()
export class MakeupEventsService {
  private readonly bus = new Subject<AttendanceTodoSsePayload>()

  publish(event: AttendanceTodoSsePayload) {
    this.bus.next(event)
  }

  stream(userId: string, role: "user" | "admin"): Observable<MessageEvent> {
    const filtered = this.bus.pipe(
      filter((e) => role === "admin" || e.userId === userId),
      map((e): MessageEvent => ({
        data: e satisfies AttendanceTodoSseClientEvent,
      }))
    )
    const keepalive = interval(25_000).pipe(
      map((): MessageEvent => ({
        data: { type: "ping" } satisfies AttendanceTodoSseClientEvent,
      }))
    )
    return merge(
      of({
        data: { type: "connected" } satisfies AttendanceTodoSseClientEvent,
      } as MessageEvent),
      filtered,
      keepalive
    )
  }
}
