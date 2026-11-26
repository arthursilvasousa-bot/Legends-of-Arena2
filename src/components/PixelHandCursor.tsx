interface PixelHandCursorProps {
  className?: string;
}

/**
 * Crisp 16-bit pixel-art gloved pointing hand cursor matching the reference title screen.
 */
export function PixelHandCursor({ className = '' }: PixelHandCursorProps) {
  return (
    <svg
      viewBox="0 0 24 16"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
    >
      {/* Black pixel outline */}
      <rect x="0" y="4" width="3" height="8" fill="#09070d" />
      <rect x="3" y="3" width="4" height="10" fill="#09070d" />
      <rect x="7" y="1" width="5" height="3" fill="#09070d" />
      <rect x="9" y="0" width="4" height="3" fill="#09070d" />
      <rect x="7" y="3" width="16" height="5" fill="#09070d" />
      <rect x="13" y="4" width="11" height="3" fill="#09070d" />
      <rect x="7" y="8" width="12" height="6" fill="#09070d" />
      <rect x="9" y="13" width="8" height="3" fill="#09070d" />

      {/* Cuff */}
      <rect x="1" y="5" width="2" height="6" fill="#94a3b8" />
      <rect x="1" y="5" width="2" height="2" fill="#e2e8f0" />
      <rect x="3" y="4" width="1" height="8" fill="#475569" />

      {/* Palm + Thumb */}
      <rect x="4" y="4" width="5" height="8" fill="#e2e8f0" />
      <rect x="4" y="9" width="5" height="3" fill="#cbd5e1" />
      <rect x="10" y="1" width="2" height="3" fill="#f8fafc" />
      <rect x="8" y="2" width="3" height="2" fill="#e2e8f0" />

      {/* Pointing Index Finger */}
      <rect x="9" y="4" width="13" height="2" fill="#ffffff" />
      <rect x="9" y="6" width="12" height="1" fill="#cbd5e1" />

      {/* Curled Middle / Ring / Pinky Fingers */}
      <rect x="9" y="8" width="8" height="2" fill="#f1f5f9" />
      <rect x="14" y="8" width="3" height="2" fill="#cbd5e1" />
      <rect x="9" y="10" width="7" height="2" fill="#e2e8f0" />
      <rect x="13" y="10" width="3" height="2" fill="#94a3b8" />
      <rect x="10" y="12" width="5" height="2" fill="#cbd5e1" />
      <rect x="13" y="12" width="2" height="2" fill="#94a3b8" />
    </svg>
  );
}
