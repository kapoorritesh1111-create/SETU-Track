import { BRAND } from "../../config/brand";

type Props = {
  compact?: boolean;
  className?: string;
  showTagline?: boolean;
  showDescription?: boolean;
  invert?: boolean;
  iconOnly?: boolean;
};

export default function BrandLockup({ compact=false, className="", showTagline=true, showDescription=false, invert=false, iconOnly=false }: Props) {
  return (
    <div className={["brandLockup", compact ? "brandLockupCompact" : "", invert ? "brandLockupInvert" : "", className].filter(Boolean).join(" ")}>
      <img className={iconOnly ? "brandMark brandMarkOnly" : compact ? "brandMark" : "brandLogo"} src={iconOnly ? BRAND.logo.mark : BRAND.logo.full} alt={iconOnly ? `${BRAND.name} symbol` : `${BRAND.name} logo`} />
      {!iconOnly ? (
        <div className="brandLockupCopy">
          {showTagline ? <div className="brandTagline">{BRAND.tagline}</div> : null}
          {showDescription ? <div className="brandDescription">{BRAND.description}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
