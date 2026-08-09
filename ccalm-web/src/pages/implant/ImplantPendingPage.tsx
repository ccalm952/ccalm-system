import * as React from "react";
import dayjs from "dayjs";
import { Plus, SearchIcon, X } from "lucide-react";
import { toast } from "sonner";

import { DatePickerField } from "@/components/date-picker-field";
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
import { api } from "@/lib/api";
import { batchDelete, toastBatchDeleteResult } from "@/lib/batch-delete";
import { errorMessage } from "@/lib/errorMessage";

const IMPLANT_TABLE_SELECT_COL_W = "40px";

const PENDING_SHARE_COLS = [
  "name",
  "phone",
  "chartNo",
  "teeth",
  "extractionDate",
  "monthsAfter",
  "remark",
  "actions",
] as const;

type PendingRow = {
  id: number;
  name: string;
  phone: string;
  chartNo: string;
  teeth: string;
  extractionDate: string | null;
  monthsAfter: number | null;
  remark: string;
};

type FormState = {
  name: string;
  phone: string;
  chartNo: string;
  teeth: string;
  extractionDate: string;
  remark: string;
};

function emptyForm(): FormState {
  return {
    name: "",
    phone: "",
    chartNo: "",
    teeth: "",
    extractionDate: "",
    remark: "",
  };
}

function formFromRow(row: PendingRow): FormState {
  return {
    name: row.name,
    phone: row.phone,
    chartNo: row.chartNo,
    teeth: row.teeth,
    extractionDate: row.extractionDate ?? "",
    remark: row.remark,
  };
}

export function ImplantPendingPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [rows, setRows] = React.useState<PendingRow[]>([]);
  const [selection, setSelection] = React.useState<Set<number>>(new Set());
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const editIdRef = React.useRef<number | null>(null);

  const load = React.useCallback(async () => {
    try {
      const params = new URLSearchParams();
      const q = searchQuery.trim();
      if (q) params.set("q", q);
      const qs = params.toString();
      const data = await api<PendingRow[]>("GET", `/implant/pending${qs ? `?${qs}` : ""}`);
      setRows(Array.isArray(data) ? data : []);
      setSelection(new Set());
    } catch (e) {
      toast.error(errorMessage(e));
      setRows([]);
    }
  }, [searchQuery]);

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

  function openEdit(row: PendingRow) {
    editIdRef.current = row.id;
    setForm(formFromRow(row));
    setDialogOpen(true);
  }

  async function save() {
    const name = form.name.trim();
    if (!name) {
      toast.error("请填写姓名");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name,
        phone: form.phone.trim(),
        chartNo: form.chartNo.trim(),
        teeth: form.teeth.trim(),
        extractionDate: form.extractionDate.trim() || null,
        remark: form.remark.trim(),
      };
      if (editIdRef.current == null) {
        await api("POST", "/implant/pending", body);
        toast.success("已添加");
      } else {
        await api("PUT", `/implant/pending/${editIdRef.current}`, body);
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

  async function confirmDeleteSelected() {
    const selected = rows.filter((_, i) => selection.has(i));
    if (!selected.length) {
      setDeleteOpen(false);
      return;
    }
    try {
      const { ok, fail } = await batchDelete(selected, (row) =>
        api("DELETE", `/implant/pending/${row.id}`),
      );
      toastBatchDeleteResult(ok, fail);
      await load();
    } finally {
      setDeleteOpen(false);
    }
  }

  async function deleteOne(row: PendingRow) {
    try {
      await api("DELETE", `/implant/pending/${row.id}`);
      toast.success("已删除");
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  function toggleSel(index: number) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  const allSelected = rows.length > 0 && selection.size === rows.length;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
      <Card size="sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>待种植</CardTitle>
          <div className="flex shrink-0 items-center gap-2">
            <InputGroup className="w-40 sm:w-56">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索姓名/手机"
              />
            </InputGroup>
            <Button type="button" variant="outline" onClick={openCreate}>
              <Plus className="size-3.5" />
              新增
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={selection.size === 0}
              onClick={() => setDeleteOpen(true)}
            >
              <X className="size-3.5" />
              删除选中
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full max-w-full [&_[data-slot=table-container]]:w-auto [&_[data-slot=table-container]]:overflow-x-visible">
            {/*
              与种植患者一致：min-w 1246 + table-fixed；勾选列固定，其余列均分
            */}
            <Table className="w-full min-w-[1246px] table-fixed border-collapse">
              <colgroup>
                <col style={{ width: IMPLANT_TABLE_SELECT_COL_W }} />
                {PENDING_SHARE_COLS.map((id) => (
                  <col
                    key={id}
                    style={{
                      width: `calc((100% - ${IMPLANT_TABLE_SELECT_COL_W}) / ${PENDING_SHARE_COLS.length})`,
                    }}
                  />
                ))}
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) => {
                        if (checked) setSelection(new Set(rows.map((_, i) => i)));
                        else setSelection(new Set());
                      }}
                    />
                  </TableHead>
                  <TableHead className="min-w-0 max-w-0 text-center">姓名</TableHead>
                  <TableHead className="min-w-0 max-w-0 text-center">手机</TableHead>
                  <TableHead className="min-w-0 max-w-0 text-center">病历号</TableHead>
                  <TableHead className="min-w-0 max-w-0 text-center">牙位</TableHead>
                  <TableHead className="min-w-0 max-w-0 text-center">拔牙日期</TableHead>
                  <TableHead className="min-w-0 max-w-0 text-center">拔牙后</TableHead>
                  <TableHead className="min-w-0 max-w-0 text-center">备注</TableHead>
                  <TableHead className="min-w-0 max-w-0 text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={row.id} onDoubleClick={() => openEdit(row)}>
                    <TableCell>
                      <Checkbox
                        checked={selection.has(index)}
                        onCheckedChange={() => toggleSel(index)}
                      />
                    </TableCell>
                    <TableCell className="min-w-0 max-w-0 truncate">{row.name}</TableCell>
                    <TableCell className="min-w-0 max-w-0 truncate">{row.phone}</TableCell>
                    <TableCell className="min-w-0 max-w-0 truncate">{row.chartNo}</TableCell>
                    <TableCell className="min-w-0 max-w-0 truncate">{row.teeth}</TableCell>
                    <TableCell className="min-w-0 max-w-0 truncate">
                      {row.extractionDate
                        ? dayjs(row.extractionDate).format("YYYY-MM-DD")
                        : ""}
                    </TableCell>
                    <TableCell className="min-w-0 max-w-0 truncate">
                      {row.monthsAfter == null ? "" : `${row.monthsAfter}个月`}
                    </TableCell>
                    <TableCell className="min-w-0 max-w-0 truncate">{row.remark}</TableCell>
                    <TableCell className="min-w-0 max-w-0 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="secondary" onClick={() => openEdit(row)}>
                          编辑
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => void deleteOne(row)}>
                          删除
                        </Button>
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
            <DialogTitle>{editIdRef.current == null ? "新增" : "编辑"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <Input
              placeholder="姓名"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              placeholder="手机"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <Input
              placeholder="病历号"
              value={form.chartNo}
              onChange={(e) => setForm((f) => ({ ...f, chartNo: e.target.value }))}
            />
            <Input
              placeholder="牙位（纯数字空格分隔可自动拆行，如 11 12 13）"
              value={form.teeth}
              onChange={(e) => setForm((f) => ({ ...f, teeth: e.target.value }))}
            />
            <DatePickerField
              value={form.extractionDate}
              onValueChange={(v) => setForm((f) => ({ ...f, extractionDate: v }))}
              placeholder="拔牙日期"
            />
            <Input
              placeholder="备注"
              value={form.remark}
              onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
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
            <AlertDialogAction onClick={() => void confirmDeleteSelected()}>
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
