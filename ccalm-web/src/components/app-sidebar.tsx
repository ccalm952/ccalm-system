import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { CalendarCheck2, ChevronRightIcon, Package, Sprout } from "lucide-react";

import { NavUser } from "@/components/nav-user";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { attendanceSubNavItems } from "@/config/attendance-nav";
import { implantSubNavItems } from "@/config/implant-nav";
import { warehouseSubNavItems } from "@/config/warehouse-nav";
import { ROUTES } from "@/config/routes";
import { useAuth } from "@/lib/use-auth";

function subPathActive(pathname: string, url: string) {
  return url === "/" ? pathname === "/" : pathname === url || pathname.startsWith(`${url}/`);
}

const navMain: {
  title: string;
  icon: typeof CalendarCheck2;
  items: { title: string; url: string }[];
}[] = [
  { title: "考勤", icon: CalendarCheck2, items: attendanceSubNavItems },
  { title: "种植", icon: Sprout, items: implantSubNavItems },
  { title: "库存", icon: Package, items: warehouseSubNavItems },
];

function SidebarNavCollapsible({
  title,
  icon: Icon,
  items,
  pathname,
}: {
  title: string;
  icon: typeof CalendarCheck2;
  items: { title: string; url: string }[];
  pathname: string;
}) {
  const active = React.useMemo(
    () => items.some((sub) => subPathActive(pathname, sub.url)),
    [pathname, items],
  );
  const [open, setOpen] = React.useState(active);
  React.useEffect(() => {
    if (!active) setOpen(false);
  }, [active]);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group/collapsible"
      render={<SidebarMenuItem />}
    >
      <CollapsibleTrigger render={<SidebarMenuButton className="font-medium" tooltip={title} />}>
        <Icon className="shrink-0" />
        <span>{title}</span>
        <ChevronRightIcon className="ml-auto size-4 shrink-0 transition-transform duration-200 group-data-open/collapsible:rotate-90" />
      </CollapsibleTrigger>
      {items.length ? (
        <CollapsibleContent>
          <SidebarMenuSub className="border-l-0">
            {items.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  isActive={subPathActive(pathname, subItem.url)}
                  render={<Link to={subItem.url} />}
                >
                  {subItem.title}
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      ) : null}
    </Collapsible>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation();
  const { me, setMe } = useAuth();

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link to={ROUTES.home} />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                <img src="/lucide-logo-light.svg" alt="" className="size-8 dark:hidden" />
                <img src="/lucide-logo-dark.svg" alt="" className="hidden size-8 dark:block" />
              </div>
              <div className="min-w-0 leading-none">
                <span className="block truncate whitespace-nowrap font-medium">CCALM</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navMain.map((item) => (
              <SidebarNavCollapsible
                key={item.title}
                title={item.title}
                icon={item.icon}
                items={item.items}
                pathname={pathname}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <NavUser
              variant="sidebar"
              user={{
                id: me?.id ?? "",
                name: me?.displayName ?? "用户",
                username: me?.username,
                avatar: me?.avatarUrl ?? "",
                role: me?.role ?? "user",
              }}
              onAvatarUpdated={(avatarUrl) => {
                setMe((current) => (current ? { ...current, avatarUrl } : current));
              }}
              onUserSwitched={(user) => {
                setMe(user);
              }}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
