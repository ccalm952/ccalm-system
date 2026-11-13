import * as React from "react";
import { Plus } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/charges/charge-calc";
import { errorMessage } from "@/lib/errorMessage";
import type { FeeCategory, FeeItem } from "@/lib/fee-catalog/types";

type Editing =
  | { kind: "category"; category: FeeCategory | null }
  | { kind: "item"; item: FeeItem | null };

type Removing =
  { kind: "category"; category: FeeCategory } | { kind: "item"; item: FeeItem };

const NUMBER_INPUT =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

export function FeeItemsPage() {
  const [categories, setCategories] = React.useState<FeeCategory[]>([]);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [editing, setEditing] = React.useState<Editing | null>(null);
  const [removing, setRemoving] = React.useState<Removing | null>(null);
  const [name, setName] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setCategories(await api<FeeCategory[]>("GET", "/fee-catalog"));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const selected =
    categories.find((c) => c.id === selectedId) ?? categories[0] ?? null;

  function openEdit(next: Editing) {
    setEditing(next);
    if (next.kind === "category") {
      setName(next.category?.name ?? "");
    } else {
      setName(next.item?.name ?? "");
      setPrice(next.item ? String(next.item.price) : "");
    }
  }

  async function save() {
    if (!editing) return;
    if (!name.trim()) {
      toast.error(
        editing.kind === "category" ? "请填写分类名称" : "请填写项目名称",
      );
      return;
    }
    setSaving(true);
    try {
      if (editing.kind === "category") {
        if (editing.category) {
          await api("PUT", `/fee-catalog/categories/${editing.category.id}`, {
            name,
          });
        } else {
          const created = await api<{ id: number }>(
            "POST",
            "/fee-catalog/categories",
            { name },
          );
          setSelectedId(created.id);
        }
      } else {
        const value = Number(price || 0);
        if (!Number.isFinite(value) || value < 0) {
          toast.error("单价无效");
          return;
        }
        if (!selected) return;
        const body = { categoryId: selected.id, name, price: value };
        if (editing.item) {
          await api("PUT", `/fee-catalog/items/${editing.item.id}`, body);
        } else {
          await api("POST", "/fee-catalog/items", body);
        }
      }
      toast.success("已保存");
      setEditing(null);
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!removing) return;
    try {
      if (removing.kind === "category") {
        await api("DELETE", `/fee-catalog/categories/${removing.category.id}`);
        setSelectedId(null);
      } else {
        await api("DELETE", `/fee-catalog/items/${removing.item.id}`);
      }
      toast.success("已删除");
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="grid items-start gap-4 p-4 md:p-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>分类</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {categories.map((c) => (
            <Button
              key={c.id}
              type="button"
              variant={c.id === selected?.id ? "secondary" : "ghost"}
              className="w-full justify-between"
              onClick={() => setSelectedId(c.id)}
            >
              <span className="truncate">{c.name}</span>
              <span className="text-muted-foreground">{c.items.length}</span>
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            className="mt-2"
            onClick={() => openEdit({ kind: "category", category: null })}
          >
            <Plus className="size-3.5" />
            添加分类
          </Button>
        </CardContent>
      </Card>

      {selected ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle>{selected.name}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  openEdit({ kind: "category", category: selected })
                }
              >
                重命名
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setRemoving({ kind: "category", category: selected })
                }
              >
                删除分类
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => openEdit({ kind: "item", item: null })}
              >
                <Plus className="size-3.5" />
                添加项目
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>项目名称</TableHead>
                  <TableHead>单价</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!selected.items.length ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      暂无项目
                    </TableCell>
                  </TableRow>
                ) : null}
                {selected.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="tabular-nums">
                      {formatMoney(item.price)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => openEdit({ kind: "item", item })}
                        >
                          编辑
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setRemoving({ kind: "item", item })}
                        >
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Dialog
        open={editing != null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing?.kind === "category"
                ? editing.category
                  ? "重命名分类"
                  : "添加分类"
                : editing?.item
                  ? "编辑项目"
                  : "添加项目"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <Input
              placeholder={
                editing?.kind === "category" ? "分类名称" : "项目名称"
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {editing?.kind === "item" ? (
              <Input
                type="number"
                min={0}
                placeholder="单价"
                className={NUMBER_INPUT}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditing(null)}
            >
              取消
            </Button>
            <Button type="button" disabled={saving} onClick={() => void save()}>
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={removing != null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.kind === "category"
                ? `确定删除分类「${removing.category.name}」吗？`
                : `确定删除项目「${removing?.item.name ?? ""}」吗？已开的收费单不受影响。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
