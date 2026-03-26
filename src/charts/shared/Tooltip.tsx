import { type ReactNode } from 'react';
import type { DataPoint, FontStyle } from '../../utils/types';
import { defaultFormatValue } from '../../utils/formatters';

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
}

const TOOLTIP_OFFSET = 12;
const TOOLTIP_MIN_WIDTH = 120;

export function Tooltip({
  data,
  containerWidth,
  containerHeight,
  formatValue = defaultFormatValue,
  renderTooltip,
  style,
}: TooltipProps) {
  if (!data) return null;

  // Custom tooltip renderer
  if (renderTooltip) {
    const left = data.x + TOOLTIP_OFFSET + TOOLTIP_MIN_WIDTH > containerWidth
      ? data.x - TOOLTIP_OFFSET - TOOLTIP_MIN_WIDTH
      : data.x + TOOLTIP_OFFSET;
    const top = Math.max(0, Math.min(data.y - 20, containerHeight - 60));

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

  const left = data.x + TOOLTIP_OFFSET + TOOLTIP_MIN_WIDTH > containerWidth
    ? data.x - TOOLTIP_OFFSET - TOOLTIP_MIN_WIDTH
    : data.x + TOOLTIP_OFFSET;
  const top = Math.max(0, Math.min(data.y - 20, containerHeight - 60));

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
        fontSize: style?.fontSize ?? 12,
        fontFamily: style?.fontFamily ?? 'var(--relay-font-family)',
        fontWeight: style?.fontWeight ?? 'var(--relay-font-weight-normal)',
        pointerEvents: 'none',
        zIndex: 10,
        whiteSpace: 'nowrap',
        minWidth: TOOLTIP_MIN_WIDTH,
      }}
    >
      <div style={{ marginBottom: 4, opacity: 0.7 }}>
        {dateStr} {timeStr}
      </div>
      {data.metrics.map((m) => (
        <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span
            style={{
              width: 8,
              height: 8,
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
