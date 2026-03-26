import { useRef } from 'react';
import type { AlertZone, FontStyle, BackgroundStyle } from '../utils/types';
import { defaultFormatValue, defaultFormatTimestamp } from '../utils/formatters';
import { resolveFont } from '../utils/useResolvedStyles';
import { useZoneTransition, type ZoneTransition } from '../utils/useZoneTransition';
import { createScaler, GAUGE_REFERENCE } from '../utils/scaler';
import { validateRange, validateAlertZones, validateValue, type ComponentError } from '../utils/validation';
import { ResponsiveContainer } from '../charts/shared/ResponsiveContainer';
import { CardSkeleton } from '../charts/shared/Skeleton';
import {
  valueToAngle,
  buildArcPath,
  arcLength,
  buildZoneDashes,
  getZoneColor,
  getArcEndpoints,
  getValuePosition,
  getZoneBoundaries,
  clampArcAngle,
} from './shared';

export interface NeedleGaugeStyles {
  value?: FontStyle;
  label?: FontStyle;
  unit?: FontStyle;
  minMax?: FontStyle;
  lastUpdated?: FontStyle;
  background?: BackgroundStyle;
  arcThickness?: number;
  needleThickness?: number;
  arcAngle?: number;
  width?: number;
  height?: number;
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
  /** Show values at alert zone boundary points on the arc. */
  showZoneValues?: boolean;
  /** Timestamp of the last data update. Displayed below the label when showLastUpdated is true. */
  lastUpdated?: Date | number;
  /** Show/hide the last updated timestamp. Default: false. */
  showLastUpdated?: boolean;
  /** Custom formatter for the timestamp. Receives Date | number, must return string. Default: dd MMM yyyy HH:MM:SS.sss +TZ */
  formatTimestamp?: (ts: Date | number) => string;
  showLoading?: boolean;
  onZoneChange?: (transition: ZoneTransition) => void;
  onError?: (error: ComponentError) => void;
}

export function NeedleGauge({
  value,
  min = 0,
  max = 100,
  formatValue = defaultFormatValue,
  alertZones = [],
  label,
  unit,
  styles,
  showZoneValues = false,
  lastUpdated,
  showLastUpdated = false,
  formatTimestamp = defaultFormatTimestamp,
  showLoading = true,
  onZoneChange,
  onError,
}: NeedleGaugeProps) {
  // Hard validation — throws on config errors
  validateRange(min, max, 'NeedleGauge');
  validateAlertZones(alertZones, 'NeedleGauge');

  // Soft validation — fires onError, falls back to last valid
  const lastValidRef = useRef<number | null>(null);
  const validatedValue = validateValue(value, 'NeedleGauge', onError);
  if (validatedValue !== null) {
    lastValidRef.current = validatedValue;
  }
  const renderValue = lastValidRef.current;

  useZoneTransition(renderValue ?? min, alertZones, onZoneChange);

  if (showLoading && renderValue == null) {
    return (
      <ResponsiveContainer
        explicitWidth={styles?.width}
        explicitHeight={styles?.height}
      >
        {({ width, height }) => <CardSkeleton width={width} height={height} />}
      </ResponsiveContainer>
    );
  }

  const sweepDegrees = clampArcAngle(styles?.arcAngle);

  const valueStyle = resolveFont(styles?.value);
  const labelStyleR = resolveFont(styles?.label);
  const unitStyle = resolveFont(styles?.unit);
  const minMaxStyle = resolveFont(styles?.minMax);
  const lastUpdatedStyle = resolveFont(styles?.lastUpdated);

  return (
    <ResponsiveContainer
      explicitWidth={styles?.width}
      explicitHeight={styles?.height}
      style={{ backgroundColor: styles?.background?.color ?? 'transparent' }}
    >
      {({ width, height }) => {
        const s = createScaler(width, height, GAUGE_REFERENCE);

        const minMaxFontSize = s(minMaxStyle?.fontSize ?? 10);
        const zoneValueExtra = showZoneValues && alertZones.length > 0 ? minMaxFontSize + s(4) : 0;
        const padding = s(20) + zoneValueExtra;
        const arcThickness = s(styles?.arcThickness ?? 14);
        const needleThickness = s(styles?.needleThickness ?? 2.5);
        const valueFontSize = s(valueStyle?.fontSize ?? 22);
        const labelFontSize = s(labelStyleR?.fontSize ?? 12);
        const unitFontSize = s(unitStyle?.fontSize ?? 13);


        const sweepRad = (sweepDegrees * Math.PI) / 180;
        const halfSweep = sweepRad / 2;
        const arcBottomFraction = sweepDegrees <= 180
          ? 0
          : Math.sin(halfSweep - Math.PI / 2);

        const textSpace = sweepDegrees <= 180 ? s(60) : s(60);
        const totalVertical = padding * 2 + textSpace;
        const maxRadius = Math.min(
          (width - padding * 2) / 2,
          (height - totalVertical) / (1 + arcBottomFraction)
        );
        const radius = Math.max(s(40), maxRadius);
        const cx = width / 2;
        const cy = padding + radius;

        const { path: arcPathD } = buildArcPath(cx, cy, radius, sweepDegrees);
        const totalLen = arcLength(radius, sweepDegrees);
        const zoneDashes = buildZoneDashes(alertZones, min, max, totalLen);

        // Clamp visual to range, but display actual value in label
        const clampedValue = Math.min(max, Math.max(min, renderValue!));
        const angle = valueToAngle(clampedValue, min, max, sweepDegrees);
        const needleLen = radius - arcThickness - s(8);
        const nx = cx + needleLen * Math.cos(angle);
        const ny = cy + needleLen * Math.sin(angle);
        const valueColor = getZoneColor(clampedValue, alertZones, '#374151');

        const endpoints = getArcEndpoints(cx, cy, radius + arcThickness / 2 + s(12), sweepDegrees);

        let valueY: number;
        let labelY: number;
        if (sweepDegrees <= 180) {
          // Text below the arc (semi-circle style)
          const minMaxGap = arcThickness / 2 + s(14);
          valueY = cy + minMaxGap + valueFontSize * 0.4;
          labelY = valueY + valueFontSize * 0.5 + labelFontSize * 0.5 + s(6);
        } else {
          // For arcs > 180°, text goes below the lowest point of the arc
          // The lowest point of the arc is at cy + radius * sin(halfSweep - π/2)
          const arcBottomY = cy + radius * Math.sin(halfSweep - Math.PI / 2);
          const belowArc = arcBottomY + arcThickness / 2 + s(8);
          valueY = belowArc + valueFontSize * 0.4;
          labelY = valueY + valueFontSize * 0.5 + labelFontSize * 0.5 + s(4);
        }

        return (
          <svg
            width={width}
            height={height}
            role="meter"
            aria-valuenow={renderValue!}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-label={label ?? 'Gauge'}
          >
            <path
              d={arcPathD}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={arcThickness}
              strokeLinecap="butt"
            />

            {zoneDashes.map((z, i) => (
              <path
                key={i}
                d={arcPathD}
                fill="none"
                stroke={z.color}
                strokeWidth={arcThickness}
                strokeDasharray={z.dasharray}
                strokeDashoffset={z.dashoffset}
                opacity={1}
              />
            ))}

            <line
              x1={cx}
              y1={cy}
              x2={nx}
              y2={ny}
              stroke={valueColor}
              strokeWidth={needleThickness}
              strokeLinecap="butt"
            />
            <circle cx={cx} cy={cy} r={Math.max(s(4), needleThickness * 2)} fill={valueColor} />

            {/* Min label */}
            <text
              x={endpoints.startX}
              y={endpoints.startY}
              textAnchor="middle"
              fontSize={s(minMaxStyle?.fontSize ?? 10)}
              fontFamily={minMaxStyle?.fontFamily ?? labelStyleR?.fontFamily ?? 'var(--relay-font-family)'}
              fontWeight={minMaxStyle?.fontWeight ?? 400}
              fill={minMaxStyle?.color ?? '#9ca3af'}
            >
              {formatValue(min)}
            </text>
            {/* Max label */}
            <text
              x={endpoints.endX}
              y={endpoints.endY}
              textAnchor="middle"
              fontSize={s(minMaxStyle?.fontSize ?? 10)}
              fontFamily={minMaxStyle?.fontFamily ?? labelStyleR?.fontFamily ?? 'var(--relay-font-family)'}
              fontWeight={minMaxStyle?.fontWeight ?? 400}
              fill={minMaxStyle?.color ?? '#9ca3af'}
            >
              {formatValue(max)}
            </text>

            {/* Zone boundary values */}
            {showZoneValues && alertZones.length > 0 && getZoneBoundaries(alertZones, min, max).map((bv) => {
              const pos = getValuePosition(cx, cy, radius + arcThickness / 2 + s(12), bv, min, max, sweepDegrees);
              return (
                <text
                  key={`zv-${bv}`}
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  fontSize={s(minMaxStyle?.fontSize ?? 10)}
                  fontFamily={minMaxStyle?.fontFamily ?? labelStyleR?.fontFamily ?? 'var(--relay-font-family)'}
                  fontWeight={minMaxStyle?.fontWeight ?? 400}
                  fill={minMaxStyle?.color ?? '#9ca3af'}
                >
                  {formatValue(bv)}
                </text>
              );
            })}

            <text
              x={cx}
              y={valueY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={valueFontSize}
              fontFamily={valueStyle?.fontFamily ?? 'var(--relay-font-family)'}
              fontWeight={valueStyle?.fontWeight ?? 700}
              fill={valueStyle?.color ?? valueColor}
            >
              {formatValue(renderValue!)}
              {unit && (
                <tspan
                  fontSize={unitFontSize}
                  fontFamily={unitStyle?.fontFamily ?? 'var(--relay-font-family)'}
                  fontWeight={unitStyle?.fontWeight ?? 400}
                  fill={unitStyle?.color ?? '#6b7280'}
                >
                  {' '}{unit}
                </tspan>
              )}
            </text>

            {label && (
              <text
                x={cx}
                y={labelY}
                textAnchor="middle"
                fontSize={labelFontSize}
                fontFamily={labelStyleR?.fontFamily ?? 'var(--relay-font-family)'}
                fontWeight={labelStyleR?.fontWeight ?? 400}
                fill={labelStyleR?.color ?? '#6b7280'}
              >
                {label}
              </text>
            )}

            {showLastUpdated && lastUpdated != null && (() => {
              const tsText = formatTimestamp(lastUpdated);
              const tsFontSize = s(lastUpdatedStyle?.fontSize ?? 9);
              const tsY = (label ? labelY + labelFontSize * 0.5 : valueY + valueFontSize * 0.5) + tsFontSize + s(4);
              return (
                <text
                  x={cx}
                  y={tsY}
                  textAnchor="middle"
                  fontSize={tsFontSize}
                  fontFamily={lastUpdatedStyle?.fontFamily ?? labelStyleR?.fontFamily ?? 'var(--relay-font-family)'}
                  fontWeight={lastUpdatedStyle?.fontWeight ?? 400}
                  fill={lastUpdatedStyle?.color ?? '#9ca3af'}
                >
                  {tsText}
                </text>
              );
            })()}
          </svg>
        );
      }}
    </ResponsiveContainer>
  );
}
