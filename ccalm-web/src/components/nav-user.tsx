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
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
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

function userAvatar(user: { displayName: string; avatarUrl: string }) {
  return (
    <Avatar size="lg">
      <AvatarImage src={user.avatarUrl} alt={user.displayName} />
      <AvatarFallback>{avatarInitials(user.displayName)}</AvatarFallback>
    </Avatar>
  );
}

export function NavUser({
  user,
  variant = "sidebar",
  onAvatarUpdated,
  onUserSwitched,
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
  onUserSwitched?: (user: AuthMe) => void;
}) {
  const nav = useNavigate();
  const { isMobile } = useSidebar();
  const initials = avatarInitials(user.name);
  const menuSide = variant === "sidebar" && !isMobile ? "right" : "bottom";
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [switchingUserId, setSwitchingUserId] = React.useState<string | null>(null);
  const [users, setUsers] = React.useState<AuthMe[]>([]);
  const [loadingUsers, setLoadingUsers] = React.useState(false);
  const currentUser = React.useMemo<AuthMe>(
    () => ({
      id: user.id,
      username: user.username ?? "",
      displayName: user.name,
      avatarUrl: user.avatar,
      role: user.role,
    }),
    [user.avatar, user.id, user.name, user.role, user.username],
  );

  const loadUsers = React.useCallback(async () => {
    setLoadingUsers(true);
    try {
      const list = await api<AuthMe[]>("GET", "/users/switchable");
      setUsers(list);
    } catch {
      setUsers([currentUser]);
    } finally {
      setLoadingUsers(false);
    }
  }, [currentUser]);

  const switchUser = React.useCallback(
    async (targetUser: AuthMe) => {
      if (targetUser.id === user.id) return;
      setSwitchingUserId(targetUser.id);
      try {
        const result = await api<{ accessToken: string; user: AuthMe }>(
          "POST",
          "/auth/switch-user",
          {
            userId: targetUser.id,
          },
        );
        setToken(result.accessToken);
        onUserSwitched?.(result.user);
        toast.success(`已切换到：${result.user.displayName}`);
      } catch (e) {
        toast.error(errorMessage(e));
      } finally {
        setSwitchingUserId(null);
      }
    },
    [onUserSwitched, user.id],
  );

  const handleAvatarFile = React.useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      const form = new FormData();
      form.append("avatar", file);
      setUploadingAvatar(true);
      try {
        const updated = await api<AuthMe>("POST", "/users/me/avatar", form);
        onAvatarUpdated?.(updated.avatarUrl);
        setUsers((current) =>
          current.map((item) =>
            item.id === updated.id ? { ...item, avatarUrl: updated.avatarUrl } : item,
          ),
        );
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
        {loadingUsers ? (
          <DropdownMenuItem disabled>加载中...</DropdownMenuItem>
        ) : users.length ? (
          users.map((item) => (
            <DropdownMenuItem
              key={item.id}
              disabled={switchingUserId === item.id}
              onClick={() => void switchUser(item)}
            >
              {userAvatar(item)}
              <span className="truncate">{item.displayName}</span>
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>暂无可切换用户</DropdownMenuItem>
        )}
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem disabled={uploadingAvatar} onClick={() => fileInputRef.current?.click()}>
          {uploadingAvatar ? "上传中..." : "更换头像"}
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

  if (variant === "sidebar") {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => void handleAvatarFile(e.target.files?.[0])}
        />
        <DropdownMenu
          onOpenChange={(open) => {
            if (open) void loadUsers();
          }}
        >
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
      </>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => void handleAvatarFile(e.target.files?.[0])}
      />
      <DropdownMenu
        onOpenChange={(open) => {
          if (open) void loadUsers();
        }}
      >
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
    </>
  );
}
