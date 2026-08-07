import { isValidElement, useMemo, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  copyText,
  markCopyableDoubleBackticks,
  splitCopyableInlineCode,
} from "@/lib/memo-fields";
import { cn } from "@/lib/utils";

function getNodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getNodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getNodeText(node.props.children);
  }
  return "";
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const text = getNodeText(children).replace(/\n$/, "");

  async function handleCopy() {
    try {
      await copyText(text);
      setCopied(true);
      toast.success("已复制代码块");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("复制失败");
    }
  }

  return (
    <div className="group relative my-3">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute top-2 right-2 z-10 h-7 w-7 bg-background/90 opacity-100 shadow-sm sm:opacity-0 sm:group-hover:opacity-100"
        onClick={() => void handleCopy()}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
      <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-3 pr-12 text-sm leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

function InlineCodeCopyable({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await copyText(text);
      setCopied(true);
      toast.success("已复制");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("复制失败");
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      title="点击复制"
      className={cn(
        "group/inline-code mx-0.5 inline-flex max-w-full items-center gap-1 align-middle",
        "rounded-md border border-border/70 bg-muted px-1.5 py-0.5",
        "font-mono text-[0.85em] leading-none",
        "transition-colors hover:border-ring hover:bg-accent",
      )}
    >
      <span className="min-w-0 truncate">{text}</span>
      <span className="inline-flex shrink-0 text-muted-foreground group-hover/inline-code:text-foreground">
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </span>
    </button>
  );
}

export function MemoMarkdown({ content, className }: { content: string; className?: string }) {
  const rendered = useMemo(() => markCopyableDoubleBackticks(content), [content]);

  if (!content.trim()) {
    return <p className="text-sm text-muted-foreground">（无正文）</p>;
  }

  return (
    <div
      className={cn(
        "memo-md max-w-none text-sm leading-relaxed text-foreground",
        "[&>:first-child]:mt-0 [&>:last-child]:mb-0",
        "[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:tracking-tight",
        "[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold",
        "[&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-semibold",
        "[&_p]:my-2 [&_p]:whitespace-pre-wrap",
        "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
        "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_li]:my-0.5",
        "[&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline",
        "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
        "[&_hr]:my-4 [&_hr]:border-border",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]",
        "[&_pre_code]:rounded-none [&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:font-mono [&_pre_code]:text-[0.85em]",
        "[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left",
        "[&_th]:border [&_th]:border-border [&_th]:bg-muted/40 [&_th]:px-2 [&_th]:py-1",
        "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          code: ({ className: codeClassName, children }) => {
            const isBlock =
              Boolean(codeClassName?.includes("language-")) || String(children).includes("\n");
            if (isBlock) {
              return <code className={codeClassName}>{children}</code>;
            }

            const raw = getNodeText(children);
            const { copyable, text } = splitCopyableInlineCode(raw);
            if (copyable) {
              return <InlineCodeCopyable text={text} />;
            }
            return <code>{text}</code>;
          },
        }}
      >
        {rendered}
      </ReactMarkdown>
    </div>
  );
}
