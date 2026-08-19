import * as React from "react";
import dayjs from "dayjs";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ATTENDANCE_MAKEUP_REQUEST_STATUS_LABEL,
  ATTENDANCE_PUNCH_TYPE_LABEL,
  type AttendanceMakeupRequest,
  type AttendancePunchDeviceUnbindRequest,
} from "@/lib/attendance/types";
import {
  attendanceMutedTextClass,
  makeupRequestStatusTextClass,
  makeupTodoBadgeClass,
} from "@/lib/attendance/attendance-theme";
import { formatMakeupTime } from "@/lib/attendance/makeup";
import { api, makeupEventsUrl } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import { useAuth } from "@/lib/use-auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TodoTab = "mine" | "pending";

function MakeupRequestCard(props: {
  item: AttendanceMakeupRequest;
  showUser?: boolean;
  mode: "mine" | "review";
  onChanged: () => void;
}) {
  const { item, showUser = false, mode, onChanged } = props;
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [acting, setActing] = React.useState(false);

  async function approve() {
    setActing(true);
    try {
      await api("POST", `/attendance/makeup-requests/${item.id}/approve`);
      toast.success("已通过补卡申请");
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setActing(false);
    }
  }

  async function reject() {
    setActing(true);
    try {
      await api("POST", `/attendance/makeup-requests/${item.id}/reject`);
      toast.success("已拒绝补卡申请");
      setRejectOpen(false);
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setActing(false);
    }
  }

  const statusClass = makeupRequestStatusTextClass(item.status);

  return (
    <>
      <Card size="sm" className="border border-border shadow-none ring-0">
        <CardHeader>
          {showUser ? <CardTitle>{item.userName}</CardTitle> : null}
          <CardDescription className="min-w-0 space-y-1">
            <div>
              {dayjs(item.date).format("M月D日")} {ATTENDANCE_PUNCH_TYPE_LABEL[item.type]}{" "}
              {formatMakeupTime(item.punchTime)}
            </div>
          </CardDescription>
          {mode === "review" && item.status === "pending" ? (
            <CardAction>
              <div className="flex gap-2">
                <Button type="button" size="sm" disabled={acting} onClick={() => void approve()}>
                  通过
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={acting}
                  onClick={() => setRejectOpen(true)}
                >
                  拒绝
                </Button>
              </div>
            </CardAction>
          ) : (
            <CardAction>
              <span className={cn("text-sm", statusClass)}>
                {ATTENDANCE_MAKEUP_REQUEST_STATUS_LABEL[item.status]}
              </span>
            </CardAction>
          )}
        </CardHeader>
      </Card>

      {mode === "review" ? (
        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent className="md:max-w-md">
            <DialogHeader>
              <DialogTitle>拒绝补卡申请</DialogTitle>
            </DialogHeader>
            <div className={cn("text-sm", attendanceMutedTextClass)}>确认拒绝这条补卡申请吗？</div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>
                取消
              </Button>
              <Button type="button" disabled={acting} onClick={() => void reject()}>
                确认拒绝
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

function DeviceUnbindRequestCard(props: {
  item: AttendancePunchDeviceUnbindRequest;
  showUser?: boolean;
  mode: "mine" | "review";
  onChanged: () => void;
}) {
  const { item, showUser = false, mode, onChanged } = props;
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [acting, setActing] = React.useState(false);

  async function approve() {
    setActing(true);
    try {
      await api("POST", `/attendance/punch-device/unbind-requests/${item.id}/approve`);
      toast.success("已通过解绑申请");
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setActing(false);
    }
  }

  async function reject() {
    setActing(true);
    try {
      await api("POST", `/attendance/punch-device/unbind-requests/${item.id}/reject`);
      toast.success("已拒绝解绑申请");
      setRejectOpen(false);
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setActing(false);
    }
  }

  const statusClass = makeupRequestStatusTextClass(item.status);

  return (
    <>
      <Card size="sm" className="border border-border shadow-none ring-0">
        <CardHeader>
          {showUser ? <CardTitle>{item.userName}</CardTitle> : null}
          <CardDescription className="min-w-0 space-y-1">
            <div>申请解绑打卡设备</div>
          </CardDescription>
          {mode === "review" && item.status === "pending" ? (
            <CardAction>
              <div className="flex gap-2">
                <Button type="button" size="sm" disabled={acting} onClick={() => void approve()}>
                  通过
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={acting}
                  onClick={() => setRejectOpen(true)}
                >
                  拒绝
                </Button>
              </div>
            </CardAction>
          ) : (
            <CardAction>
              <span className={cn("text-sm", statusClass)}>
                {ATTENDANCE_MAKEUP_REQUEST_STATUS_LABEL[item.status]}
              </span>
            </CardAction>
          )}
        </CardHeader>
      </Card>

      {mode === "review" ? (
        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent className="md:max-w-md">
            <DialogHeader>
              <DialogTitle>拒绝解绑申请</DialogTitle>
            </DialogHeader>
            <div className={cn("text-sm", attendanceMutedTextClass)}>确认拒绝这条解绑申请吗？</div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>
                取消
              </Button>
              <Button type="button" disabled={acting} onClick={() => void reject()}>
                确认拒绝
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

function RequestList(props: {
  loading: boolean;
  items: AttendanceMakeupRequest[];
  emptyText: string;
  mode: "mine" | "review";
  showUser?: boolean;
  onChanged: () => void;
}) {
  const { loading, items, emptyText, mode, showUser, onChanged } = props;

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 text-sm", attendanceMutedTextClass)}>
        <Spinner data-icon="inline-start" />
        加载中…
      </div>
    );
  }
  if (items.length === 0) {
    if (!emptyText) return null;
    return <div className={cn("text-sm", attendanceMutedTextClass)}>{emptyText}</div>;
  }
  return (
    <>
      {items.map((item) => (
        <MakeupRequestCard
          key={item.id}
          item={item}
          mode={mode}
          showUser={showUser}
          onChanged={onChanged}
        />
      ))}
    </>
  );
}

function DeviceUnbindRequestList(props: {
  loading: boolean;
  items: AttendancePunchDeviceUnbindRequest[];
  emptyText: string;
  mode: "mine" | "review";
  showUser?: boolean;
  onChanged: () => void;
}) {
  const { loading, items, emptyText, mode, showUser, onChanged } = props;

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 text-sm", attendanceMutedTextClass)}>
        <Spinner data-icon="inline-start" />
        加载中…
      </div>
    );
  }
  if (items.length === 0) {
    if (!emptyText) return null;
    return <div className={cn("text-sm", attendanceMutedTextClass)}>{emptyText}</div>;
  }
  return (
    <>
      {items.map((item) => (
        <DeviceUnbindRequestCard
          key={item.id}
          item={item}
          mode={mode}
          showUser={showUser}
          onChanged={onChanged}
        />
      ))}
    </>
  );
}

function TodoMineSection(props: {
  loading: boolean;
  makeupItems: AttendanceMakeupRequest[];
  unbindItems: AttendancePunchDeviceUnbindRequest[];
  onChanged: () => void;
}) {
  const { loading, makeupItems, unbindItems, onChanged } = props;

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 text-sm", attendanceMutedTextClass)}>
        <Spinner data-icon="inline-start" />
        加载中…
      </div>
    );
  }

  if (makeupItems.length === 0 && unbindItems.length === 0) {
    return <div className={cn("text-sm", attendanceMutedTextClass)}>暂无申请记录</div>;
  }

  return (
    <>
      <RequestList
        loading={false}
        items={makeupItems}
        emptyText=""
        mode="mine"
        onChanged={onChanged}
      />
      <DeviceUnbindRequestList
        loading={false}
        items={unbindItems}
        emptyText=""
        mode="mine"
        onChanged={onChanged}
      />
    </>
  );
}

function TodoPendingSection(props: {
  loading: boolean;
  makeupItems: AttendanceMakeupRequest[];
  unbindItems: AttendancePunchDeviceUnbindRequest[];
  onChanged: () => void;
}) {
  const { loading, makeupItems, unbindItems, onChanged } = props;

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 text-sm", attendanceMutedTextClass)}>
        <Spinner data-icon="inline-start" />
        加载中…
      </div>
    );
  }

  if (makeupItems.length === 0 && unbindItems.length === 0) {
    return <div className={cn("text-sm", attendanceMutedTextClass)}>暂无待办</div>;
  }

  return (
    <>
      <RequestList
        loading={false}
        items={makeupItems}
        emptyText=""
        mode="review"
        showUser
        onChanged={onChanged}
      />
      <DeviceUnbindRequestList
        loading={false}
        items={unbindItems}
        emptyText=""
        mode="review"
        showUser
        onChanged={onChanged}
      />
    </>
  );
}

export function MakeupTodoButton() {
  const { me } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<TodoTab>("mine");
  const [mineItems, setMineItems] = React.useState<AttendanceMakeupRequest[]>([]);
  const [pendingItems, setPendingItems] = React.useState<AttendanceMakeupRequest[]>([]);
  const [mineUnbindItems, setMineUnbindItems] = React.useState<AttendancePunchDeviceUnbindRequest[]>(
    [],
  );
  const [pendingUnbindItems, setPendingUnbindItems] = React.useState<
    AttendancePunchDeviceUnbindRequest[]
  >([]);
  const [loading, setLoading] = React.useState(false);

  const isAdmin = me?.role === "admin";
  const badgeCount = isAdmin
    ? pendingItems.length + pendingUnbindItems.length
    : mineItems.filter((item) => item.status === "pending").length +
      mineUnbindItems.filter((item) => item.status === "pending").length;

  const load = React.useCallback(async () => {
    if (!me) return;
    setLoading(true);
    try {
      const [mine, mineUnbind] = await Promise.all([
        api<AttendanceMakeupRequest[]>("GET", "/attendance/makeup-requests/mine"),
        api<AttendancePunchDeviceUnbindRequest[]>(
          "GET",
          "/attendance/punch-device/unbind-requests/mine",
        ),
      ]);
      setMineItems(mine);
      setMineUnbindItems(mineUnbind);
      if (isAdmin) {
        const [list, unbindList] = await Promise.all([
          api<AttendanceMakeupRequest[]>("GET", "/attendance/makeup-requests?status=pending"),
          api<AttendancePunchDeviceUnbindRequest[]>(
            "GET",
            "/attendance/punch-device/unbind-requests?status=pending",
          ),
        ]);
        setPendingItems(list);
        setPendingUnbindItems(unbindList);
      } else {
        setPendingItems([]);
        setPendingUnbindItems([]);
      }
    } catch {
      setMineItems([]);
      setPendingItems([]);
      setMineUnbindItems([]);
      setPendingUnbindItems([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, me]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  React.useEffect(() => {
    if (!me) return;
    const url = makeupEventsUrl();
    if (!url) return;

    let es: EventSource | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      es = new EventSource(url);
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as { type?: string };
          if (data.type === "ping" || data.type === "connected") return;
        } catch {
          // ignore parse errors, still refresh
        }
        if (document.visibilityState === "hidden") return;
        void load();
      };
      es.onerror = () => {
        es?.close();
        es = null;
        if (!closed) {
          window.setTimeout(connect, 3000);
        }
      };
    };

    connect();

    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      closed = true;
      document.removeEventListener("visibilitychange", onVisible);
      es?.close();
    };
  }, [me, load]);

  if (!me) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium text-foreground transition-all hover:bg-muted"
          >
            <span>待办</span>
            {badgeCount > 0 ? (
              <span className={makeupTodoBadgeClass}>
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            ) : null}
          </button>
        }
      />
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 md:max-w-md">
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as TodoTab)}
          className="flex h-full min-h-0 flex-col"
        >
          <div className="shrink-0 border-b px-4 pt-12 pb-3">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="mine">我创建的</TabsTrigger>
              <TabsTrigger value="pending">待我处理</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="mine" className="mt-0 min-h-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-3 p-4">
                <TodoMineSection
                  loading={loading}
                  makeupItems={mineItems}
                  unbindItems={mineUnbindItems}
                  onChanged={() => void load()}
                />
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="pending" className="mt-0 min-h-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-3 p-4">
                {isAdmin ? (
                  <TodoPendingSection
                    loading={loading}
                    makeupItems={pendingItems}
                    unbindItems={pendingUnbindItems}
                    onChanged={() => void load()}
                  />
                ) : (
                  <div className={cn("text-sm", attendanceMutedTextClass)}>暂无待办</div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
