import * as React from "react";
import dayjs from "dayjs";
import {
  type ColumnDef,
  flexRender,
  metaHelper,
  tableFeatures,
  useTable,
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
import { Checkbox } from "@/components/ui/checkbox";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, SearchIcon } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import { batchDelete, toastBatchDeleteResult } from "@/lib/batch-delete";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** 勾选列固定宽度 40px（与种植库存一致） */
const IMPLANT_TABLE_SELECT_COL_W = "40px";
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

function buildPageList(current: number, total: number): number[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  return [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
}

type PatientRow = {
  id: number;
  name: string;
  phone: string;
  gender: string;
  source: string;
  birthday: string;
  age: number;
  createdAt: string;
};

function formatDate(iso: string) {
  try {
    return dayjs(iso).format("YYYY-MM-DD");
  } catch {
    return iso;
  }
}

type PatientTableMeta = {
  selection: Set<number>;
  toggleSel: (id: number) => void;
  selectAllRows: (rowsOnPage: PatientRow[]) => void;
  clearPageSelection: (rowsOnPage: PatientRow[]) => void;
};

const patientTableFeatures = tableFeatures({
  tableMeta: metaHelper<PatientTableMeta>(),
});

export function ImplantPatientPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [patients, setPatients] = React.useState<PatientRow[]>([]);
  const [selection, setSelection] = React.useState<Set<number>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);

  const toggleSel = React.useCallback((id: number) => {
    setSelection((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const selectAllRows = React.useCallback((rowsOnPage: PatientRow[]) => {
    setSelection((prev) => {
      const next = new Set(prev);
      for (const row of rowsOnPage) next.add(row.id);
      return next;
    });
  }, []);

  const clearPageSelection = React.useCallback((rowsOnPage: PatientRow[]) => {
    setSelection((prev) => {
      const next = new Set(prev);
      for (const row of rowsOnPage) next.delete(row.id);
      return next;
    });
  }, []);

  const editRowRef = React.useRef<PatientRow | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    name: "",
    phone: "",
    gender: "",
    chartNo: "",
    birthday: "",
    age: "",
  });

  const load = React.useCallback(async () => {
    try {
      const params = new URLSearchParams();
      const q = searchQuery.trim();
      if (q) params.set("q", q);
      const qs = params.toString();
      const data = await api<PatientRow[]>("GET", `/implant/patient${qs ? `?${qs}` : ""}`);
      setPatients(Array.isArray(data) ? data : []);
      setSelection(new Set());
    } catch (e) {
      toast.error(errorMessage(e));
      setPatients([]);
    }
  }, [searchQuery]);

  React.useEffect(() => {
    setPage(1);
  }, [searchQuery, pageSize]);

  React.useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 300);
    return () => window.clearTimeout(id);
  }, [load]);

  async function confirmDeleteSelected() {
    const sel = patients.filter((row) => selection.has(row.id));
    if (!sel.length) {
      setDeleteDialogOpen(false);
      return;
    }
    try {
      const { ok, fail } = await batchDelete(sel, (row) =>
        api("DELETE", `/implant/patient/${row.id}`),
      );
      toastBatchDeleteResult(ok, fail);
      await load();
    } finally {
      setDeleteDialogOpen(false);
    }
  }

  const openEdit = React.useCallback((row: PatientRow) => {
    editRowRef.current = row;
    setEditForm({
      name: row.name,
      phone: row.phone,
      gender: row.gender === "-" ? "" : row.gender,
      chartNo: row.source === "-" ? "" : row.source,
      birthday: row.birthday === "-" ? "" : row.birthday,
      age: row.age ? String(row.age) : "",
    });
    setEditOpen(true);
  }, []);

  async function saveEdit() {
    const row = editRowRef.current;
    if (!row) return;
    const name = editForm.name.trim();
    const phone = editForm.phone.trim();
    if (!name || !phone) {
      toast.error("请填写姓名与手机");
      return;
    }
    const ageStr = editForm.age.trim();
    const ageVal = ageStr === "" ? null : Number.parseInt(ageStr, 10);
    if (ageStr !== "" && !Number.isFinite(ageVal)) {
      toast.error("年龄需为数字");
      return;
    }
    setSaving(true);
    try {
      await api("PUT", `/implant/patient/${row.id}`, {
        name,
        phone,
        gender: editForm.gender.trim() || undefined,
        chartNo: editForm.chartNo.trim() || undefined,
        birthday: editForm.birthday.trim() || null,
        age: ageVal,
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

  const total = patients.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagePatients = patients.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const pageList = buildPageList(currentPage, totalPages);
  const emptyRowCount = Math.max(0, pageSize - pagePatients.length);

  const columns = React.useMemo<Array<ColumnDef<typeof patientTableFeatures, PatientRow>>>(
    () => [
      {
        id: "select",
        header: ({ table }) => {
          const meta = table.options.meta;
          const modelRows = table.getRowModel().rows;
          const sel = meta?.selection;
          const allSelected =
            modelRows.length > 0 && modelRows.every((r) => sel?.has(r.original.id));
          const someSelected = modelRows.some((r) => sel?.has(r.original.id));
          return (
            <Checkbox
              checked={allSelected}
              indeterminate={!allSelected && someSelected}
              onCheckedChange={(value) => {
                const rowsOnPage = modelRows.map((r) => r.original);
                if (value) meta?.selectAllRows?.(rowsOnPage);
                else meta?.clearPageSelection?.(rowsOnPage);
              }}
            />
          );
        },
        cell: ({ row, table }) => {
          const id = row.original.id;
          const meta = table.options.meta;
          const sel = meta?.selection;
          const toggle = meta?.toggleSel;
          return (
            <Checkbox
              checked={sel?.has(id) ?? false}
              onCheckedChange={() => toggle?.(id)}
              onClick={(e) => e.stopPropagation()}
            />
          );
        },
      },
      {
        accessorKey: "name",
        header: "姓名",
        cell: ({ getValue }) => String(getValue() ?? ""),
      },
      {
        accessorKey: "phone",
        header: "手机",
      },
      {
        accessorKey: "gender",
        header: "性别",
      },
      {
        accessorKey: "source",
        header: "病历号",
      },
      {
        accessorKey: "birthday",
        header: "出生日期",
        cell: ({ getValue }) => {
          const v = String(getValue() ?? "");
          return v === "-" ? "-" : v;
        },
      },
      {
        accessorKey: "age",
        header: "年龄",
        cell: ({ row }) => {
          const a = row.original.age;
          return a ? `${a} 岁` : "-";
        },
      },
      {
        accessorKey: "createdAt",
        header: "创建时间",
        cell: ({ getValue }) => formatDate(String(getValue() ?? "")),
      },
      {
        id: "edit",
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
      },
    ],
    [openEdit],
  );

  const table = useTable({
    features: patientTableFeatures,
    data: pagePatients,
    columns,
    getRowId: (row) => String(row.id),
    meta: {
      selection,
      toggleSel,
      selectAllRows,
      clearPageSelection,
    },
  });

  const leafCols = table.getAllLeafColumns();
  const visibleShareColCount = leafCols.filter((c) => c.id !== "select").length;

  return (
    <div className="bg-background p-4">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <Card>
          <CardHeader className="flex flex-col gap-3 space-y-0 md:flex-row md:items-center md:justify-between">
            <InputGroup className="min-w-0 w-full md:max-w-md">
              <InputGroupAddon align="inline-start">
                <SearchIcon className="size-4 shrink-0 opacity-50" aria-hidden />
              </InputGroupAddon>
              <InputGroupInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
            <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 md:w-auto">
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
                      确定删除选中的 {selection.size} 名患者吗？将同时删除其全部种植就诊与牙位记录。
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
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-(--card-spacing)">
            <ScrollArea className="w-full max-w-full [&_[data-slot=table-container]]:w-auto [&_[data-slot=table-container]]:overflow-x-visible">
              {/*
                与 max-w-7xl（80rem=1280px）栏宽对齐：表最小宽度 = 1280 − 40 = 1240
                （Card 内容区左右各 20px 共 40px）
              */}
              <Table className="w-full min-w-[1240px] table-fixed border-collapse">
                <colgroup>
                  {leafCols.map((col) => {
                    if (col.id === "select") {
                      return <col key={col.id} style={{ width: IMPLANT_TABLE_SELECT_COL_W }} />;
                    }
                    return (
                      <col
                        key={col.id}
                        style={{
                          width: `calc((100% - ${IMPLANT_TABLE_SELECT_COL_W}) / ${Math.max(1, visibleShareColCount)})`,
                        }}
                      />
                    );
                  })}
                </colgroup>
                <TableHeader>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((h) => (
                        <TableHead
                          key={h.id}
                          className={cn(
                            "text-center",
                            h.column.id !== "select" && "min-w-0 max-w-0",
                          )}
                        >
                          {h.isPlaceholder
                            ? null
                            : flexRender(h.column.columnDef.header, h.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} onDoubleClick={() => openEdit(row.original)}>
                      {row.getAllCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            cell.column.id !== "select" &&
                              cn(
                                "min-w-0 max-w-0",
                                cell.column.id === "edit" ? "whitespace-nowrap" : "truncate",
                              ),
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {Array.from({ length: emptyRowCount }).map((_, index) => (
                    <TableRow key={`empty-${currentPage}-${index}`}>
                      {leafCols.map((col) => (
                        <TableCell
                          key={col.id}
                          className={cn(
                            col.id !== "select" &&
                              cn(
                                "min-w-0 max-w-0",
                                col.id === "edit" ? "whitespace-nowrap" : undefined,
                              ),
                          )}
                        />
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
              <div>已选择 {selection.size} 条</div>
              <div className="flex flex-wrap items-center gap-2">
                <span>共 {total} 条</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft />
                </Button>
                {pageList.map((pageNo, index) => {
                  const prev = pageList[index - 1];
                  const showEllipsis = prev != null && pageNo - prev > 1;
                  return (
                    <React.Fragment key={pageNo}>
                      {showEllipsis ? <span>…</span> : null}
                      <Button
                        type="button"
                        variant={currentPage === pageNo ? "default" : "outline"}
                        onClick={() => setPage(pageNo)}
                      >
                        {pageNo}
                      </Button>
                    </React.Fragment>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight />
                </Button>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    if (value) setPageSize(Number(value));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size} 条/页
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent showCloseButton={false} className="max-h-[90vh] overflow-y-auto">
            <div className="grid gap-4">
              <Input
                placeholder="姓名"
                value={editForm.name}
                onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))}
              />
              <Input
                placeholder="手机"
                value={editForm.phone}
                onChange={(e) => setEditForm((s) => ({ ...s, phone: e.target.value }))}
              />
              <Input
                placeholder="性别"
                value={editForm.gender}
                onChange={(e) => setEditForm((s) => ({ ...s, gender: e.target.value }))}
              />
              <Input
                placeholder="病历号"
                value={editForm.chartNo}
                onChange={(e) => setEditForm((s) => ({ ...s, chartNo: e.target.value }))}
              />
              <Input
                placeholder="出生日期"
                value={editForm.birthday}
                onChange={(e) => setEditForm((s) => ({ ...s, birthday: e.target.value }))}
              />
              <Input
                placeholder="年龄"
                value={editForm.age}
                inputMode="numeric"
                onChange={(e) => setEditForm((s) => ({ ...s, age: e.target.value }))}
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
