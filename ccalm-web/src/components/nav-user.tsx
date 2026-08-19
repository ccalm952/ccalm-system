import * as React from "react";
import { useNavigate } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PunchDeviceDialog } from "@/components/punch-device-dialog";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { api, setToken } from "@/lib/api";
import { ROUTES } from "@/config/routes";
import { errorMessage } from "@/lib/errorMessage";
import type { AuthMe, UserRole } from "@/lib/auth";
import { EllipsisVerticalIcon } from "lucide-react";
import { toast } from "sonner";

function avatarInitials(displayName: string) {
  const t = displayName.trim();
  if (!t) return "?";
  return t.length <= 2 ? t : t.slice(0, 2);
}

export function NavUser({
  user,
  variant = "sidebar",
  onAvatarUpdated,
}: {
  user: {
    /** 显示名称（与后台「显示名称」一致） */
    id: string;
    name: string;
    /** 登录用户名，可选展示在副标题 */
    username?: string;
    avatar: string;
    role: UserRole;
  };
  /** sidebar：侧栏底栏；header：页顶右上角 */
  variant?: "sidebar" | "header";
  onAvatarUpdated?: (avatarUrl: string) => void;
}) {
  const nav = useNavigate();
  const { isMobile } = useSidebar();
  const initials = avatarInitials(user.name);
  const menuSide = variant === "sidebar" && !isMobile ? "right" : "bottom";
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [deviceOpen, setDeviceOpen] = React.useState(false);

  const handleAvatarFile = React.useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      const form = new FormData();
      form.append("avatar", file);
      setUploadingAvatar(true);
      try {
        const updated = await api<AuthMe>("POST", "/users/me/avatar", form);
        onAvatarUpdated?.(updated.avatarUrl);
        toast.success("头像已更新");
      } catch (e) {
        toast.error(errorMessage(e));
      } finally {
        setUploadingAvatar(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [onAvatarUpdated],
  );
  const avatar = (
    <Avatar size="lg">
      <AvatarImage src={user.avatar} alt={user.name} />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
  const menuContent = (
    <DropdownMenuContent className="min-w-56 rounded-lg" side={menuSide} align="end" sideOffset={8}>
      <DropdownMenuGroup>
        <DropdownMenuItem onClick={() => setDeviceOpen(true)}>打卡设备</DropdownMenuItem>
        <DropdownMenuItem disabled={uploadingAvatar} onClick={() => fileInputRef.current?.click()}>
          {uploadingAvatar ? (
            <>
              <Spinner data-icon="inline-start" />
              上传中...
            </>
          ) : (
            "更换头像"
          )}
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="destructive"
        onClick={() => {
          setToken(null);
          nav(ROUTES.auth.login);
        }}
      >
        退出登录
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => void handleAvatarFile(e.target.files?.[0])}
      />
      {variant === "sidebar" ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="w-full aria-expanded:bg-sidebar-accent" />
            }
          >
            {avatar}
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
            </div>
            <EllipsisVerticalIcon className="ml-auto size-4 shrink-0 opacity-60" />
          </DropdownMenuTrigger>
          {menuContent}
        </DropdownMenu>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className={cn(
                  "flex h-8 max-w-[200px] shrink-0 items-center gap-2 rounded-md px-1.5 outline-none transition-colors",
                  "hover:bg-muted hover:text-foreground dark:hover:bg-muted/50",
                  "data-popup-open:bg-muted data-popup-open:text-foreground dark:data-popup-open:bg-muted/50",
                  "data-open:bg-muted data-open:text-foreground dark:data-open:bg-muted/50",
                  "aria-expanded:bg-muted aria-expanded:text-foreground dark:aria-expanded:bg-muted/50",
                  "focus-visible:bg-muted focus-visible:text-foreground dark:focus-visible:bg-muted/50",
                )}
              />
            }
          >
            {avatar}
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              {user.username ? (
                <span className="truncate text-xs text-muted-foreground">{user.username}</span>
              ) : null}
            </div>
          </DropdownMenuTrigger>
          {menuContent}
        </DropdownMenu>
      )}
      <PunchDeviceDialog
        open={deviceOpen}
        onOpenChange={setDeviceOpen}
        isAdmin={user.role === "admin"}
      />
    </>
  );
}
