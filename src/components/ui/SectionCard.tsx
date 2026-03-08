import type { ReactNode } from "react";
export default function SectionCard({ children, className="" }: { children: ReactNode; className?: string }) {
  return <section className={["card","cardPad","sectionCard", className].filter(Boolean).join(" ")}>{children}</section>;
}
