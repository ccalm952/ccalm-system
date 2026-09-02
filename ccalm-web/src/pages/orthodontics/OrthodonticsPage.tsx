import * as React from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, Plus, SearchIcon, X } from "lucide-react";
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
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
import { Spinner } from "@/components/ui/spinner";
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
import { DatePickerField } from "@/components/date-picker-field";
import { api } from "@/lib/api";
import { batchDelete, toastBatchDeleteResult } from "@/lib/batch-delete";
import { errorMessage } from "@/lib/errorMessage";
import {
  ORTHODONTICS_CATEGORY_OPTIONS,
  orthodonticsCategoryLabel,
  type OrthodonticsCategory,
} from "@/lib/orthodontics/categories";
import { cn } from "@/lib/utils";

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
  category: OrthodonticsCategory;
  chartNo: string;
  name: string;
  phone: string;
  applianceModel: string;
  lastVisitDate: string;
  remark: string;
  doctor: string;
};

const OVERDUE_DAYS = 30;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const ORTHODONTICS_TABLE_SELECT_COL_W = "40px";
const ORTHODONTICS_SHARE_COLS = [
  "category",
  "chartNo",
  "name",
  "applianceModel",
  "phone",
  "lastVisitDate",
  "daysSinceLastVisit",
  "remark",
  "doctor",
  "actions",
] as const;

function buildPageList(current: number, total: number): number[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  return [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
}

function emptyForm(category: OrthodonticsCategory): FormState {
  return {
    category,
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
    category: row.category,
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
    | "category"
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
    category: row.category,
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
  const [activeCategory, setActiveCategory] =
    React.useState<OrthodonticsCategory>("treating");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [rows, setRows] = React.useState<OrthodonticsRow[]>([]);
  const [selection, setSelection] = React.useState<Set<number>>(new Set());
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(emptyForm("treating"));
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [loading, setLoading] = React.useState(true);
  const editIdRef = React.useRef<number | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ category: activeCategory });
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
    } finally {
      setLoading(false);
    }
  }, [activeCategory, searchQuery]);

  React.useEffect(() => {
    setPage(1);
  }, [activeCategory, searchQuery, pageSize]);

  React.useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 300);
    return () => window.clearTimeout(id);
  }, [load]);

  function openCreate() {
    editIdRef.current = null;
    setForm(emptyForm(activeCategory));
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
        { ...patientBody({ ...row, category: "completed" }) },
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
        category: form.category,
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
        await api("POST", "/orthodontics/patients", body);
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
    <div className="bg-background p-4">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <Card>
        <CardHeader className="space-y-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {ORTHODONTICS_CATEGORY_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={activeCategory === opt.value ? "default" : "outline"}
                  onClick={() => setActiveCategory(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
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
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-(--card-spacing)">
          <div className="relative">
            <ScrollArea className="w-full max-w-full [&_[data-slot=table-container]]:w-auto [&_[data-slot=table-container]]:overflow-x-visible">
            <Table className="w-full min-w-[1240px] table-fixed border-collapse">
              <colgroup>
                <col style={{ width: ORTHODONTICS_TABLE_SELECT_COL_W }} />
                {ORTHODONTICS_SHARE_COLS.map((id) => (
                  <col
                    key={id}
                    style={{
                      width: `calc((100% - ${ORTHODONTICS_TABLE_SELECT_COL_W}) / ${ORTHODONTICS_SHARE_COLS.length})`,
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
                        !allSelected && rows.some((row) => selection.has(row.id))
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
                  <TableHead className="min-w-0 max-w-0 text-center">标签</TableHead>
                  <TableHead className="min-w-0 max-w-0 text-center">病历号</TableHead>
                  <TableHead className="min-w-0 max-w-0 text-center">姓名</TableHead>
                  <TableHead className="min-w-0 max-w-0 text-center">型号</TableHead>
                  <TableHead className="min-w-0 max-w-0 text-center">电话</TableHead>
                  <TableHead className="min-w-0 max-w-0 text-center">上次就诊</TableHead>
                  <TableHead className="min-w-0 max-w-0 text-center">距离上次就诊</TableHead>
                  <TableHead className="min-w-0 max-w-0 text-center">备注</TableHead>
                  <TableHead className="min-w-0 max-w-0 text-center">医生</TableHead>
                  <TableHead className="min-w-0 max-w-0 text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr:nth-child(odd)]:bg-muted/30">
                {pageRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Checkbox
                        checked={selection.has(row.id)}
                        onCheckedChange={() => toggleSel(row.id)}
                      />
                    </TableCell>
                    <TableCell className="min-w-0 max-w-0 truncate">
                      {orthodonticsCategoryLabel(row.category)}
                    </TableCell>
                    <TableCell className="min-w-0 max-w-0 truncate">{row.chartNo}</TableCell>
                    <TableCell className="min-w-0 max-w-0 truncate">{row.name}</TableCell>
                    <TableCell className="min-w-0 max-w-0 truncate">{row.applianceModel}</TableCell>
                    <TableCell className="min-w-0 max-w-0 truncate">{row.phone}</TableCell>
                    <TableCell className="min-w-0 max-w-0 truncate">
                      {row.lastVisitDate
                        ? dayjs(row.lastVisitDate).format("YYYY-MM-DD")
                        : ""}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "min-w-0 max-w-0 truncate",
                        isOverdue(row.daysSinceLastVisit) && "text-destructive",
                      )}
                    >
                      {row.daysSinceLastVisit == null
                        ? ""
                        : `${row.daysSinceLastVisit} 天`}
                    </TableCell>
                    <TableCell className="min-w-0 max-w-0 truncate">{row.remark}</TableCell>
                    <TableCell className="min-w-0 max-w-0 truncate">{row.doctor}</TableCell>
                    <TableCell className="min-w-0 max-w-0 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => openEdit(row)}
                        >
                          编辑
                        </Button>
                        {row.category === "treating" ? (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => void markCompleted(row)}
                          >
                            完成
                          </Button>
                        ) : null}
                        {row.category !== "completed" ? (
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
            {loading ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
                <Spinner className="size-8 opacity-60" />
              </div>
            ) : null}
          </div>
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
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editIdRef.current == null ? "添加" : "编辑"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <Combobox
              items={[...ORTHODONTICS_CATEGORY_OPTIONS]}
              value={
                ORTHODONTICS_CATEGORY_OPTIONS.find(
                  (opt) => opt.value === form.category,
                ) ?? null
              }
              onValueChange={(opt) => {
                if (opt) setForm((f) => ({ ...f, category: opt.value }));
              }}
              itemToStringValue={(opt) => opt.label}
            >
              <ComboboxInput placeholder="标签" />
              <ComboboxContent>
                <ComboboxEmpty>无匹配项</ComboboxEmpty>
                <ComboboxList>
                  {(opt) => (
                    <ComboboxItem key={opt.value} value={opt}>
                      {opt.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
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
            <Input
              placeholder="型号"
              value={form.applianceModel}
              onChange={(e) =>
                setForm((f) => ({ ...f, applianceModel: e.target.value }))
              }
            />
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
