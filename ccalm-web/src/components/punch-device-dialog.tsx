import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPunchDeviceToken } from "@/lib/attendance/punch-device";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import { toast } from "sonner";

type PunchDeviceStatus = {
  bound: boolean;
  boundAt: string | null;
  current: boolean;
  unbindPending: boolean;
};

type PunchDeviceRow = {
  userId: string;
  displayName: string;
  bound: boolean;
  boundAt: string | null;
};

export function PunchDeviceDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
}) {
  const { open, onOpenChange, isAdmin } = props;
  const [status, setStatus] = React.useState<PunchDeviceStatus | null>(null);
  const [rows, setRows] = React.useState<PunchDeviceRow[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [unbindingUserId, setUnbindingUserId] = React.useState<string | null>(null);
  const [applying, setApplying] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoadError(null);
    const deviceToken = getPunchDeviceToken();
    const mine = await api<PunchDeviceStatus>(
      "GET",
      `/attendance/punch-device?deviceToken=${encodeURIComponent(deviceToken)}`,
    );
    setStatus(mine);
    if (!isAdmin) {
      setRows(null);
      return;
    }
    const list = await api<PunchDeviceRow[]>("GET", "/attendance/punch-devices");
    setRows(list);
  }, [isAdmin]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled) {
          setStatus(null);
          setRows(null);
          setLoadError(errorMessage(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, load]);

  function statusText(s: PunchDeviceStatus): string {
    if (!s.bound) return "尚未绑定，首次打卡后自动绑定当前手机";
    if (s.unbindPending) return "解绑申请审批中，请等待管理员处理";
    if (s.current) return "本机已绑定";
    return "已绑定其他设备，可申请解绑后在新手机打卡";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>打卡设备</DialogTitle>
        </DialogHeader>
        {loadError ? (
          <div className="text-sm text-destructive">{loadError}</div>
        ) : status === null ? (
          <Spinner />
        ) : (
          <>
            <div>{statusText(status)}</div>
            {!isAdmin && status.bound && !status.unbindPending ? (
              <Button
                type="button"
                variant="secondary"
                disabled={applying}
                onClick={() => {
                  void (async () => {
                    setApplying(true);
                    try {
                      await api("POST", "/attendance/punch-device/unbind-requests");
                      toast.success("已提交解绑申请");
                      await load();
                    } catch (e) {
                      toast.error(errorMessage(e));
                    } finally {
                      setApplying(false);
                    }
                  })();
                }}
              >
                {applying ? "提交中…" : "申请解绑"}
              </Button>
            ) : null}
            {isAdmin ? (
              rows === null ? (
                <Spinner />
              ) : (
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>姓名</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.userId}>
                          <TableCell>{row.displayName}</TableCell>
                          <TableCell>{row.bound ? "已绑定" : "未绑定"}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={!row.bound || unbindingUserId === row.userId}
                              onClick={() => {
                                void (async () => {
                                  setUnbindingUserId(row.userId);
                                  try {
                                    await api("POST", "/attendance/punch-device/unbind", {
                                      userId: row.userId,
                                    });
                                    toast.success(`已解绑：${row.displayName}`);
                                    await load();
                                  } catch (e) {
                                    toast.error(errorMessage(e));
                                  } finally {
                                    setUnbindingUserId(null);
                                  }
                                })();
                              }}
                            >
                              {unbindingUserId === row.userId ? "解绑中…" : "解绑"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              )
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
