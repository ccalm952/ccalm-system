import * as React from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ROUTES } from "@/config/routes";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import { setSalaryUnlockToken } from "@/lib/salary-unlock";

type SalaryUnlockDialogProps = {
  open: boolean;
  onUnlocked: () => void;
};

export function SalaryUnlockDialog({ open, onUnlocked }: SalaryUnlockDialogProps) {
  const navigate = useNavigate();
  const [pin, setPin] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setPin("");
    setError(null);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      setError("请输入 4 位数字 PIN");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api<{ unlockToken: string; expiresAt: string }>(
        "POST",
        "/salary/unlock",
        { pin },
      );
      setSalaryUnlockToken(res.unlockToken);
      onUnlocked();
    } catch (err) {
      setError(errorMessage(err));
      setPin("");
      inputRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="md:max-w-sm">
        <form onSubmit={(e) => void submit(e)}>
          <DialogHeader>
            <DialogTitle>薪资 PIN 验证</DialogTitle>
            <DialogDescription>
              请输入 4 位薪资 PIN 以查看和编辑薪资数据。验证有效期 30 分钟，关闭浏览器标签后需重新输入。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="salary-pin">薪资 PIN</Label>
            <Input
              ref={inputRef}
              id="salary-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              pattern="\d{4}"
              placeholder="••••"
              value={pin}
              disabled={submitting}
              className="text-center text-lg tracking-[0.4em]"
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, "").slice(0, 4);
                setPin(next);
                setError(null);
              }}
            />
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
          </div>
          <DialogFooter className="gap-2 md:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => navigate(ROUTES.home)}
            >
              返回
            </Button>
            <Button type="submit" disabled={submitting || pin.length !== 4}>
              {submitting ? <Spinner className="size-4" /> : null}
              确认
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
