import { metaHelper, tableFeatures, type ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import type { ImplantRecordRow, RecordsTableMeta } from "./implant-records-types";

export const recordsTableFeatures = tableFeatures({
  tableMeta: metaHelper<RecordsTableMeta>(),
});

function phase2DisplayDate(
  addMonths: (visitDate: string, months: number) => string,
  visitDate: string,
  remarkMonths: string | null,
): string {
  const months = remarkMonths?.trim();
  if (!months || !/^\d+$/.test(months)) return "";
  const value = parseInt(months, 10);
  if (!Number.isFinite(value) || value < 0) return "";
  return addMonths(visitDate, value);
}

export function createImplantRecordsColumns(
  addMonths: (visitDate: string, months: number) => string,
  openEdit: (row: ImplantRecordRow) => void,
): Array<ColumnDef<typeof recordsTableFeatures, ImplantRecordRow>> {
  return [
    {
      id: "select",
      header: ({ table }) => {
        const meta = table.options.meta;
        const modelRows = table.getRowModel().rows;
        const selection = meta?.selection;
        const allSelected =
          modelRows.length > 0 && modelRows.every((row) => selection?.has(row.id));
        const someSelected = modelRows.some((row) => selection?.has(row.id));
        return (
          <Checkbox
            checked={allSelected}
            indeterminate={!allSelected && someSelected}
            onCheckedChange={(value) => {
              if (value) meta?.selectAllRows?.();
              else meta?.clearSelection?.();
            }}
          />
        );
      },
      cell: ({ row, table }) => {
        const selection = table.options.meta?.selection;
        const toggle = table.options.meta?.toggleSel;
        return (
          <Checkbox
            checked={selection?.has(row.id) ?? false}
            onCheckedChange={() => toggle?.(row.id)}
            onClick={(event) => event.stopPropagation()}
          />
        );
      },
    },
    { id: "patientName", accessorKey: "patientName", header: "姓名" },
    { id: "phone", accessorKey: "phone", header: "手机" },
    { id: "visitDate", accessorKey: "visitDate", header: "日期" },
    {
      id: "remark",
      accessorKey: "remark",
      header: "二期",
      cell: ({ row }) =>
        phase2DisplayDate(addMonths, row.original.visitDate, row.original.remark),
    },
    {
      id: "toothNo",
      accessorKey: "toothNo",
      header: "牙位",
      cell: ({ getValue }) => (getValue() as string | null) ?? "",
    },
    {
      id: "implantBrand",
      accessorKey: "implantBrand",
      header: "品牌",
      cell: ({ getValue }) => (getValue() as string | null) ?? "",
    },
    {
      id: "implantModel",
      accessorKey: "implantModel",
      header: "植体",
      cell: ({ getValue }) => (getValue() as string | null) ?? "",
    },
    {
      id: "toothRemark",
      accessorKey: "toothRemark",
      header: "备注",
      cell: ({ getValue }) => (getValue() as string | null) ?? "",
    },
    {
      id: "staff",
      accessorKey: "staff",
      header: "人员",
      cell: ({ getValue }) => (getValue() as string | null) ?? "",
    },
    {
      id: "edit",
      header: "操作",
      cell: ({ row }) => (
        <Button
          type="button"
          variant="secondary"
          onClick={(event) => {
            event.stopPropagation();
            openEdit(row.original);
          }}
        >
          编辑
        </Button>
      ),
    },
  ];
}
