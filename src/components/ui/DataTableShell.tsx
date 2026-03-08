import type { ReactNode } from "react";
export default function DataTableShell({ children, className="" }: { children: ReactNode; className?: string }) {
  return <div className={["dataTableShell", className].filter(Boolean).join(" ")}>{children}</div>;
}
