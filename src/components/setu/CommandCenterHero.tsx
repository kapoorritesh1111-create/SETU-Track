"use client";

import { useRouter } from "next/navigation";

type Metric = { label: string; value: string; hint: string; tone?: "teal" | "blue" | "violet" | "amber" };
type WatchItem = { title: string; meta: string; status: string; tone?: "ok" | "warn" | "risk" };

const metrics: Metric[] = [
  { label: "Active contractors", value: "34", hint: "12 submitting this week", tone: "blue" },
  { label: "Hours logged", value: "482h", hint: "Current operational window", tone: "teal" },
  { label: "Payroll ready", value: "$21.2k", hint: "Approved and exportable", tone: "teal" },
  { label: "Approvals pending", value: "5", hint: "Needs manager attention", tone: "violet" },
];

const watchlist: WatchItem[] = [
  { title: "Website Redesign", meta: "83% budget used", status: "On track", tone: "ok" },
  { title: "Mobile App Development", meta: "31% margin", status: "Healthy", tone: "ok" },
  { title: "Digital Marketing Campaign", meta: "91% budget used", status: "At risk", tone: "risk" },
  { title: "Client Onboarding", meta: "2 approvals blocked", status: "Needs review", tone: "warn" },
];

function toneClass(tone?: Metric["tone"]) {
  return tone ? `setu-tone-${tone}` : "setu-tone-blue";
}

function watchToneClass(tone?: WatchItem["tone"]) {
  if (tone === "ok") return "pill ok";
  if (tone === "risk") return "pill warn";
  return "pill";
}

export default function CommandCenterHero() {
  const router = useRouter();

  return (
    <section className="setuCommandCenter">
      <div className="setuHeroPanel">
        <div className="setuHeroHeader">
          <div>
            <div className="setuEyebrow">SETU command center</div>
            <h2 className="setuHeroTitle">Connect work, payroll, and growth in one finance-grade workspace.</h2>
            <p className="setuHeroCopy">
              The dashboard now orients around operational status, payroll readiness, project budget health,
              and next actions instead of disconnected modules.
            </p>
          </div>

          <div className="setuHeroActions">
            <button className="btn btnPrimary" onClick={() => router.push("/reports/payroll")}>Open payroll</button>
            <button className="btn btnSecondary" onClick={() => router.push("/projects")}>Review projects</button>
          </div>
        </div>

        <div className="setuHeroMetrics">
          {metrics.map((metric) => (
            <article key={metric.label} className={`setuHeroMetric ${toneClass(metric.tone)}`}>
              <div className="setuHeroMetricLabel">{metric.label}</div>
              <div className="setuHeroMetricValue">{metric.value}</div>
              <div className="setuHeroMetricHint">{metric.hint}</div>
            </article>
          ))}
        </div>
      </div>

      <aside className="setuWatchPanel">
        <div className="setuWatchHeader">
          <div>
            <div className="setuEyebrow">Executive watchlist</div>
            <h3 className="setuWatchTitle">Budget and workflow attention areas</h3>
          </div>
          <button className="btn btnGhost btnSm" onClick={() => router.push("/analytics")}>Open analytics</button>
        </div>

        <div className="setuWatchList">
          {watchlist.map((item) => (
            <div key={item.title} className="setuWatchItem">
              <div>
                <div className="setuWatchItemTitle">{item.title}</div>
                <div className="setuWatchItemMeta">{item.meta}</div>
              </div>
              <span className={watchToneClass(item.tone)}>{item.status}</span>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}
