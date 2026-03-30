import { useRef, useState, useEffect } from "react";
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
import { createScaler } from "../utils/scaler";
import { validateAlertZones, type ComponentError } from "../utils/validation";
import {
  useZoneTransition,
  type ZoneTransition,
} from "../utils/useZoneTransition";

const STAT_REFERENCE = 300;

export interface StatCardStyles {
  value?: FontStyle;
  label?: FontStyle;
  lastUpdated?: FontStyle;
  background?: BackgroundStyle;
  width?: string | number;
  height?: string | number;
}

export interface StatCardProps {
  /** Accept full hook result from useRelayLatest. */
  data: RelayDataPoint;
  numericValue?: number;
  label?: string;
  formatValue?: (value: any) => string;
  alertZones?: AlertZone[];
  onZoneChange?: (transition: ZoneTransition) => void;
  borderRadius?: number | "rounded" | "sharp";
  borderColor?: string;
  borderThickness?: number;
  styles?: StatCardStyles;
  showLastUpdated?: boolean;
  formatTimestamp?: (ts: Date | number) => string;
  lastUpdatedMargin?: number;
  showLoading?: boolean;
  onError?: (error: ComponentError) => void;
}

function resolveBorderRadius(value?: number | "rounded" | "sharp"): string {
  if (value === "sharp") return "0";
  if (value === "rounded") return "var(--relay-border-radius, 8px)";
  if (typeof value === "number") return `${value}px`;
  return "var(--relay-border-radius, 8px)";
}

function defaultDisplayFormat(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return defaultFormatValue(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getZoneColor(value: number, zones: AlertZone[]): string | null {
  for (const zone of zones) {
    if (value >= zone.min && value <= zone.max) return zone.color;
  }
  return null;
}

function toCss(val: string | number | undefined): string | undefined {
  if (val === undefined) return undefined;
  return typeof val === "number" ? `${val}px` : val;
}

export function StatCard({
  data,
  numericValue,
  label,
  formatValue,
  alertZones = [],
  onZoneChange,
  borderRadius,
  borderColor,
  borderThickness,
  styles,
  showLastUpdated = false,
  formatTimestamp = defaultFormatTimestamp,
  lastUpdatedMargin = 8,
  showLoading = true,
  onError,
}: StatCardProps) {
  const resolvedValue = data.value;
  const resolvedLastUpdated = data.timestamp;

  // Validate alert zones (hard error)
  if (alertZones.length > 0) {
    validateAlertZones(alertZones, "StatCard");
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const lastValidRef = useRef<any>(null);
  const [dims, setDims] = useState({
    width: STAT_REFERENCE,
    height: STAT_REFERENCE,
  });

  // Track last valid value
  if (resolvedValue !== null && resolvedValue !== undefined) {
    lastValidRef.current = resolvedValue;
  } else {
    // null/undefined — fire onError
    onError?.({
      type: "invalid_value",
      message: `StatCard: value is ${resolvedValue === null ? "null" : "undefined"}.`,
      rawValue: resolvedValue,
      component: "StatCard",
    });
  }

  const renderValue =
    resolvedValue !== null && resolvedValue !== undefined
      ? resolvedValue
      : lastValidRef.current;

  // Resolve the numeric value for zone evaluation
  const zoneNumeric =
    numericValue ?? (typeof renderValue === "number" ? renderValue : null);

  useZoneTransition(
    zoneNumeric ?? 0,
    alertZones,
    zoneNumeric !== null ? onZoneChange : undefined,
  );

  // ResizeObserver for proportional scaling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const w = Math.round(entry.contentRect.width);
        const h = Math.round(entry.contentRect.height);
        setDims((prev) =>
          prev.width === w && prev.height === h
            ? prev
            : { width: w, height: h },
        );
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const s = createScaler(dims.width, dims.height, STAT_REFERENCE, "width");

  // Resolve font styles
  const valueStyleR = resolveFont(styles?.value);
  const labelStyleR = resolveFont(styles?.label);
  const lastUpdatedStyleR = resolveFont(styles?.lastUpdated);

  // Zone color
  const zoneColor =
    zoneNumeric !== null && alertZones.length > 0
      ? getZoneColor(zoneNumeric, alertZones)
      : null;

  // Format display value
  const displayValue =
    renderValue !== null && renderValue !== undefined
      ? formatValue
        ? formatValue(renderValue)
        : defaultDisplayFormat(renderValue)
      : "";

  // Container sizing
  const widthCss = toCss(styles?.width) ?? "100%";
  const heightCss = toCss(styles?.height) ?? "100%";

  // Loading skeleton
  if (showLoading && renderValue === null) {
    return (
      <div
        ref={containerRef}
        style={{
          width: widthCss,
          height: heightCss,
          borderRadius: resolveBorderRadius(borderRadius),
          background: `linear-gradient(90deg,
            var(--relay-skeleton-base, #e5e7eb) 25%,
            var(--relay-skeleton-shine, #f3f4f6) 50%,
            var(--relay-skeleton-base, #e5e7eb) 75%)`,
          backgroundSize: "200% 100%",
          animation: "relay-skeleton-shimmer 1.5s ease-in-out infinite",
        }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: widthCss,
        height: heightCss,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: styles?.background?.color ?? "transparent",
        borderRadius: resolveBorderRadius(borderRadius),
        border:
          borderColor || borderThickness
            ? `${borderThickness ?? 1}px solid ${borderColor ?? "var(--relay-border-color, #e0e0e0)"}`
            : undefined,
        padding: s(16),
        boxSizing: "border-box",
      }}
    >
      {label && (
        <div
          style={{
            fontFamily: labelStyleR?.fontFamily ?? "var(--relay-font-family)",
            fontSize: labelStyleR?.fontSize ?? s(13),
            fontWeight: labelStyleR?.fontWeight ?? 400,
            color: labelStyleR?.color ?? zoneColor ?? "#6b7280",
            marginBottom: s(4),
          }}
        >
          {label}
        </div>
      )}
      <div
        style={{
          fontFamily: valueStyleR?.fontFamily ?? "var(--relay-font-family)",
          fontSize: valueStyleR?.fontSize ?? s(32),
          fontWeight: valueStyleR?.fontWeight ?? 700,
          color: valueStyleR?.color ?? zoneColor ?? "currentColor",
          lineHeight: 1.2,
          textAlign: "center",
          wordBreak: "break-word",
          overflowWrap: "anywhere",
          maxWidth: "100%",
        }}
      >
        {displayValue}
      </div>
      {showLastUpdated && resolvedLastUpdated != null && (
        <div
          style={{
            fontFamily:
              lastUpdatedStyleR?.fontFamily ?? "var(--relay-font-family)",
            fontSize: lastUpdatedStyleR?.fontSize ?? s(11),
            fontWeight: lastUpdatedStyleR?.fontWeight ?? 400,
            color: lastUpdatedStyleR?.color ?? zoneColor ?? "#9ca3af",
            marginTop: s(lastUpdatedMargin),
          }}
        >
          {formatTimestamp(resolvedLastUpdated)}
        </div>
      )}
    </div>
  );
}
