import type { AlertZone, FontStyle, BackgroundStyle } from '../utils/types';
import { defaultFormatValue } from '../utils/formatters';
import { ResponsiveContainer } from '../charts/shared/ResponsiveContainer';
import { CardSkeleton } from '../charts/shared/Skeleton';
import {
  buildSemiCirclePath,
  semiCircleLength,
  buildZoneDashes,
  buildValueDash,
  getZoneColor,
} from './shared';

export interface ArcGaugeStyles {
  value?: FontStyle;
  label?: FontStyle;
  unit?: FontStyle;
  background?: BackgroundStyle;
}

export interface ArcGaugeProps {
  value: number;
  min?: number;
  max?: number;
  formatValue?: (value: number) => string;
  alertZones?: AlertZone[];
  label?: string;
  unit?: string;
  styles?: ArcGaugeStyles;
  showLoading?: boolean;
}

const ARC_THICKNESS = 20;

export function ArcGauge({
  value,
  min = 0,
  max = 100,
  formatValue = defaultFormatValue,
  alertZones = [],
  label,
  unit,
  styles,
  showLoading = true,
}: ArcGaugeProps) {
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
        const maxRadius = Math.min((width - padding * 2) / 2, height - padding - 50);
        const radius = Math.max(40, maxRadius);
        const cx = width / 2;
        const cy = padding + radius;

        const arcPath = buildSemiCirclePath(cx, cy, radius);
        const totalLen = semiCircleLength(radius);
        const zoneDashes = buildZoneDashes(alertZones, min, max, totalLen);
        const valueDash = buildValueDash(value, min, max, totalLen);
        const valueColor = alertZones.length > 0
          ? getZoneColor(value, alertZones, '#3b82f6')
          : '#3b82f6';

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

            {/* Alert zone arcs (subtle) */}
            {zoneDashes.map((z, i) => (
              <path
                key={i}
                d={arcPath}
                fill="none"
                stroke={z.color}
                strokeWidth={ARC_THICKNESS}
                strokeDasharray={z.dasharray}
                strokeDashoffset={z.dashoffset}
                opacity={0.25}
              />
            ))}

            {/* Value fill arc */}
            <path
              d={arcPath}
              fill="none"
              stroke={valueColor}
              strokeWidth={ARC_THICKNESS}
              strokeLinecap="butt"
              strokeDasharray={valueDash.dasharray}
              strokeDashoffset={valueDash.dashoffset}
            />

            {/* Value in center */}
            <text
              x={cx}
              y={cy - 4}
              textAnchor="middle"
              dominantBaseline="auto"
              fontSize={styles?.value?.fontSize ?? 26}
              fontFamily={styles?.value?.fontFamily ?? 'var(--relay-font-family)'}
              fontWeight={styles?.value?.fontWeight ?? 700}
              fill={styles?.value?.color ?? valueColor}
            >
              {formatValue(value)}
            </text>

            {/* Unit */}
            {unit && (
              <text
                x={cx}
                y={cy + 16}
                textAnchor="middle"
                fontSize={styles?.unit?.fontSize ?? 13}
                fontFamily={styles?.unit?.fontFamily ?? 'var(--relay-font-family)'}
                fontWeight={styles?.unit?.fontWeight ?? 400}
                fill={styles?.unit?.color ?? '#6b7280'}
              >
                {unit}
              </text>
            )}

            {/* Label */}
            {label && (
              <text
                x={cx}
                y={cy + 34}
                textAnchor="middle"
                fontSize={styles?.label?.fontSize ?? 12}
                fontFamily={styles?.label?.fontFamily ?? 'var(--relay-font-family)'}
                fontWeight={styles?.label?.fontWeight ?? 400}
                fill={styles?.label?.color ?? '#6b7280'}
              >
                {label}
              </text>
            )}

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
          </svg>
        );
      }}
    </ResponsiveContainer>
  );
}
