import { type ReactNode } from 'react';
import type { DataPoint, FontStyle } from '../../utils/types';
import { defaultFormatValue } from '../../utils/formatters';

const identity = (px: number) => px;

export interface TooltipData {
  point: DataPoint;
  metrics: { key: string; label: string; color: string; value: number }[];
  x: number;
  y: number;
}

interface TooltipProps {
  data: TooltipData | null;
  containerWidth: number;
  containerHeight: number;
  formatValue?: (value: number) => string;
  renderTooltip?: (point: DataPoint) => ReactNode;
  style?: FontStyle;
  /** Proportional scaler created by the parent chart. Defaults to identity. */
  s?: (px: number) => number;
}

const TOOLTIP_OFFSET_REF = 12;
const TOOLTIP_MIN_WIDTH_REF = 120;

export function Tooltip({
  data,
  containerWidth,
  containerHeight,
  formatValue = defaultFormatValue,
  renderTooltip,
  style,
  s = identity,
}: TooltipProps) {
  if (!data) return null;

  const tooltipOffset = s(TOOLTIP_OFFSET_REF);
  const tooltipMinWidth = s(TOOLTIP_MIN_WIDTH_REF);

  // Custom tooltip renderer
  if (renderTooltip) {
    const left = data.x + tooltipOffset + tooltipMinWidth > containerWidth
      ? data.x - tooltipOffset - tooltipMinWidth
      : data.x + tooltipOffset;
    const top = Math.max(0, Math.min(data.y - s(20), containerHeight - s(60)));

    return (
      <div
        style={{
          position: 'absolute',
          left,
          top,
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        {renderTooltip(data.point)}
      </div>
    );
  }

  // Default tooltip
  const timestamp = new Date(data.point.timestamp);
  const timeStr = timestamp.toLocaleTimeString();
  const dateStr = timestamp.toLocaleDateString();

  const left = data.x + tooltipOffset + tooltipMinWidth > containerWidth
    ? data.x - tooltipOffset - tooltipMinWidth
    : data.x + tooltipOffset;
  const top = Math.max(0, Math.min(data.y - s(20), containerHeight - s(60)));

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        background: 'var(--relay-tooltip-bg, #1a1a1a)',
        color: 'var(--relay-tooltip-text, #ffffff)',
        borderRadius: 'var(--relay-tooltip-border-radius, 4px)',
        padding: 'var(--relay-tooltip-padding, 8px 12px)',
        fontSize: style?.fontSize ?? s(12),
        fontFamily: style?.fontFamily ?? 'var(--relay-font-family)',
        fontWeight: style?.fontWeight ?? 'var(--relay-font-weight-normal)',
        pointerEvents: 'none',
        zIndex: 10,
        whiteSpace: 'nowrap',
        minWidth: tooltipMinWidth,
      }}
    >
      <div style={{ marginBottom: s(4), opacity: 0.7 }}>
        {dateStr} {timeStr}
      </div>
      {data.metrics.map((m) => (
        <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: s(6), marginTop: s(2) }}>
          <span
            style={{
              width: s(8),
              height: s(8),
              borderRadius: '50%',
              backgroundColor: m.color,
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span style={{ opacity: 0.8 }}>{m.label}:</span>
          <span style={{ fontWeight: 600 }}>{formatValue(m.value)}</span>
        </div>
      ))}
    </div>
  );
}
