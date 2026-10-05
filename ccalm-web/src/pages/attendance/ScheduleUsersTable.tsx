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
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  detailOvertimeClass,
  hasOvertime,
  scheduleHolidayHeaderClass,
} from "@/lib/attendance/attendance-theme";
import type { ScheduleMonthData } from "@/lib/attendance/schedule";
import {
  SCHEDULE_SHIFT_LABEL,
  scheduleCellClass,
} from "@/lib/attendance/schedule";
import { formatDayCount } from "@/lib/attendance/summary";
import { cn } from "cn";

type ScheduleUser = ScheduleMonthData["users"][number];
type DayHeader = ScheduleMonthData["dayHeaders"][number];

function ScheduleUserCells({
  user,
  dayHeaders,
  monthAllowance,
  leaveOffset,
}: {
  user: ScheduleUser;
  dayHeaders: DayHeader[];
  monthAllowance: number;
  leaveOffset: React.ReactNode;
}) {
  return (
    <>
      <TableCell className="sticky left-0 z-10 w-24 bg-background text-center font-medium">
        {user.userName}
      </TableCell>
      {dayHeaders.map((h) => {
        const shift = user.days[String(h.day)] ?? null;
        return (
          <TableCell key={h.day} className="w-9 p-0.5 text-center">
            <span
              className={cn(
                "mx-auto flex h-8 w-8 items-center justify-center rounded text-sm",
                scheduleCellClass(shift),
              )}
            >
              {shift ? SCHEDULE_SHIFT_LABEL[shift] : ""}
            </span>
          </TableCell>
        );
      })}
      <TableCell className="w-10 text-center">{user.fullCount}</TableCell>
      <TableCell className="w-10 text-center">{user.morningCount}</TableCell>
      <TableCell className="w-10 text-center">{user.afternoonCount}</TableCell>
      <TableCell className="w-16 text-center">
        {formatDayCount(user.monthLeave)}
      </TableCell>
      <TableCell className="w-24 px-1 text-center">{leaveOffset}</TableCell>
      <TableCell className="w-16 text-center">
        {formatDayCount(monthAllowance)}
      </TableCell>
      <TableCell className="w-16 text-center">
        {formatDayCount(user.remainingLeave)}
      </TableCell>
      <TableCell
        className={cn(
          "w-20 text-center",
          detailOvertimeClass(user.overtimeStr),
        )}
      >
        {hasOvertime(user.overtimeStr) ? user.overtimeStr : ""}
      </TableCell>
    </>
  );
}

function SortableScheduleRow({
  user,
  dayHeaders,
  monthAllowance,
  leaveOffset,
}: {
  user: ScheduleUser;
  dayHeaders: DayHeader[];
  monthAllowance: number;
  leaveOffset: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: user.userId });

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
      <ScheduleUserCells
        user={user}
        dayHeaders={dayHeaders}
        monthAllowance={monthAllowance}
        leaveOffset={leaveOffset}
      />
      <TableCell className="w-12 px-1 text-center">
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
      </TableCell>
    </TableRow>
  );
}

function ScheduleDragPreview({
  user,
  dayHeaders,
  monthAllowance,
}: {
  user: ScheduleUser;
  dayHeaders: DayHeader[];
  monthAllowance: number;
}) {
  return (
    <Table className="w-max bg-background text-center text-sm opacity-50 shadow-md">
      <TableBody>
        <TableRow>
          <ScheduleUserCells
            user={user}
            dayHeaders={dayHeaders}
            monthAllowance={monthAllowance}
            leaveOffset={formatDayCount(user.leaveOffsetDays ?? 0)}
          />
          <TableCell className="w-12 px-1 text-center">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
            >
              <GripVertical className="size-3.5" />
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

export function ScheduleUsersTable({
  data,
  isAdmin,
  holidayDateKey,
  holidays,
  renderLeaveOffset,
  onReorderUsers,
}: {
  data: ScheduleMonthData;
  isAdmin: boolean;
  holidayDateKey: (day: number) => string;
  holidays: { offDayMap: Record<string, string> } | null;
  renderLeaveOffset: (user: ScheduleUser) => React.ReactNode;
  onReorderUsers: (userIds: string[]) => void;
}) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const userIds = data.users.map((user) => user.userId);
  const activeUser = data.users.find((user) => user.userId === activeId);
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
    const oldIndex = userIds.indexOf(String(event.active.id));
    const newIndex = userIds.indexOf(String(event.over.id));
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
    onReorderUsers(arrayMove(userIds, oldIndex, newIndex));
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  const header = (
    <TableHeader>
      <TableRow>
        <TableHead className="sticky left-0 z-20 w-24 bg-background text-center">
          姓名
        </TableHead>
        {data.dayHeaders.map((h) => {
          const dateKey = holidayDateKey(h.day);
          const holidayName = holidays?.offDayMap[dateKey];
          const isHoliday = !!holidayName;
          return (
            <TableHead
              key={h.day}
              title={holidayName}
              className={cn(
                "w-9 px-1 text-center",
                isHoliday && scheduleHolidayHeaderClass,
              )}
            >
              <div>{h.weekday}</div>
              <div>{h.day}</div>
            </TableHead>
          );
        })}
        <TableHead className="w-10 text-center">全</TableHead>
        <TableHead className="w-10 text-center">上</TableHead>
        <TableHead className="w-10 text-center">下</TableHead>
        <TableHead className="w-16 text-center">本月请假</TableHead>
        <TableHead className="w-24 text-center">假期抵消</TableHead>
        <TableHead className="w-16 text-center">本月假期</TableHead>
        <TableHead className="w-16 text-center">剩余假期</TableHead>
        <TableHead className="w-20 text-center">加班时长</TableHead>
        {isAdmin ? <TableHead className="w-12 text-center" /> : null}
      </TableRow>
    </TableHeader>
  );

  if (!isAdmin) {
    return (
      <Table className="w-max text-center text-sm">
        {header}
        <TableBody>
          {data.users.map((user) => (
            <TableRow key={user.userId}>
              <ScheduleUserCells
                user={user}
                dayHeaders={data.dayHeaders}
                monthAllowance={data.monthAllowance}
                leaveOffset={renderLeaveOffset(user)}
              />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
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
      <Table className="w-max text-center text-sm">
        {header}
        <TableBody>
          <SortableContext
            items={userIds}
            strategy={verticalListSortingStrategy}
          >
            {data.users.map((user) => (
              <SortableScheduleRow
                key={user.userId}
                user={user}
                dayHeaders={data.dayHeaders}
                monthAllowance={data.monthAllowance}
                leaveOffset={renderLeaveOffset(user)}
              />
            ))}
          </SortableContext>
        </TableBody>
      </Table>
      <DragOverlay dropAnimation={null}>
        {activeUser ? (
          <ScheduleDragPreview
            user={activeUser}
            dayHeaders={data.dayHeaders}
            monthAllowance={data.monthAllowance}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
