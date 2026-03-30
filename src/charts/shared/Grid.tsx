import type { ScaleLinear, ScaleTime } from "d3";

interface GridProps {
  xScale: ScaleTime<number, number> | ScaleLinear<number, number>;
  yScale: ScaleLinear<number, number>;
  width: number;
  height: number;
  showGrid?: boolean;
  gridColor?: string;
  gridThickness?: number;
}

export function Grid({
  xScale,
  yScale,
  width,
  height,
  showGrid = true,
  gridColor,
  gridThickness,
}: GridProps) {
  if (!showGrid) return null;

  const color = gridColor ?? "var(--relay-grid-color, #e0e0e0)";
  const thickness = gridThickness ?? 1;

  const xTicks = "ticks" in xScale ? (xScale as any).ticks() : [];
  const yTicks = yScale.ticks();

  return (
    <g className="relay-grid">
      {/* Horizontal grid lines */}
      {yTicks.map((tick: number) => (
        <line
          key={`h-${tick}`}
          x1={0}
          x2={width}
          y1={yScale(tick)}
          y2={yScale(tick)}
          stroke={color}
          strokeWidth={thickness}
          strokeDasharray="2,2"
        />
      ))}
      {/* Vertical grid lines */}
      {xTicks.map((tick: any, i: number) => (
        <line
          key={`v-${i}`}
          x1={xScale(tick)}
          x2={xScale(tick)}
          y1={0}
          y2={height}
          stroke={color}
          strokeWidth={thickness}
          strokeDasharray="2,2"
        />
      ))}
    </g>
  );
}
