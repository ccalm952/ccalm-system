import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  FIELD_PHRASES,
  filterPhraseGroups,
  insertPhrase,
  segmentBefore,
  type PhraseField,
} from "@/lib/medical-records/field-phrases";

/**
 * 带词条面板的多行输入：点输入框弹出，输入时按光标前的片段联想词条，
 * 点词条把该片段替换成词条。没有配置词条的字段就是普通 Textarea。
 */
export function PhraseTextarea({
  field,
  value,
  onChange,
  closeOnInsert,
  ...textareaProps
}: {
  field?: string;
  value: string;
  onChange: (next: string) => void;
  /** 选完词条就收起（处置这类下面还有控件的行用） */
  closeOnInsert?: boolean;
} & Omit<React.ComponentProps<"textarea">, "value" | "onChange">) {
  const key = field as PhraseField | undefined;
  const groups = key ? FIELD_PHRASES[key] : undefined;
  const [open, setOpen] = React.useState(false);
  const [caret, setCaret] = React.useState(value.length);
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const boxRef = React.useRef<HTMLDivElement>(null);

  const segment = React.useMemo(
    () => segmentBefore(value, caret),
    [value, caret],
  );
  const matched = React.useMemo(
    () =>
      groups && segment.text.length >= 1
        ? filterPhraseGroups(groups, segment.text)
        : [],
    [groups, segment.text],
  );
  // 有联想结果就只显示匹配的词条；否则显示全部分类，方便浏览
  const visible = React.useMemo(
    () => (matched.length ? matched : (groups ?? [])),
    [matched, groups],
  );

  if (!groups) {
    return (
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...textareaProps}
      />
    );
  }

  function pick(groupLabel: string, phrase: string) {
    const el = ref.current;
    const start = el?.selectionStart ?? caret;
    const end = el?.selectionEnd ?? start;
    const next = matched.length
      ? {
          text: value.slice(0, segment.start) + phrase + value.slice(end),
          caret: segment.start + phrase.length,
        }
      : insertPhrase(value, start, end, groupLabel, phrase);
    onChange(next.text);
    setCaret(next.caret);
    if (closeOnInsert) setOpen(false);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(next.caret, next.caret);
    });
  }

  return (
    <div className="relative" ref={boxRef}>
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setCaret(e.target.selectionStart);
        }}
        onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        {...textareaProps}
      />

      <Popover
        open={open}
        onOpenChange={(next, details) => {
          // 点回输入框不算「点外部」，面板保持并让焦点落回输入框
          if (!next && details.reason === "outside-press") {
            const target = details.event.target;
            if (target instanceof Node && boxRef.current?.contains(target)) {
              details.cancel();
              return;
            }
          }
          setOpen(next);
        }}
      >
        {/* 让 Popover 有个锚点元素，点外部才能正常收起 */}
        <PopoverTrigger
          render={
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10"
            />
          }
        />
        <PopoverContent
          anchor={ref}
          align="start"
          side="bottom"
          sideOffset={8}
          initialFocus={ref}
          className="max-h-(--available-height) w-(--anchor-width) overflow-hidden rounded-2xl p-3"
        >
          <ScrollArea
            viewportClassName="max-h-[calc(var(--available-height)-1.5rem)]"
            className="max-h-[calc(var(--available-height)-1.5rem)]"
          >
            <div className="flex flex-col gap-2 pr-2">
              {visible.map((group) => (
                <div key={group.label} className="flex gap-2 text-sm">
                  <span className="flex h-8 w-14 shrink-0 items-center text-sm text-muted-foreground">
                    {group.label}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {group.phrases.map((phrase) => (
                      <Button
                        key={phrase}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-8 max-w-full rounded-2xl px-3 text-sm font-normal"
                        onClick={() => pick(group.label, phrase)}
                      >
                        {phrase}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
