import * as React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
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
import { Field, FieldContent, FieldLabel, FieldSet, FieldTitle } from "@/components/ui/field";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Checkbox } from "@/components/ui/checkbox";
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
import { errorMessage } from "@/lib/errorMessage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type InvRow = {
  id: number;
  brand: string;
  model: string;
  supplement: number;
  used: number;
  left: number;
};

function InventoryBrandCombobox({
  items,
  value,
  onValueChange,
  className,
}: {
  items: string[];
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
}) {
  return (
    <Combobox
      items={items}
      value={value || null}
      onValueChange={(v) => onValueChange(v ?? "")}
      onInputValueChange={(v) => onValueChange(v)}
    >
      <ComboboxInput showTrigger={false} className={cn("w-full min-w-0", className)} />
      <ComboboxContent>
        <ComboboxEmpty>暂无匹配，可直接输入新品牌</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export function PlantingInventoryPage() {
  const [list, setList] = React.useState<InvRow[]>([]);
  const [selection, setSelection] = React.useState<Set<number>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = React.useState(false);

  const [addBrand, setAddBrand] = React.useState("");
  const [addModel, setAddModel] = React.useState("");
  const [addQty, setAddQty] = React.useState("1");
  const [adding, setAdding] = React.useState(false);

  const [editOpen, setEditOpen] = React.useState(false);
  const editRowRef = React.useRef<InvRow | null>(null);
  const [editBrand, setEditBrand] = React.useState("");
  const [editModel, setEditModel] = React.useState("");
  const [editSupplement, setEditSupplement] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const addBrandItems = React.useMemo(() => {
    const s = new Set<string>();
    for (const r of list) {
      const b = r.brand?.trim();
      if (b) s.add(b);
    }
    const t = addBrand.trim();
    if (t) s.add(t);
    return [...s].sort((a, b) => a.localeCompare(b, "zh-CN"));
  }, [list, addBrand]);

  async function load() {
    try {
      const data = await api<InvRow[]>("GET", "/implant/inventory");
      setList(Array.isArray(data) ? data : []);
      setSelection(new Set());
    } catch (e) {
      toast.error(errorMessage(e));
      setList([]);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  async function addStock() {
    setAdding(true);
    try {
      await api("POST", "/implant/inventory", {
        brand: addBrand.trim(),
        modelCode: addModel.trim(),
        supplement: Number(addQty) || 1,
      });
      toast.success("已保存");
      setAddModel("");
      setAddQty("1");
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setAdding(false);
    }
  }

  function toggleSel(id: number) {
    setSelection((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function confirmDeleteSelected() {
    const ids = [...selection];
    if (!ids.length) {
      setDeleteDialogOpen(false);
      return;
    }
    try {
      for (const id of ids) {
        try {
          await api("DELETE", `/implant/inventory/${id}`);
        } catch (e) {
          toast.error(errorMessage(e));
        }
      }
      toast.success("已删除");
      await load();
    } finally {
      setDeleteDialogOpen(false);
    }
  }

  async function confirmDeleteAll() {
    try {
      await api("DELETE", "/implant/inventory");
      toast.success("已清空");
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleteAllDialogOpen(false);
    }
  }

  function openEdit(row: InvRow) {
    editRowRef.current = row;
    setEditBrand(row.brand);
    setEditModel(row.model);
    setEditSupplement(String(row.supplement));
    setEditOpen(true);
  }

  async function saveEdit() {
    const row = editRowRef.current;
    if (!row) return;
    setSaving(true);
    try {
      await api("PUT", `/implant/inventory/${row.id}`, {
        brand: editBrand.trim(),
        modelCode: editModel.trim(),
        supplement: Number(editSupplement) || 0,
      });
      toast.success("已保存");
      setEditOpen(false);
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-background p-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>补货</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldSet className="text-sm">
              <div className="flex min-w-0 items-end gap-3">
                <div className="grid min-w-0 flex-1 grid-cols-3 gap-3">
                  <Field orientation="vertical" className="min-w-0">
                    <FieldLabel>
                      <FieldTitle>品牌</FieldTitle>
                    </FieldLabel>
                    <FieldContent>
                      <InventoryBrandCombobox
                        items={addBrandItems}
                        value={addBrand}
                        onValueChange={setAddBrand}
                      />
                    </FieldContent>
                  </Field>
                  <Field orientation="vertical" className="min-w-0">
                    <FieldLabel>
                      <FieldTitle>植体</FieldTitle>
                    </FieldLabel>
                    <FieldContent>
                      <Input value={addModel} onChange={(e) => setAddModel(e.target.value)} />
                    </FieldContent>
                  </Field>
                  <Field orientation="vertical" className="min-w-0">
                    <FieldLabel>
                      <FieldTitle>数量</FieldTitle>
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        type="number"
                        min={1}
                        value={addQty}
                        onChange={(e) => setAddQty(e.target.value)}
                        className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </FieldContent>
                  </Field>
                </div>
                <Button
                  type="button"
                  className="shrink-0"
                  disabled={adding}
                  onClick={() => void addStock()}
                >
                  添加
                </Button>
              </div>
            </FieldSet>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle>库存列表</CardTitle>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger
                  disabled={!selection.size}
                  render={<Button variant="destructive" />}
                >
                  删除选中
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除</AlertDialogTitle>
                    <AlertDialogDescription>
                      确定删除选中的 {selection.size} 条库存型号吗？
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel variant="outline">取消</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => void confirmDeleteSelected()}
                    >
                      删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
                <AlertDialogTrigger render={<Button variant="destructive" />}>
                  全部删除
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认清空</AlertDialogTitle>
                    <AlertDialogDescription>
                      确定清空全部库存型号吗？此操作不可恢复。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel variant="outline">取消</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => void confirmDeleteAll()}
                    >
                      清空
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead className="w-[calc((100%_-_2.5rem)_/_6)]">品牌</TableHead>
                  <TableHead className="w-[calc((100%_-_2.5rem)_/_6)]">植体</TableHead>
                  <TableHead className="w-[calc((100%_-_2.5rem)_/_6)]">补货</TableHead>
                  <TableHead className="w-[calc((100%_-_2.5rem)_/_6)]">已用</TableHead>
                  <TableHead className="w-[calc((100%_-_2.5rem)_/_6)]">库存</TableHead>
                  <TableHead className="w-[calc((100%_-_2.5rem)_/_6)]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((row) => (
                  <TableRow key={row.id} onDoubleClick={() => openEdit(row)}>
                    <TableCell>
                      <Checkbox
                        checked={selection.has(row.id)}
                        onCheckedChange={() => toggleSel(row.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="选择该行"
                      />
                    </TableCell>
                    <TableCell className="w-[calc((100%_-_2.5rem)_/_6)]">{row.brand}</TableCell>
                    <TableCell className="w-[calc((100%_-_2.5rem)_/_6)]">{row.model}</TableCell>
                    <TableCell className="w-[calc((100%_-_2.5rem)_/_6)]">
                      {row.supplement}
                    </TableCell>
                    <TableCell className="w-[calc((100%_-_2.5rem)_/_6)]">{row.used}</TableCell>
                    <TableCell className="w-[calc((100%_-_2.5rem)_/_6)]">{row.left}</TableCell>
                    <TableCell className="w-[calc((100%_-_2.5rem)_/_6)]">
                      <Button
                        type="button"
                        variant="link"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(row);
                        }}
                      >
                        编辑
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>修改库存</DialogTitle>
            </DialogHeader>
            <FieldSet className="text-sm">
              <Field orientation="vertical">
                <FieldLabel>
                  <FieldTitle>品牌</FieldTitle>
                </FieldLabel>
                <FieldContent>
                  <Input value={editBrand} onChange={(e) => setEditBrand(e.target.value)} />
                </FieldContent>
              </Field>
              <Field orientation="vertical">
                <FieldLabel>
                  <FieldTitle>植体</FieldTitle>
                </FieldLabel>
                <FieldContent>
                  <Input value={editModel} onChange={(e) => setEditModel(e.target.value)} />
                </FieldContent>
              </Field>
              <Field orientation="vertical">
                <FieldLabel>
                  <FieldTitle>补货数量</FieldTitle>
                </FieldLabel>
                <FieldContent>
                  <Input
                    type="number"
                    min={0}
                    value={editSupplement}
                    onChange={(e) => setEditSupplement(e.target.value)}
                    className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </FieldContent>
              </Field>
            </FieldSet>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>
                取消
              </Button>
              <Button type="button" disabled={saving} onClick={() => void saveEdit()}>
                {saving ? "保存中…" : "保存"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
