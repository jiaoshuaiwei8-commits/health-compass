import type { DimensionScore } from "@/lib/types";

export function RadarChart({ dimensions, size = 320 }: { dimensions: DimensionScore[]; size?: number }) {
  const center = size / 2;
  const radius = size / 2 - 46;
  const count = dimensions.length;
  const angleFor = (index: number) => (Math.PI * 2 * index) / count - Math.PI / 2;
  const point = (index: number, value: number) => {
    const angle = angleFor(index);
    const r = (Math.max(0, Math.min(100, value)) / 100) * radius;
    return [center + Math.cos(angle) * r, center + Math.sin(angle) * r] as const;
  };

  const rings = [25, 50, 75, 100];
  const polygon = dimensions
    .map((dimension, index) => {
      const [x, y] = point(index, dimension.score);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-auto w-full max-w-[340px]">
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={dimensions
            .map((_, index) => {
              const [x, y] = point(index, ring);
              return `${x},${y}`;
            })
            .join(" ")}
          fill="none"
          stroke="rgba(29,42,36,0.10)"
          strokeWidth={1}
        />
      ))}

      {dimensions.map((_, index) => {
        const [x, y] = point(index, 100);
        return <line key={index} x1={center} y1={center} x2={x} y2={y} stroke="rgba(29,42,36,0.08)" strokeWidth={1} />;
      })}

      <polygon points={polygon} fill="rgba(31,111,92,0.16)" stroke="#1f6f5c" strokeWidth={2} strokeLinejoin="round" />

      {dimensions.map((dimension, index) => {
        const [x, y] = point(index, dimension.score);
        return <circle key={dimension.key} cx={x} cy={y} r={3} fill="#1f6f5c" />;
      })}

      {dimensions.map((dimension, index) => {
        const angle = angleFor(index);
        const labelRadius = radius + 26;
        const x = center + Math.cos(angle) * labelRadius;
        const y = center + Math.sin(angle) * labelRadius;
        const anchor = Math.abs(Math.cos(angle)) < 0.2 ? "middle" : Math.cos(angle) > 0 ? "start" : "end";
        return (
          <text
            key={dimension.key}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize={11}
            fill="#64736a"
          >
            {dimension.label.replace("体重与体态", "体重").replace("情绪与压力", "情绪").replace("烟酒与咖啡因", "习惯").replace("消化与排泄", "消化")}
          </text>
        );
      })}
    </svg>
  );
}
