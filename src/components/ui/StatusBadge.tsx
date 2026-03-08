import type { ReactNode } from "react";
export default function StatusBadge({ children, tone="default" }: { children: ReactNode; tone?: "default"|"success"|"warning"|"danger" }) {
  return <span className={`statusBadge statusBadge${tone[0].toUpperCase()+tone.slice(1)}`}>{children}</span>;
}
