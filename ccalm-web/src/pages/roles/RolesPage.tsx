import * as React from "react";
import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import { can } from "@/lib/permissions";
import { useAuth } from "@/lib/use-auth";

type Role = {
  id: string;
  name: string;
  bookable: boolean;
  assistable: boolean;
  permissions: string[];
  builtin: boolean;
  sortOrder: number;
  userCount: number;
};

type PermissionGroup = {
  key: string;
  label: string;
  items: { key: string; label: string }[];
};

type UserRow = {
  id: string;
  username: string;
  displayName: string;
  role: "user" | "admin";
  roles: { id: string; name: string; bookable: boolean; assistable: boolean }[];
};

type Draft = {
  id: string | null;
  name: string;
  bookable: boolean;
  assistable: boolean;
  permissions: string[];
};

const EMPTY_DRAFT: Draft = {
  id: null,
  name: "",
  bookable: false,
  assistable: false,
  permissions: [],
};

export function RolesPage() {
  const { me } = useAuth();
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [groups, setGroups] = React.useState<PermissionGroup[]>([]);
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [removing, setRemoving] = React.useState<Role | null>(null);

  const load = React.useCallback(async () => {
    try {
      const [roleRows, meta, userRows] = await Promise.all([
        api<Role[]>("GET", "/roles"),
        api<{ groups: PermissionGroup[] }>("GET", "/roles/meta"),
        api<UserRow[]>("GET", "/users"),
      ]);
      setRoles(roleRows);
      setGroups(meta.groups);
      setUsers(userRows);
      return roleRows;
    } catch (e) {
      toast.error(errorMessage(e));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!draft && roles.length) {
      const first = roles[0];
      setDraft({
        id: first.id,
        name: first.name,
        bookable: first.bookable,
        assistable: first.assistable,
        permissions: first.permissions,
      });
    }
  }, [roles, draft]);

  function selectRole(role: Role) {
    setDraft({
      id: role.id,
      name: role.name,
      bookable: role.bookable,
      assistable: role.assistable,
      permissions: role.permissions,
    });
  }

  function togglePermission(key: string, checked: boolean) {
    setDraft((d) =>
      d
        ? {
            ...d,
            permissions: checked
              ? [...new Set([...d.permissions, key])]
              : d.permissions.filter((p) => p !== key),
          }
        : d,
    );
  }

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error("请填写角色名称");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: draft.name.trim(),
        bookable: draft.bookable,
        assistable: draft.assistable,
        permissions: draft.permissions,
      };
      if (draft.id) await api("PUT", `/roles/${draft.id}`, body);
      else await api("POST", "/roles", body);
      toast.success("已保存");
      const rows = await load();
      const saved = draft.id
        ? rows.find((r) => r.id === draft.id)
        : rows.find((r) => r.name === body.name);
      if (saved) selectRole(saved);
      else setDraft(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    try {
      await api("DELETE", `/roles/${removing.id}`);
      toast.success("已删除");
      setDraft(null);
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setRemoving(null);
    }
  }

  async function toggleMember(user: UserRow, roleId: string, checked: boolean) {
    const next = checked
      ? [...new Set([...user.roles.map((r) => r.id), roleId])]
      : user.roles.map((r) => r.id).filter((id) => id !== roleId);
    if (!next.length) {
      toast.error("每个员工至少要保留一个角色");
      return;
    }
    try {
      const updated = await api<UserRow>("PATCH", `/users/${user.id}`, {
        roleIds: next,
      });
      setUsers((rows) =>
        rows.map((r) =>
          r.id === user.id
            ? { ...r, role: updated.role, roles: updated.roles }
            : r,
        ),
      );
      void load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="size-8 opacity-60" />
      </div>
    );
  }

  if (!can(me, "staff.manage")) {
    return (
      <div className="p-6 text-muted-foreground">
        你没有「人员与角色管理」权限，请联系管理员。
      </div>
    );
  }

  const selectedRole = roles.find((r) => r.id === draft?.id) ?? null;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">人员与角色</h1>
          <span className="text-muted-foreground">
            角色 = 岗位身份（可被预约 / 可配台）+ 权限点，可随时调整
          </span>
        </div>
        <Button
          type="button"
          onClick={() => setDraft({ ...EMPTY_DRAFT, permissions: [] })}
        >
          <Plus className="size-4" />
          新建角色
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-sm">角色（{roles.length}）</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {roles.map((role) => {
              const active = draft?.id === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => selectRole(role)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                    active ? "bg-accent" : "hover:bg-accent/50"
                  }`}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-1.5 font-medium">
                      {role.name}
                      {role.builtin ? (
                        <Badge variant="secondary">内置</Badge>
                      ) : null}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {role.permissions.length} 项权限 · {role.userCount} 人
                      {role.bookable ? " · 可被预约" : ""}
                      {role.assistable ? " · 可配台" : ""}
                    </span>
                  </span>
                </button>
              );
            })}
            {!roles.length ? (
              <p className="py-6 text-center text-muted-foreground">暂无角色</p>
            ) : null}
          </CardContent>
        </Card>

        {draft ? (
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm">
                  {draft.id
                    ? `编辑角色：${selectedRole?.name ?? draft.name}`
                    : "新建角色"}
                </CardTitle>
                {draft.id && !selectedRole?.builtin ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (selectedRole) setRemoving(selectedRole);
                    }}
                  >
                    <Trash2 className="size-4" />
                    删除
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="role-name">角色名称</Label>
                    <Input
                      id="role-name"
                      value={draft.name}
                      disabled={!!selectedRole?.builtin}
                      placeholder="如：医生、护士、前台"
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, name: e.target.value } : d,
                        )
                      }
                    />
                  </div>
                  <div className="flex items-end gap-6 pb-2">
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={draft.bookable}
                        onCheckedChange={(v) =>
                          setDraft((d) =>
                            d ? { ...d, bookable: v === true } : d,
                          )
                        }
                      />
                      <span className="text-sm">可被预约（医生）</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={draft.assistable}
                        onCheckedChange={(v) =>
                          setDraft((d) =>
                            d ? { ...d, assistable: v === true } : d,
                          )
                        }
                      />
                      <span className="text-sm">可配台（护士）</span>
                    </label>
                  </div>
                </div>

                <Separator />

                <div className="flex flex-col gap-3">
                  {groups.map((group) => {
                    const allChecked = group.items.every((i) =>
                      draft.permissions.includes(i.key),
                    );
                    return (
                      <div key={group.key} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={allChecked}
                            onCheckedChange={(v) =>
                              setDraft((d) => {
                                if (!d) return d;
                                const rest = d.permissions.filter(
                                  (p) => !group.items.some((i) => i.key === p),
                                );
                                return {
                                  ...d,
                                  permissions:
                                    v === true
                                      ? [
                                          ...rest,
                                          ...group.items.map((i) => i.key),
                                        ]
                                      : rest,
                                };
                              })
                            }
                          />
                          <span className="text-sm font-medium">
                            {group.label}
                          </span>
                        </div>
                        <div className="grid gap-2 pl-6 sm:grid-cols-2 xl:grid-cols-3">
                          {group.items.map((item) => (
                            <label
                              key={item.key}
                              className="flex items-center gap-2 text-sm"
                            >
                              <Checkbox
                                checked={draft.permissions.includes(item.key)}
                                onCheckedChange={(v) =>
                                  togglePermission(item.key, v === true)
                                }
                              />
                              {item.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => {
                      if (draft.id) {
                        const role = roles.find((r) => r.id === draft.id);
                        if (role) selectRole(role);
                      } else {
                        setDraft(null);
                      }
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    type="button"
                    disabled={saving}
                    onClick={() => void save()}
                  >
                    保存
                  </Button>
                </div>
              </CardContent>
            </Card>

            {draft.id ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    成员（勾选后该员工就拥有此角色）
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {users.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={user.roles.some((r) => r.id === draft.id)}
                        onCheckedChange={(v) =>
                          void toggleMember(user, draft.id!, v === true)
                        }
                      />
                      <span className="truncate">
                        {user.displayName}
                        <span className="ml-1 text-xs text-muted-foreground">
                          {user.username}
                        </span>
                      </span>
                    </label>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}
      </div>

      <AlertDialog
        open={removing != null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除角色</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除「{removing?.name}」吗？有成员时无法删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmRemove()}>
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
