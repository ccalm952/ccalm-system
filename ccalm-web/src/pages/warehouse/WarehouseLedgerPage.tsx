import * as React from "react";
import dayjs from "dayjs";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { MonthPickerField } from "@/components/month-picker-field";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import { useAuth } from "@/lib/use-auth";

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
  bizType:
    | "purchase"
    | "use"
    | "return_in"
    | "return_out"
    | "adjust_in"
    | "adjust_out";
  qty: number;
  unitPrice: number;
  amount: number;
  occurDate: string;
  remark: string;
  item: WarehouseItem;
  operatorUser?: { displayName: string; username: string } | null;
};

const typeItems = [
  { label: "入库", value: "in" },
  { label: "出库", value: "out" },
  { label: "调整", value: "adjust" },
] as const;

const bizTypeItems: Record<"in" | "out" | "adjust", Array<{ label: string; value: string }>> = {
  in: [
    { label: "采购入库", value: "purchase" },
    { label: "退回入库", value: "return_in" },
  ],
  out: [
    { label: "领用出库", value: "use" },
    { label: "退货出库", value: "return_out" },
  ],
  adjust: [
    { label: "盘盈调整", value: "adjust_in" },
    { label: "盘亏调整", value: "adjust_out" },
  ],
};

function formatMoney(n: number) {
  return n.toFixed(2);
}

function makeWarehouseItemCode() {
  return `WP${dayjs().format("YYYYMMDDHHmmss")}`;
}

export function WarehouseLedgerPage() {
  const { me } = useAuth();
  const isAdmin = me?.role === "admin";
  const [items, setItems] = React.useState<WarehouseItem[]>([]);
  const [txns, setTxns] = React.useState<WarehouseTxn[]>([]);
  const [q, setQ] = React.useState("");
  const [month, setMonth] = React.useState(dayjs().format("YYYY-MM"));
  const [selectedId, setSelectedId] = React.useState<number | null>(null);

  const [itemDialogOpen, setItemDialogOpen] = React.useState(false);
  const [itemSubmitting, setItemSubmitting] = React.useState(false);
  const [editingItemId, setEditingItemId] = React.useState<number | null>(null);
  const [itemForm, setItemForm] = React.useState({
    code: "",
    name: "",
    category: "种植耗材",
    spec: "",
    unit: "个",
    brand: "",
    manufacturer: "",
    supplierName: "",
    enabled: true,
  });

  const [txnDialogOpen, setTxnDialogOpen] = React.useState(false);
  const [txnSubmitting, setTxnSubmitting] = React.useState(false);
  const [txnForm, setTxnForm] = React.useState({
    type: "in" as "in" | "out" | "adjust",
    bizType: "purchase",
    qty: "1",
    unitPrice: "0",
    occurDate: dayjs().format("YYYY-MM-DD"),
    remark: "",
  });

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const totalQty = items.reduce((sum, item) => sum + item.currentQty, 0);

  async function loadItems() {
    try {
      const data = await api<WarehouseItem[]>(
        "GET",
        `/warehouse/items${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`,
      );
      setItems(Array.isArray(data) ? data : []);
      setSelectedId((prev) =>
        data.some((item) => item.id === prev) ? prev : data[0]?.id ?? null,
      );
    } catch (e) {
      toast.error(errorMessage(e));
      setItems([]);
      setSelectedId(null);
    }
  }

  async function loadTxns() {
    try {
      const params = new URLSearchParams();
      if (month) params.set("month", month);
      if (selectedId) params.set("itemId", String(selectedId));
      const data = await api<WarehouseTxn[]>(
        "GET",
        `/warehouse/txns${params.size ? `?${params.toString()}` : ""}`,
      );
      setTxns(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(errorMessage(e));
      setTxns([]);
    }
  }

  React.useEffect(() => {
    void loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    void loadTxns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, selectedId]);

  function openCreateItem() {
    setEditingItemId(null);
    setItemForm({
      code: makeWarehouseItemCode(),
      name: "",
      category: "种植耗材",
      spec: "",
      unit: "个",
      brand: "",
      manufacturer: "",
      supplierName: "",
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
      enabled: item.enabled,
    });
    setItemDialogOpen(true);
  }

  function openTxn(type: "in" | "out" | "adjust") {
    if (!selectedItem) {
      toast.error("请先选择物品");
      return;
    }
    const firstBizType = bizTypeItems[type][0]?.value ?? "purchase";
    setTxnForm({
      type,
      bizType: firstBizType,
      qty: "1",
      unitPrice: type === "in" ? String(selectedItem.lastPurchasePrice || 0) : "0",
      occurDate: dayjs().format("YYYY-MM-DD"),
      remark: "",
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
        await api("PUT", `/warehouse/items/${editingItemId}`, payload);
        toast.success("物品已更新");
      } else {
        await api("POST", "/warehouse/items", payload);
        toast.success("物品已创建");
      }
      setItemDialogOpen(false);
      await loadItems();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setItemSubmitting(false);
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
        unitPrice: Number(txnForm.unitPrice) || 0,
        occurDate: txnForm.occurDate,
        remark: txnForm.remark.trim(),
      });
      toast.success("流水已登记");
      setTxnDialogOpen(false);
      await Promise.all([loadItems(), loadTxns()]);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setTxnSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <Card>
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
            <MonthPickerField value={month} onValueChange={setMonth} />
          </div>
          {isAdmin ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={openCreateItem}>
                新增物品
              </Button>
              <Button type="button" variant="outline" onClick={() => openTxn("in")}>
                入库
              </Button>
              <Button type="button" variant="outline" onClick={() => openTxn("out")}>
                出库
              </Button>
              <Button type="button" variant="outline" onClick={() => openTxn("adjust")}>
                调整
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">物品数</div>
                  <div className="text-2xl font-semibold">{items.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">当前总库存</div>
                  <div className="text-2xl font-semibold">{totalQty}</div>
                </CardContent>
              </Card>
            </div>

            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[16%]">编码</TableHead>
                  <TableHead className="w-[20%]">名称</TableHead>
                  <TableHead className="w-[14%]">分类</TableHead>
                  <TableHead className="w-[16%]">规格</TableHead>
                  <TableHead className="w-[10%]">单位</TableHead>
                  <TableHead className="w-[12%] text-center">库存</TableHead>
                  <TableHead className="w-[12%] text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    className={selectedId === item.id ? "bg-muted/40" : undefined}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <TableCell>{item.code}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.spec || "-"}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-center">{item.currentQty}</TableCell>
                    <TableCell className="text-center">
                      {isAdmin ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditItem(item);
                          }}
                        >
                          编辑
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-4">
            <Card>
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

            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[18%]">日期</TableHead>
                  <TableHead className="w-[12%]">类型</TableHead>
                  <TableHead className="w-[20%]">业务</TableHead>
                  <TableHead className="w-[12%] text-center">数量</TableHead>
                  <TableHead className="w-[18%] text-center">金额</TableHead>
                  <TableHead className="w-[20%]">操作人</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txns.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell>{txn.occurDate}</TableCell>
                    <TableCell>{typeItems.find((x) => x.value === txn.type)?.label ?? txn.type}</TableCell>
                    <TableCell>{bizTypeItems[txn.type].find((x) => x.value === txn.bizType)?.label ?? txn.bizType}</TableCell>
                    <TableCell className="text-center">{txn.qty}</TableCell>
                    <TableCell className="text-center">{formatMoney(txn.amount)}</TableCell>
                    <TableCell>{txn.operatorUser?.displayName || txn.operatorUser?.username || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItemId ? "编辑物品" : "新增物品"}</DialogTitle>
            <DialogDescription>维护库房物品主档，后续出入库都基于这里的物品。</DialogDescription>
          </DialogHeader>
          <FieldSet className="text-sm">
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field orientation="responsive">
                <FieldLabel><FieldTitle>名称</FieldTitle></FieldLabel>
                <FieldContent>
                  <Input value={itemForm.name} onChange={(e) => setItemForm((s) => ({ ...s, name: e.target.value }))} />
                </FieldContent>
              </Field>
              <Field orientation="responsive">
                <FieldLabel><FieldTitle>分类</FieldTitle></FieldLabel>
                <FieldContent>
                  <Input value={itemForm.category} onChange={(e) => setItemForm((s) => ({ ...s, category: e.target.value }))} />
                </FieldContent>
              </Field>
              <Field orientation="responsive">
                <FieldLabel><FieldTitle>规格</FieldTitle></FieldLabel>
                <FieldContent>
                  <Input value={itemForm.spec} onChange={(e) => setItemForm((s) => ({ ...s, spec: e.target.value }))} />
                </FieldContent>
              </Field>
              <Field orientation="responsive">
                <FieldLabel><FieldTitle>单位</FieldTitle></FieldLabel>
                <FieldContent>
                  <Input value={itemForm.unit} onChange={(e) => setItemForm((s) => ({ ...s, unit: e.target.value }))} />
                </FieldContent>
              </Field>
              <Field orientation="responsive">
                <FieldLabel><FieldTitle>品牌</FieldTitle></FieldLabel>
                <FieldContent>
                  <Input value={itemForm.brand} onChange={(e) => setItemForm((s) => ({ ...s, brand: e.target.value }))} />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>登记流水</DialogTitle>
            <DialogDescription>为当前选中的物品登记入库、出库或库存调整。</DialogDescription>
          </DialogHeader>
          <FieldSet className="text-sm">
            <Field orientation="responsive">
              <FieldLabel><FieldTitle>物品</FieldTitle></FieldLabel>
              <FieldContent>
                <Input value={selectedItem ? `${selectedItem.name} (${selectedItem.code})` : ""} disabled />
              </FieldContent>
            </Field>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field orientation="responsive">
                <FieldLabel><FieldTitle>类型</FieldTitle></FieldLabel>
                <FieldContent>
                  <Select
                    value={txnForm.type}
                    onValueChange={(v: string | null) => {
                      if (!v) return;
                      const type = v as "in" | "out" | "adjust";
                      setTxnForm((s) => ({
                        ...s,
                        type,
                        bizType: bizTypeItems[type][0]?.value ?? s.bizType,
                      }));
                    }}
                    items={typeItems}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {typeItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
              <Field orientation="responsive">
                <FieldLabel><FieldTitle>业务</FieldTitle></FieldLabel>
                <FieldContent>
                  <Select
                    value={txnForm.bizType}
                    onValueChange={(v: string | null) => v && setTxnForm((s) => ({ ...s, bizType: v }))}
                    items={bizTypeItems[txnForm.type]}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {bizTypeItems[txnForm.type].map((item) => (
                          <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
              <Field orientation="responsive">
                <FieldLabel><FieldTitle>数量</FieldTitle></FieldLabel>
                <FieldContent>
                  <Input type="number" min={1} value={txnForm.qty} onChange={(e) => setTxnForm((s) => ({ ...s, qty: e.target.value }))} />
                </FieldContent>
              </Field>
              <Field orientation="responsive">
                <FieldLabel><FieldTitle>单价</FieldTitle></FieldLabel>
                <FieldContent>
                  <Input type="number" min={0} step={0.01} value={txnForm.unitPrice} onChange={(e) => setTxnForm((s) => ({ ...s, unitPrice: e.target.value }))} />
                </FieldContent>
              </Field>
              <Field orientation="responsive">
                <FieldLabel><FieldTitle>日期</FieldTitle></FieldLabel>
                <FieldContent>
                  <Input type="date" value={txnForm.occurDate} onChange={(e) => setTxnForm((s) => ({ ...s, occurDate: e.target.value }))} />
                </FieldContent>
              </Field>
              <Field orientation="responsive">
                <FieldLabel><FieldTitle>金额</FieldTitle></FieldLabel>
                <FieldContent>
                  <Input disabled value={formatMoney((Number(txnForm.qty) || 0) * (Number(txnForm.unitPrice) || 0))} />
                </FieldContent>
              </Field>
            </FieldGroup>
            <Field orientation="responsive">
              <FieldLabel><FieldTitle>备注</FieldTitle></FieldLabel>
              <FieldContent>
                <Input value={txnForm.remark} onChange={(e) => setTxnForm((s) => ({ ...s, remark: e.target.value }))} />
              </FieldContent>
            </Field>
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
    </div>
  );
}
