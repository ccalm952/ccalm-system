import * as React from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { round2, type computeSalarySheet } from "@/lib/salary/calc";
import type {
  SalaryEmployeeComputed,
  SalaryEmployeeInput,
} from "@/lib/salary/types";

import {
  NumInput,
  RatePercentInput,
  SalaryOutlineIconButton,
  SummaryDecimalInput,
} from "./salary-table-inputs";

type SalarySheetComputed = ReturnType<typeof computeSalarySheet>;

function sumActualReceiptTotal(computed: SalarySheetComputed): number {
  return round2(
    computed.employees.reduce((sum, row) => sum + row.actualReceipt, 0),
  );
}

function deductionTooltip(bonusMode: SalaryEmployeeInput["bonusMode"]): string {
  if (
    bonusMode === "chen_pool" ||
    bonusMode === "lu_pool" ||
    bonusMode === "xu_pool"
  ) {
    return "护士扣减";
  }
  return "医生扣减";
}

function SortableEmployeeRow({
  row,
  index,
  updateEmployee,
  removeEmployee,
}: {
  row: SalaryEmployeeComputed;
  index: number;
  updateEmployee: (index: number, patch: Partial<SalaryEmployeeInput>) => void;
  removeEmployee: (index: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  return (
    <TableRow
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(
          transform ? { ...transform, x: 0 } : null,
        ),
        transition,
        opacity: isDragging ? 0 : undefined,
      }}
    >
      <TableCell>
        <Input
          value={row.title}
          placeholder="职称"
          onChange={(e) => updateEmployee(index, { title: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <Input
          value={row.name}
          placeholder="姓名"
          onChange={(e) => updateEmployee(index, { name: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <Tooltip>
          <TooltipTrigger render={<span />}>
            <RatePercentInput
              value={row.deductionRate}
              onChange={(deductionRate) =>
                updateEmployee(index, { deductionRate })
              }
            />
          </TooltipTrigger>
          <TooltipContent>{deductionTooltip(row.bonusMode)}</TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell>
        <NumInput
          value={row.baseSalary}
          onChange={(baseSalary) => updateEmployee(index, { baseSalary })}
        />
      </TableCell>
      <TableCell>{row.deductedBase}</TableCell>
      <TableCell>
        <SummaryDecimalInput
          value={row.shareRatio}
          onCommit={(shareRatio) => updateEmployee(index, { shareRatio })}
        />
      </TableCell>
      <TableCell>{row.actualReceipt}</TableCell>
      <TableCell>{row.bonus}</TableCell>
      <TableCell>
        <NumInput
          value={row.plantingCount}
          onChange={(plantingCount) => updateEmployee(index, { plantingCount })}
        />
      </TableCell>
      <TableCell>{row.plantingBonus}</TableCell>
      <TableCell>{row.monthlySalary}</TableCell>
      <TableCell>{row.socialInsurance}</TableCell>
      <TableCell>{row.medicalInsurance}</TableCell>
      <TableCell>
        <NumInput
          value={row.housingFund}
          onChange={(housingFund) => updateEmployee(index, { housingFund })}
        />
      </TableCell>
      <TableCell>{row.leaveDays}</TableCell>
      <TableCell>{row.leaveOffset}</TableCell>
      <TableCell>
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-3.5" />
          </Button>
          <SalaryOutlineIconButton
            aria-label="删除员工"
            onClick={() => removeEmployee(index)}
          >
            <X className="size-3.5" />
          </SalaryOutlineIconButton>
        </div>
      </TableCell>
    </TableRow>
  );
}

function EmployeeDragPreview({ row }: { row: SalaryEmployeeComputed }) {
  return (
    <Table className="table-fixed bg-background opacity-50 shadow-md">
      <TableBody>
        <TableRow>
          <TableCell>{row.title || "职称"}</TableCell>
          <TableCell>{row.name || "姓名"}</TableCell>
          <TableCell />
          <TableCell>{row.baseSalary}</TableCell>
          <TableCell>{row.deductedBase}</TableCell>
          <TableCell>{row.shareRatio}</TableCell>
          <TableCell>{row.actualReceipt}</TableCell>
          <TableCell>{row.bonus}</TableCell>
          <TableCell>{row.plantingCount}</TableCell>
          <TableCell>{row.plantingBonus}</TableCell>
          <TableCell>{row.monthlySalary}</TableCell>
          <TableCell>{row.socialInsurance}</TableCell>
          <TableCell>{row.medicalInsurance}</TableCell>
          <TableCell>{row.housingFund}</TableCell>
          <TableCell>{row.leaveDays}</TableCell>
          <TableCell>{row.leaveOffset}</TableCell>
          <TableCell />
        </TableRow>
      </TableBody>
    </Table>
  );
}

export function SalaryEmployeeTable({
  computed,
  updateEmployee,
  removeEmployee,
  onAddEmployee,
  onReorderEmployees,
}: {
  computed: SalarySheetComputed;
  updateEmployee: (index: number, patch: Partial<SalaryEmployeeInput>) => void;
  removeEmployee: (index: number) => void;
  onAddEmployee: () => void;
  onReorderEmployees: (activeId: string, overId: string) => void;
}) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const actualReceiptTotal = React.useMemo(
    () => sumActualReceiptTotal(computed),
    [computed],
  );
  const employeeIds = computed.employees.map((row) => row.id);
  const activeRow = computed.employees.find((row) => row.id === activeId);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    if (!event.over || event.active.id === event.over.id) return;
    onReorderEmployees(String(event.active.id), String(event.over.id));
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead>职称</TableHead>
            <TableHead>姓名</TableHead>
            <TableHead>扣减(%)</TableHead>
            <TableHead>底薪</TableHead>
            <TableHead>扣假后底薪</TableHead>
            <TableHead>实收比例</TableHead>
            <TableHead>实收</TableHead>
            <TableHead>奖金</TableHead>
            <TableHead>种植</TableHead>
            <TableHead>种植奖金</TableHead>
            <TableHead>月薪</TableHead>
            <TableHead>社保</TableHead>
            <TableHead>医保</TableHead>
            <TableHead>公积金</TableHead>
            <TableHead>假期</TableHead>
            <TableHead>假期抵消</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <SortableContext
            items={employeeIds}
            strategy={verticalListSortingStrategy}
          >
            {computed.employees.map((row, index) => (
              <SortableEmployeeRow
                key={row.id}
                row={row}
                index={index}
                updateEmployee={updateEmployee}
                removeEmployee={removeEmployee}
              />
            ))}
          </SortableContext>
          <TableRow>
            <TableCell />
            <TableCell />
            <TableCell />
            <TableCell />
            <TableCell>{computed.totals.deductedBase}</TableCell>
            <TableCell>{computed.totals.shareRatio}</TableCell>
            <TableCell>{actualReceiptTotal}</TableCell>
            <TableCell>{computed.totals.bonus}</TableCell>
            <TableCell />
            <TableCell />
            <TableCell>{computed.totals.monthlySalary}</TableCell>
            <TableCell />
            <TableCell />
            <TableCell />
            <TableCell />
            <TableCell />
            <TableCell>
              <SalaryOutlineIconButton
                aria-label="添加员工"
                onClick={onAddEmployee}
              >
                <Plus className="size-3.5" />
              </SalaryOutlineIconButton>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <DragOverlay dropAnimation={null}>
        {activeRow ? <EmployeeDragPreview row={activeRow} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
