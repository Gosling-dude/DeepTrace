/** DeepTrace mark: a reticle with the trace it found. */
export function LogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="15" cy="5" r="2.6" strokeWidth="1.2" style={{ fill: 'var(--signal)', stroke: 'var(--logo-gap, var(--ground))' }} />
    </svg>
  );
}

export default function Logo({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-bone ${className}`}>
      <LogoMark size={size} />
      <span
        className="font-semibold tracking-[-0.02em]"
        style={{ fontStretch: '112%', fontVariationSettings: "'wdth' 112", fontSize: size * 0.85 }}
      >
        DeepTrace
      </span>
    </span>
  );
}
