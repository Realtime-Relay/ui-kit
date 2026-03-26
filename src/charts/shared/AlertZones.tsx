import type { ScaleLinear } from 'd3';
import type { AlertZone } from '../../utils/types';

interface AlertZonesProps {
  zones: AlertZone[];
  yScale: ScaleLinear<number, number>;
  width: number;
  height: number;
}

export function AlertZonesOverlay({ zones, yScale, width, height }: AlertZonesProps) {
  if (!zones.length) return null;

  const [yMin, yMax] = yScale.domain();

  return (
    <g className="relay-alert-zones">
      {zones.map((zone, i) => {
        const clampedMin = Math.max(zone.min, yMin);
        const clampedMax = Math.min(zone.max, yMax);
        if (clampedMin >= clampedMax) return null;

        const y = yScale(clampedMax);
        const zoneHeight = yScale(clampedMin) - y;

        return (
          <g key={i}>
            <rect
              x={0}
              y={y}
              width={width}
              height={Math.max(0, zoneHeight)}
              fill={zone.color}
              opacity={0.1}
            />
            {zone.label && (
              <text
                x={width - 4}
                y={y + 12}
                textAnchor="end"
                fill={zone.color}
                fontSize={10}
                fontFamily="var(--relay-font-family)"
                opacity={0.6}
              >
                {zone.label}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
