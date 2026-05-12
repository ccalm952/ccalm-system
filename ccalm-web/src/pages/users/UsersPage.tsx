import * as React from "react";
import { Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import { toast } from "@/components/ui/sonner";

type UserRow = {
  id: string;
  username: string;
  displayName: string;
  role: "user" | "admin";
  createdAt: string;
};

export function UsersPage() {
  const [me, setMe] = React.useState<{ id: string; role: "user" | "admin" } | null>(null);
  const [rows, setRows] = React.useState<UserRow[] | null>(null);

  const roleItems = React.useMemo(
    () => [
      { label: "user", value: "user" },
      { label: "admin", value: "admin" },
    ],
    [],
  );
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createSubmitting, setCreateSubmitting] = React.useState(false);
  const [newUser, setNewUser] = React.useState({
    username: "",
    displayName: "",
    password: "",
    role: "user" as "user" | "admin",
  });

  const [editOpen, setEditOpen] = React.useState(false);
  const [editSubmitting, setEditSubmitting] = React.useState(false);
  const [editUser, setEditUser] = React.useState<
    | (UserRow & {
        password: string;
        role: "user" | "admin";
        displayName: string;
      })
    | null
  >(null);

  const [userPendingDelete, setUserPendingDelete] = React.useState<UserRow | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = React.useState(false);
  const adminCount = rows?.filter((row) => row.role === "admin").length ?? 0;

  function deleteDisabledReason(row: UserRow): string | null {
    if (row.id === me?.id) return "不能删除当前登录用户";
    if (row.role === "admin" && adminCount <= 1) return "至少保留一个管理员";
    return null;
  }

  async function load() {
    const meRes = await api<{ id: string; role: "user" | "admin"; displayName: string }>(
      "GET",
      "/auth/me",
    );
    setMe({ id: meRes.id, role: meRes.role });

    if (meRes.role === "admin") {
      const list = await api<UserRow[]>("GET", "/users");
      setRows(list);
    } else {
      setRows([]);
    }
  }

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
        if (cancelled) return;
      } catch {
        if (cancelled) return;
        window.location.href = "/login";
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-svh bg-background p-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-end gap-2">
              {me?.role === "admin" ? (
                <Button type="button" onClick={() => setCreateOpen(true)}>
                  创建
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {me?.role !== "admin" ? (
              <div className="text-sm text-muted-foreground">仅管理员可管理人员。</div>
            ) : rows === null ? (
              <div className="text-sm text-muted-foreground">加载中…</div>
            ) : (
              <ScrollArea className="w-full">
                <Table className="w-full min-w-[800px] table-fixed">
                  <TableHeader className="bg-muted/40 text-muted-foreground">
                    <TableRow>
                      <TableHead className="w-1/5">用户名</TableHead>
                      <TableHead className="w-1/5">显示名称</TableHead>
                      <TableHead className="w-1/5">角色</TableHead>
                      <TableHead className="w-1/5">创建时间</TableHead>
                      <TableHead className="w-1/5">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => {
                      const disabledReason = deleteDisabledReason(r);
                      return (
                        <TableRow key={r.id} className="border-t border-border">
                          <TableCell className="w-1/5">{r.username}</TableCell>
                          <TableCell className="w-1/5">{r.displayName}</TableCell>
                          <TableCell className="w-1/5">{r.role}</TableCell>
                          <TableCell className="w-1/5 text-muted-foreground">
                            {new Date(r.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="w-1/5">
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                  setEditUser({ ...r, password: "" });
                                  setEditOpen(true);
                                }}
                              >
                                编辑
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                disabled={!!disabledReason}
                                title={disabledReason ?? undefined}
                                onClick={() => setUserPendingDelete(r)}
                              >
                                删除
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) {
              setCreateSubmitting(false);
              setNewUser({ username: "", displayName: "", password: "", role: "user" });
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建人员</DialogTitle>
              <DialogDescription>创建后即可使用用户名和密码登录。</DialogDescription>
            </DialogHeader>

            <FieldSet className="text-sm">
              <div className="flex flex-col gap-4">
                <FieldGroup className="flex flex-col sm:flex-row">
                  <Field className="flex-1" orientation="responsive">
                    <FieldLabel>
                      <FieldTitle>用户名</FieldTitle>
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        className="w-full"
                        value={newUser.username}
                        onChange={(e) => setNewUser((s) => ({ ...s, username: e.target.value }))}
                      />
                    </FieldContent>
                  </Field>
                  <Field className="flex-1" orientation="responsive">
                    <FieldLabel>
                      <FieldTitle>密码</FieldTitle>
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        className="w-full"
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser((s) => ({ ...s, password: e.target.value }))}
                      />
                    </FieldContent>
                  </Field>
                </FieldGroup>

                <FieldGroup className="flex flex-col sm:flex-row">
                  <Field className="flex-1" orientation="responsive">
                    <FieldLabel>
                      <FieldTitle>姓名</FieldTitle>
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        className="w-full"
                        value={newUser.displayName}
                        onChange={(e) =>
                          setNewUser((s) => ({
                            ...s,
                            displayName: e.target.value,
                          }))
                        }
                      />
                    </FieldContent>
                  </Field>
                  <Field className="flex-1" orientation="responsive">
                    <FieldLabel>
                      <FieldTitle>角色</FieldTitle>
                    </FieldLabel>
                    <FieldContent>
                      <Select
                        value={newUser.role}
                        onValueChange={(v: string | null) => {
                          if (!v) return;
                          setNewUser((s) => ({ ...s, role: v as "user" | "admin" }));
                        }}
                        items={roleItems}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="选择角色" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {roleItems.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FieldContent>
                  </Field>
                </FieldGroup>
              </div>
            </FieldSet>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                disabled={createSubmitting}
                onClick={() => setCreateOpen(false)}
              >
                取消
              </Button>
              <Button
                type="button"
                disabled={
                  createSubmitting ||
                  !newUser.username.trim() ||
                  !newUser.displayName.trim() ||
                  !newUser.password
                }
                onClick={() => {
                  void (async () => {
                    try {
                      setCreateSubmitting(true);
                      await api("POST", "/users", {
                        username: newUser.username.trim(),
                        displayName: newUser.displayName.trim(),
                        password: newUser.password,
                        role: newUser.role,
                      });
                      toast.success("用户已创建");
                      setCreateOpen(false);
                      await load();
                    } catch (e) {
                      toast.error(errorMessage(e));
                    } finally {
                      setCreateSubmitting(false);
                    }
                  })();
                }}
              >
                {createSubmitting ? "创建中…" : "创建"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) {
              setEditSubmitting(false);
              setEditUser(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>编辑人员</DialogTitle>
              <DialogDescription>可修改姓名、角色与密码（留空则不修改密码）。</DialogDescription>
            </DialogHeader>

            {editUser ? (
              <FieldSet className="text-sm">
                <div className="flex flex-col gap-4">
                  <FieldGroup className="flex flex-col sm:flex-row">
                    <Field className="flex-1" orientation="responsive">
                      <FieldLabel>
                        <FieldTitle>用户名</FieldTitle>
                      </FieldLabel>
                      <FieldContent>
                        <Input className="w-full" value={editUser.username} disabled />
                      </FieldContent>
                    </Field>
                    <Field className="flex-1" orientation="responsive">
                      <FieldLabel>
                        <FieldTitle>密码</FieldTitle>
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          className="w-full"
                          type="password"
                          value={editUser.password}
                          onChange={(e) =>
                            setEditUser((s) => (s ? { ...s, password: e.target.value } : s))
                          }
                        />
                      </FieldContent>
                    </Field>
                  </FieldGroup>

                  <FieldGroup className="flex flex-col sm:flex-row">
                    <Field className="flex-1" orientation="responsive">
                      <FieldLabel>
                        <FieldTitle>姓名</FieldTitle>
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          className="w-full"
                          value={editUser.displayName}
                          onChange={(e) =>
                            setEditUser((s) => (s ? { ...s, displayName: e.target.value } : s))
                          }
                        />
                      </FieldContent>
                    </Field>
                    <Field className="flex-1" orientation="responsive">
                      <FieldLabel>
                        <FieldTitle>角色</FieldTitle>
                      </FieldLabel>
                      <FieldContent>
                        <Select
                          value={editUser.role}
                          onValueChange={(v: string | null) => {
                            if (!v) return;
                            setEditUser((s) => (s ? { ...s, role: v as "user" | "admin" } : s));
                          }}
                          items={roleItems}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="选择角色" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {roleItems.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                  {item.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </FieldContent>
                    </Field>
                  </FieldGroup>
                </div>
              </FieldSet>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                disabled={editSubmitting}
                onClick={() => setEditOpen(false)}
              >
                取消
              </Button>
              <Button
                type="button"
                disabled={editSubmitting || !editUser?.displayName.trim()}
                onClick={() => {
                  const u = editUser;
                  if (!u) return;
                  void (async () => {
                    try {
                      setEditSubmitting(true);
                      await api("PATCH", `/users/${u.id}`, {
                        displayName: u.displayName.trim(),
                        role: u.role,
                        password: u.password ? u.password : undefined,
                      });
                      toast.success("用户已更新");
                      setEditOpen(false);
                      await load();
                    } catch (e) {
                      toast.error(errorMessage(e));
                    } finally {
                      setEditSubmitting(false);
                    }
                  })();
                }}
              >
                {editSubmitting ? "保存中…" : "保存"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!userPendingDelete}
          onOpenChange={(open) => {
            if (!open) {
              setUserPendingDelete(null);
              setDeleteSubmitting(false);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                <Trash2Icon />
              </AlertDialogMedia>
              <AlertDialogTitle>删除用户？</AlertDialogTitle>
              <AlertDialogDescription>
                {userPendingDelete ? (
                  <>此操作无法撤销，将永久删除用户「{userPendingDelete.username}」及其登录数据。</>
                ) : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel variant="outline" disabled={deleteSubmitting}>
                取消
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={deleteSubmitting || !userPendingDelete}
                onClick={(e) => {
                  e.preventDefault();
                  const u = userPendingDelete;
                  if (!u) return;
                  void (async () => {
                    setDeleteSubmitting(true);
                    try {
                      await api("DELETE", `/users/${u.id}`);
                      await load();
                      toast.success(`已删除用户：${u.username}`);
                      setUserPendingDelete(null);
                    } catch (err) {
                      toast.error(errorMessage(err));
                    } finally {
                      setDeleteSubmitting(false);
                    }
                  })();
                }}
              >
                {deleteSubmitting ? "删除中…" : "删除"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
