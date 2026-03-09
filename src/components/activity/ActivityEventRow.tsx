import { activityTone } from "../../lib/activityPresentation";

function initialsFromName(name?: string | null) {
  const clean = String(name || "System").trim();
  const parts = clean.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "S";
}

function formatWhen(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

type ActivityEventRowProps = {
  actorName?: string | null;
  actorEmail?: string | null;
  title: string;
  actionLabel: string;
  detail?: string | null;
  timestamp?: string | null;
  tone?: "default" | "success" | "warning";
};

export default function ActivityEventRow({
  actorName,
  actorEmail,
  title,
  actionLabel,
  detail,
  timestamp,
  tone,
}: ActivityEventRowProps) {
  const safeTone = tone || activityTone(actionLabel);
  const toneClass = safeTone === "warning" ? "pill warn" : safeTone === "success" ? "pill ok" : "pill";

  return (
    <div className="setuEventRow">
      <div className="setuEventAvatar">{initialsFromName(actorName)}</div>

      <div className="setuEventBody">
        <div className="setuEventHeadline">
          <strong>{actorName || actorEmail || "System"}</strong> {actionLabel}
        </div>
        <div className="setuEventSubhead">{title}</div>
        {detail ? <div className="setuEventDetail">{detail}</div> : null}
      </div>

      <div className="setuEventAside">
        <span className={toneClass}>{title}</span>
        <div className="setuEventMeta">{formatWhen(timestamp)}</div>
      </div>
    </div>
  );
}
