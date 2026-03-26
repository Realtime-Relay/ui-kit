import { useMemo, useState } from 'react';
import { scaleTime, extent } from 'd3';
import type { DataPoint, FontStyle, BackgroundStyle } from '../utils/types';
import { ResponsiveContainer } from '../charts/shared/ResponsiveContainer';
import { resolveFont } from '../utils/useResolvedStyles';
import { ChartSkeleton } from '../charts/shared/Skeleton';
import { createScaler, CHART_REFERENCE } from '../utils/scaler';
import { isValidTimestamp, type ComponentError } from '../utils/validation';

export interface StateEntry {
  state: string;
  start: number;
  end: number;
  color?: string;
}

export interface StateTimelineStyles {
  label?: FontStyle;
  tooltip?: FontStyle;
  background?: BackgroundStyle;
}

export interface StateTimelineProps {
  data: DataPoint[];
  stateMapper: (value: any) => string;
  metricKey?: string;
  stateColors?: Record<string, string>;
  formatTooltip?: (entry: StateEntry) => string;
  renderTooltip?: (entry: StateEntry) => React.ReactNode;
  styles?: StateTimelineStyles;
  showLoading?: boolean;
  onError?: (error: ComponentError) => void;
}

const DEFAULT_STATE_COLORS: Record<string, string> = {
  normal: '#22c55e',
  warning: '#f59e0b',
  critical: '#ef4444',
  error: '#ef4444',
  offline: '#6b7280',
  online: '#22c55e',
};

const FALLBACK_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#6366f1'];

function getStateColor(state: string, stateColors?: Record<string, string>, index?: number): string {
  if (stateColors?.[state]) return stateColors[state];
  if (DEFAULT_STATE_COLORS[state]) return DEFAULT_STATE_COLORS[state];
  return FALLBACK_COLORS[(index ?? 0) % FALLBACK_COLORS.length];
}

export function StateTimeline({
  data,
  stateMapper,
  metricKey: metricKeyProp,
  stateColors,
  formatTooltip,
  renderTooltip,
  styles,
  showLoading = true,
  onError,
}: StateTimelineProps) {
  const labelStyleR = resolveFont(styles?.label);
  const tooltipStyleR = resolveFont(styles?.tooltip);
  const [hoveredEntry, setHoveredEntry] = useState<{ entry: StateEntry; x: number; y: number } | null>(null);

  // Filter out data points with invalid timestamps
  const validData = useMemo(() => {
    return data.filter((point) => {
      if (!isValidTimestamp(point.timestamp)) {
        onError?.({ type: 'invalid_timestamp', message: `StateTimeline: invalid timestamp, received ${point.timestamp}`, rawValue: point.timestamp, component: 'StateTimeline' });
        return false;
      }
      return true;
    });
  }, [data, onError]);

  // Resolve metric key
  const metricKey = useMemo(() => {
    if (metricKeyProp) return metricKeyProp;
    if (validData.length === 0) return '';
    const firstPoint = validData[0];
    const keys = Object.keys(firstPoint).filter((k) => k !== 'timestamp');
    return keys[0] ?? '';
  }, [validData, metricKeyProp]);

  // Group consecutive data points into state bands
  const entries = useMemo(() => {
    if (!metricKey || validData.length === 0) return [];
    const sorted = [...validData].sort((a, b) => a.timestamp - b.timestamp);
    const result: StateEntry[] = [];
    let currentState: string | null = null;
    let start = 0;

    for (let i = 0; i < sorted.length; i++) {
      const state = stateMapper(sorted[i][metricKey]);
      if (state !== currentState) {
        if (currentState !== null) {
          result.push({ state: currentState, start, end: sorted[i].timestamp });
        }
        currentState = state;
        start = sorted[i].timestamp;
      }
    }
    // Close last entry
    if (currentState !== null) {
      const lastTs = sorted[sorted.length - 1].timestamp;
      result.push({ state: currentState, start, end: lastTs });
    }

    return result;
  }, [validData, metricKey, stateMapper]);

  // Unique states for color indexing
  const uniqueStates = useMemo(() => {
    const set = new Set(entries.map((e) => e.state));
    return Array.from(set);
  }, [entries]);

  if (showLoading && validData.length === 0) {
    return (
      <ResponsiveContainer>
        {({ width, height }) => <ChartSkeleton width={width} height={height} />}
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer
      style={{ backgroundColor: styles?.background?.color ?? 'transparent' }}
    >
      {({ width, height }) => {
        const s = createScaler(width, height, CHART_REFERENCE, 'width');
        const MARGIN = { top: s(8), right: s(12), bottom: s(24), left: s(12) };
        const BAR_HEIGHT = s(32);
        const chartWidth = width - MARGIN.left - MARGIN.right;
        if (chartWidth <= 0) return null;

        const [tMin, tMax] = extent(validData, (d) => d.timestamp) as [number, number];
        const xScale = scaleTime().domain([new Date(tMin), new Date(tMax)]).range([0, chartWidth]);

        return (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <svg width={width} height={height}>
              <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
                {entries.map((entry, i) => {
                  const x = xScale(new Date(entry.start));
                  const w = Math.max(1, xScale(new Date(entry.end)) - x);
                  const color = getStateColor(
                    entry.state,
                    stateColors,
                    uniqueStates.indexOf(entry.state)
                  );

                  return (
                    <rect
                      key={i}
                      x={x}
                      y={0}
                      width={w}
                      height={BAR_HEIGHT}
                      fill={color}
                      rx={0}
                      opacity={hoveredEntry?.entry === entry ? 1 : 0.8}
                      style={{ cursor: 'pointer', transition: 'opacity 100ms ease' }}
                      onMouseEnter={(e) =>
                        setHoveredEntry({ entry, x: e.clientX, y: e.clientY })
                      }
                      onMouseMove={(e) =>
                        setHoveredEntry({ entry, x: e.clientX, y: e.clientY })
                      }
                      onMouseLeave={() => setHoveredEntry(null)}
                    />
                  );
                })}

                {/* X axis time labels */}
                {xScale.ticks(6).map((tick, i) => (
                  <text
                    key={i}
                    x={xScale(tick)}
                    y={BAR_HEIGHT + s(16)}
                    textAnchor="middle"
                    fontSize={labelStyleR?.fontSize ?? s(11)}
                    fontFamily={labelStyleR?.fontFamily ?? 'var(--relay-font-family)'}
                    fill={labelStyleR?.color ?? '#9ca3af'}
                  >
                    {tick.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </text>
                ))}
              </g>
            </svg>

            {/* State legend */}
            <div
              style={{
                display: 'flex',
                gap: `${s(12)}px`,
                justifyContent: 'center',
                flexWrap: 'wrap',
                padding: `${s(4)}px 0`,
                fontFamily: labelStyleR?.fontFamily ?? 'var(--relay-font-family)',
                fontSize: labelStyleR?.fontSize ?? s(11),
              }}
            >
              {uniqueStates.map((state, i) => (
                <div key={state} style={{ display: 'flex', alignItems: 'center', gap: s(4) }}>
                  <span
                    style={{
                      width: s(10),
                      height: s(10),
                      borderRadius: s(2),
                      backgroundColor: getStateColor(state, stateColors, i),
                      display: 'inline-block',
                    }}
                  />
                  <span style={{ color: labelStyleR?.color ?? '#6b7280' }}>{state}</span>
                </div>
              ))}
            </div>

            {/* Tooltip */}
            {hoveredEntry && (
              <div
                style={{
                  position: 'fixed',
                  left: hoveredEntry.x + s(12),
                  top: hoveredEntry.y - s(10),
                  background: 'var(--relay-tooltip-bg, #1a1a1a)',
                  color: 'var(--relay-tooltip-text, #ffffff)',
                  borderRadius: 'var(--relay-tooltip-border-radius, 4px)',
                  padding: 'var(--relay-tooltip-padding, 8px 12px)',
                  fontSize: tooltipStyleR?.fontSize ?? s(12),
                  fontFamily: tooltipStyleR?.fontFamily ?? 'var(--relay-font-family)',
                  pointerEvents: 'none',
                  zIndex: 1000,
                  whiteSpace: 'nowrap',
                }}
              >
                {renderTooltip ? (
                  renderTooltip(hoveredEntry.entry)
                ) : formatTooltip ? (
                  formatTooltip(hoveredEntry.entry)
                ) : (
                  <>
                    <div style={{ fontWeight: 600, marginBottom: s(2) }}>{hoveredEntry.entry.state}</div>
                    <div style={{ opacity: 0.7 }}>
                      {new Date(hoveredEntry.entry.start).toLocaleTimeString()} –{' '}
                      {new Date(hoveredEntry.entry.end).toLocaleTimeString()}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      }}
    </ResponsiveContainer>
  );
}
