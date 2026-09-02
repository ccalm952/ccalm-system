import * as React from "react";
import {
  columnVisibilityFeature,
  flexRender,
  tableFeatures,
  useTable,
  type Column,
  type ColumnDef,
  type ColumnVisibilityState,
} from "@tanstack/react-table";

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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { FieldSet } from "@/components/ui/field";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
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
import { batchDelete, toastBatchDeleteResult } from "@/lib/batch-delete";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import { toast } from "sonner";

/** 勾选列固定宽度（与 `w-10` 一致） */
const INV_TABLE_SELECT_COL_W = "2.5rem";

type InvRow = {
  id: number;
  brand: string;
  model: string;
  supplement: number;
  used: number;
  left: number;
};

const inventoryTableFeatures = tableFeatures({
  columnVisibilityFeature,
});

function inventoryColumnPickerLabel(column: Column<typeof inventoryTableFeatures, InvRow, unknown>) {
  const h = column.columnDef.header;
  if (typeof h === "string") return h;
  return column.id;
}

function InventoryBrandCombobox({
  items,
  value,
  onValueChange,
}: {
  items: string[];
  value: string;
  onValueChange: (v: string) => void;
}) {
  return (
    <Combobox
      items={items}
      value={value || null}
      onValueChange={(v) => onValueChange(v ?? "")}
      onInputValueChange={(v) => onValueChange(v)}
    >
      <ComboboxInput placeholder="品牌" />
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

export function ImplantInventoryPage() {
  const [list, setList] = React.useState<InvRow[]>([]);
  const [selection, setSelection] = React.useState<Set<number>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [addStockOpen, setAddStockOpen] = React.useState(false);

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
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({});

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
      setAddStockOpen(false);
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setAdding(false);
    }
  }

  const toggleSel = React.useCallback((id: number) => {
    setSelection((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  async function confirmDeleteSelected() {
    const ids = [...selection];
    if (!ids.length) {
      setDeleteDialogOpen(false);
      return;
    }
    try {
      const { ok, fail } = await batchDelete(ids, (id) =>
        api("DELETE", `/implant/inventory/${id}`),
      );
      toastBatchDeleteResult(ok, fail);
      await load();
    } finally {
      setDeleteDialogOpen(false);
    }
  }

  const openEdit = React.useCallback((row: InvRow) => {
    editRowRef.current = row;
    setEditBrand(row.brand);
    setEditModel(row.model);
    setEditSupplement(String(row.supplement));
    setEditOpen(true);
  }, []);

  const columns = React.useMemo<ColumnDef<typeof inventoryTableFeatures, InvRow>[]>(
    () => [
      {
        id: "select",
        header: () => {
          const ids = list.map((r) => r.id);
          const selectedCount = ids.filter((id) => selection.has(id)).length;
          const allSelected = ids.length > 0 && selectedCount === ids.length;
          const someSelected = selectedCount > 0 && !allSelected;
          return (
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              disabled={ids.length === 0}
              onCheckedChange={(checked) => {
                setSelection(checked ? new Set(ids) : new Set());
              }}
              onClick={(e) => e.stopPropagation()}
            />
          );
        },
        cell: ({ row }) => (
          <Checkbox
            checked={selection.has(row.original.id)}
            onCheckedChange={() => toggleSel(row.original.id)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableHiding: false,
      },
      {
        accessorKey: "brand",
        header: "品牌",
      },
      {
        accessorKey: "model",
        header: "植体",
      },
      {
        accessorKey: "supplement",
        header: "补货",
      },
      {
        accessorKey: "used",
        header: "已用",
      },
      {
        accessorKey: "left",
        header: "库存",
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row.original);
            }}
          >
            编辑
          </Button>
        ),
        enableHiding: false,
      },
    ],
    [list, selection, toggleSel, openEdit],
  );

  const table = useTable({
    features: inventoryTableFeatures,
    data: list,
    columns,
    getRowId: (row) => String(row.id),
    onColumnVisibilityChange: setColumnVisibility,
    state: { columnVisibility },
  });

  const leafCols = table.getVisibleLeafColumns();
  /** 与操作列一起均分的列数（全部可见列减去勾选列） */
  const visibleShareColCount = leafCols.filter((c) => c.id !== "select").length;

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
          <CardHeader className="flex flex-row flex-wrap items-center justify-end gap-2 space-y-0">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" />}>
                列
                <ChevronDownIcon className="size-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuGroup>
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {inventoryColumnPickerLabel(column)}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button type="button" onClick={() => setAddStockOpen(true)}>
              补货
            </Button>
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
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full max-w-full [&_[data-slot=table-container]]:w-auto [&_[data-slot=table-container]]:overflow-x-visible">
              {/*
                宽屏 min-w-full 贴合 Card 内容区，避免多余横向滚动条；
                窄屏 max-md:min-w-[990px] 保留横向滚动
              */}
              <Table className="w-full min-w-full table-fixed border-collapse max-md:min-w-[990px]">
                <colgroup>
                  {leafCols.map((col) => {
                    if (col.id === "select") {
                      return <col key={col.id} style={{ width: INV_TABLE_SELECT_COL_W }} />;
                    }
                    return (
                      <col
                        key={col.id}
                        style={{
                          width: `calc((100% - ${INV_TABLE_SELECT_COL_W}) / ${Math.max(1, visibleShareColCount)})`,
                        }}
                      />
                    );
                  })}
                </colgroup>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={cn(
                            "text-center",
                            header.column.id !== "select" && "min-w-0 max-w-0",
                          )}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} onDoubleClick={() => openEdit(row.original)}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            cell.column.id !== "select" &&
                              cn(
                                "min-w-0 max-w-0",
                                cell.column.id === "actions" ? "whitespace-nowrap" : "truncate",
                              ),
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>

        <Dialog open={addStockOpen} onOpenChange={setAddStockOpen}>
          <DialogContent showCloseButton={false}>
            <FieldSet>
              <InventoryBrandCombobox
                items={addBrandItems}
                value={addBrand}
                onValueChange={setAddBrand}
              />
              <Input
                value={addModel}
                onChange={(e) => setAddModel(e.target.value)}
                placeholder="植体"
              />
              <Input
                type="number"
                min={1}
                value={addQty}
                onChange={(e) => setAddQty(e.target.value)}
                placeholder="数量"
                className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </FieldSet>
            <DialogFooter className="grid grid-cols-2 md:grid-cols-2 *:w-full">
              <Button type="button" variant="secondary" onClick={() => setAddStockOpen(false)}>
                取消
              </Button>
              <Button type="button" disabled={adding} onClick={() => void addStock()}>
                {adding ? "添加中…" : "添加"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent showCloseButton={false}>
            <div className="grid gap-4">
              <Input
                placeholder="品牌"
                value={editBrand}
                onChange={(e) => setEditBrand(e.target.value)}
              />
              <Input
                placeholder="植体"
                value={editModel}
                onChange={(e) => setEditModel(e.target.value)}
              />
              <Input
                type="number"
                min={0}
                placeholder="补货数量"
                value={editSupplement}
                onChange={(e) => setEditSupplement(e.target.value)}
                className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
            <DialogFooter className="grid grid-cols-2 md:grid-cols-2 *:w-full">
              <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>
                取消
              </Button>
              <Button type="button" disabled={saving} onClick={() => void saveEdit()}>
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
      </div>
    </div>
  );
}
