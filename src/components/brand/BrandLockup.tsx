import { BRAND } from '../../config/brand';

type Props = {
  className?: string;
  logoClassName?: string;
  taglineClassName?: string;
  descriptionClassName?: string;
  stacked?: boolean;
  showDescription?: boolean;
  href?: string;
};

export default function BrandLockup({
  className = '',
  logoClassName = '',
  taglineClassName = '',
  descriptionClassName = '',
  stacked = true,
  showDescription = false,
}: Props) {
  return (
    <div className={`setuBrandLockup ${stacked ? 'setuBrandLockupStacked' : ''} ${className}`.trim()}>
      <img className={`setuBrandLogo ${logoClassName}`.trim()} src={BRAND.logo.full} alt={`${BRAND.name} logo`} />
      <div className="setuBrandCopy">
        <p className={`setuBrandTagline ${taglineClassName}`.trim()}>{BRAND.tagline}</p>
        {showDescription ? (
          <p className={`setuBrandDescription ${descriptionClassName}`.trim()}>{BRAND.description}</p>
        ) : null}
      </div>
    </div>
  );
}
