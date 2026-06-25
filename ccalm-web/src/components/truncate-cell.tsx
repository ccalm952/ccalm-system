import * as React from "react";

export function TruncateCell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div
      className="truncate text-left"
      title={title ?? (typeof children === "string" ? children : undefined)}
    >
      {children}
    </div>
  );
}
