import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { CalendarCheck2, ChevronRightIcon, Smile, Sprout, StickyNote, Wallet } from "lucide-react";

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
  useSidebar,
} from "@/components/ui/sidebar";
import { attendanceNavItemsForRole } from "@/config/attendance-nav";
import { implantSubNavItems } from "@/config/implant-nav";
import { orthodonticsSubNavItems } from "@/config/orthodontics-nav";
import { memosNavItem } from "@/config/memos-nav";
import { salaryNavItem } from "@/config/salary-nav";
import { ROUTES } from "@/config/routes";
import { useAuth } from "@/lib/use-auth";

function subPathActive(pathname: string, url: string) {
  return url === "/" ? pathname === "/" : pathname === url || pathname.startsWith(`${url}/`);
}

function SidebarNavCollapsible({
  title,
  icon: Icon,
  items,
  activePath,
  onNavClick,
}: {
  title: string;
  icon: typeof CalendarCheck2;
  items: { title: string; url: string }[];
  activePath: string;
  onNavClick: (url: string) => void;
}) {
  const active = React.useMemo(
    () => items.some((sub) => subPathActive(activePath, sub.url)),
    [activePath, items],
  );
  const [open, setOpen] = React.useState(true);
  React.useEffect(() => {
    if (active) setOpen(true);
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
                  isActive={subPathActive(activePath, subItem.url)}
                  render={<Link to={subItem.url} onClick={() => onNavClick(subItem.url)} />}
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
  const { setOpenMobile } = useSidebar();
  const { me, setMe } = useAuth();
  const [pendingPath, setPendingPath] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPendingPath(null);
  }, [pathname]);

  const activePath = pendingPath ?? pathname;

  function onNavClick(url: string) {
    setPendingPath(url);
    setOpenMobile(false);
  }

  const navMain: {
    title: string;
    icon: typeof CalendarCheck2;
    items: { title: string; url: string }[];
  }[] = [
    { title: "考勤", icon: CalendarCheck2, items: attendanceNavItemsForRole(me?.role) },
    { title: "种植", icon: Sprout, items: implantSubNavItems },
    { title: "正畸", icon: Smile, items: orthodonticsSubNavItems },
  ];

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
                activePath={activePath}
                onNavClick={onNavClick}
              />
            ))}
            <SidebarMenuItem>
              <SidebarMenuButton
                className="font-medium"
                isActive={subPathActive(activePath, memosNavItem.url)}
                render={<Link to={memosNavItem.url} onClick={() => onNavClick(memosNavItem.url)} />}
                tooltip={memosNavItem.title}
              >
                <StickyNote className="shrink-0" />
                <span>{memosNavItem.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {me?.role === "admin" ? (
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="font-medium"
                  isActive={subPathActive(activePath, salaryNavItem.url)}
                  render={<Link to={salaryNavItem.url} onClick={() => onNavClick(salaryNavItem.url)} />}
                  tooltip={salaryNavItem.title}
                >
                  <Wallet className="shrink-0" />
                  <span>{salaryNavItem.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ) : null}
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
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
