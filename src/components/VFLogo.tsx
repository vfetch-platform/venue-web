interface VFLogoProps {
  className?: string;
  size?: number;
}

export default function VFLogo({ className = '', size = 32 }: VFLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* V left arm */}
      <polygon points="2,8  16,8  46,78  32,78" fill="#4db6ac" />

      {/* V right arm */}
      <polygon points="32,78  46,78  60,8  46,8" fill="#4db6ac" />

      {/* F top bar (cyan) */}
      <polygon points="46,8  96,8  96,20  46,20" fill="#4db6ac" />

      {/* F lower block — skewed right so corners stay sharp rectangles */}
      <g transform="skewX(-12) translate(12, -8)">
        {/* Stem */}
        <rect x="58" y="48" width="12" height="39" fill="#ffffff" />
        {/* Horizontal bar */}
        <rect x="58" y="48" width="30" height="12" fill="#ffffff" />
      </g>
    </svg>
  );
}
