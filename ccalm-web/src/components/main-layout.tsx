import { Link, Outlet } from "react-router-dom";

import { AppSidebar } from "@/components/app-sidebar";
import { MakeupTodoButton } from "@/components/makeup-todo-button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { attendanceSubNavItems } from "@/config/attendance-nav";
import { implantSubNavItems } from "@/config/implant-nav";
import { salaryNavItem } from "@/config/salary-nav";
import { ROUTES } from "@/config/routes";
import { useAuth } from "@/lib/use-auth";

export function MainLayout() {
  const { me } = useAuth();

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar collapsible="offcanvas" />
      <SidebarInset>
        <header className="sticky top-0 z-40 flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b bg-background px-4 py-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <SidebarTrigger className="size-9" />
            <NavigationMenu className="hidden md:block">
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>考勤</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    {attendanceSubNavItems.map((item) => (
                      <NavigationMenuLink
                        className="w-62"
                        key={item.title}
                        render={<Link to={item.url} />}
                      >
                        {item.title}
                      </NavigationMenuLink>
                    ))}
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>种植</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    {implantSubNavItems.map((item) => (
                      <NavigationMenuLink
                        className="w-62"
                        key={item.title}
                        render={<Link to={item.url} />}
                      >
                        {item.title}
                      </NavigationMenuLink>
                    ))}
                  </NavigationMenuContent>
                </NavigationMenuItem>
                {me?.role === "admin" ? (
                  <NavigationMenuItem>
                    <NavigationMenuLink render={<Link to={ROUTES.salary.root} />}>
                      {salaryNavItem.title}
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ) : null}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <MakeupTodoButton />
          </div>
        </header>
        <div className="flex min-w-0 flex-1 flex-col">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
