import type { ReactNode } from "react";
export default function FilterToolbar({ children, className="" }: { children: ReactNode; className?: string }) {
  return <div className={["filterToolbar", className].filter(Boolean).join(" ")}>{children}</div>;
}
