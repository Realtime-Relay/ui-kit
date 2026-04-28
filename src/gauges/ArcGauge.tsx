import { useRef } from "react";
import type {
  AlertZone,
  FontStyle,
  BackgroundStyle,
  RelayDataPoint,
} from "../utils/types";
import {
  defaultFormatValue,
  defaultFormatTimestamp,
} from "../utils/formatters";
import { resolveFont } from "../utils/useResolvedStyles";
import {
  useZoneTransition,
  type ZoneTransition,
} from "../utils/useZoneTransition";
import { createScaler, GAUGE_REFERENCE } from "../utils/scaler";
import {
  validateRange,
  validateAlertZones,
  validateValue,
  type ComponentError,
} from "../utils/validation";
import { ResponsiveContainer } from "../charts/shared/ResponsiveContainer";
import { CardSkeleton } from "../charts/shared/Skeleton";
import {
  buildArcPath,
  arcLength,
  buildZoneDashes,
  buildValueDash,
  getZoneColor,
  getArcEndpoints,
  getValuePosition,
  getZoneBoundaries,
  clampArcAngle,
} from "./shared";

export interface ArcGaugeStyles {
  value?: FontStyle;
  label?: FontStyle;
  unit?: FontStyle;
  minMax?: FontStyle;
  lastUpdated?: FontStyle;
  background?: BackgroundStyle;
  arcThickness?: number;
  arcAngle?: number;
  width?: number | string;
  height?: number | string;
}

export interface ArcGaugeProps {
  /** Accept full hook result from useRelayLatest. */
  data: RelayDataPoint;
  min?: number;
  max?: number;
  formatValue?: (value: number) => string;
  alertZones?: AlertZone[];
  label?: string;
  unit?: string;
  styles?: ArcGaugeStyles;
  /** Color used for the arc fill when no alert zone matches. Default: '#3b82f6' (blue). */
  defaultColor?: string;
  showZoneValues?: boolean;
  showLastUpdated?: boolean;
  /** Custom formatter for the timestamp. Receives Date | number, must return string. Default: dd MMM yyyy HH:MM:SS.sss +TZ */
  formatTimestamp?: (ts: Date | number) => string;
  showLoading?: boolean;
  onZoneChange?: (transition: ZoneTransition) => void;
  onError?: (error: ComponentError) => void;
}

export function ArcGauge({
  data,
  min = 0,
  max = 100,
  formatValue = defaultFormatValue,
  alertZones = [],
  label,
  unit,
  styles,
  defaultColor = "#3b82f6",
  showZoneValues = false,
  showLastUpdated = false,
  formatTimestamp = defaultFormatTimestamp,
  showLoading = true,
  onZoneChange,
  onError,
}: ArcGaugeProps) {
  const resolvedValue = data.value as number;
  const resolvedLastUpdated = data.timestamp;

  validateRange(min, max, "ArcGauge");
  validateAlertZones(alertZones, "ArcGauge");

  const lastValidRef = useRef<number | null>(null);
  const validatedValue = validateValue(resolvedValue, "ArcGauge", onError);
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
      style={{ backgroundColor: styles?.background?.color ?? "transparent" }}
    >
      {({ width, height }) => {
        const s = createScaler(width, height, GAUGE_REFERENCE);

        const minMaxFontSize = s(minMaxStyle?.fontSize ?? 10);
        const zoneValueExtra =
          showZoneValues && alertZones.length > 0 ? minMaxFontSize + s(4) : 0;
        const padding = s(20) + zoneValueExtra;
        const arcThickness = s(styles?.arcThickness ?? 20);
        const valueFontSize = s(valueStyle?.fontSize ?? 26);
        const labelFontSize = s(labelStyleR?.fontSize ?? 12);
        const unitFontSize = s(unitStyle?.fontSize ?? 13);

        const sweepRad = (sweepDegrees * Math.PI) / 180;
        const halfSweep = sweepRad / 2;
        const arcBottomFraction =
          sweepDegrees <= 180 ? 0 : Math.sin(halfSweep - Math.PI / 2);

        const textSpace = sweepDegrees <= 180 ? s(50) : s(20);
        const totalVertical = padding * 2 + textSpace;
        const maxRadius = Math.min(
          (width - padding * 2) / 2,
          (height - totalVertical) / (1 + arcBottomFraction),
        );
        const radius = Math.max(s(40), maxRadius);
        const cx = width / 2;
        const cy = padding + radius;

        const { path: arcPathD } = buildArcPath(cx, cy, radius, sweepDegrees);
        const totalLen = arcLength(radius, sweepDegrees);
        const zoneDashes = buildZoneDashes(alertZones, min, max, totalLen);
        const clampedValue = Math.min(max, Math.max(min, renderValue!));
        const valueDash = buildValueDash(clampedValue, min, max, totalLen);
        const valueColor =
          alertZones.length > 0
            ? getZoneColor(clampedValue, alertZones, defaultColor)
            : defaultColor;

        const endpoints = getArcEndpoints(
          cx,
          cy,
          radius + arcThickness / 2 + s(12),
          sweepDegrees,
        );

        // Value + label stack centered inside the arc
        const totalTextHeight = label
          ? valueFontSize + labelFontSize + s(4)
          : valueFontSize;
        const valueY = cy - totalTextHeight / 2 + valueFontSize / 2;
        const labelYPos =
          valueY + valueFontSize * 0.5 + labelFontSize * 0.5 + s(4);

        return (
          <svg
            width={width}
            height={height}
            shapeRendering="geometricPrecision"
            role="meter"
            aria-valuenow={renderValue!}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-label={label ?? "Gauge"}
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
                opacity={0.25}
              />
            ))}

            <path
              d={arcPathD}
              fill="none"
              stroke={valueColor}
              strokeWidth={arcThickness}
              strokeLinecap="butt"
              strokeDasharray={valueDash.dasharray}
              strokeDashoffset={valueDash.dashoffset}
            />

            <text
              x={cx}
              y={valueY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={valueFontSize}
              fontFamily={valueStyle?.fontFamily ?? "var(--relay-font-family)"}
              fontWeight={valueStyle?.fontWeight ?? 700}
              fill={valueStyle?.color ?? valueColor}
            >
              {formatValue(renderValue!)}
              {unit && (
                <tspan
                  fontSize={unitFontSize}
                  fontFamily={
                    unitStyle?.fontFamily ?? "var(--relay-font-family)"
                  }
                  fontWeight={unitStyle?.fontWeight ?? 400}
                  fill={unitStyle?.color ?? "#6b7280"}
                >
                  {" "}
                  {unit}
                </tspan>
              )}
            </text>

            {label && (
              <text
                x={cx}
                y={labelYPos}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={labelFontSize}
                fontFamily={
                  labelStyleR?.fontFamily ?? "var(--relay-font-family)"
                }
                fontWeight={labelStyleR?.fontWeight ?? 400}
                fill={labelStyleR?.color ?? "#6b7280"}
              >
                {label}
              </text>
            )}

            {/* Min label */}
            <text
              x={endpoints.startX}
              y={endpoints.startY}
              textAnchor="middle"
              fontSize={s(minMaxStyle?.fontSize ?? 10)}
              fontFamily={
                minMaxStyle?.fontFamily ??
                labelStyleR?.fontFamily ??
                "var(--relay-font-family)"
              }
              fontWeight={minMaxStyle?.fontWeight ?? 400}
              fill={minMaxStyle?.color ?? "#9ca3af"}
            >
              {formatValue(min)}
            </text>
            {/* Max label */}
            <text
              x={endpoints.endX}
              y={endpoints.endY}
              textAnchor="middle"
              fontSize={s(minMaxStyle?.fontSize ?? 10)}
              fontFamily={
                minMaxStyle?.fontFamily ??
                labelStyleR?.fontFamily ??
                "var(--relay-font-family)"
              }
              fontWeight={minMaxStyle?.fontWeight ?? 400}
              fill={minMaxStyle?.color ?? "#9ca3af"}
            >
              {formatValue(max)}
            </text>

            {/* Zone boundary values */}
            {showZoneValues &&
              alertZones.length > 0 &&
              getZoneBoundaries(alertZones, min, max).map((bv) => {
                const pos = getValuePosition(
                  cx,
                  cy,
                  radius + arcThickness / 2 + s(12),
                  bv,
                  min,
                  max,
                  sweepDegrees,
                );
                return (
                  <text
                    key={`zv-${bv}`}
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    fontSize={s(minMaxStyle?.fontSize ?? 10)}
                    fontFamily={
                      minMaxStyle?.fontFamily ??
                      labelStyleR?.fontFamily ??
                      "var(--relay-font-family)"
                    }
                    fontWeight={minMaxStyle?.fontWeight ?? 400}
                    fill={minMaxStyle?.color ?? "#9ca3af"}
                  >
                    {formatValue(bv)}
                  </text>
                );
              })}

            {showLastUpdated &&
              resolvedLastUpdated != null &&
              (() => {
                const tsText = formatTimestamp(resolvedLastUpdated);
                const tsFontSize = s(lastUpdatedStyle?.fontSize ?? 9);
                const tsY =
                  (label
                    ? labelYPos + labelFontSize * 0.5
                    : valueY + valueFontSize * 0.5) +
                  tsFontSize +
                  s(4);
                return (
                  <text
                    x={cx}
                    y={tsY}
                    textAnchor="middle"
                    fontSize={tsFontSize}
                    fontFamily={
                      lastUpdatedStyle?.fontFamily ??
                      labelStyleR?.fontFamily ??
                      "var(--relay-font-family)"
                    }
                    fontWeight={lastUpdatedStyle?.fontWeight ?? 400}
                    fill={lastUpdatedStyle?.color ?? "#9ca3af"}
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
