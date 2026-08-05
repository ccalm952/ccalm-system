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
  const submittingRef = React.useRef(false);

  React.useEffect(() => {
    if (!open) return;
    setPassword("");
    submittingRef.current = false;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const unlock = React.useCallback(
    async (pin: string) => {
      if (!/^\d{4}$/.test(pin) || submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      try {
        const res = await api<{ unlockToken: string; expiresAt: string }>(
          "POST",
          "/salary/unlock",
          { password: pin },
        );
        setSalaryUnlockToken(res.unlockToken);
        onUnlocked();
      } catch (err) {
        toast.error(errorMessage(err));
        setPassword("");
        inputRef.current?.focus();
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [onUnlocked],
  );

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="gap-4 md:max-w-sm">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void unlock(password);
          }}
        >
          <DialogTitle className="text-center">输入密码</DialogTitle>
          <Input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            placeholder="••••"
            value={password}
            disabled={submitting}
            className="text-center text-lg tracking-[0.4em]"
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, "").slice(0, 4);
              setPassword(next);
              if (next.length === 4) void unlock(next);
            }}
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
            <Button type="submit" disabled={submitting || password.length !== 4}>
              {submitting ? <Spinner className="size-4" /> : null}
              确认
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
