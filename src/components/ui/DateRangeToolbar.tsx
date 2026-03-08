"use client";

import type { DatePreset } from "../../lib/dateRanges";

const PRESET_OPTIONS: Array<{ value: DatePreset; label: string }> = [
  { value: "current_week", label: "Current week" },
  { value: "last_week", label: "Last week" },
  { value: "current_month", label: "Current month" },
  { value: "last_month", label: "Last month" },
  { value: "custom", label: "Custom" },
];

export default function DateRangeToolbar({
  preset,
  start,
  end,
  onPresetChange,
  onStartChange,
  onEndChange,
  onRefresh,
  busy = false,
  compact = false,
}: {
  preset: DatePreset;
  start: string;
  end: string;
  onPresetChange: (value: DatePreset) => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onRefresh?: () => void;
  busy?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`setuRangeToolbar ${compact ? "isCompact" : ""}`}>
      <label className="setuField">
        <span>Period</span>
        <select className="input" value={preset} onChange={(e) => onPresetChange(e.target.value as DatePreset)}>
          {PRESET_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>

      {preset === "custom" ? (
        <>
          <label className="setuField">
            <span>Start</span>
            <input className="input" type="date" value={start} onChange={(e) => onStartChange(e.target.value)} />
          </label>
          <label className="setuField">
            <span>End</span>
            <input className="input" type="date" value={end} onChange={(e) => onEndChange(e.target.value)} />
          </label>
        </>
      ) : null}

      {onRefresh ? (
        <button className="pill" type="button" onClick={onRefresh} disabled={busy}>
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      ) : null}
    </div>
  );
}
