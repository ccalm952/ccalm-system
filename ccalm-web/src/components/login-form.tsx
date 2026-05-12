import * as React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api, setToken } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import { cn } from "@/lib/utils";

/** 基于 shadcn login-05；提示用 Sonner https://ui.shadcn.com/docs/components/sonner */
export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const nav = useNavigate();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();

          const u = username.trim();
          const p = password.trim();
          if (!u || !p) {
            if (!u && !p) toast.error("请填写账号和密码");
            else if (!u) toast.error("请填写账号");
            else toast.error("请填写密码");
            return;
          }

          setLoading(true);
          try {
            const res = await api<{ accessToken: string }>("POST", "/auth/login", {
              username: u,
              password: p,
            });
            setToken(res.accessToken);
            nav("/");
          } catch (err) {
            toast.error(errorMessage(err));
          } finally {
            setLoading(false);
          }
        }}
      >
        <FieldGroup>
          <Field>
            <FieldContent>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="账号"
                aria-label="账号"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldContent>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="密码"
                aria-label="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FieldContent>
          </Field>
          <Field>
            <Button
              type="submit"
              className="w-full gap-2"
              disabled={loading}
              aria-label={loading ? "登录中" : undefined}
            >
              {loading ? (
                <Spinner className="size-4" aria-hidden />
              ) : (
                "登录"
              )}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
