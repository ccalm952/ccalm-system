import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pin, Plus, RefreshCw, Search, StickyNote, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { MemoMarkdown } from "@/components/memos/MemoMarkdown";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import { cn } from "@/lib/utils";

type Memo = {
  id: number;
  title: string;
  content: string;
  category: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

type Draft = {
  title: string;
  content: string;
  category: string;
  pinned: boolean;
};

const emptyDraft: Draft = {
  title: "",
  content: "",
  category: "",
  pinned: false,
};

const AUTO_SAVE_MS = 600;

function ListSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

function formatTime(value: string) {
  try {
    return new Date(value).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function draftEquals(a: Draft, b: Draft) {
  return (
    a.title === b.title &&
    a.content === b.content &&
    a.category === b.category &&
    a.pinned === b.pinned
  );
}

export function MemosPage() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [contentMode, setContentMode] = useState<"edit" | "preview">("edit");
  const saveGenRef = useRef(0);
  const skipHydrateRef = useRef(false);
  const memosRef = useRef(memos);
  memosRef.current = memos;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<Memo[]>("GET", "/memos");
      setMemos(data);
      setSelectedId((current) => {
        if (current === "new") return current;
        if (current !== null && data.some((item) => item.id === current)) return current;
        return data[0]?.id ?? null;
      });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // 仅在切换选中项时灌入草稿，避免自动保存回写列表时覆盖正在编辑的内容
  useEffect(() => {
    if (selectedId === null || selectedId === "new") {
      if (selectedId === "new") setDraft(emptyDraft);
      return;
    }
    if (skipHydrateRef.current) {
      skipHydrateRef.current = false;
      return;
    }
    const memo = memosRef.current.find((item) => item.id === selectedId);
    if (!memo) return;
    setDraft({
      title: memo.title,
      content: memo.content,
      category: memo.category,
      pinned: memo.pinned,
    });
  }, [selectedId]);

  const savedDraft = useMemo((): Draft | null => {
    if (typeof selectedId !== "number") return null;
    const memo = memos.find((item) => item.id === selectedId);
    if (!memo) return null;
    return {
      title: memo.title,
      content: memo.content,
      category: memo.category,
      pinned: memo.pinned,
    };
  }, [selectedId, memos]);

  const dirty = useMemo(() => {
    if (selectedId === "new") {
      return Boolean(
        draft.title.trim() || draft.content.trim() || draft.category.trim() || draft.pinned,
      );
    }
    if (typeof selectedId !== "number" || !savedDraft) return false;
    return !draftEquals(draft, savedDraft);
  }, [selectedId, draft, savedDraft]);

  useEffect(() => {
    if (!dirty) return;

    const gen = ++saveGenRef.current;
    const timer = window.setTimeout(() => {
      void (async () => {
        if (gen !== saveGenRef.current) return;
        setSaving(true);
        try {
          if (selectedId === "new") {
            const created = await api<Memo>("POST", "/memos", {
              title: draft.title.trim() || "未命名",
              content: draft.content,
              category: draft.category.trim(),
              pinned: draft.pinned,
            });
            setMemos((prev) => {
              const next = [created, ...prev.filter((item) => item.id !== created.id)];
              next.sort((a, b) => {
                if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
                return b.updatedAt.localeCompare(a.updatedAt) || b.id - a.id;
              });
              return next;
            });
            // 新建成功后切到真实 id；跳过灌入以免覆盖请求期间的继续输入
            skipHydrateRef.current = true;
            if (gen === saveGenRef.current && !draft.title.trim()) {
              setDraft((prev) => ({ ...prev, title: "未命名" }));
            }
            setSelectedId(created.id);
          } else if (typeof selectedId === "number") {
            const updated = await api<Memo>("PUT", `/memos/${selectedId}`, {
              title: draft.title.trim() || "未命名",
              content: draft.content,
              category: draft.category.trim(),
              pinned: draft.pinned,
            });
            if (gen !== saveGenRef.current) return;
            setMemos((prev) => {
              const next = prev.map((item) => (item.id === updated.id ? updated : item));
              next.sort((a, b) => {
                if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
                return b.updatedAt.localeCompare(a.updatedAt) || b.id - a.id;
              });
              return next;
            });
            if (!draft.title.trim()) {
              setDraft((prev) => ({ ...prev, title: "未命名" }));
            }
          }
        } catch (err) {
          if (gen === saveGenRef.current) toast.error(errorMessage(err));
        } finally {
          if (gen === saveGenRef.current) setSaving(false);
        }
      })();
    }, AUTO_SAVE_MS);

    return () => window.clearTimeout(timer);
  }, [dirty, draft, selectedId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return memos;
    return memos.filter((item) => {
      const haystack = `${item.title}\n${item.content}\n${item.category}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [memos, query]);

  function startCreate() {
    saveGenRef.current += 1;
    setSaving(false);
    setSelectedId("new");
    setDraft(emptyDraft);
    setContentMode("edit");
  }

  async function handleTogglePin(memo: Memo) {
    try {
      const updated = await api<Memo>("PUT", `/memos/${memo.id}`, { pinned: !memo.pinned });
      toast.success(memo.pinned ? "已取消置顶" : "已置顶");
      setMemos((prev) => {
        const next = prev.map((item) => (item.id === updated.id ? updated : item));
        next.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return b.updatedAt.localeCompare(a.updatedAt) || b.id - a.id;
        });
        return next;
      });
      if (selectedId === memo.id) {
        setDraft((prev) => ({ ...prev, pinned: updated.pinned }));
      }
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function handleDelete(id: number) {
    try {
      saveGenRef.current += 1;
      setSaving(false);
      await api("DELETE", `/memos/${id}`);
      toast.success("已删除");
      setMemos((prev) => prev.filter((item) => item.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const showEditor = selectedId !== null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4 pt-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">备忘录</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Markdown：# / ## / ### 标题；**粗体**、*斜体*；- 或 1. 列表；&gt; 引用；[文字](链接)；
            ``两个反引号`` 可复制，`一个` 仅高亮；``` 代码块右上角可复制；| 表格
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Spinner /> : <RefreshCw />}
            刷新
          </Button>
          <Button size="sm" onClick={startCreate}>
            <Plus />
            新建
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="搜索标题、正文、分类"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <ListSkeleton />
          ) : filtered.length === 0 ? (
            <Empty className="border py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <StickyNote />
                </EmptyMedia>
                <EmptyTitle>{memos.length === 0 ? "暂无备忘录" : "无匹配结果"}</EmptyTitle>
                <EmptyDescription>
                  {memos.length === 0 ? "点击「新建」开始记录" : "试试其他关键词"}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-2">
              {filtered.map((memo) => (
                <button
                  key={memo.id}
                  type="button"
                  onClick={() => {
                    saveGenRef.current += 1;
                    setSaving(false);
                    setSelectedId(memo.id);
                    setContentMode("preview");
                  }}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                    selectedId === memo.id ? "border-ring bg-accent/60" : "hover:bg-muted/50",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {memo.pinned ? (
                          <Pin className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                        ) : null}
                        <span className="truncate font-medium">{memo.title}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {memo.content || "（无正文）"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {memo.category ? (
                        <Badge variant="secondary" className="max-w-[5.5rem] truncate">
                          {memo.category}
                        </Badge>
                      ) : null}
                      <span className="text-[11px] text-muted-foreground">
                        {formatTime(memo.updatedAt)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {showEditor ? (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle>{selectedId === "new" ? "新建备忘录" : "编辑备忘录"}</CardTitle>
                <CardDescription>
                  {saving ? "保存中…" : dirty ? "待保存" : "已自动保存"}
                  ；``两个反引号`` 可点击复制；`一个反引号` 仅高亮；三个反引号是代码块
                </CardDescription>
              </div>
              {typeof selectedId === "number" ? (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const memo = memos.find((item) => item.id === selectedId);
                      if (memo) void handleTogglePin(memo);
                    }}
                  >
                    <Pin className={cn(draft.pinned && "fill-current text-amber-600")} />
                    {draft.pinned ? "取消置顶" : "置顶"}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={<Button type="button" variant="ghost" size="icon" />}
                    >
                      <Trash2 className="text-destructive" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>删除备忘录</AlertDialogTitle>
                        <AlertDialogDescription>
                          确定删除「{draft.title || "未命名"}」吗？
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel variant="outline">取消</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={() => void handleDelete(selectedId)}
                        >
                          删除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>标题</Label>
                  <Input
                    placeholder="例如：OpenClash 端口"
                    value={draft.title}
                    onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>分类</Label>
                  <Input
                    placeholder="运维 / 账号 / 杂记"
                    value={draft.category}
                    onChange={(e) => setDraft((prev) => ({ ...prev, category: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>正文</Label>
                  <Tabs
                    value={contentMode}
                    onValueChange={(value) => setContentMode(value as "edit" | "preview")}
                  >
                    <TabsList>
                      <TabsTrigger value="edit">编辑</TabsTrigger>
                      <TabsTrigger value="preview">预览</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                {contentMode === "edit" ? (
                  <Textarea
                    placeholder={
                      "# RackNerd\n\n账号 ``user@example.com``\n密码 ``******``\n\n端口说明用 `7890` 这种仅高亮。\n\n## 命令\n\n```bash\ndocker ps\n```"
                    }
                    className="min-h-64 font-mono text-sm"
                    value={draft.content}
                    onChange={(e) => setDraft((prev) => ({ ...prev, content: e.target.value }))}
                  />
                ) : (
                  <div className="min-h-64 rounded-md border bg-background p-3">
                    <MemoMarkdown content={draft.content} />
                  </div>
                )}
              </div>
              {selectedId === "new" ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.pinned}
                    onChange={(e) => setDraft((prev) => ({ ...prev, pinned: e.target.checked }))}
                    className="size-4 rounded border"
                  />
                  创建后置顶
                </label>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <Empty className="border py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <StickyNote />
              </EmptyMedia>
              <EmptyTitle>选择一条备忘录</EmptyTitle>
              <EmptyDescription>或点击「新建」开始记录</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </div>
  );
}
