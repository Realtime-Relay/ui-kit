import { useMemo, useState, useCallback } from 'react';
import { scaleTime, extent } from 'd3';
import type { DataPoint, FontStyle, BackgroundStyle } from '../utils/types';
import { ResponsiveContainer } from '../charts/shared/ResponsiveContainer';
import { resolveFont } from '../utils/useResolvedStyles';
import { ChartSkeleton } from '../charts/shared/Skeleton';
import { createScaler, CHART_REFERENCE } from '../utils/scaler';
import { isValidTimestamp, type ComponentError } from '../utils/validation';
import { getStateColor, groupStateEntries } from './stateUtils';
import type { StateEntry } from './stateUtils';

export interface StateTimelineStyles {
  label?: FontStyle;
  rowLabel?: FontStyle;
  tooltip?: FontStyle;
  background?: BackgroundStyle;
  emptyRowColor?: string;
}

export interface StateTimelineProps {
  data: Record<string, DataPoint[]>;
  stateMapper: (value: any) => string;
  metricKey?: string;
  stateColors?: Record<string, string>;
  formatTooltip?: (entry: StateEntry, deviceName: string) => string;
  renderTooltip?: (entry: StateEntry, deviceName: string) => React.ReactNode;
  styles?: StateTimelineStyles;
  rowHeight?: number;
  labelAlign?: 'left' | 'right';
  showLoading?: boolean;
  onError?: (error: ComponentError) => void;
}

export function StateTimeline({
  data,
  stateMapper,
  metricKey: metricKeyProp,
  stateColors,
  formatTooltip,
  renderTooltip,
  styles,
  rowHeight: rowHeightProp,
  labelAlign = 'left',
  showLoading = true,
  onError,
}: StateTimelineProps) {
  const labelStyleR = resolveFont(styles?.label);
  const rowLabelStyleR = resolveFont(styles?.rowLabel);
  const tooltipStyleR = resolveFont(styles?.tooltip);
  const [hoveredEntry, setHoveredEntry] = useState<{
    entry: StateEntry;
    deviceName: string;
    x: number;
    y: number;
  } | null>(null);

  const deviceNames = useMemo(() => Object.keys(data), [data]);

  // Measure max label width using a callback ref — fires when SVG mounts/updates
  const [measuredLabelWidth, setMeasuredLabelWidth] = useState<number | null>(null);
  const svgRef = useCallback((svg: SVGSVGElement | null) => {
    if (!svg) return;
    const texts = svg.querySelectorAll<SVGTextElement>('[data-label]');
    let max = 0;
    texts.forEach((t) => {
      const w = t.getComputedTextLength();
      if (w > max) max = w;
    });
    const newWidth = max > 0 ? Math.ceil(max) + 16 : null;
    setMeasuredLabelWidth((prev) => {
      if (prev === newWidth) return prev;
      return newWidth;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceNames, rowLabelStyleR?.fontSize, rowLabelStyleR?.fontFamily, rowLabelStyleR?.fontWeight]);

  // Validate and filter data per device
  const validDataMap = useMemo(() => {
    const result: Record<string, DataPoint[]> = {};
    for (const name of deviceNames) {
      result[name] = (data[name] ?? []).filter((point) => {
        if (!isValidTimestamp(point.timestamp)) {
          onError?.({
            type: 'invalid_timestamp',
            message: `StateTimeline [${name}]: invalid timestamp, received ${point.timestamp}`,
            rawValue: point.timestamp,
            component: 'StateTimeline',
          });
          return false;
        }
        return true;
      });
    }
    return result;
  }, [data, deviceNames, onError]);

  // Resolve metric key from first non-empty device
  const metricKey = useMemo(() => {
    if (metricKeyProp) return metricKeyProp;
    for (const name of deviceNames) {
      const points = validDataMap[name];
      if (points && points.length > 0) {
        const keys = Object.keys(points[0]).filter((k) => k !== 'timestamp');
        if (keys.length > 0) return keys[0];
      }
    }
    return '';
  }, [validDataMap, deviceNames, metricKeyProp]);

  // Group state entries per device
  const entriesMap = useMemo(() => {
    const result: Record<string, StateEntry[]> = {};
    for (const name of deviceNames) {
      result[name] = groupStateEntries(validDataMap[name] ?? [], metricKey, stateMapper);
    }
    return result;
  }, [validDataMap, deviceNames, metricKey, stateMapper]);

  // Global time domain across all devices
  const globalExtent = useMemo(() => {
    const allTimestamps: number[] = [];
    for (const name of deviceNames) {
      for (const p of validDataMap[name] ?? []) {
        allTimestamps.push(p.timestamp);
      }
    }
    if (allTimestamps.length === 0) return null;
    return extent(allTimestamps) as [number, number];
  }, [validDataMap, deviceNames]);

  // Unique states across all devices for consistent color indexing
  const uniqueStates = useMemo(() => {
    const set = new Set<string>();
    for (const name of deviceNames) {
      for (const e of entriesMap[name] ?? []) {
        set.add(e.state);
      }
    }
    return Array.from(set);
  }, [entriesMap, deviceNames]);

  // No devices at all — show skeleton
  if (deviceNames.length === 0) {
    if (!showLoading) return null;
    return (
      <ResponsiveContainer>
        {({ width, height }) => <ChartSkeleton width={width} height={height} />}
      </ResponsiveContainer>
    );
  }

  const rowCount = deviceNames.length;

  return (
    <ResponsiveContainer
      style={{ backgroundColor: styles?.background?.color ?? 'transparent' }}
    >
      {({ width }) => {
        const rawS = createScaler(width, 100, CHART_REFERENCE, 'width');
        const s = (px: number) => rawS(px) > px ? px : rawS(px);

        const BAR_HEIGHT = rowHeightProp ?? 28;
        const ROW_GAP = 6;
        const LABEL_WIDTH = measuredLabelWidth ?? 120;
        const LABEL_GAP = 8;
        const X_AXIS_HEIGHT = 20;
        const LEGEND_HEIGHT = 24;
        const MARGIN = { top: 8, right: 12, bottom: 8, left: 12 };

        const chartWidth = width - MARGIN.left - LABEL_WIDTH - LABEL_GAP - MARGIN.right;
        if (chartWidth <= 0) return null;

        const labelsOnRight = labelAlign === 'right';
        const barsX = labelsOnRight ? MARGIN.left : MARGIN.left + LABEL_WIDTH + LABEL_GAP;
        const labelX = labelsOnRight ? width - MARGIN.right : MARGIN.left;
        const emptyRowColor = styles?.emptyRowColor ?? '#f3f4f6';

        const hasData = globalExtent !== null;
        const totalHeight = MARGIN.top + rowCount * BAR_HEIGHT + (rowCount - 1) * ROW_GAP + X_AXIS_HEIGHT + (hasData ? LEGEND_HEIGHT : 0) + MARGIN.bottom;

        const xScale = hasData
          ? scaleTime().domain([new Date(globalExtent[0]), new Date(globalExtent[1])]).range([0, chartWidth])
          : null;
        const spansDays = hasData
          ? new Date(globalExtent[0]).toDateString() !== new Date(globalExtent[1]).toDateString()
          : false;

        const rowLabelFontSize = rowLabelStyleR?.fontSize ?? 12;
        const axisLabelFontSize = labelStyleR?.fontSize ?? 11;

        return (
          <div style={{ position: 'relative', width: '100%' }}>
            <svg ref={svgRef} width={width} height={totalHeight}>
              {deviceNames.map((name, rowIdx) => {
                const yOffset = MARGIN.top + rowIdx * (BAR_HEIGHT + ROW_GAP);
                const entries = entriesMap[name] ?? [];

                return (
                  <g key={name}>
                    {/* Row label */}
                    <text
                      data-label
                      x={labelX}
                      y={yOffset + BAR_HEIGHT / 2}
                      dominantBaseline="central"
                      textAnchor={labelsOnRight ? 'end' : 'start'}
                      fontSize={rowLabelFontSize}
                      fontFamily={rowLabelStyleR?.fontFamily ?? 'var(--relay-font-family)'}
                      fontWeight={rowLabelStyleR?.fontWeight ?? 500}
                      fill={rowLabelStyleR?.color ?? '#374151'}
                    >
                      {name}
                    </text>

                    {/* State bars */}
                    <g transform={`translate(${barsX},${yOffset})`}>
                      {/* Empty row background */}
                      {entries.length === 0 && (
                        <rect x={0} y={0} width={chartWidth} height={BAR_HEIGHT} fill={emptyRowColor} rx={2} />
                      )}
                      {xScale && entries.map((entry, i) => {
                        const x = xScale(new Date(entry.start));
                        const w = Math.max(1, xScale(new Date(entry.end)) - x);
                        const color = getStateColor(
                          entry.state,
                          stateColors,
                          uniqueStates.indexOf(entry.state),
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
                              setHoveredEntry({ entry, deviceName: name, x: e.clientX, y: e.clientY })
                            }
                            onMouseMove={(e) =>
                              setHoveredEntry({ entry, deviceName: name, x: e.clientX, y: e.clientY })
                            }
                            onMouseLeave={() => setHoveredEntry(null)}
                          />
                        );
                      })}
                    </g>
                  </g>
                );
              })}

              {/* Shared X axis */}
              {xScale && (
                <g transform={`translate(${barsX},${MARGIN.top + rowCount * BAR_HEIGHT + (rowCount - 1) * ROW_GAP + 4})`}>
                  {(() => {
                    const labelWidth = axisLabelFontSize * 7.5;
                    const maxTicks = Math.max(2, Math.floor(chartWidth / (labelWidth + axisLabelFontSize * 2)));
                    const tickCount = Math.min(maxTicks, 6);
                    return xScale.ticks(tickCount).map((tick, i) => (
                      <text
                        key={i}
                        x={xScale(tick)}
                        y={axisLabelFontSize + 2}
                        textAnchor="middle"
                        fontSize={axisLabelFontSize}
                        fontFamily={labelStyleR?.fontFamily ?? 'var(--relay-font-family)'}
                        fill={labelStyleR?.color ?? '#9ca3af'}
                      >
                        {spansDays
                          ? tick.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + tick.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : tick.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </text>
                    ));
                  })()}
                </g>
              )}
              {/* State legend */}
              {uniqueStates.length > 0 && <foreignObject
                x={0}
                y={MARGIN.top + rowCount * BAR_HEIGHT + (rowCount - 1) * ROW_GAP + X_AXIS_HEIGHT}
                width={width}
                height={LEGEND_HEIGHT}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    padding: '4px 0',
                    fontFamily: labelStyleR?.fontFamily ?? 'var(--relay-font-family)',
                    fontSize: labelStyleR?.fontSize ?? 11,
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
                      <span style={{ color: labelStyleR?.color ?? '#6b7280' }}>{state}</span>
                    </div>
                  ))}
                </div>
              </foreignObject>}
            </svg>

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
                  fontSize: tooltipStyleR?.fontSize ?? 12,
                  fontFamily: tooltipStyleR?.fontFamily ?? 'var(--relay-font-family)',
                  pointerEvents: 'none',
                  zIndex: 1000,
                  whiteSpace: 'nowrap',
                }}
              >
                {renderTooltip ? (
                  renderTooltip(hoveredEntry.entry, hoveredEntry.deviceName)
                ) : formatTooltip ? (
                  formatTooltip(hoveredEntry.entry, hoveredEntry.deviceName)
                ) : (
                  <>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>
                      {hoveredEntry.deviceName} — {hoveredEntry.entry.state}
                    </div>
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
