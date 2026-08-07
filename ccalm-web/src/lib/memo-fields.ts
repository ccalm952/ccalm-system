export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.position = "fixed";
  el.style.left = "-9999px";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
}

/** 标记：由 ``两个反引号`` 转换而来，渲染为可复制行内代码 */
export const COPYABLE_INLINE_MARK = "\u2060COPY\u2060";

/**
 * 将正文中的 ``内容``（恰好两个反引号）转为带标记的单反引号行内代码。
 * 三个反引号的代码块不处理。
 */
export function markCopyableDoubleBackticks(source: string): string {
  return source.replace(
    /(```[\s\S]*?```)|(?<!`)``([^`\n]+?)``(?!`)/g,
    (_match, fence: string | undefined, inner: string | undefined) => {
      if (fence) return fence;
      return `\`${COPYABLE_INLINE_MARK}${inner}\``;
    },
  );
}

export function splitCopyableInlineCode(raw: string): {
  copyable: boolean;
  text: string;
} {
  if (raw.startsWith(COPYABLE_INLINE_MARK)) {
    return { copyable: true, text: raw.slice(COPYABLE_INLINE_MARK.length) };
  }
  return { copyable: false, text: raw };
}
