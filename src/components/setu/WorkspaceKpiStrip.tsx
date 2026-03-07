"use client";

type StripItem = { label: string; value: string; hint: string };

export default function WorkspaceKpiStrip({ items }: { items: StripItem[] }) {
  return (
    <section className="setuWorkspaceStrip">
      {items.map((item) => (
        <article key={item.label} className="setuWorkspaceCard">
          <div className="setuWorkspaceLabel">{item.label}</div>
          <div className="setuWorkspaceValue">{item.value}</div>
          <div className="setuWorkspaceHint">{item.hint}</div>
        </article>
      ))}
    </section>
  );
}
