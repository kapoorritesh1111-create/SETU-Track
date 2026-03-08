import type { ReactNode } from "react";
export default function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return <div className="pageHeader"><div><h1 className="pageTitle">{title}</h1>{subtitle ? <div className="pageSubtitle">{subtitle}</div> : null}</div>{right ? <div>{right}</div> : null}</div>;
}
