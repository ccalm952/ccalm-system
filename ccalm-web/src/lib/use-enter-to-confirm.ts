import * as React from "react";

/** 弹窗打开时按 Enter 触发确认（提交中时不响应）。 */
export function useEnterToConfirm(
  open: boolean,
  onConfirm: () => void | Promise<void>,
  busy = false,
) {
  const onConfirmRef = React.useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  React.useEffect(() => {
    if (!open || busy) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Enter" || e.repeat) return;
      e.preventDefault();
      void onConfirmRef.current();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, busy]);
}
