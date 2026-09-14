import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { buildPageList, PAGE_SIZE_OPTIONS } from "@/lib/pagination"

type TablePaginationProps = {
  selectedCount: number
  total: number
  currentPage: number
  totalPages: number
  pageSize: number
  onPageChange: React.Dispatch<React.SetStateAction<number>>
  onPageSizeChange: (pageSize: number) => void
}

export function TablePagination({
  selectedCount,
  total,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  const pageList = buildPageList(currentPage, totalPages)

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
      <div>已选择 {selectedCount} 条</div>
      <div className="flex flex-wrap items-center gap-2">
        <span>共 {total} 条</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={currentPage <= 1}
          onClick={() => onPageChange((page) => Math.max(1, page - 1))}
        >
          <ChevronLeft />
        </Button>
        {pageList.map((pageNo, index) => {
          const prev = pageList[index - 1]
          const showEllipsis = prev != null && pageNo - prev > 1
          return (
            <React.Fragment key={pageNo}>
              {showEllipsis ? <span>…</span> : null}
              <Button
                type="button"
                variant={currentPage === pageNo ? "default" : "outline"}
                onClick={() => onPageChange(pageNo)}
              >
                {pageNo}
              </Button>
            </React.Fragment>
          )
        })}
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange((page) => Math.min(totalPages, page + 1))}
        >
          <ChevronRight />
        </Button>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            if (value) onPageSizeChange(Number(value))
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
  )
}
