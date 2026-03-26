import type { AlertZone, FontStyle, BackgroundStyle } from '../utils/types';
import { defaultFormatValue } from '../utils/formatters';
import { ResponsiveContainer } from '../charts/shared/ResponsiveContainer';
import { CardSkeleton } from '../charts/shared/Skeleton';
import {
  valueToAngle,
  buildSemiCirclePath,
  semiCircleLength,
  buildZoneDashes,
  getZoneColor,
} from './shared';

export interface NeedleGaugeStyles {
  value?: FontStyle;
  label?: FontStyle;
  unit?: FontStyle;
  background?: BackgroundStyle;
}

export interface NeedleGaugeProps {
  value: number;
  min?: number;
  max?: number;
  formatValue?: (value: number) => string;
  alertZones?: AlertZone[];
  label?: string;
  unit?: string;
  styles?: NeedleGaugeStyles;
  showLoading?: boolean;
}

const ARC_THICKNESS = 14;

export function NeedleGauge({
  value,
  min = 0,
  max = 100,
  formatValue = defaultFormatValue,
  alertZones = [],
  label,
  unit,
  styles,
  showLoading = true,
}: NeedleGaugeProps) {
  if (showLoading && value == null) {
    return (
      <ResponsiveContainer>
        {({ width, height }) => <CardSkeleton width={width} height={height} />}
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer
      style={{ backgroundColor: styles?.background?.color ?? 'transparent' }}
    >
      {({ width, height }) => {
        const padding = 20;
        const maxRadius = Math.min((width - padding * 2) / 2, height - padding - 60);
        const radius = Math.max(40, maxRadius);
        const cx = width / 2;
        const cy = padding + radius;

        const arcPath = buildSemiCirclePath(cx, cy, radius);
        const totalLen = semiCircleLength(radius);
        const zoneDashes = buildZoneDashes(alertZones, min, max, totalLen);

        const angle = valueToAngle(value, min, max);
        const needleLen = radius - ARC_THICKNESS - 8;
        const nx = cx + needleLen * Math.cos(angle);
        const ny = cy - needleLen * Math.sin(angle);
        const valueColor = getZoneColor(value, alertZones, '#374151');

        const textY = cy + 28;

        return (
          <svg width={width} height={height}>
            {/* Background arc */}
            <path
              d={arcPath}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={ARC_THICKNESS}
              strokeLinecap="butt"
            />

            {/* Alert zone arcs */}
            {zoneDashes.map((z, i) => (
              <path
                key={i}
                d={arcPath}
                fill="none"
                stroke={z.color}
                strokeWidth={ARC_THICKNESS}
                strokeDasharray={z.dasharray}
                strokeDashoffset={z.dashoffset}
                opacity={0.5}
              />
            ))}

            {/* Needle */}
            <line
              x1={cx}
              y1={cy}
              x2={nx}
              y2={ny}
              stroke={valueColor}
              strokeWidth={2.5}
              strokeLinecap="butt"
            />
            <circle cx={cx} cy={cy} r={5} fill={valueColor} />

            {/* Min label */}
            <text
              x={cx - radius}
              y={cy + 20}
              textAnchor="middle"
              fontSize={10}
              fontFamily={styles?.label?.fontFamily ?? 'var(--relay-font-family)'}
              fill="#9ca3af"
            >
              {formatValue(min)}
            </text>
            {/* Max label */}
            <text
              x={cx + radius}
              y={cy + 20}
              textAnchor="middle"
              fontSize={10}
              fontFamily={styles?.label?.fontFamily ?? 'var(--relay-font-family)'}
              fill="#9ca3af"
            >
              {formatValue(max)}
            </text>

            {/* Value */}
            <text
              x={cx}
              y={textY}
              textAnchor="middle"
              fontSize={styles?.value?.fontSize ?? 22}
              fontFamily={styles?.value?.fontFamily ?? 'var(--relay-font-family)'}
              fontWeight={styles?.value?.fontWeight ?? 700}
              fill={styles?.value?.color ?? valueColor}
            >
              {formatValue(value)}
              {unit && (
                <tspan
                  fontSize={styles?.unit?.fontSize ?? 13}
                  fontWeight={styles?.unit?.fontWeight ?? 400}
                  fill={styles?.unit?.color ?? '#6b7280'}
                >
                  {' '}{unit}
                </tspan>
              )}
            </text>

            {/* Label */}
            {label && (
              <text
                x={cx}
                y={textY + 20}
                textAnchor="middle"
                fontSize={styles?.label?.fontSize ?? 12}
                fontFamily={styles?.label?.fontFamily ?? 'var(--relay-font-family)'}
                fontWeight={styles?.label?.fontWeight ?? 400}
                fill={styles?.label?.color ?? '#6b7280'}
              >
                {label}
              </text>
            )}
          </svg>
        );
      }}
    </ResponsiveContainer>
  );
}
