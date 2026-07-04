import * as React from "react";
import dayjs from "dayjs";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

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
import { toast } from "sonner";
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

type WarehouseProduct = {
  id: number;
  name: string;
  category: string;
  brand: string;
  manufacturer: string;
  supplierName: string;
  defaultUnit: string;
  enabled: boolean;
};

type WarehouseItem = {
  id: number;
  productId: number;
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

type ProductGroup = {
  productId: number;
  name: string;
  category: string;
  brand: string;
  items: WarehouseItem[];
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

function findProductByIdentity(
  products: WarehouseProduct[],
  name: string,
  brand: string,
) {
  const normalizedName = name.trim();
  if (!normalizedName) return null;
  const normalizedBrand = brand.trim().toLowerCase();
  return (
    products.find(
      (product) =>
        product.name.trim().toLowerCase() === normalizedName.toLowerCase() &&
        product.brand.trim().toLowerCase() === normalizedBrand,
    ) ?? null
  );
}

function formatProductOption(product: WarehouseProduct) {
  const brand = product.brand.trim();
  return brand ? `${product.name} · ${brand}` : product.name;
}

function WarehouseProductNameCombobox({
  products,
  value,
  brand,
  onValueChange,
  onProductSelect,
}: {
  products: WarehouseProduct[];
  value: string;
  brand: string;
  onValueChange: (name: string) => void;
  onProductSelect: (product: WarehouseProduct | null) => void;
}) {
  const options = React.useMemo(
    () =>
      [...products]
        .sort((a, b) => formatProductOption(a).localeCompare(formatProductOption(b), "zh-CN"))
        .map((product) => formatProductOption(product)),
    [products],
  );

  const pickProduct = React.useCallback(
    (input: string) => {
      const matchedOption = products.find((product) => formatProductOption(product) === input);
      if (matchedOption) {
        onProductSelect(matchedOption);
        return;
      }
      onValueChange(input);
      onProductSelect(findProductByIdentity(products, input, brand));
    },
    [brand, onProductSelect, onValueChange, products],
  );

  return (
    <Combobox
      items={options}
      value={value || null}
      onValueChange={(v) => pickProduct(v ?? "")}
      onInputValueChange={pickProduct}
    >
      <ComboboxInput placeholder="选择已有产品或输入新名称" />
      <ComboboxContent>
        <ComboboxEmpty>暂无匹配，填写名称与品牌可创建新产品</ComboboxEmpty>
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
    productId: null as number | null,
    code: "",
    name: "",
    category: "其他",
    spec: "",
    unit: "个",
    brand: "",
    manufacturer: "",
    supplierName: "",
    currentQty: "0",
    initialQty: "0",
    initialUnitPrice: "0",
    initialOccurDate: dayjs().format("YYYY-MM-DD"),
    enabled: true,
  });
  const [products, setProducts] = React.useState<WarehouseProduct[]>([]);
  const [collapsedProducts, setCollapsedProducts] = React.useState<Set<number>>(new Set());

  const [txnDialogOpen, setTxnDialogOpen] = React.useState(false);
  const [txnSubmitting, setTxnSubmitting] = React.useState(false);
  const [txnTargetItem, setTxnTargetItem] = React.useState<WarehouseItem | null>(null);
  const [txnForm, setTxnForm] = React.useState({
    type: "in" as "in" | "out",
    bizType: "purchase",
    qty: "1",
    unitPrice: "0",
    occurDate: dayjs().format("YYYY-MM-DD"),
  });

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const totalQty = items.reduce((sum, item) => sum + item.currentQty, 0);
  const productCount = React.useMemo(
    () => new Set(items.map((item) => item.productId)).size,
    [items],
  );
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
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [importing, setImporting] = React.useState(false);
  const [itemSort, setItemSort] = React.useState<ItemSort | null>(null);
  const [deleteTxnId, setDeleteTxnId] = React.useState<number | null>(null);
  const [deleteTxnSubmitting, setDeleteTxnSubmitting] = React.useState(false);
  const [deleteItemTarget, setDeleteItemTarget] = React.useState<WarehouseItem | null>(null);
  const [deleteItemOpen, setDeleteItemOpen] = React.useState(false);
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

  const productGroups = React.useMemo(() => {
    const order: number[] = [];
    const map = new Map<number, ProductGroup>();
    for (const item of displayItems) {
      let group = map.get(item.productId);
      if (!group) {
        group = {
          productId: item.productId,
          name: item.name,
          category: item.category,
          brand: item.brand,
          items: [],
        };
        map.set(item.productId, group);
        order.push(item.productId);
      }
      group.items.push(item);
    }
    return order.map((productId) => map.get(productId)!);
  }, [displayItems]);

  function toggleProductCollapse(productId: number) {
    setCollapsedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function toggleItemSort(key: ItemSortKey) {
    setItemSort((prev) => {
      if (prev?.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: "asc" };
    });
  }

  const loadItems = React.useCallback(async () => {
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
  }, [q]);

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
    const id = window.setTimeout(() => {
      void loadItems();
    }, 300);
    return () => window.clearTimeout(id);
  }, [loadItems]);

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (itemDialogOpen || txnDialogOpen || deleteItemOpen || deleteTxnId != null) return;
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement ||
        (active instanceof HTMLElement && active.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      searchInputRef.current?.focus();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [itemDialogOpen, txnDialogOpen, deleteItemOpen, deleteTxnId]);

  React.useEffect(() => {
    if (!itemDialogOpen) return;
    void api<WarehouseProduct[]>("GET", "/warehouse/products")
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch((e) => toast.error(errorMessage(e)));
  }, [itemDialogOpen]);

  function openCreateItem() {
    setEditingItemId(null);
    setItemForm({
      productId: null,
      code: makeWarehouseItemCode(),
      name: "",
      category: "其他",
      spec: "",
      unit: "个",
      brand: "",
      manufacturer: "",
      supplierName: "",
      currentQty: "0",
      initialQty: "0",
      initialUnitPrice: "0",
      initialOccurDate: dayjs().format("YYYY-MM-DD"),
      enabled: true,
    });
    setItemDialogOpen(true);
  }

  function openEditItem(item: WarehouseItem) {
    setEditingItemId(item.id);
    setItemForm({
      productId: item.productId,
      code: item.code,
      name: item.name,
      category: item.category,
      spec: item.spec || item.name,
      unit: item.unit,
      brand: item.brand,
      manufacturer: item.manufacturer,
      supplierName: item.supplierName,
      currentQty: String(item.currentQty),
      initialQty: "0",
      initialUnitPrice: "0",
      initialOccurDate: dayjs().format("YYYY-MM-DD"),
      enabled: item.enabled,
    });
    setItemDialogOpen(true);
  }

  function applySelectedProduct(product: WarehouseProduct | null) {
    if (!product) {
      setItemForm((state) => ({ ...state, productId: null }));
      return;
    }
    setItemForm((state) => ({
      ...state,
      productId: product.id,
      name: product.name,
      category: product.category || "其他",
      brand: product.brand,
      manufacturer: product.manufacturer,
      supplierName: product.supplierName,
      unit: product.defaultUnit || state.unit,
    }));
  }

  function syncProductIdentity(name: string, brand: string) {
    const matched = findProductByIdentity(products, name, brand);
    if (matched) applySelectedProduct(matched);
    else setItemForm((state) => ({ ...state, productId: null, name, brand }));
  }

  function openTxn(item: WarehouseItem, type: "in" | "out") {
    setSelectedId(item.id);
    setTxnTargetItem(item);
    const firstBizType = txnBizOptions[type][0]?.value ?? "purchase";
    setTxnForm({
      type,
      bizType: firstBizType,
      qty: "1",
      unitPrice: type === "in" ? String(item.lastPurchasePrice || 0) : "0",
      occurDate: dayjs().format("YYYY-MM-DD"),
    });
    setTxnDialogOpen(true);
  }

  async function submitItem() {
    setItemSubmitting(true);
    try {
      const productFields = {
        name: itemForm.name.trim(),
        category: itemForm.category.trim(),
        brand: itemForm.brand.trim(),
        manufacturer: itemForm.manufacturer.trim(),
        supplierName: itemForm.supplierName.trim(),
      };
      const skuFields = {
        code: itemForm.code.trim(),
        spec: itemForm.spec.trim(),
        unit: itemForm.unit.trim(),
        enabled: itemForm.enabled,
      };
      if (editingItemId) {
        await api("PUT", `/warehouse/items/${editingItemId}`, {
          ...productFields,
          ...skuFields,
          currentQty: Math.max(0, Math.round(Number(itemForm.currentQty) || 0)),
        });
        toast.success("物品已更新");
      } else {
        const matchedProduct = itemForm.productId
          ? null
          : findProductByIdentity(products, itemForm.name, itemForm.brand);
        const created = await api<WarehouseItem>("POST", "/warehouse/items", {
          ...productFields,
          ...skuFields,
          ...(itemForm.productId
            ? { productId: itemForm.productId }
            : matchedProduct
              ? { productId: matchedProduct.id }
              : { name: productFields.name }),
        });
        const initialQty = Math.round(Number(itemForm.initialQty) || 0);
        if (initialQty > 0) {
          await api("POST", "/warehouse/txns", {
            itemId: created.id,
            type: "in",
            bizType: "purchase",
            qty: initialQty,
            unitPrice: Number(itemForm.initialUnitPrice) || 0,
            occurDate: itemForm.initialOccurDate,
          });
          setSelectedId(created.id);
          toast.success("物品已创建并完成入库");
        } else {
          toast.success("物品已创建");
        }
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
    if (!txnTargetItem) return;
    setTxnSubmitting(true);
    try {
      await api("POST", "/warehouse/txns", {
        itemId: txnTargetItem.id,
        type: txnForm.type,
        bizType: txnForm.bizType,
        qty: Number(txnForm.qty),
        unitPrice: txnForm.type === "in" ? Number(txnForm.unitPrice) || 0 : 0,
        occurDate: txnForm.occurDate,
      });
      toast.success("流水已登记");
      setTxnDialogOpen(false);
      setTxnTargetItem(null);
      setSelectedId(txnTargetItem.id);
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
      setDeleteItemOpen(false);
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
              ref={searchInputRef}
              className="w-56"
              value={q}
              placeholder="搜索名称、分类、品牌"
              onChange={(e) => setQ(e.target.value)}
            />
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
                新增规格
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
                "grid w-full grid-cols-3 gap-3",
                itemsLoading && items.length > 0 && "opacity-60",
              )}
            >
              <Card className="border border-border shadow-xs ring-0">
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">产品数</div>
                  <div className="min-h-8 text-2xl font-semibold tabular-nums">{productCount}</div>
                </CardContent>
              </Card>
              <Card className="border border-border shadow-xs ring-0">
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">规格数</div>
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
                {productGroups.map((group) => {
                  const collapsed = collapsedProducts.has(group.productId);
                  const groupQty = group.items.reduce((sum, item) => sum + item.currentQty, 0);
                  return (
                    <React.Fragment key={group.productId}>
                      <TableRow className="bg-muted/20">
                        <TableCell colSpan={8} className="p-0">
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-auto w-full justify-start gap-2 rounded-none px-3 py-2"
                            onClick={() => toggleProductCollapse(group.productId)}
                          >
                            {collapsed ? (
                              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
                            )}
                            <span>
                              {group.name}
                              {group.category ? ` · ${group.category}` : ""}
                              {group.brand ? ` · ${group.brand}` : ""}
                              {` · ${group.items.length} 个规格 · 库存 ${groupQty}`}
                            </span>
                          </Button>
                        </TableCell>
                      </TableRow>
                      {!collapsed
                        ? group.items.map((item) => (
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
                                <TruncateCell title={item.spec || undefined}>
                                  {item.spec || "-"}
                                </TruncateCell>
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
                                        openTxn(item, "in");
                                      }}
                                    >
                                      入库
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="link"
                                      className={tableActionLinkClass}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openTxn(item, "out");
                                      }}
                                    >
                                      出库
                                    </Button>
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
                                        setDeleteItemOpen(true);
                                      }}
                                    >
                                      删除
                                    </Button>
                                  </div>
                                ) : null}
                              </TableCell>
                            </TableRow>
                          ))
                        : null}
                    </React.Fragment>
                  );
                })}
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
        <DialogContent className="md:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingItemId ? "编辑规格" : "新增规格"}</DialogTitle>
            <DialogDescription>
              {editingItemId
                ? "改为已有「名称+品牌」会并入该产品；改为新的名称或品牌且同组有多条规格时，仅本条会拆成新产品。修改库存时会自动登记调整流水。"
                : "同一名称可对应不同品牌；选择下拉项或填写相同名称与品牌会归入已有产品。填写入库数量后将同时登记采购入库流水。"}
            </DialogDescription>
          </DialogHeader>
          <FieldSet className="text-sm">
            <FieldGroup className="grid gap-3 md:grid-cols-2">
              <Field orientation="vertical">
                <FieldLabel>
                  <FieldTitle>产品名称</FieldTitle>
                </FieldLabel>
                <FieldContent>
                  <WarehouseProductNameCombobox
                    products={products}
                    value={itemForm.name}
                    brand={itemForm.brand}
                    onValueChange={(name) =>
                      editingItemId
                        ? setItemForm((state) => ({ ...state, name }))
                        : syncProductIdentity(name, itemForm.brand)
                    }
                    onProductSelect={
                      editingItemId
                        ? (product) => {
                            if (!product) return;
                            setItemForm((state) => ({
                              ...state,
                              name: product.name,
                              brand: product.brand,
                            }));
                          }
                        : applySelectedProduct
                    }
                  />
                </FieldContent>
              </Field>
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
                    onChange={(e) =>
                      editingItemId
                        ? setItemForm((state) => ({ ...state, brand: e.target.value }))
                        : syncProductIdentity(itemForm.name, e.target.value)
                    }
                  />
                </FieldContent>
              </Field>
              {!editingItemId ? (
                <>
                  <Field orientation="vertical">
                    <FieldLabel>
                      <FieldTitle>入库数量</FieldTitle>
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        className="w-full"
                        type="number"
                        min={0}
                        value={itemForm.initialQty}
                        onChange={(e) =>
                          setItemForm((s) => ({ ...s, initialQty: e.target.value }))
                        }
                      />
                    </FieldContent>
                  </Field>
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
                        value={itemForm.initialUnitPrice}
                        onChange={(e) =>
                          setItemForm((s) => ({ ...s, initialUnitPrice: e.target.value }))
                        }
                      />
                    </FieldContent>
                  </Field>
                  <Field orientation="vertical">
                    <FieldLabel>
                      <FieldTitle>入库日期</FieldTitle>
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        className="w-full"
                        type="date"
                        value={itemForm.initialOccurDate}
                        onChange={(e) =>
                          setItemForm((s) => ({ ...s, initialOccurDate: e.target.value }))
                        }
                      />
                    </FieldContent>
                  </Field>
                </>
              ) : null}
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

      <Dialog
        open={txnDialogOpen}
        onOpenChange={(open) => {
          setTxnDialogOpen(open);
          if (!open) setTxnTargetItem(null);
        }}
      >
        <DialogContent className="md:max-w-3xl">
          <DialogHeader>
            <DialogTitle>登记流水</DialogTitle>
            <DialogDescription>为所选物品登记入库或出库。</DialogDescription>
          </DialogHeader>
          <FieldSet className="text-sm">
            <Field orientation="vertical">
              <FieldLabel>
                <FieldTitle>物品</FieldTitle>
              </FieldLabel>
              <FieldContent>
                <Input
                  className="w-full"
                  value={
                    txnTargetItem ? `${txnTargetItem.name} (${txnTargetItem.code})` : ""
                  }
                  disabled
                />
              </FieldContent>
            </Field>
            <FieldGroup className="grid gap-3 md:grid-cols-2">
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
                          type === "in" ? String(txnTargetItem?.lastPurchasePrice || 0) : "0",
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
        open={deleteItemOpen}
        onOpenChange={(open) => {
          setDeleteItemOpen(open);
          if (!open) {
            window.setTimeout(() => setDeleteItemTarget(null), 150);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除物品</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteItemTarget
                ? `确定删除「${deleteItemTarget.name}」吗？将同时删除其全部出入库流水，且不可恢复。`
                : ""}
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
