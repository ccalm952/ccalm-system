import * as React from "react";
import { useLocation } from "react-router-dom";
import dayjs from "dayjs";
import { Plus, SearchIcon, X } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DatePickerField } from "@/components/date-picker-field";
import { ROUTES } from "@/config/routes";
import { api } from "@/lib/api";
import { batchDelete, toastBatchDeleteResult } from "@/lib/batch-delete";
import { errorMessage } from "@/lib/errorMessage";
import { cn } from "@/lib/utils";

type OrthodonticsCategory = "treating" | "appliance" | "completed";

type OrthodonticsRow = {
  id: number;
  category: OrthodonticsCategory;
  chartNo: string;
  name: string;
  phone: string;
  applianceModel: string;
  lastVisitDate: string | null;
  daysSinceLastVisit: number | null;
  followUp: string;
  remark: string;
  doctor: string;
};

type FormState = {
  chartNo: string;
  name: string;
  phone: string;
  applianceModel: string;
  lastVisitDate: string;
  remark: string;
  doctor: string;
};

const OVERDUE_DAYS = 30;

const CATEGORY_BY_PATH: Record<string, OrthodonticsCategory> = {
  [ROUTES.orthodontics.treating]: "treating",
  [ROUTES.orthodontics.appliance]: "appliance",
  [ROUTES.orthodontics.completed]: "completed",
};

const TITLE_BY_CATEGORY: Record<OrthodonticsCategory, string> = {
  treating: "治疗中",
  appliance: "矫治器",
  completed: "已完成",
};

function emptyForm(): FormState {
  return {
    chartNo: "",
    name: "",
    phone: "",
    applianceModel: "",
    lastVisitDate: "",
    remark: "",
    doctor: "",
  };
}

function formFromRow(row: OrthodonticsRow): FormState {
  return {
    chartNo: row.chartNo,
    name: row.name,
    phone: row.phone,
    applianceModel: row.applianceModel,
    lastVisitDate: row.lastVisitDate ?? "",
    remark: row.remark,
    doctor: row.doctor,
  };
}

function isOverdue(days: number | null): boolean {
  return days != null && days > OVERDUE_DAYS;
}

function patientBody(
  row: Pick<
    OrthodonticsRow,
    | "chartNo"
    | "name"
    | "phone"
    | "applianceModel"
    | "lastVisitDate"
    | "followUp"
    | "remark"
    | "doctor"
  >,
) {
  return {
    chartNo: row.chartNo,
    name: row.name,
    phone: row.phone,
    applianceModel: row.applianceModel,
    lastVisitDate: row.lastVisitDate,
    followUp: row.followUp,
    remark: row.remark,
    doctor: row.doctor,
  };
}

export function OrthodonticsPage() {
  const { pathname } = useLocation();
  const category = CATEGORY_BY_PATH[pathname] ?? "treating";
  const showModel = category === "appliance";

  const [searchQuery, setSearchQuery] = React.useState("");
  const [rows, setRows] = React.useState<OrthodonticsRow[]>([]);
  const [selection, setSelection] = React.useState<Set<number>>(new Set());
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const editIdRef = React.useRef<number | null>(null);

  const load = React.useCallback(async () => {
    try {
      const params = new URLSearchParams({ category });
      const q = searchQuery.trim();
      if (q) params.set("q", q);
      const data = await api<OrthodonticsRow[]>(
        "GET",
        `/orthodontics/patients?${params.toString()}`,
      );
      setRows(Array.isArray(data) ? data : []);
      setSelection(new Set());
    } catch (e) {
      toast.error(errorMessage(e));
      setRows([]);
    }
  }, [category, searchQuery]);

  React.useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 300);
    return () => window.clearTimeout(id);
  }, [load]);

  function openCreate() {
    editIdRef.current = null;
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(row: OrthodonticsRow) {
    editIdRef.current = row.id;
    setForm(formFromRow(row));
    setDialogOpen(true);
  }

  async function markCompleted(row: OrthodonticsRow) {
    try {
      await api(
        "PUT",
        `/orthodontics/patients/${row.id}`,
        { ...patientBody(row), category: "completed" },
      );
      toast.success("已移至已完成");
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function markVisitedToday(row: OrthodonticsRow) {
    try {
      await api(
        "PUT",
        `/orthodontics/patients/${row.id}`,
        patientBody({
          ...row,
          lastVisitDate: dayjs().format("YYYY-MM-DD"),
        }),
      );
      toast.success("已更新就诊");
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function save() {
    const name = form.name.trim();
    if (!name) {
      toast.error("请填写姓名");
      return;
    }
    setSaving(true);
    try {
      const existing =
        editIdRef.current == null
          ? null
          : (rows.find((row) => row.id === editIdRef.current) ?? null);
      const body = {
        chartNo: form.chartNo.trim(),
        name,
        phone: form.phone.trim(),
        applianceModel: form.applianceModel.trim(),
        lastVisitDate: form.lastVisitDate.trim() || null,
        followUp: existing?.followUp ?? "",
        remark: form.remark.trim(),
        doctor: form.doctor.trim(),
      };
      if (editIdRef.current == null) {
        await api("POST", "/orthodontics/patients", { ...body, category });
        toast.success("已添加");
      } else {
        await api("PUT", `/orthodontics/patients/${editIdRef.current}`, body);
        toast.success("已保存");
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    const selected = rows.filter((row) => selection.has(row.id));
    if (!selected.length) {
      setDeleteOpen(false);
      return;
    }
    try {
      const { ok, fail } = await batchDelete(selected, (row) =>
        api("DELETE", `/orthodontics/patients/${row.id}`),
      );
      toastBatchDeleteResult(ok, fail);
      await load();
    } finally {
      setDeleteOpen(false);
    }
  }

  function toggleSel(id: number) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = rows.length > 0 && rows.every((row) => selection.has(row.id));

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
      <Card size="sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>{TITLE_BY_CATEGORY[category]}</CardTitle>
          <div className="flex shrink-0 items-center gap-2">
            <InputGroup className="w-40 sm:w-56">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索"
              />
            </InputGroup>
            <Button type="button" variant="outline" onClick={openCreate}>
              <Plus className="size-3.5" />
              添加
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={selection.size === 0}
              onClick={() => setDeleteOpen(true)}
            >
              <X className="size-3.5" />
              删除
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Checkbox
                      checked={allSelected}
                      indeterminate={
                        !allSelected && rows.some((row) => selection.has(row.id))
                      }
                      onCheckedChange={(checked) => {
                        if (checked) setSelection(new Set(rows.map((row) => row.id)));
                        else setSelection(new Set());
                      }}
                    />
                  </TableHead>
                  <TableHead>病历号</TableHead>
                  <TableHead>姓名</TableHead>
                  {showModel ? <TableHead>型号</TableHead> : null}
                  <TableHead>电话</TableHead>
                  <TableHead>上次就诊</TableHead>
                  <TableHead>距离上次就诊</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead>医生</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Checkbox
                        checked={selection.has(row.id)}
                        onCheckedChange={() => toggleSel(row.id)}
                      />
                    </TableCell>
                    <TableCell>{row.chartNo}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    {showModel ? <TableCell>{row.applianceModel}</TableCell> : null}
                    <TableCell>{row.phone}</TableCell>
                    <TableCell>
                      {row.lastVisitDate
                        ? dayjs(row.lastVisitDate).format("YYYY-MM-DD")
                        : ""}
                    </TableCell>
                    <TableCell
                      className={cn(
                        isOverdue(row.daysSinceLastVisit) && "text-destructive",
                      )}
                    >
                      {row.daysSinceLastVisit == null
                        ? ""
                        : `${row.daysSinceLastVisit} 天`}
                    </TableCell>
                    <TableCell>{row.remark}</TableCell>
                    <TableCell>{row.doctor}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => openEdit(row)}
                        >
                          编辑
                        </Button>
                        {category === "treating" ? (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => void markCompleted(row)}
                          >
                            完成
                          </Button>
                        ) : null}
                        {category !== "completed" ? (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => void markVisitedToday(row)}
                          >
                            就诊
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editIdRef.current == null ? "添加" : "编辑"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <Input
              placeholder="病历号"
              value={form.chartNo}
              onChange={(e) => setForm((f) => ({ ...f, chartNo: e.target.value }))}
            />
            <Input
              placeholder="姓名"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            {showModel ? (
              <Input
                placeholder="型号"
                value={form.applianceModel}
                onChange={(e) =>
                  setForm((f) => ({ ...f, applianceModel: e.target.value }))
                }
              />
            ) : null}
            <Input
              placeholder="电话"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <DatePickerField
              value={form.lastVisitDate}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, lastVisitDate: v }))
              }
              placeholder="上次就诊时间"
            />
            <Input
              placeholder="备注"
              value={form.remark}
              onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
            />
            <Input
              placeholder="医生"
              value={form.doctor}
              onChange={(e) => setForm((f) => ({ ...f, doctor: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDialogOpen(false)}
            >
              取消
            </Button>
            <Button type="button" disabled={saving} onClick={() => void save()}>
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除选中的 {selection.size} 条记录吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
