import * as React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setPassword("");
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setSubmitting(true);
    try {
      const res = await api<{ unlockToken: string; expiresAt: string }>(
        "POST",
        "/salary/unlock",
        { password },
      );
      setSalaryUnlockToken(res.unlockToken);
      onUnlocked();
    } catch (err) {
      toast.error(errorMessage(err));
      setPassword("");
      inputRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="gap-4 md:max-w-sm">
        <form className="flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
          <DialogTitle>输入密码</DialogTitle>
          <Input
            ref={inputRef}
            type="password"
            autoComplete="off"
            value={password}
            disabled={submitting}
            onChange={(e) => setPassword(e.target.value)}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => navigate(ROUTES.home)}
            >
              返回
            </Button>
            <Button type="submit" disabled={submitting || !password}>
              {submitting ? <Spinner className="size-4" /> : null}
              确认
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
