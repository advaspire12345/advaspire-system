"use client";

interface HexagonNumberBadgeProps {
  value: number | string;
  size?: number;
  color?: string;
  textColor?: string;
}

// Pre-calculated rounded hexagon path for a 36x36 viewBox
// Hexagon with radius 15 (accounting for 3px padding), centered at 18,18
function getHexagonPath(size: number): string {
  const center = size / 2;
  const radius = size / 2 - size * 0.08;
  const cornerRadius = 4;
  const sides = 6;
  const step = (Math.PI * 2) / sides;

  // Calculate hexagon points (starting from top)
  const points: [number, number][] = [];
  for (let i = 0; i < sides; i++) {
    const angle = step * i - Math.PI / 2;
    points.push([
      center + radius * Math.cos(angle),
      center + radius * Math.sin(angle),
    ]);
  }

  // Build rounded path using quadratic curves for corners
  let path = "";
  for (let i = 0; i < sides; i++) {
    const curr = points[i];
    const next = points[(i + 1) % sides];

    // Vector from current to next point
    const dx = next[0] - curr[0];
    const dy = next[1] - curr[1];
    const len = Math.sqrt(dx * dx + dy * dy);

    // Offset for corner rounding
    const offset = Math.min(cornerRadius, len / 2);
    const ux = (dx / len) * offset;
    const uy = (dy / len) * offset;

    if (i === 0) {
      path += `M ${curr[0] + ux} ${curr[1] + uy}`;
    }

    // Line to corner start
    path += ` L ${next[0] - ux} ${next[1] - uy}`;

    // Quadratic curve around corner
    const nextNext = points[(i + 2) % sides];
    const dx2 = nextNext[0] - next[0];
    const dy2 = nextNext[1] - next[1];
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    const offset2 = Math.min(cornerRadius, len2 / 2);
    const ux2 = (dx2 / len2) * offset2;
    const uy2 = (dy2 / len2) * offset2;

    path += ` Q ${next[0]} ${next[1]} ${next[0] + ux2} ${next[1] + uy2}`;
  }

  path += " Z";
  return path;
}

export function HexagonNumberBadge({
  value,
  size = 36,
  color = "#45437F",
  textColor = "#fff",
}: HexagonNumberBadgeProps) {
  const hexPath = getHexagonPath(size);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block" }}
    >
      <path d={hexPath} fill={color} stroke="#fff" strokeWidth={3} />
      <text
        x={size / 2}
        y={size / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={textColor}
        fontSize={size * 0.35}
        fontWeight="bold"
        fontFamily="Rajdhani, sans-serif"
      >
        {value}
      </text>
    </svg>
  );
}

export default HexagonNumberBadge;
