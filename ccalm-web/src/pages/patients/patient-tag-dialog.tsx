import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import {
  refreshPatientTags,
  TAG_COLORS,
  usePatientTags,
  type PatientTag,
} from "@/lib/patients/tags";

export function PatientTagDialog({
  open,
  onOpenChange,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}) {
  const tags = usePatientTags();
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState(TAG_COLORS[0]);
  const [abbreviation, setAbbreviation] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  function resetForm() {
    setEditingId(null);
    setName("");
    setColor(TAG_COLORS[0]);
    setAbbreviation("");
    setDeletingId(null);
  }

  function startEdit(tag: PatientTag) {
    setEditingId(tag.id);
    setName(tag.name);
    setColor(tag.color);
    setAbbreviation(tag.abbreviation);
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("请填写标签名称");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: trimmed,
        color,
        abbreviation: abbreviation.trim(),
      };
      if (editingId == null) {
        await api("POST", "/patients/tags", body);
        toast.success("已添加标签");
      } else {
        await api("PUT", `/patients/tags/${editingId}`, body);
        toast.success("已保存标签");
      }
      refreshPatientTags();
      resetForm();
      onChanged?.();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(tag: PatientTag) {
    try {
      await api("PUT", `/patients/tags/${tag.id}`, { enabled: !tag.enabled });
      refreshPatientTags();
      onChanged?.();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function remove(tag: PatientTag) {
    try {
      await api("DELETE", `/patients/tags/${tag.id}`);
      toast.success("已删除标签");
      refreshPatientTags();
      setDeletingId(null);
      if (editingId === tag.id) resetForm();
      onChanged?.();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>标签管理</DialogTitle>
          <DialogDescription>
            维护标签名称、颜色和启停用。删除标签会同时从患者档案中移除。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border p-3">
            <Input
              className="min-w-40 flex-1"
              placeholder="标签名称"
              value={name}
              maxLength={20}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              className="w-20"
              placeholder="缩写"
              value={abbreviation}
              maxLength={4}
              onChange={(e) => setAbbreviation(e.target.value)}
            />
            <input
              type="color"
              className="h-9 w-10 cursor-pointer rounded-lg border bg-background p-1"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
            <Button type="button" disabled={saving} onClick={() => void save()}>
              {editingId == null ? "添加" : "保存"}
            </Button>
            {editingId == null ? null : (
              <Button type="button" variant="ghost" onClick={resetForm}>
                取消
              </Button>
            )}
          </div>

          <ScrollArea className="max-h-80" viewportClassName="max-h-80">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-2 border-b py-2 last:border-b-0"
              >
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate">
                    {tag.name}
                    {tag.abbreviation ? (
                      <span className="ml-1 text-xs text-muted-foreground">
                        {tag.abbreviation}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {tag.count} 位患者
                  </div>
                </div>
                {tag.enabled ? null : <Badge variant="outline">已停用</Badge>}
                {deletingId === tag.id ? (
                  <>
                    <span className="text-xs text-muted-foreground">
                      确认删除？
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => void remove(tag)}
                    >
                      删除
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingId(null)}
                    >
                      取消
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(tag)}
                    >
                      编辑
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void toggleEnabled(tag)}
                    >
                      {tag.enabled ? "停用" : "启用"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingId(tag.id)}
                    >
                      删除
                    </Button>
                  </>
                )}
              </div>
            ))}
            {!tags.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                还没有标签，在上方输入名称添加
              </p>
            ) : null}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
