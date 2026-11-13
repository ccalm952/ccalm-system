import * as React from "react";
import { Merge, Plus, SearchIcon, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { TablePagination } from "@/components/table-pagination";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
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
import { ROUTES } from "@/config/routes";
import { api } from "@/lib/api";
import { batchDelete, toastBatchDeleteResult } from "@/lib/batch-delete";
import { errorMessage } from "@/lib/errorMessage";
import { PATIENT_AUTO_GROUPS, type PatientGroup } from "@/lib/patients/groups";
import {
  PatientFormDialog,
  type PatientFormValue,
} from "./patient-form-dialog";
import { MergePatientsDialog } from "./merge-patients-dialog";
import { type PatientFilter, PatientSidebar } from "./patient-sidebar";

type PatientRow = PatientFormValue & {
  id: number;
  age: number | null;
  createdAt: string;
  lastVisitDate: string | null;
  hasImplant: boolean;
  hasPending: boolean;
  orthodonticsCategories: string[];
};

const PATIENT_COLS = [
  "name",
  "gender",
  "phone",
  "chartNo",
  "tags",
  "lastVisitDate",
  "remark",
  "actions",
] as const;
const SELECT_COL_W = "40px";
const TABLE_ROW_HEIGHT_PX = 40;
const TABLE_COL_COUNT = 1 + PATIENT_COLS.length;

function parseGroup(raw: string | null): PatientGroup {
  return PATIENT_AUTO_GROUPS.some((g) => g.value === raw)
    ? (raw as PatientGroup)
    : "all";
}

export function PatientsPage() {
  const [searchParams] = useSearchParams();
  const tag = searchParams.get("tag");
  const group = tag ? "all" : parseGroup(searchParams.get("group"));
  const filter = React.useMemo<PatientFilter>(
    () => ({ group, tag }),
    [group, tag],
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [rows, setRows] = React.useState<PatientRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [selection, setSelection] = React.useState<Set<number>>(new Set());
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [mergeOpen, setMergeOpen] = React.useState(false);
  const mergeIds = React.useMemo(() => [...selection], [selection]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PatientRow | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        group: filter.group,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (filter.tag) params.set("tag", filter.tag);
      const q = searchQuery.trim();
      if (q) params.set("q", q);
      const data = await api<{ list: PatientRow[]; total: number }>(
        "GET",
        `/patients?${params.toString()}`,
      );
      setRows(data.list);
      setTotal(data.total);
      setSelection(new Set());
    } catch (e) {
      toast.error(errorMessage(e));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filter, searchQuery, page, pageSize]);

  React.useEffect(() => {
    setPage(1);
  }, [filter, searchQuery, pageSize]);

  React.useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 300);
    return () => window.clearTimeout(id);
  }, [load]);

  async function reload() {
    await load();
    setRefreshKey((k) => k + 1);
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(row: PatientRow) {
    setEditing(row);
    setDialogOpen(true);
  }

  async function confirmDelete() {
    const selected = rows.filter((row) => selection.has(row.id));
    if (!selected.length) {
      setDeleteOpen(false);
      return;
    }
    try {
      const { ok, fail } = await batchDelete(selected, (row) =>
        api("DELETE", `/patients/${row.id}`),
      );
      toastBatchDeleteResult(ok, fail);
      await reload();
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

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const emptyRowCount = Math.max(0, pageSize - rows.length);
  const allSelected =
    rows.length > 0 && rows.every((row) => selection.has(row.id));

  return (
    <div className="flex gap-4 p-4 md:p-6">
      <PatientSidebar
        defaultTab="groups"
        activeFilter={filter}
        refreshKey={refreshKey}
      />

      <Card className="min-w-0 flex-1">
        <CardHeader className="space-y-0">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <InputGroup className="w-40 sm:w-56">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="姓名 / 手机 / 病历号"
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
            <Button
              type="button"
              variant="outline"
              disabled={selection.size < 2}
              onClick={() => setMergeOpen(true)}
            >
              <Merge className="size-3.5" />
              合并
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-(--card-spacing)">
          <div className="relative">
            <ScrollArea className="w-full max-w-full [&_[data-slot=table-container]]:w-auto [&_[data-slot=table-container]]:overflow-x-visible">
              <Table className="w-full min-w-[960px] table-fixed border-collapse">
                <colgroup>
                  <col style={{ width: SELECT_COL_W }} />
                  {PATIENT_COLS.map((id) => (
                    <col
                      key={id}
                      style={{
                        width: `calc((100% - ${SELECT_COL_W}) / ${PATIENT_COLS.length})`,
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
                          !allSelected &&
                          rows.some((row) => selection.has(row.id))
                        }
                        onCheckedChange={(checked) => {
                          setSelection(
                            checked
                              ? new Set(rows.map((r) => r.id))
                              : new Set(),
                          );
                        }}
                      />
                    </TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>性别</TableHead>
                    <TableHead>手机</TableHead>
                    <TableHead>病历号</TableHead>
                    <TableHead>标签</TableHead>
                    <TableHead>最近就诊</TableHead>
                    <TableHead>备注</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_tr:nth-child(odd)]:bg-muted/30">
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Checkbox
                          checked={selection.has(row.id)}
                          onCheckedChange={() => toggleSel(row.id)}
                        />
                      </TableCell>
                      <TableCell className="max-w-0 min-w-0 truncate">
                        <Button
                          variant="link"
                          nativeButton={false}
                          render={<Link to={ROUTES.patients.detail(row.id)} />}
                        >
                          {row.name}
                        </Button>
                      </TableCell>
                      <TableCell className="max-w-0 min-w-0 truncate">
                        {row.gender}
                      </TableCell>
                      <TableCell className="max-w-0 min-w-0 truncate">
                        {row.phone}
                      </TableCell>
                      <TableCell className="max-w-0 min-w-0 truncate">
                        {row.chartNo}
                      </TableCell>
                      <TableCell className="max-w-0 min-w-0 truncate">
                        <div className="flex justify-center gap-1">
                          {row.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-0 min-w-0 truncate">
                        {row.lastVisitDate ?? ""}
                      </TableCell>
                      <TableCell className="max-w-0 min-w-0 truncate">
                        {row.remark}
                      </TableCell>
                      <TableCell className="max-w-0 min-w-0 whitespace-nowrap">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => openEdit(row)}
                        >
                          编辑
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {emptyRowCount > 0 ? (
                    <TableRow className="border-b-0 !bg-background hover:!bg-transparent">
                      <TableCell
                        colSpan={TABLE_COL_COUNT}
                        className="p-0"
                        style={{ height: emptyRowCount * TABLE_ROW_HEIGHT_PX }}
                      />
                    </TableRow>
                  ) : null}
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
          <TablePagination
            selectedCount={selection.size}
            total={total}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      <PatientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patientId={editing?.id ?? null}
        initial={editing}
        onSaved={reload}
      />

      <MergePatientsDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        ids={mergeIds}
        onMerged={() => void reload()}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除选中的 {selection.size}{" "}
              位患者吗？其种植、待种植、正畸记录会一并删除。
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
