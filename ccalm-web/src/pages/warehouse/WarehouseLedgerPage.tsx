import * as React from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { api } from "@/lib/api";
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
  enabled: boolean;
};

type ProductGroup = {
  key: string;
  name: string;
  items: WarehouseItem[];
};

type ItemSortKey = "code" | "name" | "category" | "brand" | "spec" | "unit";

type ItemSort = {
  key: ItemSortKey;
  dir: "asc" | "desc";
};

const SELECT_COL_W = "40px";
const ACTIONS_COL_W = "160px";

function productGroupKey(name: string) {
  return name.trim().toLowerCase();
}

function compareItems(a: WarehouseItem, b: WarehouseItem, sort: ItemSort): number {
  const cmp = (a[sort.key] ?? "").toString().localeCompare((b[sort.key] ?? "").toString(), "zh-CN", {
    numeric: true,
  });
  return sort.dir === "asc" ? cmp : -cmp;
}

function findProductByIdentity(products: WarehouseProduct[], name: string, brand: string) {
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

const emptyForm = {
  productId: null as number | null,
  code: "",
  name: "",
  category: "其他",
  spec: "",
  unit: "个",
  brand: "",
};

export function WarehouseLedgerPage() {
  const { me } = useAuth();
  const isAdmin = me?.role === "admin";
  const [items, setItems] = React.useState<WarehouseItem[]>([]);
  const [q, setQ] = React.useState("");
  const [itemsLoading, setItemsLoading] = React.useState(true);
  const [itemSort, setItemSort] = React.useState<ItemSort | null>(null);
  const [selection, setSelection] = React.useState<Set<number>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(new Set());

  const [itemDialogOpen, setItemDialogOpen] = React.useState(false);
  const [itemSubmitting, setItemSubmitting] = React.useState(false);
  const [editingItemId, setEditingItemId] = React.useState<number | null>(null);
  const [itemForm, setItemForm] = React.useState(emptyForm);
  const [products, setProducts] = React.useState<WarehouseProduct[]>([]);
  const [deleteItemOpen, setDeleteItemOpen] = React.useState(false);
  const [deleteItemTarget, setDeleteItemTarget] = React.useState<WarehouseItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const itemsRequestRef = React.useRef(0);

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

  const displayItems = React.useMemo(() => {
    if (!itemSort) return items;
    return [...items].sort((a, b) => compareItems(a, b, itemSort));
  }, [items, itemSort]);

  const productGroups = React.useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, ProductGroup>();
    for (const item of displayItems) {
      const key = productGroupKey(item.name);
      let group = map.get(key);
      if (!group) {
        group = {
          key,
          name: item.name.trim(),
          items: [],
        };
        map.set(key, group);
        order.push(key);
      }
      group.items.push(item);
    }
    return order.map((key) => map.get(key)!);
  }, [displayItems]);

  const colCount = isAdmin ? 8 : 7;
  const shareColCount = 6;
  const reservedWidth = isAdmin
    ? `calc(${SELECT_COL_W} + ${ACTIONS_COL_W})`
    : SELECT_COL_W;

  const allSelected =
    displayItems.length > 0 && displayItems.every((item) => selection.has(item.id));
  const someSelected = displayItems.some((item) => selection.has(item.id));

  function toggleGroupCollapse(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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

  function toggleSel(id: number) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copySelectedCodes() {
    const codes = displayItems
      .filter((item) => selection.has(item.id))
      .map((item) => item.code.trim())
      .filter(Boolean);
    if (codes.length === 0) {
      toast.error("请先勾选要复制的编码");
      return;
    }
    const text = codes.join(", ");
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`已复制 ${codes.length} 个编码`);
    } catch {
      toast.error("复制失败");
    }
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
      setSelection((prev) => {
        const next = new Set<number>();
        for (const id of prev) {
          if (list.some((item) => item.id === id)) next.add(id);
        }
        return next;
      });
    } catch (e) {
      if (requestId !== itemsRequestRef.current) return;
      toast.error(errorMessage(e));
    } finally {
      if (requestId === itemsRequestRef.current) setItemsLoading(false);
    }
  }, [q]);

  React.useEffect(() => {
    const id = window.setTimeout(() => {
      void loadItems();
    }, 300);
    return () => window.clearTimeout(id);
  }, [loadItems]);

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (itemDialogOpen || deleteItemOpen) return;
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
  }, [itemDialogOpen, deleteItemOpen]);

  React.useEffect(() => {
    if (!itemDialogOpen) return;
    void api<WarehouseProduct[]>("GET", "/warehouse/products")
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch((e) => toast.error(errorMessage(e)));
  }, [itemDialogOpen]);

  function openCreateItem() {
    setEditingItemId(null);
    setItemForm(emptyForm);
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
      unit: product.defaultUnit || state.unit,
    }));
  }

  function syncProductIdentity(name: string, brand: string) {
    const matched = findProductByIdentity(products, name, brand);
    if (matched) applySelectedProduct(matched);
    else setItemForm((state) => ({ ...state, productId: null, name, brand }));
  }

  async function submitItem() {
    setItemSubmitting(true);
    try {
      const productFields = {
        name: itemForm.name.trim(),
        category: itemForm.category.trim(),
        brand: itemForm.brand.trim(),
      };
      const skuFields = {
        code: itemForm.code.trim(),
        spec: itemForm.spec.trim(),
        unit: itemForm.unit.trim(),
      };
      if (editingItemId) {
        await api("PUT", `/warehouse/items/${editingItemId}`, {
          ...productFields,
          ...skuFields,
        });
        toast.success("已更新");
      } else {
        const matchedProduct = itemForm.productId
          ? null
          : findProductByIdentity(products, itemForm.name, itemForm.brand);
        await api("POST", "/warehouse/items", {
          ...productFields,
          ...skuFields,
          ...(itemForm.productId
            ? { productId: itemForm.productId }
            : matchedProduct
              ? { productId: matchedProduct.id }
              : { name: productFields.name }),
        });
        toast.success("已创建");
      }
      setItemDialogOpen(false);
      await loadItems();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setItemSubmitting(false);
    }
  }

  async function confirmDeleteItem() {
    if (!deleteItemTarget) return;
    setDeleting(true);
    try {
      await api("DELETE", `/warehouse/items/${deleteItemTarget.id}`);
      toast.success("已删除");
      setDeleteItemOpen(false);
      setDeleteItemTarget(null);
      await loadItems();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-background p-4">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center gap-2">
          <Input
            ref={searchInputRef}
            className="max-w-xs"
            placeholder="搜索名称、分类、品牌、编码"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={selection.size === 0}
            onClick={() => void copySelectedCodes()}
          >
            复制编码
          </Button>
          {isAdmin ? (
            <Button type="button" variant="outline" onClick={openCreateItem}>
              新增
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full max-w-full [&_[data-slot=table-container]]:w-auto [&_[data-slot=table-container]]:overflow-x-visible">
            <Table className="w-full min-w-[1240px] table-fixed border-collapse">
              <colgroup>
                <col style={{ width: SELECT_COL_W }} />
                {(["code", "name", "category", "brand", "spec", "unit"] as const).map((id) => (
                  <col
                    key={id}
                    style={{
                      width: `calc((100% - ${reservedWidth}) / ${shareColCount})`,
                    }}
                  />
                ))}
                {isAdmin ? <col style={{ width: ACTIONS_COL_W }} /> : null}
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Checkbox
                      checked={allSelected}
                      indeterminate={!allSelected && someSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelection(new Set(displayItems.map((item) => item.id)));
                        } else {
                          setSelection(new Set());
                        }
                      }}
                    />
                  </TableHead>
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
                  {isAdmin ? <TableHead className="text-center">操作</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsLoading && items.length === 0 ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: colCount }).map((__, cellIndex) => (
                        <TableCell
                          key={cellIndex}
                          className={cn(cellIndex > 0 && "min-w-0 max-w-0")}
                        >
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : productGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={colCount}>暂无数据</TableCell>
                  </TableRow>
                ) : (
                  productGroups.map((group) => {
                    const collapsed = collapsedGroups.has(group.key);
                    return (
                      <React.Fragment key={group.key}>
                        <TableRow className="bg-muted/20">
                          <TableCell colSpan={colCount} className="p-0">
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-auto w-full justify-start gap-2 rounded-none px-3 py-2"
                              onClick={() => toggleGroupCollapse(group.key)}
                            >
                              {collapsed ? (
                                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                              ) : (
                                <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
                              )}
                              <span>{group.name}</span>
                              <span className="text-muted-foreground">
                                （{group.items.length}）
                              </span>
                            </Button>
                          </TableCell>
                        </TableRow>
                        {!collapsed
                          ? group.items.map((item) => (
                              <TableRow
                                key={item.id}
                                onDoubleClick={
                                  isAdmin ? () => openEditItem(item) : undefined
                                }
                              >
                                <TableCell>
                                  <Checkbox
                                    checked={selection.has(item.id)}
                                    onCheckedChange={() => toggleSel(item.id)}
                                  />
                                </TableCell>
                                <TableCell className="min-w-0 max-w-0">
                                  <TruncateCell>{item.code}</TruncateCell>
                                </TableCell>
                                <TableCell className="min-w-0 max-w-0">
                                  <TruncateCell>{item.name}</TruncateCell>
                                </TableCell>
                                <TableCell className="min-w-0 max-w-0">
                                  <TruncateCell>{item.category}</TruncateCell>
                                </TableCell>
                                <TableCell className="min-w-0 max-w-0">
                                  <TruncateCell>{item.brand || "-"}</TruncateCell>
                                </TableCell>
                                <TableCell className="min-w-0 max-w-0">
                                  <TruncateCell>{item.spec || "-"}</TruncateCell>
                                </TableCell>
                                <TableCell className="min-w-0 max-w-0">
                                  <TruncateCell>{item.unit}</TruncateCell>
                                </TableCell>
                                {isAdmin ? (
                                  <TableCell>
                                    <div className="flex items-center justify-center gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openEditItem(item)}
                                      >
                                        编辑
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setDeleteItemTarget(item);
                                          setDeleteItemOpen(true);
                                        }}
                                      >
                                        删除
                                      </Button>
                                    </div>
                                  </TableCell>
                                ) : null}
                              </TableRow>
                            ))
                          : null}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <div className="mt-2 text-sm text-muted-foreground">共 {items.length} 条</div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="md:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingItemId ? "编辑" : "新增"}</DialogTitle>
            <DialogDescription>
              {editingItemId
                ? "改为已有「名称+品牌」会并入该产品；改为新的名称或品牌且同组有多条规格时，仅本条会拆成新产品。"
                : "同一名称可对应不同品牌；选择下拉项或填写相同名称与品牌会归入已有产品。"}
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
                  <FieldTitle>编码</FieldTitle>
                </FieldLabel>
                <FieldContent>
                  <Input
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
              <Field orientation="vertical">
                <FieldLabel>
                  <FieldTitle>品牌</FieldTitle>
                </FieldLabel>
                <FieldContent>
                  <Input
                    value={itemForm.brand}
                    onChange={(e) =>
                      editingItemId
                        ? setItemForm((state) => ({ ...state, brand: e.target.value }))
                        : syncProductIdentity(itemForm.name, e.target.value)
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
                    value={itemForm.unit}
                    onChange={(e) => setItemForm((s) => ({ ...s, unit: e.target.value }))}
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
              {itemSubmitting ? (
                <>
                  <Spinner data-icon="inline-start" />
                  保存中…
                </>
              ) : (
                "保存"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteItemOpen} onOpenChange={setDeleteItemOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除确认</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteItemTarget
                ? `确定删除「${deleteItemTarget.name}」吗？将同时删除其全部出入库流水，且不可恢复。`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={() => void confirmDeleteItem()}>
              {deleting ? "删除中…" : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
