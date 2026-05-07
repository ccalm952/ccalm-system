import * as React from "react";
import dayjs from "dayjs";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type TableMeta,
  useReactTable,
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
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";

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
  toggleSel: (i: number) => void;
  selectAllRows: () => void;
  clearSelection: () => void;
};

export function PlantingPatientPage() {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [chart, setChart] = React.useState("");
  const [patients, setPatients] = React.useState<PatientRow[]>([]);
  const [selection, setSelection] = React.useState<Set<number>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const toggleSel = React.useCallback((i: number) => {
    setSelection((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  }, []);

  const selectAllRows = React.useCallback(() => {
    setSelection(new Set(patients.map((_, i) => i)));
  }, [patients]);

  const clearSelection = React.useCallback(() => {
    setSelection(new Set());
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
      if (name.trim()) params.set("name", name.trim());
      if (phone.trim()) params.set("phone", phone.trim());
      if (chart.trim()) params.set("chart", chart.trim());
      const q = params.toString();
      const data = await api<PatientRow[]>("GET", `/implant/patient${q ? `?${q}` : ""}`);
      setPatients(Array.isArray(data) ? data : []);
      setSelection(new Set());
    } catch (e) {
      toast.error(errorMessage(e));
      setPatients([]);
    }
  }, [name, phone, chart]);

  React.useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 300);
    return () => window.clearTimeout(id);
  }, [load]);

  async function confirmDeleteSelected() {
    const sel = patients.filter((_, i) => selection.has(i));
    if (!sel.length) {
      setDeleteDialogOpen(false);
      return;
    }
    try {
      for (const row of sel) {
        try {
          await api("DELETE", `/implant/patient/${row.id}`);
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

  const columns = React.useMemo<Array<ColumnDef<PatientRow>>>(
    () => [
      {
        id: "select",
        header: ({ table }) => {
          const meta = table.options.meta as PatientTableMeta | undefined;
          const modelRows = table.getRowModel().rows;
          const sel = meta?.selection;
          const allSelected = modelRows.length > 0 && modelRows.every((r) => sel?.has(r.index));
          const someSelected = modelRows.some((r) => sel?.has(r.index));
          return (
            <Checkbox
              checked={allSelected}
              indeterminate={!allSelected && someSelected}
              onCheckedChange={(value) => {
                if (value) meta?.selectAllRows?.();
                else meta?.clearSelection?.();
              }}
              aria-label="全选"
            />
          );
        },
        cell: ({ row, table }) => {
          const i = row.index;
          const meta = table.options.meta as PatientTableMeta | undefined;
          const sel = meta?.selection;
          const toggle = meta?.toggleSel;
          return (
            <Checkbox
              checked={sel?.has(i) ?? false}
              onCheckedChange={() => toggle?.(i)}
              onClick={(e) => e.stopPropagation()}
              aria-label="选择行"
            />
          );
        },
        enableHiding: false,
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
            variant="link"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row.original);
            }}
          >
            编辑
          </Button>
        ),
        enableSorting: false,
      },
    ],
    [openEdit],
  );

  const table = useReactTable({
    data: patients,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
    meta: {
      selection,
      toggleSel,
      selectAllRows,
      clearSelection,
    } as TableMeta<PatientRow>,
  });

  return (
    <div className="bg-background p-4">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>种植患者</CardTitle>
            <CardDescription>
              仅列出至少有一条种植就诊记录的患者。可选填姓名、手机、病历号筛选，与种植记录页相同为子串匹配。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldSet>
              <FieldGroup>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <Field>
                    <FieldLabel>
                      <FieldTitle>姓名</FieldTitle>
                    </FieldLabel>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel>
                      <FieldTitle>手机</FieldTitle>
                    </FieldLabel>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel>
                      <FieldTitle>病历号</FieldTitle>
                    </FieldLabel>
                    <Input value={chart} onChange={(e) => setChart(e.target.value)} />
                  </Field>
                </div>
              </FieldGroup>
            </FieldSet>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardAction>
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
                        确定删除选中的 {selection.size}{" "}
                        名患者吗？将同时删除其全部种植就诊与牙位记录。
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
            </CardAction>
          </CardHeader>
          <CardContent>
            <ScrollArea>
              <div className="w-full min-w-0 overflow-hidden rounded-md border">
                <Table className="table-fixed">
                  <TableHeader>
                    {table.getHeaderGroups().map((hg) => (
                      <TableRow key={hg.id}>
                        {hg.headers.map((h) => (
                          <TableHead
                            key={h.id}
                            className={
                              h.column.id === "select" ? undefined : "w-[calc((100%_-_2.5rem)_/_8)]"
                            }
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
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id} onDoubleClick={() => openEdit(row.original)}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              className={
                                cell.column.id === "select"
                                  ? undefined
                                  : "w-[calc((100%_-_2.5rem)_/_8)]"
                              }
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={table.getAllColumns().length}>无结果。</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑患者</DialogTitle>
            </DialogHeader>
            <FieldSet className="text-sm">
              <Field orientation="vertical">
                <FieldLabel>
                  <FieldTitle>姓名</FieldTitle>
                </FieldLabel>
                <FieldContent>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))}
                  />
                </FieldContent>
              </Field>
              <Field orientation="vertical">
                <FieldLabel>
                  <FieldTitle>手机</FieldTitle>
                </FieldLabel>
                <FieldContent>
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm((s) => ({ ...s, phone: e.target.value }))}
                  />
                </FieldContent>
              </Field>
              <Field orientation="vertical">
                <FieldLabel>
                  <FieldTitle>性别</FieldTitle>
                </FieldLabel>
                <FieldContent>
                  <Input
                    value={editForm.gender}
                    onChange={(e) => setEditForm((s) => ({ ...s, gender: e.target.value }))}
                  />
                </FieldContent>
              </Field>
              <Field orientation="vertical">
                <FieldLabel>
                  <FieldTitle>病历号</FieldTitle>
                </FieldLabel>
                <FieldContent>
                  <Input
                    value={editForm.chartNo}
                    onChange={(e) => setEditForm((s) => ({ ...s, chartNo: e.target.value }))}
                  />
                </FieldContent>
              </Field>
              <Field orientation="vertical">
                <FieldLabel>
                  <FieldTitle>出生日期</FieldTitle>
                </FieldLabel>
                <FieldContent>
                  <Input
                    value={editForm.birthday}
                    onChange={(e) => setEditForm((s) => ({ ...s, birthday: e.target.value }))}
                  />
                </FieldContent>
              </Field>
              <Field orientation="vertical">
                <FieldLabel>
                  <FieldTitle>年龄</FieldTitle>
                </FieldLabel>
                <FieldContent>
                  <Input
                    value={editForm.age}
                    inputMode="numeric"
                    onChange={(e) => setEditForm((s) => ({ ...s, age: e.target.value }))}
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
