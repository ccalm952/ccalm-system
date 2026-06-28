import * as React from "react";
import dayjs from "dayjs";

import { SortableTableHead } from "@/components/sortable-table-head";
import { TruncateCell } from "@/components/truncate-cell";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { toast } from "@/components/ui/sonner";
import { DateRangePickerField, type DateRangeValue } from "@/components/date-range-picker-field";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { api } from "@/lib/api";
import { tableActionLinkClass } from "@/lib/attendance/attendance-theme";
import { errorMessage } from "@/lib/errorMessage";
import { useAuth } from "@/lib/use-auth";
import { cn } from "@/lib/utils";

type WarehouseItem = {
  id: number;
  code: string;
  name: string;
  category: string;
  spec: string;
  unit: string;
  brand: string;
  manufacturer: string;
  supplierName: string;
  currentQty: number;
  lastPurchasePrice: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type WarehouseTxn = {
  id: number;
  itemId: number;
  type: "in" | "out" | "adjust";
  bizType: "purchase" | "use" | "return_in" | "return_out" | "adjust_in" | "adjust_out";
  qty: number;
  unitPrice: number;
  amount: number;
  occurDate: string;
  item: WarehouseItem;
  operatorUser?: { displayName: string; username: string } | null;
};

const txnTypeLabels: Record<string, string> = {
  in: "入库",
  out: "出库",
  adjust: "调整",
};

const txnBizLabels: Record<string, string> = {
  purchase: "采购入库",
  return_in: "退回入库",
  use: "领用出库",
  return_out: "退货出库",
  adjust_in: "盘盈调整",
  adjust_out: "盘亏调整",
};

const txnTypeOptions = [
  { label: "入库", value: "in" },
  { label: "出库", value: "out" },
] as const;

const txnBizOptions: Record<"in" | "out", Array<{ label: string; value: string }>> = {
  in: [
    { label: "采购入库", value: "purchase" },
    { label: "退回入库", value: "return_in" },
  ],
  out: [
    { label: "领用出库", value: "use" },
    { label: "退货出库", value: "return_out" },
  ],
};

function formatMoney(n: number) {
  return n.toFixed(2);
}

function makeWarehouseItemCode() {
  return `WP${dayjs().format("YYYYMMDDHHmmss")}`;
}

function defaultDateRange(): DateRangeValue {
  return {
    from: dayjs().startOf("month").format("YYYY-MM-DD"),
    to: dayjs().format("YYYY-MM-DD"),
  };
}

function WarehouseCategoryCombobox({
  items,
  value,
  onValueChange,
}: {
  items: string[];
  value: string;
  onValueChange: (v: string) => void;
}) {
  return (
    <Combobox
      items={items}
      value={value || null}
      onValueChange={(v) => onValueChange(v ?? "")}
      onInputValueChange={(v) => onValueChange(v)}
    >
      <ComboboxInput placeholder="选择或输入分类" />
      <ComboboxContent>
        <ComboboxEmpty>暂无匹配，可直接输入新分类</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

type ItemSortKey = "code" | "name" | "category" | "brand" | "spec" | "unit" | "currentQty";

type ItemSort = {
  key: ItemSortKey;
  dir: "asc" | "desc";
};

function compareItems(a: WarehouseItem, b: WarehouseItem, sort: ItemSort): number {
  const cmp =
    sort.key === "currentQty"
      ? a.currentQty - b.currentQty
      : (a[sort.key] ?? "").toString().localeCompare((b[sort.key] ?? "").toString(), "zh-CN", {
          numeric: true,
        });
  return sort.dir === "asc" ? cmp : -cmp;
}

const TXN_PAGE_SIZE = 15;

export function WarehouseLedgerPage() {
  const { me } = useAuth();
  const isAdmin = me?.role === "admin";
  const [items, setItems] = React.useState<WarehouseItem[]>([]);
  const [txns, setTxns] = React.useState<WarehouseTxn[]>([]);
  const [q, setQ] = React.useState("");
  const [dateRange, setDateRange] = React.useState<DateRangeValue>(defaultDateRange);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);

  const [itemDialogOpen, setItemDialogOpen] = React.useState(false);
  const [itemSubmitting, setItemSubmitting] = React.useState(false);
  const [editingItemId, setEditingItemId] = React.useState<number | null>(null);
  const [itemForm, setItemForm] = React.useState({
    code: "",
    name: "",
    category: "其他",
    spec: "",
    unit: "个",
    brand: "",
    manufacturer: "",
    supplierName: "",
    currentQty: "0",
    enabled: true,
  });

  const [txnDialogOpen, setTxnDialogOpen] = React.useState(false);
  const [txnSubmitting, setTxnSubmitting] = React.useState(false);
  const [txnForm, setTxnForm] = React.useState({
    type: "in" as "in" | "out",
    bizType: "purchase",
    qty: "1",
    unitPrice: "0",
    occurDate: dayjs().format("YYYY-MM-DD"),
  });

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const totalQty = items.reduce((sum, item) => sum + item.currentQty, 0);
  const categoryItems = React.useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      const c = item.category?.trim();
      if (c) set.add(c);
    }
    const current = itemForm.category.trim();
    if (current) set.add(current);
    return [...set].sort((a, b) => a.localeCompare(b, "zh-CN"));
  }, [items, itemForm.category]);
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const [importing, setImporting] = React.useState(false);
  const [itemSort, setItemSort] = React.useState<ItemSort | null>(null);
  const [deleteTxnId, setDeleteTxnId] = React.useState<number | null>(null);
  const [deleteTxnSubmitting, setDeleteTxnSubmitting] = React.useState(false);
  const [deleteItemTarget, setDeleteItemTarget] = React.useState<WarehouseItem | null>(null);
  const [deleteItemSubmitting, setDeleteItemSubmitting] = React.useState(false);
  const [txnPage, setTxnPage] = React.useState(1);
  const [txnTotal, setTxnTotal] = React.useState(0);
  const [txnsLoading, setTxnsLoading] = React.useState(false);
  const [itemsLoading, setItemsLoading] = React.useState(false);
  const txnRequestRef = React.useRef(0);
  const itemsRequestRef = React.useRef(0);
  const selectedIdRef = React.useRef(selectedId);
  const dateRangeRef = React.useRef(dateRange);

  React.useLayoutEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  React.useLayoutEffect(() => {
    dateRangeRef.current = dateRange;
  }, [dateRange]);

  const displayItems = React.useMemo(() => {
    if (!itemSort) return items;
    return [...items].sort((a, b) => compareItems(a, b, itemSort));
  }, [items, itemSort]);

  function toggleItemSort(key: ItemSortKey) {
    setItemSort((prev) => {
      if (prev?.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: "asc" };
    });
  }

  async function loadItems() {
    const requestId = ++itemsRequestRef.current;
    setItemsLoading(true);
    try {
      const data = await api<WarehouseItem[]>(
        "GET",
        `/warehouse/items${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`,
      );
      if (requestId !== itemsRequestRef.current) return;
      const list = Array.isArray(data) ? data : [];
      setItems(list);
      setSelectedId((prev) =>
        list.some((item) => item.id === prev) ? prev : (list[0]?.id ?? null),
      );
    } catch (e) {
      if (requestId !== itemsRequestRef.current) return;
      toast.error(errorMessage(e));
    } finally {
      if (requestId === itemsRequestRef.current) setItemsLoading(false);
    }
  }

  const loadTxns = React.useCallback(async (page: number) => {
    const itemId = selectedIdRef.current;
    const { from, to } = dateRangeRef.current;

    if (itemId == null) {
      setTxns([]);
      setTxnTotal(0);
      setTxnPage(1);
      setTxnsLoading(false);
      return;
    }

    const requestId = ++txnRequestRef.current;
    setTxnsLoading(true);

    try {
      const params = new URLSearchParams();
      if (from) params.set("startDate", from);
      if (to) params.set("endDate", to);
      params.set("itemId", String(itemId));
      params.set("page", String(page));
      params.set("pageSize", String(TXN_PAGE_SIZE));
      const data = await api<{
        items: WarehouseTxn[];
        total: number;
        page: number;
        pageSize: number;
      }>("GET", `/warehouse/txns?${params.toString()}`);
      if (requestId !== txnRequestRef.current) return;

      const latestItemId = selectedIdRef.current;
      const latestRange = dateRangeRef.current;
      if (latestItemId !== itemId) return;
      if (latestRange.from !== from || latestRange.to !== to) return;

      setTxns(Array.isArray(data.items) ? data.items : []);
      setTxnTotal(data.total ?? 0);
      setTxnPage(data.page ?? page);
    } catch (e) {
      if (requestId !== txnRequestRef.current) return;
      toast.error(errorMessage(e));
    } finally {
      if (requestId === txnRequestRef.current) setTxnsLoading(false);
    }
  }, []);

  const goTxnPage = React.useCallback(
    (page: number) => {
      if (selectedId == null) return;
      const maxPage = Math.max(1, Math.ceil(txnTotal / TXN_PAGE_SIZE));
      const next = Math.min(Math.max(1, page), maxPage);
      setTxnPage(next);
      void loadTxns(next);
    },
    [loadTxns, selectedId, txnTotal],
  );

  React.useEffect(() => {
    txnRequestRef.current += 1;
    setTxnPage(1);
    if (selectedId == null) {
      setTxns([]);
      setTxnTotal(0);
      setTxnsLoading(false);
      return;
    }
    void loadTxns(1);
  }, [dateRange.from, dateRange.to, selectedId, loadTxns]);

  React.useEffect(() => {
    void loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreateItem() {
    setEditingItemId(null);
    setItemForm({
      code: makeWarehouseItemCode(),
      name: "",
      category: "其他",
      spec: "",
      unit: "个",
      brand: "",
      manufacturer: "",
      supplierName: "",
      currentQty: "0",
      enabled: true,
    });
    setItemDialogOpen(true);
  }

  function openEditItem(item: WarehouseItem) {
    setEditingItemId(item.id);
    setItemForm({
      code: item.code,
      name: item.name,
      category: item.category,
      spec: item.spec,
      unit: item.unit,
      brand: item.brand,
      manufacturer: item.manufacturer,
      supplierName: item.supplierName,
      currentQty: String(item.currentQty),
      enabled: item.enabled,
    });
    setItemDialogOpen(true);
  }

  function openTxn(type: "in" | "out") {
    if (!selectedItem) {
      toast.error("请先选择物品");
      return;
    }
    const firstBizType = txnBizOptions[type][0]?.value ?? "purchase";
    setTxnForm({
      type,
      bizType: firstBizType,
      qty: "1",
      unitPrice: type === "in" ? String(selectedItem.lastPurchasePrice || 0) : "0",
      occurDate: dayjs().format("YYYY-MM-DD"),
    });
    setTxnDialogOpen(true);
  }

  async function submitItem() {
    setItemSubmitting(true);
    try {
      const payload = {
        code: itemForm.code.trim(),
        name: itemForm.name.trim(),
        category: itemForm.category.trim(),
        spec: itemForm.spec.trim(),
        unit: itemForm.unit.trim(),
        brand: itemForm.brand.trim(),
        manufacturer: itemForm.manufacturer.trim(),
        supplierName: itemForm.supplierName.trim(),
        enabled: itemForm.enabled,
      };
      if (editingItemId) {
        await api("PUT", `/warehouse/items/${editingItemId}`, {
          ...payload,
          currentQty: Math.max(0, Math.round(Number(itemForm.currentQty) || 0)),
        });
        toast.success("物品已更新");
      } else {
        await api("POST", "/warehouse/items", payload);
        toast.success("物品已创建");
      }
      setItemDialogOpen(false);
      await Promise.all([loadItems(), loadTxns(txnPage)]);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setItemSubmitting(false);
    }
  }

  async function handleImportLichi(file?: File) {
    if (!file) return;
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await api<{
        totalRows: number;
        createdItems: number;
        createdTxns: number;
        skippedTxns: number;
      }>("POST", "/warehouse/import/lichi", form);
      toast.success(
        `导入完成：${result.createdTxns} 条入库，新增物品 ${result.createdItems} 个，跳过 ${result.skippedTxns} 条`,
      );
      await Promise.all([loadItems(), loadTxns(txnPage)]);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  async function submitTxn() {
    if (!selectedItem) return;
    setTxnSubmitting(true);
    try {
      await api("POST", "/warehouse/txns", {
        itemId: selectedItem.id,
        type: txnForm.type,
        bizType: txnForm.bizType,
        qty: Number(txnForm.qty),
        unitPrice: txnForm.type === "in" ? Number(txnForm.unitPrice) || 0 : 0,
        occurDate: txnForm.occurDate,
      });
      toast.success("流水已登记");
      setTxnDialogOpen(false);
      await Promise.all([loadItems(), loadTxns(txnPage)]);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setTxnSubmitting(false);
    }
  }

  async function confirmDeleteTxn() {
    if (deleteTxnId == null) return;
    setDeleteTxnSubmitting(true);
    try {
      await api("DELETE", `/warehouse/txns/${deleteTxnId}`);
      toast.success("流水已删除");
      setDeleteTxnId(null);
      const nextPage = txns.length === 1 && txnPage > 1 ? txnPage - 1 : txnPage;
      await loadItems();
      await loadTxns(nextPage);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleteTxnSubmitting(false);
    }
  }

  async function confirmDeleteItem() {
    if (!deleteItemTarget) return;
    setDeleteItemSubmitting(true);
    try {
      await api("DELETE", `/warehouse/items/${deleteItemTarget.id}`);
      toast.success("物品已删除");
      setDeleteItemTarget(null);
      await Promise.all([loadItems(), loadTxns(txnPage)]);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleteItemSubmitting(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
      <Card className="w-full min-w-0">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="w-56"
              value={q}
              placeholder="搜索名称、分类、品牌"
              onChange={(e) => setQ(e.target.value)}
            />
            <Button type="button" variant="outline" onClick={() => void loadItems()}>
              搜索
            </Button>
            <DateRangePickerField value={dateRange} onValueChange={setDateRange} />
          </div>
          {isAdmin ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => void handleImportLichi(e.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                disabled={importing}
                onClick={() => importInputRef.current?.click()}
              >
                {importing ? "导入中…" : "导入"}
              </Button>
              <Button type="button" variant="outline" onClick={openCreateItem}>
                新增物品
              </Button>
              <Button type="button" variant="outline" onClick={() => openTxn("in")}>
                入库
              </Button>
              <Button type="button" variant="outline" onClick={() => openTxn("out")}>
                出库
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="[&_[data-slot=table-container]]:w-auto [&_[data-slot=table-container]]:overflow-x-visible">
          <ScrollArea className="w-full max-w-full">
          <div className="flex w-max flex-col gap-4 lg:flex-row lg:items-start">
          <div className="grid w-max shrink-0 grid-cols-1 gap-4 self-start">
            <div
              className={cn(
                "grid w-full grid-cols-2 gap-3",
                itemsLoading && items.length > 0 && "opacity-60",
              )}
            >
              <Card className="border border-border shadow-xs ring-0">
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">物品数</div>
                  <div className="min-h-8 text-2xl font-semibold tabular-nums">{items.length}</div>
                </CardContent>
              </Card>
              <Card className="border border-border shadow-xs ring-0">
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">当前总库存</div>
                  <div className="min-h-8 text-2xl font-semibold tabular-nums">{totalQty}</div>
                </CardContent>
              </Card>
            </div>

            <Table className="w-max">
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    label="编码"
                    sortKey="code"
                    activeSort={itemSort}
                    onSort={toggleItemSort}
                  />
                  <SortableTableHead
                    label="名称"
                    sortKey="name"
                    activeSort={itemSort}
                    onSort={toggleItemSort}
                  />
                  <SortableTableHead
                    label="分类"
                    sortKey="category"
                    activeSort={itemSort}
                    onSort={toggleItemSort}
                  />
                  <SortableTableHead
                    label="品牌"
                    sortKey="brand"
                    activeSort={itemSort}
                    onSort={toggleItemSort}
                  />
                  <SortableTableHead
                    label="规格"
                    sortKey="spec"
                    activeSort={itemSort}
                    onSort={toggleItemSort}
                  />
                  <SortableTableHead
                    label="单位"
                    sortKey="unit"
                    activeSort={itemSort}
                    onSort={toggleItemSort}
                  />
                  <SortableTableHead
                    label="库存"
                    sortKey="currentQty"
                    activeSort={itemSort}
                    onSort={toggleItemSort}
                  />
                  <TableHead className="text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className={selectedId === item.id ? "bg-muted/40" : undefined}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <TableCell>
                      <TruncateCell title={item.code}>{item.code}</TruncateCell>
                    </TableCell>
                    <TableCell>
                      <TruncateCell title={item.name}>{item.name}</TruncateCell>
                    </TableCell>
                    <TableCell>
                      <TruncateCell title={item.category || undefined}>
                        {item.category || "-"}
                      </TruncateCell>
                    </TableCell>
                    <TableCell>
                      <TruncateCell title={item.brand || undefined}>
                        {item.brand || "-"}
                      </TruncateCell>
                    </TableCell>
                    <TableCell>
                      <TruncateCell title={item.spec || undefined}>{item.spec || "-"}</TruncateCell>
                    </TableCell>
                    <TableCell>
                      <TruncateCell title={item.unit}>{item.unit}</TruncateCell>
                    </TableCell>
                    <TableCell className="text-center">{item.currentQty}</TableCell>
                    <TableCell className="text-center">
                      {isAdmin ? (
                        <div className="flex items-center justify-center gap-3">
                          <Button
                            type="button"
                            variant="link"
                            className={tableActionLinkClass}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditItem(item);
                            }}
                          >
                            编辑
                          </Button>
                          <Button
                            type="button"
                            variant="link"
                            className={tableActionLinkClass}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteItemTarget(item);
                            }}
                          >
                            删除
                          </Button>
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid w-max shrink-0 grid-cols-1 gap-4 self-start">
            <Card className="w-full border border-border shadow-xs ring-0">
              <CardContent className="pt-6">
                <div className="mb-2 text-sm font-medium">当前选中物品</div>
                {selectedItem ? (
                  <div className="space-y-1 text-sm">
                    <div>名称：{selectedItem.name}</div>
                    <div>编码：{selectedItem.code}</div>
                    <div>规格：{selectedItem.spec || "-"}</div>
                    <div>品牌：{selectedItem.brand || "-"}</div>
                    <div>供应商：{selectedItem.supplierName || "-"}</div>
                    <div>库存：{selectedItem.currentQty}</div>
                    <div>最近采购单价：{formatMoney(selectedItem.lastPurchasePrice)}</div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">暂无选中物品</div>
                )}
              </CardContent>
            </Card>

            <div
              className={cn(
                "min-h-[640px]",
                txnsLoading && txns.length > 0 && "pointer-events-none opacity-60",
              )}
            >
            <Table className="w-max">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">日期</TableHead>
                  <TableHead className="text-center">类型</TableHead>
                  <TableHead className="text-center">业务</TableHead>
                  <TableHead className="text-center">数量</TableHead>
                  <TableHead className="text-center">单价</TableHead>
                  <TableHead className="text-center">金额</TableHead>
                  <TableHead className="text-center">操作人</TableHead>
                  {isAdmin ? <TableHead className="text-center">操作</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {txns.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell>{txn.occurDate}</TableCell>
                    <TableCell>{txnTypeLabels[txn.type] ?? txn.type}</TableCell>
                    <TableCell>{txnBizLabels[txn.bizType] ?? txn.bizType}</TableCell>
                    <TableCell className="text-center">{txn.qty}</TableCell>
                    <TableCell className="text-center">
                      {txn.type === "in" ? formatMoney(txn.unitPrice) : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {txn.type === "in" ? formatMoney(txn.amount) : "-"}
                    </TableCell>
                    <TableCell>
                      {txn.operatorUser?.displayName || txn.operatorUser?.username || "-"}
                    </TableCell>
                    {isAdmin ? (
                      <TableCell className="text-center">
                        <Button
                          type="button"
                          variant="link"
                          className={tableActionLinkClass}
                          onClick={() => setDeleteTxnId(txn.id)}
                        >
                          删除
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex w-full items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>
                共 {txnTotal} 条
                {txnTotal > 0
                  ? `，第 ${txnPage} / ${Math.max(1, Math.ceil(txnTotal / TXN_PAGE_SIZE))} 页`
                  : ""}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={txnPage <= 1}
                  onClick={() => goTxnPage(txnPage - 1)}
                >
                  上一页
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={txnPage >= Math.ceil(txnTotal / TXN_PAGE_SIZE)}
                  onClick={() => goTxnPage(txnPage + 1)}
                >
                  下一页
                </Button>
              </div>
            </div>
            </div>
          </div>
          </div>
          <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingItemId ? "编辑物品" : "新增物品"}</DialogTitle>
            <DialogDescription>
              {editingItemId
                ? "修改库存时会自动登记一条调整流水。"
                : "维护库存物品主档，后续出入库都基于这里的物品。"}
            </DialogDescription>
          </DialogHeader>
          <FieldSet className="text-sm">
            <FieldGroup className="grid gap-3 sm:grid-cols-2">
              <Field orientation="vertical">
                <FieldLabel>
                  <FieldTitle>编码</FieldTitle>
                </FieldLabel>
                <FieldContent>
                  <Input
                    className="w-full"
                    value={itemForm.code}
                    onChange={(e) => setItemForm((s) => ({ ...s, code: e.target.value }))}
                  />
                </FieldContent>
              </Field>
              <Field orientation="vertical">
                <FieldLabel>
                  <FieldTitle>名称</FieldTitle>
                </FieldLabel>
                <FieldContent>
                  <Input
                    className="w-full"
                    value={itemForm.name}
                    onChange={(e) => setItemForm((s) => ({ ...s, name: e.target.value }))}
                  />
                </FieldContent>
              </Field>
              <Field orientation="vertical">
                <FieldLabel>
                  <FieldTitle>分类</FieldTitle>
                </FieldLabel>
                <FieldContent>
                  <WarehouseCategoryCombobox
                    items={categoryItems}
                    value={itemForm.category}
                    onValueChange={(category) => setItemForm((s) => ({ ...s, category }))}
                  />
                </FieldContent>
              </Field>
              {editingItemId ? (
                <Field orientation="vertical">
                  <FieldLabel>
                    <FieldTitle>库存</FieldTitle>
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      className="w-full"
                      type="number"
                      min={0}
                      value={itemForm.currentQty}
                      onChange={(e) => setItemForm((s) => ({ ...s, currentQty: e.target.value }))}
                    />
                  </FieldContent>
                </Field>
              ) : null}
              <Field orientation="vertical">
                <FieldLabel>
                  <FieldTitle>规格</FieldTitle>
                </FieldLabel>
                <FieldContent>
                  <Input
                    className="w-full"
                    value={itemForm.spec}
                    onChange={(e) => setItemForm((s) => ({ ...s, spec: e.target.value }))}
                  />
                </FieldContent>
              </Field>
              <Field orientation="vertical">
                <FieldLabel>
                  <FieldTitle>单位</FieldTitle>
                </FieldLabel>
                <FieldContent>
                  <Input
                    className="w-full"
                    value={itemForm.unit}
                    onChange={(e) => setItemForm((s) => ({ ...s, unit: e.target.value }))}
                  />
                </FieldContent>
              </Field>
              <Field orientation="vertical">
                <FieldLabel>
                  <FieldTitle>品牌</FieldTitle>
                </FieldLabel>
                <FieldContent>
                  <Input
                    className="w-full"
                    value={itemForm.brand}
                    onChange={(e) => setItemForm((s) => ({ ...s, brand: e.target.value }))}
                  />
                </FieldContent>
              </Field>
            </FieldGroup>
          </FieldSet>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setItemDialogOpen(false)}>
              取消
            </Button>
            <Button type="button" disabled={itemSubmitting} onClick={() => void submitItem()}>
              {itemSubmitting ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={txnDialogOpen} onOpenChange={setTxnDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>登记流水</DialogTitle>
            <DialogDescription>为当前选中的物品登记入库或出库。</DialogDescription>
          </DialogHeader>
          <FieldSet className="text-sm">
            <Field orientation="vertical">
              <FieldLabel>
                <FieldTitle>物品</FieldTitle>
              </FieldLabel>
              <FieldContent>
                <Input
                  className="w-full"
                  value={selectedItem ? `${selectedItem.name} (${selectedItem.code})` : ""}
                  disabled
                />
              </FieldContent>
            </Field>
            <FieldGroup className="grid gap-3 sm:grid-cols-2">
              <Field orientation="vertical">
                <FieldLabel>
                  <FieldTitle>类型</FieldTitle>
                </FieldLabel>
                <FieldContent>
                  <Select
                    value={txnForm.type}
                    onValueChange={(v: string | null) => {
                      if (!v) return;
                      const type = v as "in" | "out";
                      setTxnForm((s) => ({
                        ...s,
                        type,
                        bizType: txnBizOptions[type][0]?.value ?? s.bizType,
                        unitPrice:
                          type === "in" ? String(selectedItem?.lastPurchasePrice || 0) : "0",
                      }));
                    }}
                    items={txnTypeOptions}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {txnTypeOptions.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
              <Field orientation="vertical">
                <FieldLabel>
                  <FieldTitle>业务</FieldTitle>
                </FieldLabel>
                <FieldContent>
                  <Select
                    value={txnForm.bizType}
                    onValueChange={(v: string | null) =>
                      v && setTxnForm((s) => ({ ...s, bizType: v }))
                    }
                    items={txnBizOptions[txnForm.type]}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {txnBizOptions[txnForm.type].map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
              <Field orientation="vertical">
                <FieldLabel>
                  <FieldTitle>数量</FieldTitle>
                </FieldLabel>
                <FieldContent>
                  <Input
                    className="w-full"
                    type="number"
                    min={1}
                    value={txnForm.qty}
                    onChange={(e) => setTxnForm((s) => ({ ...s, qty: e.target.value }))}
                  />
                </FieldContent>
              </Field>
              {txnForm.type === "in" ? (
                <>
                  <Field orientation="vertical">
                    <FieldLabel>
                      <FieldTitle>单价</FieldTitle>
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        className="w-full"
                        type="number"
                        min={0}
                        step={0.01}
                        value={txnForm.unitPrice}
                        onChange={(e) => setTxnForm((s) => ({ ...s, unitPrice: e.target.value }))}
                      />
                    </FieldContent>
                  </Field>
                  <Field orientation="vertical">
                    <FieldLabel>
                      <FieldTitle>金额</FieldTitle>
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        className="w-full"
                        disabled
                        value={formatMoney(
                          (Number(txnForm.qty) || 0) * (Number(txnForm.unitPrice) || 0),
                        )}
                      />
                    </FieldContent>
                  </Field>
                </>
              ) : null}
              <Field orientation="vertical">
                <FieldLabel>
                  <FieldTitle>日期</FieldTitle>
                </FieldLabel>
                <FieldContent>
                  <Input
                    className="w-full"
                    type="date"
                    value={txnForm.occurDate}
                    onChange={(e) => setTxnForm((s) => ({ ...s, occurDate: e.target.value }))}
                  />
                </FieldContent>
              </Field>
            </FieldGroup>
          </FieldSet>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setTxnDialogOpen(false)}>
              取消
            </Button>
            <Button type="button" disabled={txnSubmitting} onClick={() => void submitTxn()}>
              {txnSubmitting ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTxnId != null}
        onOpenChange={(open) => !open && setDeleteTxnId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除流水</AlertDialogTitle>
            <AlertDialogDescription>
              删除后会同步回滚该物品库存。若删除的是采购入库记录，最近采购单价也会重新计算。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline">取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteTxnSubmitting}
              onClick={() => void confirmDeleteTxn()}
            >
              {deleteTxnSubmitting ? "删除中…" : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteItemTarget != null}
        onOpenChange={(open) => !open && setDeleteItemTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除物品</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteItemTarget
                ? `确定删除「${deleteItemTarget.name}」吗？将同时删除其全部出入库流水，且不可恢复。`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline">取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteItemSubmitting}
              onClick={() => void confirmDeleteItem()}
            >
              {deleteItemSubmitting ? "删除中…" : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
