import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ROUTES } from "@/config/routes";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import { PATIENT_AUTO_GROUPS, type PatientGroup } from "@/lib/patients/groups";
import {
  loadRecentPatients,
  RECENT_PATIENTS_EVENT,
  type RecentPatient,
} from "@/lib/patients/recent-patients";

export type PatientSidebarTab = "groups" | "recent";
export type PatientFilter = { group: PatientGroup; tag: string | null };

type GroupsResponse = {
  groups: { group: PatientGroup; count: number }[];
  tags: { tag: string; count: number }[];
};

const COLLAPSED_KEY = "patients:sidebar-collapsed";
const LAST_DETAIL_KEY = "patients:last-detail";

function patientsListUrl(filter: PatientFilter): string {
  if (filter.tag)
    return `${ROUTES.patients.root}?tag=${encodeURIComponent(filter.tag)}`;
  if (filter.group === "all") return ROUTES.patients.root;
  return `${ROUTES.patients.root}?group=${filter.group}`;
}

function GroupLink({
  label,
  count,
  active,
  filter,
}: {
  label: string;
  count: number;
  active: boolean;
  filter: PatientFilter;
}) {
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      className="w-full justify-between"
      nativeButton={false}
      render={<Link to={patientsListUrl(filter)} />}
    >
      <span className="truncate">{label}</span>
      <span className="text-muted-foreground">{count}</span>
    </Button>
  );
}

function PatientLinks({
  patients,
  currentId,
  extra,
}: {
  patients: RecentPatient[];
  currentId: number | null;
  extra: (p: RecentPatient) => React.ReactNode;
}) {
  const { pathname, search } = useLocation();
  const params = new URLSearchParams(
    pathname.startsWith(`${ROUTES.patients.root}/`) ? search : "",
  );
  params.delete("record");
  params.delete("charge");
  const query = params.toString();
  return (
    <div className="flex flex-col gap-1">
      {patients.map((p) => (
        <Button
          key={p.id}
          variant={p.id === currentId ? "secondary" : "ghost"}
          className="w-full justify-between"
          nativeButton={false}
          render={
            <Link
              to={`${ROUTES.patients.detail(p.id)}${query ? `?${query}` : ""}`}
            />
          }
        >
          <span className="truncate">{p.name}</span>
          <span className="text-muted-foreground">{extra(p)}</span>
        </Button>
      ))}
    </div>
  );
}

export function PatientSidebar({
  defaultTab,
  currentId = null,
  activeFilter = null,
  refreshKey = 0,
}: {
  defaultTab: PatientSidebarTab;
  currentId?: number | null;
  activeFilter?: PatientFilter | null;
  refreshKey?: number;
}) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  React.useEffect(() => {
    if (currentId != null)
      sessionStorage.setItem(LAST_DETAIL_KEY, pathname + search);
  }, [currentId, pathname, search]);
  const [collapsed, setCollapsed] = React.useState(
    () => localStorage.getItem(COLLAPSED_KEY) === "1",
  );
  const [groups, setGroups] = React.useState<GroupsResponse>({
    groups: [],
    tags: [],
  });
  const [recent, setRecent] = React.useState(loadRecentPatients);
  React.useEffect(() => {
    api<GroupsResponse>("GET", "/patients/groups")
      .then(setGroups)
      .catch((e: unknown) => toast.error(errorMessage(e)));
  }, [refreshKey]);

  React.useEffect(() => {
    const sync = () => setRecent(loadRecentPatients());
    window.addEventListener(RECENT_PATIENTS_EVENT, sync);
    return () => window.removeEventListener(RECENT_PATIENTS_EVENT, sync);
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      localStorage.setItem(COLLAPSED_KEY, c ? "0" : "1");
      return !c;
    });
  }

  const groupCount = (group: PatientGroup) =>
    groups.groups.find((g) => g.group === group)?.count ?? 0;
  const isActive = (f: PatientFilter) =>
    activeFilter != null &&
    activeFilter.group === f.group &&
    activeFilter.tag === f.tag;

  return (
    <aside
      className={cn(
        "sticky top-20 hidden h-[calc(100svh-6.5rem)] shrink-0 md:block",
        collapsed ? "w-0" : "w-56",
      )}
    >
      {collapsed ? null : (
        <Card className="h-full">
          <CardContent className="flex min-h-0 flex-1 flex-col">
            <Tabs
              defaultValue={defaultTab}
              onValueChange={(v) => {
                if (v === "groups" && currentId != null)
                  void navigate(ROUTES.patients.root);
                const lastDetail = sessionStorage.getItem(LAST_DETAIL_KEY);
                if (v === "recent" && currentId == null && lastDetail)
                  void navigate(lastDetail);
              }}
              className="min-h-0 flex-1"
            >
              <TabsList className="w-full">
                <TabsTrigger value="groups">分组</TabsTrigger>
                <TabsTrigger value="recent">最近</TabsTrigger>
              </TabsList>
              <TabsContent value="groups" className="flex min-h-0 flex-col">
                <ScrollArea className="min-h-0 flex-1">
                  <div className="flex flex-col gap-1">
                    <GroupLink
                      label="全部患者"
                      count={groupCount("all")}
                      active={isActive({ group: "all", tag: null })}
                      filter={{ group: "all", tag: null }}
                    />
                    <Separator className="my-2" />
                    <CardTitle className="px-2.5 py-1 text-muted-foreground">
                      自动分组
                    </CardTitle>
                    {PATIENT_AUTO_GROUPS.map((g) => (
                      <GroupLink
                        key={g.value}
                        label={g.label}
                        count={groupCount(g.value)}
                        active={isActive({ group: g.value, tag: null })}
                        filter={{ group: g.value, tag: null }}
                      />
                    ))}
                    <Separator className="my-2" />
                    <CardTitle className="px-2.5 py-1 text-muted-foreground">
                      标签
                    </CardTitle>
                    {groups.tags.map((t) => (
                      <GroupLink
                        key={t.tag}
                        label={t.tag}
                        count={t.count}
                        active={isActive({ group: "all", tag: t.tag })}
                        filter={{ group: "all", tag: t.tag }}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="recent" className="flex min-h-0 flex-col">
                <ScrollArea className="min-h-0 flex-1">
                  <PatientLinks
                    patients={recent}
                    currentId={currentId}
                    extra={(p) => p.chartNo}
                  />
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
      <div className="absolute top-1/2 -right-4 z-10 -translate-y-1/2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="bg-background"
          onClick={toggleCollapsed}
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </Button>
      </div>
    </aside>
  );
}
