import * as React from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, Plus, SearchIcon, X } from "lucide-react";
import { toast } from "sonner";

import { DatePickerField } from "@/components/date-picker-field";
import { ToothPositionField } from "@/components/tooth-chart/ToothPositionField";
import { ToothPalmerMark } from "@/components/tooth-chart/ToothPalmerMark";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { parseTeethStrict } from "@/lib/tooth-fdi";
import { cn } from "@/lib/utils";

const IMPLANT_TABLE_SELECT_COL_W = "40px";
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

function buildPageList(current: number, total: number): number[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  return [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
}

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
const PENDING_TABLE_COL_COUNT = 1 + PENDING_SHARE_COLS.length;

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

function TeethCell({ teeth }: { teeth: string }) {
  const parsed = parseTeethStrict(teeth);
  if (parsed == null) {
    return <span className="truncate">{teeth}</span>;
  }
  if (!parsed.length) return null;
  return (
    <div className="flex h-10 w-full items-center justify-center overflow-hidden leading-none">
      <ToothPalmerMark fdis={parsed} compact />
    </div>
  );
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
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
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
    setPage(1);
  }, [searchQuery, pageSize]);

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
    const selected = rows.filter((row) => selection.has(row.id));
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

  function toggleSel(id: number) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const pageList = buildPageList(currentPage, totalPages);
  const allSelected =
    pageRows.length > 0 && pageRows.every((row) => selection.has(row.id));

  return (
    <div className="flex flex-col p-4 md:p-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <CardTitle className="shrink-0">待种植</CardTitle>
          <div className="flex min-w-0 w-full items-center gap-2 sm:w-auto sm:justify-end">
            <InputGroup className="min-w-0 flex-1 sm:w-56 sm:flex-none">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索姓名/手机"
              />
            </InputGroup>
            <Button type="button" variant="outline" className="shrink-0" onClick={openCreate}>
              <Plus className="size-3.5" />
              新增
            </Button>
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              disabled={selection.size === 0}
              onClick={() => setDeleteOpen(true)}
            >
              <X className="size-3.5" />
              删除选中
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-(--card-spacing)">
          <ScrollArea className="w-full max-w-full [&_[data-slot=table-container]]:w-auto [&_[data-slot=table-container]]:overflow-x-visible">
            {/*
              与种植患者一致：min-w 1240 + table-fixed；勾选列固定，其余列均分
            */}
            <Table className="w-full min-w-[1240px] table-fixed border-collapse">
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
                      indeterminate={
                        !allSelected && pageRows.some((row) => selection.has(row.id))
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelection((prev) => {
                            const next = new Set(prev);
                            for (const row of pageRows) next.add(row.id);
                            return next;
                          });
                        } else {
                          setSelection((prev) => {
                            const next = new Set(prev);
                            for (const row of pageRows) next.delete(row.id);
                            return next;
                          });
                        }
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
                {Array.from({ length: pageSize }, (_, index) => {
                  const row = pageRows[index];
                  if (row) {
                    const padAfter = index === pageRows.length - 1 && index < pageSize - 1;
                    return (
                      <TableRow
                        key={row.id}
                        className={cn(
                          "h-10 max-h-10 overflow-hidden",
                          padAfter && "border-b-0",
                        )}
                        onDoubleClick={() => openEdit(row)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selection.has(row.id)}
                            onCheckedChange={() => toggleSel(row.id)}
                          />
                        </TableCell>
                        <TableCell className="min-w-0 max-w-0 truncate">{row.name}</TableCell>
                        <TableCell className="min-w-0 max-w-0 truncate">{row.phone}</TableCell>
                        <TableCell className="min-w-0 max-w-0 truncate">{row.chartNo}</TableCell>
                        <TableCell className="overflow-hidden p-0">
                          <TeethCell teeth={row.teeth} />
                        </TableCell>
                        <TableCell className="min-w-0 max-w-0 truncate">
                          {row.extractionDate
                            ? dayjs(row.extractionDate).format("YYYY-MM-DD")
                            : ""}
                        </TableCell>
                        <TableCell className="min-w-0 max-w-0 truncate">
                          {row.monthsAfter == null ? "" : `${row.monthsAfter}个月`}
                        </TableCell>
                        <TableCell className="min-w-0 max-w-0 truncate">{row.remark}</TableCell>
                        <TableCell className="min-w-0 max-w-0 overflow-hidden whitespace-nowrap">
                          <div className="flex h-10 items-center justify-center gap-2">
                            <Button type="button" variant="secondary" onClick={() => openEdit(row)}>
                              编辑
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => void deleteOne(row)}
                            >
                              删除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  return (
                    <TableRow
                      key={`empty-${currentPage}-${index}`}
                      className="h-10 max-h-10 border-b-0 hover:bg-transparent"
                    >
                      <TableCell />
                      {PENDING_SHARE_COLS.map((id) => (
                        <TableCell
                          key={id}
                          className={
                            id === "teeth" ? "overflow-hidden p-0" : "min-w-0 max-w-0"
                          }
                        />
                      ))}
                    </TableRow>
                  );
                })}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="text-base md:text-sm [&_button]:text-base md:[&_button]:text-sm [&_input]:text-base md:[&_input]:text-sm"
        >
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
            <ToothPositionField
              value={form.teeth}
              onValueChange={(v) => setForm((f) => ({ ...f, teeth: v }))}
            />
            <DatePickerField
              value={form.extractionDate}
              onValueChange={(v) => setForm((f) => ({ ...f, extractionDate: v }))}
              placeholder="拔牙日期"
              className="border-transparent bg-input/50 hover:bg-input/50 dark:bg-input/50 dark:hover:bg-input/50"
            />
            <Input
              placeholder="备注"
              value={form.remark}
              onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
            />
          </div>
          <DialogFooter className="grid grid-cols-2 md:grid-cols-2 *:w-full">
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
