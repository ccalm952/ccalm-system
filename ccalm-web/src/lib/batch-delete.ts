import { toast } from "@/components/ui/sonner";

export async function batchDelete<T>(
  items: T[],
  deleteOne: (item: T) => Promise<void>
): Promise<{ ok: number; fail: number }> {
  const results = await Promise.all(
    items.map(async (item) => {
      try {
        await deleteOne(item);
        return true;
      } catch {
        return false;
      }
    })
  );
  const ok = results.filter(Boolean).length;
  return { ok, fail: items.length - ok };
}

export function toastBatchDeleteResult(
  ok: number,
  fail: number,
  unit = "条"
): void {
  if (fail === 0) {
    toast.success(`已删除 ${ok} ${unit}`);
    return;
  }
  if (ok === 0) {
    toast.error("删除失败");
    return;
  }
  toast.warning(`已删除 ${ok}/${ok + fail} ${unit}，${fail} ${unit}失败`);
}
