import * as React from "react";
import dayjs from "dayjs";
import { flexRender, useTable } from "@tanstack/react-table";
import { SearchIcon } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DateRangePickerField } from "@/components/date-range-picker-field";
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
import { cn } from "@/lib/utils";

import {
  createImplantRecordsColumns,
  recordsTableFeatures,
} from "./implant-records-columns";
import type {
  ImplantRecordRow,
  ImplantRecordsVisitDialogState,
} from "./implant-records-types";
import { ImplantRecordsVisitDialog } from "./ImplantRecordsVisitDialog";

const IMPLANT_TABLE_SELECT_COL_W = "40px";
const MERGED_COLUMN_IDS = new Set(["patientName", "phone", "visitDate", "remark", "staff", "edit"]);

function defaultDateRange() {
  const start = dayjs().startOf("month");
  const end = dayjs().endOf("month");
  return { from: start.format("YYYY-MM-DD"), to: end.format("YYYY-MM-DD") };
}

function recordRowId(row: ImplantRecordRow, index: number) {
  return `${row.visitId}-${row.toothId ?? index}`;
}

function rowMergeKey(row: ImplantRecordRow) {
  return `${row.patientName}\n${row.phone}\n${row.visitDate}`;
}

function computeMergeSpans(rows: ImplantRecordRow[]) {
  if (!rows.length) return [];
  const spans = Array.from({ length: rows.length }, () => 1);
  let index = 0;
  while (index < rows.length) {
    const key = rowMergeKey(rows[index]!);
    let end = index + 1;
    while (end < rows.length && rowMergeKey(rows[end]!) === key) end++;
    const length = end - index;
    for (let current = index; current < end; current++)
      spans[current] = current === index ? length : 0;
    index = end;
  }
  return spans;
}

function rowsInSameMergeGroup(rows: ImplantRecordRow[], clicked: ImplantRecordRow) {
  const key = rowMergeKey(clicked);
  const index = rows.findIndex(
    (row) => row.visitId === clicked.visitId && row.toothId === clicked.toothId,
  );
  if (index < 0) return [clicked];
  let start = index;
  while (start > 0 && rowMergeKey(rows[start - 1]!) === key) start--;
  let end = index;
  while (end + 1 < rows.length && rowMergeKey(rows[end + 1]!) === key) end++;
  return rows.slice(start, end + 1);
}

export function ImplantRecordsPage() {
  const range = React.useMemo(() => defaultDateRange(), []);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState(range.from);
  const [dateTo, setDateTo] = React.useState(range.to);
  const [rows, setRows] = React.useState<ImplantRecordRow[]>([]);
  const [selection, setSelection] = React.useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [visitDialog, setVisitDialog] = React.useState<ImplantRecordsVisitDialogState | null>(null);
  const mergeSpans = React.useMemo(() => computeMergeSpans(rows), [rows]);

  const toggleSel = React.useCallback((id: string) => {
    setSelection((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllRows = React.useCallback(() => {
    setSelection(new Set(rows.map(recordRowId)));
  }, [rows]);

  const clearSelection = React.useCallback(() => setSelection(new Set()), []);

  const load = React.useCallback(async () => {
    try {
      const params = new URLSearchParams();
      const keyword = searchQuery.trim();
      if (keyword) params.set("q", keyword);
      else {
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
      }
      const query = params.toString();
      const data = await api<ImplantRecordRow[]>(
        "GET",
        `/implant/records${query ? `?${query}` : ""}`,
      );
      setRows(Array.isArray(data) ? data : []);
      setSelection(new Set());
    } catch (error) {
      toast.error(errorMessage(error));
      setRows([]);
    }
  }, [searchQuery, dateFrom, dateTo]);

  React.useEffect(() => {
    const id = window.setTimeout(() => void load(), 300);
    return () => window.clearTimeout(id);
  }, [load]);

  const openEdit = React.useCallback(
    (row: ImplantRecordRow) => {
      setVisitDialog({ type: "edit", group: rowsInSameMergeGroup(rows, row) });
    },
    [rows],
  );

  async function confirmDeleteSelected() {
    const selected = rows.filter((row, index) => selection.has(recordRowId(row, index)));
    if (!selected.length) {
      setDeleteDialogOpen(false);
      return;
    }
    try {
      const { ok, fail } = await batchDelete(selected, (row) => {
        const query =
          row.toothId != null ? `?toothId=${encodeURIComponent(String(row.toothId))}` : "";
        return api("DELETE", `/implant/visits/${row.visitId}${query}`);
      });
      toastBatchDeleteResult(ok, fail);
      await load();
    } finally {
      setDeleteDialogOpen(false);
    }
  }

  const columns = React.useMemo(
    () =>
      createImplantRecordsColumns(
        (visitDate, months) => {
          const date = dayjs(visitDate).add(months, "month");
          return date.isValid() ? date.format("YYYY-MM-DD") : "";
        },
        openEdit,
      ),
    [openEdit],
  );

  const table = useTable({
    features: recordsTableFeatures,
    data: rows,
    columns,
    getRowId: recordRowId,
    meta: { mergeSpans, selection, toggleSel, selectAllRows, clearSelection },
  });
  const leafColumns = table.getAllLeafColumns();
  const visibleShareColumnCount = leafColumns.filter((column) => column.id !== "select").length;

  return (
    <div className="bg-background p-4">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <Card>
          <CardHeader className="flex min-w-0 flex-col gap-3 space-y-0 md:flex-row md:flex-nowrap md:items-center md:justify-between">
            <div className="flex min-w-0 w-full flex-1 flex-nowrap items-center gap-2">
              <InputGroup className="min-w-0 flex-1 md:max-w-md">
                <InputGroupAddon align="inline-start">
                  <SearchIcon className="size-4 shrink-0 opacity-50" aria-hidden />
                </InputGroupAddon>
                <InputGroupInput
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </InputGroup>
              <DateRangePickerField
                value={{ from: dateFrom, to: dateTo }}
                onValueChange={({ from, to }) => {
                  setDateFrom(from);
                  setDateTo(to);
                }}
                className="min-w-0 max-w-[min(100%,280px)] shrink-0 md:max-w-[280px]"
              />
            </div>
            <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 md:w-auto md:shrink-0 md:justify-end">
              <Button
                type="button"
                className="shrink-0"
                onClick={() => setVisitDialog({ type: "add" })}
              >
                新增
              </Button>
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger
                  disabled={!selection.size}
                  render={<Button variant="destructive" className="shrink-0" />}
                >
                  删除选中
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除</AlertDialogTitle>
                    <AlertDialogDescription>
                      确定删除选中的 {selection.size} 条记录吗？
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
          <CardContent>
            <ScrollArea className="w-full max-w-full [&_[data-slot=table-container]]:w-auto [&_[data-slot=table-container]]:overflow-x-visible">
              <Table className="w-full min-w-[1240px] table-fixed border-collapse">
                <colgroup>
                  {leafColumns.map((column) => (
                    <col
                      key={column.id}
                      style={{
                        width:
                          column.id === "select"
                            ? IMPLANT_TABLE_SELECT_COL_W
                            : `calc((100% - ${IMPLANT_TABLE_SELECT_COL_W}) / ${Math.max(1, visibleShareColumnCount)})`,
                      }}
                    />
                  ))}
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
                  {table.getRowModel().rows.map((row) => {
                    const rowSpan = mergeSpans[row.index] ?? 1;
                    const showMerged = rowSpan > 0;
                    return (
                      <TableRow key={row.id} onDoubleClick={() => openEdit(row.original)}>
                        {row.getAllCells().map((cell) => {
                          const columnId = cell.column.id;
                          if (MERGED_COLUMN_IDS.has(columnId) && !showMerged) return null;
                          const rowSpanProps =
                            MERGED_COLUMN_IDS.has(columnId) && showMerged && rowSpan > 1
                              ? { rowSpan }
                              : {};
                          return (
                            <TableCell
                              key={cell.id}
                              {...rowSpanProps}
                              className={cn(
                                columnId !== "select" &&
                                  cn(
                                    "min-w-0 max-w-0",
                                    columnId === "edit" ? "whitespace-nowrap" : "truncate",
                                  ),
                              )}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
        <ImplantRecordsVisitDialog
          state={visitDialog}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setVisitDialog(null);
          }}
          onSaved={() => void load()}
        />
      </div>
    </div>
  );
}
