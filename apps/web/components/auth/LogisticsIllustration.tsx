/**
 * §15.8/15.10 auth-hero illustration: monoline, duotone (accent-500 + white
 * at low opacity), abstract/geometric, no literal isometric projection or
 * realistic drawing. A simplified front-facing warehouse silhouette (pitched
 * roof, two bay-divider lines, a door) with a small connected-node motif
 * trailing off to the right, standing in for "logistics"/distribution
 * network — not a strict isometric building, a stylized simplification, per
 * the spec's own "roughly 200-300px... abstract geometric/architectural"
 * framing rather than literal accuracy. ~280x200 viewBox.
 */
export function LogisticsIllustration() {
  return (
    <svg
      width="280"
      height="200"
      viewBox="0 0 280 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* soft depth layer - white, low opacity */}
      <circle cx="140" cy="70" r="72" stroke="white" strokeOpacity="0.08" strokeWidth="1.5" />
      <line x1="20" y1="164" x2="260" y2="164" stroke="white" strokeOpacity="0.15" strokeWidth="1.5" />

      {/* warehouse silhouette - accent-500 */}
      <path
        d="M60 164 L60 92 L110 54 L160 92 L160 164"
        stroke="var(--accent-500)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="86" y1="164" x2="86" y2="108" stroke="var(--accent-500)" strokeOpacity="0.6" strokeWidth="1.5" />
      <line x1="134" y1="164" x2="134" y2="108" stroke="var(--accent-500)" strokeOpacity="0.6" strokeWidth="1.5" />
      <rect x="100" y="132" width="20" height="32" stroke="var(--accent-500)" strokeWidth="1.5" />

      {/* distribution network nodes */}
      <line x1="160" y1="140" x2="192" y2="140" stroke="var(--accent-500)" strokeOpacity="0.4" strokeWidth="1.5" />
      <line x1="192" y1="140" x2="222" y2="118" stroke="var(--accent-500)" strokeOpacity="0.4" strokeWidth="1.5" />
      <line x1="192" y1="140" x2="228" y2="156" stroke="var(--accent-500)" strokeOpacity="0.4" strokeWidth="1.5" />
      <circle cx="192" cy="140" r="4" fill="var(--accent-500)" />
      <circle cx="222" cy="118" r="4" fill="var(--accent-500)" fillOpacity="0.6" />
      <circle cx="228" cy="156" r="4" fill="var(--accent-500)" fillOpacity="0.6" />
    </svg>
  );
}
