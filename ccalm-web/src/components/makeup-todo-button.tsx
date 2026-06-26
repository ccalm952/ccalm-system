import * as React from "react";
import dayjs from "dayjs";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/lib/attendance/types";
import {
  attendanceMutedTextClass,
  makeupRequestStatusTextClass,
  makeupTodoBadgeClass,
} from "@/lib/attendance/attendance-theme";
import { formatMakeupTime } from "@/lib/attendance/makeup";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import { useAuth } from "@/lib/use-auth";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";

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
          <DialogContent className="sm:max-w-md">
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
    return <div className={cn("text-sm", attendanceMutedTextClass)}>加载中…</div>;
  }
  if (items.length === 0) {
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

export function MakeupTodoButton() {
  const { me } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<TodoTab>("mine");
  const [mineItems, setMineItems] = React.useState<AttendanceMakeupRequest[]>([]);
  const [pendingItems, setPendingItems] = React.useState<AttendanceMakeupRequest[]>([]);
  const [loading, setLoading] = React.useState(false);

  const isAdmin = me?.role === "admin";
  const badgeCount = isAdmin
    ? pendingItems.length
    : mineItems.filter((item) => item.status === "pending").length;

  const load = React.useCallback(async () => {
    if (!me) return;
    setLoading(true);
    try {
      const mine = await api<AttendanceMakeupRequest[]>("GET", "/attendance/makeup-requests/mine");
      setMineItems(mine);
      if (isAdmin) {
        const list = await api<AttendanceMakeupRequest[]>(
          "GET",
          "/attendance/makeup-requests?status=pending",
        );
        setPendingItems(list);
      } else {
        setPendingItems([]);
      }
    } catch {
      setMineItems([]);
      setPendingItems([]);
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

  if (!me) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/60"
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
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
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
                <RequestList
                  loading={loading}
                  items={mineItems}
                  emptyText="暂无申请记录"
                  mode="mine"
                  onChanged={() => void load()}
                />
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="pending" className="mt-0 min-h-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-3 p-4">
                {isAdmin ? (
                  <RequestList
                    loading={loading}
                    items={pendingItems}
                    emptyText="暂无待办"
                    mode="review"
                    showUser
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
