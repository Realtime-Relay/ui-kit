import { useMemo, useState } from 'react';
import { scaleTime, extent } from 'd3';
import type { DataPoint, FontStyle, BackgroundStyle } from '../utils/types';
import { ResponsiveContainer } from '../charts/shared/ResponsiveContainer';
import { ChartSkeleton } from '../charts/shared/Skeleton';

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

const MARGIN = { top: 8, right: 12, bottom: 24, left: 12 };
const BAR_HEIGHT = 32;

export function StateTimeline({
  data,
  stateMapper,
  metricKey: metricKeyProp,
  stateColors,
  formatTooltip,
  renderTooltip,
  styles,
  showLoading = true,
}: StateTimelineProps) {
  const [hoveredEntry, setHoveredEntry] = useState<{ entry: StateEntry; x: number; y: number } | null>(null);

  // Resolve metric key
  const metricKey = useMemo(() => {
    if (metricKeyProp) return metricKeyProp;
    if (data.length === 0) return '';
    const firstPoint = data[0];
    const keys = Object.keys(firstPoint).filter((k) => k !== 'timestamp');
    return keys[0] ?? '';
  }, [data, metricKeyProp]);

  // Group consecutive data points into state bands
  const entries = useMemo(() => {
    if (!metricKey || data.length === 0) return [];
    const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
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
  }, [data, metricKey, stateMapper]);

  // Unique states for color indexing
  const uniqueStates = useMemo(() => {
    const set = new Set(entries.map((e) => e.state));
    return Array.from(set);
  }, [entries]);

  if (showLoading && data.length === 0) {
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
        const chartWidth = width - MARGIN.left - MARGIN.right;
        if (chartWidth <= 0) return null;

        const [tMin, tMax] = extent(data, (d) => d.timestamp) as [number, number];
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
                    y={BAR_HEIGHT + 16}
                    textAnchor="middle"
                    fontSize={styles?.label?.fontSize ?? 11}
                    fontFamily={styles?.label?.fontFamily ?? 'var(--relay-font-family)'}
                    fill={styles?.label?.color ?? '#9ca3af'}
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
                gap: '12px',
                justifyContent: 'center',
                flexWrap: 'wrap',
                padding: '4px 0',
                fontFamily: styles?.label?.fontFamily ?? 'var(--relay-font-family)',
                fontSize: styles?.label?.fontSize ?? 11,
              }}
            >
              {uniqueStates.map((state, i) => (
                <div key={state} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      backgroundColor: getStateColor(state, stateColors, i),
                      display: 'inline-block',
                    }}
                  />
                  <span style={{ color: styles?.label?.color ?? '#6b7280' }}>{state}</span>
                </div>
              ))}
            </div>

            {/* Tooltip */}
            {hoveredEntry && (
              <div
                style={{
                  position: 'fixed',
                  left: hoveredEntry.x + 12,
                  top: hoveredEntry.y - 10,
                  background: 'var(--relay-tooltip-bg, #1a1a1a)',
                  color: 'var(--relay-tooltip-text, #ffffff)',
                  borderRadius: 'var(--relay-tooltip-border-radius, 4px)',
                  padding: 'var(--relay-tooltip-padding, 8px 12px)',
                  fontSize: styles?.tooltip?.fontSize ?? 12,
                  fontFamily: styles?.tooltip?.fontFamily ?? 'var(--relay-font-family)',
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
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{hoveredEntry.entry.state}</div>
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
