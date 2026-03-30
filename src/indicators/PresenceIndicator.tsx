import { useRef, useState, useEffect } from "react";
import { createScaler, CHART_REFERENCE } from "../utils/scaler";

export interface PresenceIndicatorProps {
  online: boolean;
  onlineColor?: string;
  offlineColor?: string;
  size?: number;
}

export function PresenceIndicator({
  online,
  onlineColor,
  offlineColor,
  size,
}: PresenceIndicatorProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState(CHART_REFERENCE);

  useEffect(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setMeasuredWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const s = createScaler(measuredWidth, 0, CHART_REFERENCE, "width");

  const isOnline = typeof online === "boolean" ? online : false;

  const color = isOnline
    ? (onlineColor ?? "var(--relay-presence-online, #22c55e)")
    : (offlineColor ?? "var(--relay-presence-offline, #ef4444)");

  const dotSize = size ?? 12;

  return (
    <span
      ref={containerRef}
      role="status"
      aria-label={isOnline ? "Online" : "Offline"}
      style={{
        display: "inline-block",
        width: dotSize,
        height: dotSize,
        borderRadius: "50%",
        backgroundColor: color,
        boxShadow: isOnline ? `0 0 0 ${s(3)}px ${color}33` : undefined,
        transition: "background-color 200ms ease, box-shadow 200ms ease",
        flexShrink: 0,
      }}
    />
  );
}
