import * as React from "react";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";

type Preview = {
  dryRun: boolean;
  patientId: number | null;
  chartNo: string;
  matchedBy: "chartNo" | "name" | "create";
  existingRecords: number;
  existingCharges: number;
  records: number;
  planItems: number;
  charges: number;
  payments: number;
};

type RawPayload = {
  name: string;
  patientId: number;
  chartNo?: string;
  patient?: unknown;
  summaries?: unknown;
  fulls?: unknown;
  orders?: unknown;
  duplicateNames?: unknown;
  scrapedAt?: string;
};

const MATCH_LABEL: Record<Preview["matchedBy"], string> = {
  chartNo: "按病历号匹配",
  name: "按姓名匹配",
  create: "将新建患者",
};

export function EkqyImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}) {
  const [fileKey, setFileKey] = React.useState(0);
  const [fileName, setFileName] = React.useState("");
  const [raw, setRaw] = React.useState<RawPayload | null>(null);
  const [chartNo, setChartNo] = React.useState("");
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setFileName("");
      setRaw(null);
      setChartNo("");
      setPreview(null);
      setConfirmOpen(false);
      setFileKey((k) => k + 1);
    }
  }, [open]);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPreview(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as RawPayload;
      if (!parsed?.name || !parsed?.patientId) {
        throw new Error("不是有效的 e看牙抓取文件（缺少 name / patientId）");
      }
      setRaw(parsed);
      const fromPatient =
        parsed.chartNo ||
        (parsed.patient &&
        typeof parsed.patient === "object" &&
        "privateId" in parsed.patient
          ? String((parsed.patient as { privateId?: string }).privateId ?? "")
          : "");
      setChartNo(fromPatient);
    } catch (err) {
      setRaw(null);
      toast.error(errorMessage(err));
    }
  }

  async function runPreview() {
    if (!raw) return;
    setLoading(true);
    try {
      const data = await api<Preview>("POST", "/patients/ekqy-import", {
        ...raw,
        chartNo: chartNo.trim() || undefined,
        dryRun: true,
      });
      setPreview(data);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function confirmImport() {
    if (!raw) return;
    setSaving(true);
    try {
      const data = await api<Preview>("POST", "/patients/ekqy-import", {
        ...raw,
        chartNo: chartNo.trim() || undefined,
        dryRun: false,
      });
      toast.success(
        `已导入 ${data.records} 条病历，收费 ${data.charges}（患者 #${data.patientId}）`,
      );
      setConfirmOpen(false);
      onOpenChange(false);
      onImported();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>导入 e看牙</DialogTitle>
            <DialogDescription>
              上传 scrape 产出的
              JSON。确认后会清空该患者已有病历与收费，再写入抓取内容。
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>抓取文件</Label>
              <Input
                key={fileKey}
                type="file"
                accept="application/json,.json"
                onChange={onFileChange}
              />
              {fileName ? (
                <p className="text-xs text-muted-foreground">{fileName}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>病历号（同名时必填）</Label>
              <Input
                value={chartNo}
                onChange={(e) => setChartNo(e.target.value)}
                placeholder="e看牙 privateId"
              />
            </div>

            {raw ? (
              <p className="text-sm">
                患者 <span className="font-medium">{raw.name}</span>
                （e看牙 id {raw.patientId}）
              </p>
            ) : null}

            {preview ? (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <p>
                  {MATCH_LABEL[preview.matchedBy]} · 病历号 {preview.chartNo}
                </p>
                {preview.patientId != null ? (
                  <p>线上患者 id {preview.patientId}</p>
                ) : null}
                <p>
                  将清空已有病历 {preview.existingRecords}、收费{" "}
                  {preview.existingCharges}
                </p>
                <p>
                  将写入病历 {preview.records}、计划项 {preview.planItems}、收费{" "}
                  {preview.charges}、收款 {preview.payments} 笔
                </p>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={!raw || loading}
              onClick={() => void runPreview()}
            >
              {loading ? <Spinner /> : null}
              预览
            </Button>
            <Button
              type="button"
              disabled={!preview || loading}
              onClick={() => setConfirmOpen(true)}
            >
              确认导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认导入？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除该患者现有病历与收费单，再写入 e看牙数据。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                void confirmImport();
              }}
            >
              {saving ? <Spinner /> : null}
              确认导入
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
