import { useNavigate } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { setToken } from "@/lib/api";
import { ROUTES } from "@/config/routes";
import { BellIcon, CreditCardIcon, EllipsisVerticalIcon, LogOutIcon, UserIcon } from "lucide-react";

function avatarInitials(displayName: string) {
  const t = displayName.trim();
  if (!t) return "?";
  return t.length <= 2 ? t : t.slice(0, 2);
}

export function NavUser({
  user,
  variant = "sidebar",
}: {
  user: {
    /** 显示名称（与后台「显示名称」一致） */
    name: string;
    /** 登录用户名，可选展示在副标题 */
    username?: string;
    avatar: string;
  };
  /** sidebar：侧栏底栏；header：页顶右上角 */
  variant?: "sidebar" | "header";
}) {
  const nav = useNavigate();
  const { isMobile } = useSidebar();
  const initials = avatarInitials(user.name);
  const menuSide = variant === "sidebar" && !isMobile ? "right" : "bottom";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          variant === "sidebar" ? (
            <SidebarMenuButton size="lg" className="w-full aria-expanded:bg-sidebar-accent" />
          ) : (
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
          )
        }
      >
        <Avatar>
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
          <span className="truncate font-medium">{user.name}</span>
          {user.username ? (
            <span className="truncate text-xs text-muted-foreground">{user.username}</span>
          ) : null}
        </div>
        {variant === "sidebar" ? (
          <EllipsisVerticalIcon className="ml-auto size-4 shrink-0 opacity-60" />
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56 rounded-lg"
        side={menuSide}
        align="end"
        sideOffset={4}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar>
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                {user.username ? (
                  <span className="truncate text-xs text-muted-foreground">{user.username}</span>
                ) : null}
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => nav(ROUTES.users.root)}>
            <UserIcon className="size-4" />
            账户
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CreditCardIcon className="size-4" />
            账单
          </DropdownMenuItem>
          <DropdownMenuItem>
            <BellIcon className="size-4" />
            通知
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
          <LogOutIcon className="size-4" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
