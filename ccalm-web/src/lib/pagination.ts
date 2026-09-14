export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const

export function buildPageList(current: number, total: number): number[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }
  const pages = new Set<number>([1, total, current, current - 1, current + 1])
  return [...pages]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b)
}

export function paginateRows<T>(rows: T[], page: number, pageSize: number) {
  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageRows = rows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  return {
    total,
    totalPages,
    currentPage,
    pageRows,
    emptyRowCount: Math.max(0, pageSize - pageRows.length),
  }
}
