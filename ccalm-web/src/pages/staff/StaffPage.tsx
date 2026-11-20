import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import type { AuthMe } from "@/lib/auth";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import { can } from "@/lib/permissions";
import { useAuth } from "@/lib/use-auth";

import { RoleSettings } from "./RoleSettings";
import type { PermissionGroup, Role, StaffUser } from "./staff-types";

type UserDraft = {
  id: string | null;
  username: string;
  displayName: string;
  password: string;
  roleIds: string[];
};

const EMPTY_USER_DRAFT: UserDraft = {
  id: null,
  username: "",
  displayName: "",
  password: "",
  roleIds: [],
};

function RolePicker({
  roles,
  value,
  onChange,
}: {
  roles: Role[];
  value: string[];
  onChange: (roleIds: string[]) => void;
}) {
  function toggle(roleId: string, checked: boolean) {
    onChange(
      checked
        ? [...new Set([...value, roleId])]
        : value.filter((id) => id !== roleId),
    );
  }

  return (
    <div className="grid gap-2 py-1 sm:grid-cols-2">
      {roles.map((role) => (
        <label key={role.id} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={value.includes(role.id)}
            onCheckedChange={(v) => toggle(role.id, v === true)}
          />
          <span>{role.name}</span>
          {role.bookable ? <Badge variant="secondary">可预约</Badge> : null}
          {role.assistable ? <Badge variant="secondary">可配台</Badge> : null}
        </label>
      ))}
    </div>
  );
}

function UserEditor({
  draft,
  roles,
  saving,
  onDraftChange,
  onCancel,
  onSave,
}: {
  draft: UserDraft;
  roles: Role[];
  saving: boolean;
  onDraftChange: (draft: UserDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const passwordMissing = !draft.id && !draft.password;
  const passwordTooShort =
    !!draft.password && draft.password.length > 0 && draft.password.length < 6;
  const canSave =
    !saving &&
    !!draft.username.trim() &&
    !!draft.displayName.trim() &&
    !passwordMissing &&
    !passwordTooShort &&
    draft.roleIds.length > 0;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{draft.id ? "编辑人员" : "新增人员"}</DialogTitle>
          <DialogDescription>
            {draft.id
              ? "可修改姓名、角色与密码（密码留空则不修改）。挂上带「可配台」的角色后会出现在配台选人里。"
              : "创建后即可使用用户名和密码登录，角色必选。"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="staff-username">用户名</Label>
              <Input
                id="staff-username"
                value={draft.username}
                disabled={!!draft.id}
                onChange={(e) =>
                  onDraftChange({ ...draft, username: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="staff-password">密码</Label>
              <Input
                id="staff-password"
                type="password"
                placeholder={draft.id ? "留空则不修改" : "至少 6 位"}
                value={draft.password}
                onChange={(e) =>
                  onDraftChange({ ...draft, password: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="staff-display-name">姓名</Label>
            <Input
              id="staff-display-name"
              value={draft.displayName}
              onChange={(e) =>
                onDraftChange({ ...draft, displayName: e.target.value })
              }
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>角色（可多选）</Label>
            <RolePicker
              roles={roles}
              value={draft.roleIds}
              onChange={(roleIds) => onDraftChange({ ...draft, roleIds })}
            />
            {!draft.roleIds.length ? (
              <p className="text-xs text-muted-foreground">
                至少选择一个角色，员工的身份与权限都来自角色。
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onCancel}>
            取消
          </Button>
          <Button type="button" disabled={!canSave} onClick={onSave}>
            {saving ? (
              <>
                <Spinner data-icon="inline-start" />
                保存中…
              </>
            ) : (
              "保存"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PeoplePanel({
  me,
  roles,
  users,
  reload,
}: {
  me: AuthMe | null;
  roles: Role[];
  users: StaffUser[];
  reload: () => Promise<unknown>;
}) {
  const [draft, setDraft] = React.useState<UserDraft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<StaffUser | null>(
    null,
  );
  const [deleting, setDeleting] = React.useState(false);

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      if (draft.id) {
        await api("PATCH", `/users/${draft.id}`, {
          displayName: draft.displayName.trim(),
          roleIds: draft.roleIds,
          password: draft.password ? draft.password : undefined,
        });
        toast.success("人员已更新");
      } else {
        await api("POST", "/users", {
          username: draft.username.trim(),
          displayName: draft.displayName.trim(),
          password: draft.password,
          roleIds: draft.roleIds,
        });
        toast.success("人员已创建");
      }
      setDraft(null);
      await reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api("DELETE", `/users/${pendingDelete.id}`);
      toast.success(`已删除人员：${pendingDelete.displayName}`);
      setPendingDelete(null);
      await reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            共 {users.length} 人。配台选人来自带「可配台」角色的人员；编辑人员角色或到「角色管理」勾选即可。
          </span>
          <Button
            type="button"
            onClick={() => setDraft({ ...EMPTY_USER_DRAFT })}
          >
            <Plus className="size-4" />
            新增人员
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-muted/40 text-muted-foreground">
              <TableRow>
                <TableHead className="w-[28%]">姓名</TableHead>
                <TableHead className="w-[36%]">角色</TableHead>
                <TableHead className="w-[20%]">创建时间</TableHead>
                <TableHead className="w-[16%]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isSelf = user.id === me?.id;
                const canAssist = user.roles.some((role) => role.assistable);
                return (
                  <TableRow key={user.id} className="border-t border-border">
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium">{user.displayName}</span>
                          {canAssist ? (
                            <Badge variant="secondary">可配台</Badge>
                          ) : null}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {user.username}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <Badge key={role.id} variant="secondary">
                            {role.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            setDraft({
                              id: user.id,
                              username: user.username,
                              displayName: user.displayName,
                              password: "",
                              roleIds: user.roles.map((r) => r.id),
                            })
                          }
                        >
                          编辑
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={isSelf}
                          title={isSelf ? "不能删除当前登录用户" : undefined}
                          onClick={() => setPendingDelete(user)}
                        >
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!users.length ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-muted-foreground"
                  >
                    还没有人员，先新增一个吧
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {draft ? (
        <UserEditor
          draft={draft}
          roles={roles}
          saving={saving}
          onDraftChange={setDraft}
          onCancel={() => setDraft(null)}
          onSave={() => void save()}
        />
      ) : null}

      <AlertDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>删除人员？</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `此操作无法撤销，将永久删除「${pendingDelete.displayName}」及其登录数据。`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? "删除中…" : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function StaffPage() {
  const { me } = useAuth();
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [groups, setGroups] = React.useState<PermissionGroup[]>([]);
  const [users, setUsers] = React.useState<StaffUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<"people" | "roles">("people");

  const reload = React.useCallback(async () => {
    const [roleRows, meta, userRows] = await Promise.all([
      api<Role[]>("GET", "/roles"),
      api<{ groups: PermissionGroup[] }>("GET", "/roles/meta"),
      api<StaffUser[]>("GET", "/users"),
    ]);
    setRoles(roleRows);
    setGroups(meta.groups);
    setUsers(userRows);
    return roleRows;
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await reload();
      } catch (e) {
        if (!cancelled) toast.error(errorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

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
        你没有「人员管理」权限，请联系管理员。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as "people" | "roles")}
      >
        <TabsList>
          <TabsTrigger value="people">人员管理</TabsTrigger>
          <TabsTrigger value="roles">角色管理</TabsTrigger>
        </TabsList>
        <TabsContent value="people">
          <PeoplePanel me={me} roles={roles} users={users} reload={reload} />
        </TabsContent>
        <TabsContent value="roles">
          <RoleSettings
            roles={roles}
            groups={groups}
            users={users}
            reload={reload}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
