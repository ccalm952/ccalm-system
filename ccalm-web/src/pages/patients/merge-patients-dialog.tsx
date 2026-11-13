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
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import {
  defaultMergePicks,
  defaultMergeTarget,
  MERGE_FIELDS,
  type MergeCandidate,
  mergedValues,
  mergeFieldText,
  type MergePicks,
} from "@/lib/patients/merge";
import {
  loadRecentPatients,
  saveRecentPatients,
} from "@/lib/patients/recent-patients";

const COUNT_LABELS: [keyof MergeCandidate["counts"], string][] = [
  ["clinicVisits", "就诊"],
  ["medicalRecords", "病历"],
  ["chargeOrders", "收费"],
  ["implantVisits", "种植"],
  ["pendings", "待种植"],
  ["orthodontics", "正畸"],
];

function countsText(p: MergeCandidate) {
  const parts = COUNT_LABELS.filter(([k]) => p.counts[k] > 0).map(
    ([k, label]) => `${label} ${p.counts[k]}`,
  );
  return parts.length ? parts.join(" · ") : "无记录";
}

export function MergePatientsDialog({
  open,
  onOpenChange,
  ids,
  onMerged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ids: number[];
  onMerged: () => void;
}) {
  const [list, setList] = React.useState<MergeCandidate[]>([]);
  const [targetId, setTargetId] = React.useState<number | null>(null);
  const [picks, setPicks] = React.useState<MergePicks | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open || ids.length < 2) return;
    setLoading(true);
    setList([]);
    api<MergeCandidate[]>("GET", `/patients/merge-preview?ids=${ids.join(",")}`)
      .then((data) => {
        const target = defaultMergeTarget(data);
        setList(data);
        setTargetId(target);
        setPicks(defaultMergePicks(data, target));
      })
      .catch((e) => toast.error(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [open, ids]);

  function chooseTarget(id: number) {
    setTargetId(id);
    setPicks(defaultMergePicks(list, id));
  }

  const target = list.find((p) => p.id === targetId);

  async function merge() {
    if (!target || !picks) return;
    const sourceIds = list.filter((p) => p.id !== target.id).map((p) => p.id);
    setSaving(true);
    try {
      await api("POST", "/patients/merge", {
        targetId: target.id,
        sourceIds,
        ...mergedValues(list, picks),
      });
      saveRecentPatients(
        loadRecentPatients().filter((p) => !sourceIds.includes(p.id)),
      );
      toast.success("已合并");
      setConfirmOpen(false);
      onOpenChange(false);
      onMerged();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>合并患者</DialogTitle>
          <DialogDescription>
            选择保留的档案，其他患者的就诊、病历、收费、种植、正畸记录都会并入该档案；每项资料点选要保留的值。
          </DialogDescription>
        </DialogHeader>
        {loading || !picks ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner className="size-8 opacity-60" />
          </div>
        ) : (
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-20" />
                {list.map((p) => (
                  <TableHead key={p.id}>
                    <Button
                      type="button"
                      variant={p.id === targetId ? "default" : "outline"}
                      onClick={() => chooseTarget(p.id)}
                    >
                      {p.id === targetId ? "保留此档案" : "设为保留"}
                    </Button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>记录</TableCell>
                {list.map((p) => (
                  <TableCell
                    key={p.id}
                    className="truncate text-muted-foreground"
                  >
                    {countsText(p)}
                  </TableCell>
                ))}
              </TableRow>
              {MERGE_FIELDS.map(({ key, label }) => (
                <TableRow key={key}>
                  <TableCell>{label}</TableCell>
                  {list.map((p) => (
                    <TableCell key={p.id}>
                      <Button
                        type="button"
                        variant={picks[key] === p.id ? "secondary" : "ghost"}
                        className="w-full"
                        onClick={() => setPicks({ ...picks, [key]: p.id })}
                      >
                        <span className="truncate">
                          {mergeFieldText(p, key) || "—"}
                        </span>
                      </Button>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type="button"
            disabled={!target}
            onClick={() => setConfirmOpen(true)}
          >
            合并
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认合并</AlertDialogTitle>
            <AlertDialogDescription>
              将 {list.length - 1} 位患者合并到「{target?.name}
              」，被合并的档案会删除，无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction disabled={saving} onClick={() => void merge()}>
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
