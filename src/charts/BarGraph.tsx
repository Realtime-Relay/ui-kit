import { useState, useCallback, useMemo, useRef } from "react";
import { scaleBand, scaleLinear, pointer } from "d3";
import type {
  DataPoint,
  MetricConfig,
  AlertZone,
  FontStyle,
  BackgroundStyle,
  DownsampleConfig,
} from "../utils/types";
import { resolveMetrics } from "../utils/metrics";
import { useResolvedStyles } from "../utils/useResolvedStyles";
import { getMetricColor } from "../theme/palette";
import { applyDownsample } from "../utils/downsample";
import { defaultFormatValue } from "../utils/formatters";
import { createScaler, CHART_REFERENCE } from "../utils/scaler";
import {
  isValidTimestamp,
  validateAlertZones,
  type ComponentError,
} from "../utils/validation";
import {
  ResponsiveContainer,
  Tooltip,
  type TooltipData,
  Legend,
  type LegendItem,
  AlertZonesOverlay,
  XAxis,
  YAxis,
  ChartSkeleton,
} from "./shared";

export interface BarGraphStyles {
  title?: FontStyle;
  axis?: FontStyle;
  legend?: FontStyle;
  tooltip?: FontStyle;
  background?: BackgroundStyle;
}

export interface BarGraphProps {
  data: DataPoint[];
  metrics?: MetricConfig[];
  title?: string;
  formatValue?: (value: number) => string;
  renderTooltip?: (point: DataPoint) => React.ReactNode;
  onHover?: (
    point: { metric: string; value: number; timestamp: number } | null,
    event: MouseEvent,
  ) => void;
  onRelease?: (
    point: { metric: string; value: number; timestamp: number } | null,
    event: MouseEvent,
  ) => void;
  showGrid?: boolean;
  gridColor?: string;
  gridThickness?: number;
  styles?: BarGraphStyles;
  barWidth?: number;
  alertZones?: AlertZone[];
  showLegend?: boolean;
  legendPosition?: "top" | "bottom";
  showLoading?: boolean;
  downsample?: DownsampleConfig;
  onError?: (error: ComponentError) => void;
}

export function BarGraph({
  data,
  metrics: metricsProp,
  title,
  formatValue = defaultFormatValue,
  renderTooltip,
  onHover,
  onRelease,
  showGrid = true,
  gridColor,
  gridThickness,
  styles,
  barWidth: barWidthProp,
  alertZones = [],
  showLegend = true,
  legendPosition = "bottom",
  showLoading = true,
  downsample,
  onError,
}: BarGraphProps) {
  validateAlertZones(alertZones, "BarGraph");

  const resolvedStyles = useResolvedStyles(styles);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [visibleMetrics, setVisibleMetrics] = useState<Set<string> | null>(
    null,
  );
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Filter out data points with invalid timestamps
  const validData = useMemo(() => {
    return data.filter((point) => {
      if (!isValidTimestamp(point.timestamp)) {
        onError?.({
          type: "invalid_timestamp",
          message: `BarGraph: invalid timestamp, received ${point.timestamp}`,
          rawValue: point.timestamp,
          component: "BarGraph",
        });
        return false;
      }
      return true;
    });
  }, [data, onError]);

  const resolvedMetrics = useMemo(
    () => resolveMetrics(validData, metricsProp),
    [validData, metricsProp],
  );

  const metricVisibility = useMemo(() => {
    if (visibleMetrics) return visibleMetrics;
    const set = new Set<string>();
    for (const m of resolvedMetrics) {
      if (m.visible !== false) set.add(m.key);
    }
    return set;
  }, [resolvedMetrics, visibleMetrics]);

  const activeMetrics = useMemo(
    () => resolvedMetrics.filter((m) => metricVisibility.has(m.key)),
    [resolvedMetrics, metricVisibility],
  );

  const downsampledData = useMemo(() => {
    if (activeMetrics.length === 0) return validData;
    return applyDownsample(validData, downsample, activeMetrics[0].key);
  }, [validData, downsample, activeMetrics]);

  const handleSelectMetric = useCallback(
    (key: string) => {
      setVisibleMetrics((prev) => {
        const current = prev ?? new Set(resolvedMetrics.map((m) => m.key));
        if (current.size === 1 && current.has(key)) {
          return new Set(resolvedMetrics.map((m) => m.key));
        }
        return new Set([key]);
      });
    },
    [resolvedMetrics],
  );

  if (showLoading && (!validData || validData.length === 0)) {
    return (
      <ResponsiveContainer>
        {({ width, height }) => <ChartSkeleton width={width} height={height} />}
      </ResponsiveContainer>
    );
  }

  const legendItems: LegendItem[] = resolvedMetrics.map((m, i) => ({
    key: m.key,
    label: m.label ?? m.key,
    color: m.color ?? getMetricColor(i),
    visible: metricVisibility.has(m.key),
  }));

  return (
    <ResponsiveContainer
      style={{
        backgroundColor:
          styles?.background?.color ?? "var(--relay-bg-color, transparent)",
      }}
    >
      {({ width, height }) => {
        const s = createScaler(width, height, CHART_REFERENCE, "width");
        const MARGIN = { top: s(20), right: s(20), bottom: s(30), left: s(50) };
        const chartWidth = width - MARGIN.left - MARGIN.right;
        const chartHeight =
          height -
          MARGIN.top -
          MARGIN.bottom -
          (showLegend ? s(30) : 0) -
          (title ? s(24) : 0);

        if (chartWidth <= 0 || chartHeight <= 0) return null;

        // Band scale for x-axis (each data point gets a group of bars)
        const xScale = scaleBand<number>()
          .domain(downsampledData.map((_, i) => i))
          .range([0, chartWidth])
          .padding(0.2);

        // Metric sub-band within each group
        const metricScale = scaleBand<string>()
          .domain(activeMetrics.map((m) => m.key))
          .range([0, xScale.bandwidth()])
          .padding(0.05);

        // Y scale
        let yMin = 0;
        let yMax = -Infinity;
        for (const d of downsampledData) {
          for (const m of activeMetrics) {
            const v = Number(d[m.key]);
            if (!isNaN(v)) {
              if (v < yMin) yMin = v;
              if (v > yMax) yMax = v;
            }
          }
        }
        for (const zone of alertZones) {
          if (zone.min < yMin) yMin = zone.min;
          if (zone.max > yMax) yMax = zone.max;
        }
        const yPadding = (yMax - yMin) * 0.05 || 1;
        const yScale = scaleLinear()
          .domain([Math.min(0, yMin - yPadding), yMax + yPadding])
          .range([chartHeight, 0])
          .nice();

        // For the linear y-axis grid we can reuse Grid, but x-axis is band-based
        // so we draw grid lines manually for y only
        const yTicks = yScale.ticks();
        const gColor = gridColor ?? "var(--relay-grid-color, #e0e0e0)";
        const gThick = gridThickness ?? 1;

        const computedBarWidth = barWidthProp
          ? Math.min(barWidthProp, metricScale.bandwidth())
          : metricScale.bandwidth();

        const handleBarHover = (
          dataIndex: number,
          metricKey: string,
          event: React.MouseEvent,
        ) => {
          const d = downsampledData[dataIndex];
          const value = Number(d[metricKey]) || 0;
          const metricValues = activeMetrics.map((m, i) => ({
            key: m.key,
            label: m.label ?? m.key,
            color: m.color ?? getMetricColor(i),
            value: Number(d[m.key]) || 0,
          }));

          const [mx, my] = pointer(event.nativeEvent, svgRef.current!);
          setTooltipData({
            point: d,
            metrics: metricValues,
            x: mx,
            y: my,
          });
          setHoveredIndex(dataIndex);

          onHover?.(
            { metric: metricKey, value, timestamp: d.timestamp },
            event.nativeEvent,
          );
        };

        const handleMouseLeave = (event: React.MouseEvent) => {
          const last = tooltipData?.metrics[0];
          setTooltipData(null);
          setHoveredIndex(null);
          onRelease?.(
            last
              ? {
                  metric: last.key,
                  value: last.value,
                  timestamp: tooltipData!.point.timestamp,
                }
              : null,
            event.nativeEvent,
          );
        };

        // Format x tick labels as timestamps
        const formatXTick = (i: number) => {
          const d = downsampledData[i];
          if (!d) return "";
          return new Date(d.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
        };

        return (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              height: "100%",
            }}
          >
            {title && (
              <div
                style={{
                  textAlign: "center",
                  fontFamily:
                    resolvedStyles?.title?.fontFamily ??
                    "var(--relay-font-family)",
                  fontSize: resolvedStyles?.title?.fontSize ?? s(14),
                  fontWeight: resolvedStyles?.title?.fontWeight ?? 600,
                  color: resolvedStyles?.title?.color,
                  padding: `${s(4)}px 0`,
                }}
              >
                {title}
              </div>
            )}
            {showLegend && legendPosition === "top" && (
              <Legend
                items={legendItems}
                onSelect={handleSelectMetric}
                position="top"
                style={resolvedStyles?.legend}
                s={s}
              />
            )}
            <div style={{ flex: 1, position: "relative" }}>
              <svg
                ref={svgRef}
                width={width}
                height={chartHeight + MARGIN.top + MARGIN.bottom}
              >
                <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
                  {/* Y grid lines */}
                  {showGrid &&
                    yTicks.map((tick) => (
                      <line
                        key={`yg-${tick}`}
                        x1={0}
                        x2={chartWidth}
                        y1={yScale(tick)}
                        y2={yScale(tick)}
                        stroke={gColor}
                        strokeWidth={gThick}
                        strokeDasharray="2,2"
                      />
                    ))}

                  <AlertZonesOverlay
                    zones={alertZones}
                    yScale={yScale}
                    width={chartWidth}
                    height={chartHeight}
                    s={s}
                  />

                  {/* Bars */}
                  {downsampledData.map((d, dataIdx) =>
                    activeMetrics.map((m, metricIdx) => {
                      const color = m.color ?? getMetricColor(metricIdx);
                      const value = Number(d[m.key]) || 0;
                      const barX =
                        (xScale(dataIdx) ?? 0) +
                        (metricScale(m.key) ?? 0) +
                        (metricScale.bandwidth() - computedBarWidth) / 2;
                      const barY = value >= 0 ? yScale(value) : yScale(0);
                      const barHeight = Math.abs(yScale(value) - yScale(0));

                      return (
                        <rect
                          key={`${dataIdx}-${m.key}`}
                          x={barX}
                          y={barY}
                          width={computedBarWidth}
                          height={barHeight}
                          fill={color}
                          opacity={hoveredIndex === dataIdx ? 1 : 0.85}
                          rx={s(2)}
                          onMouseMove={(e) => handleBarHover(dataIdx, m.key, e)}
                          onMouseLeave={handleMouseLeave}
                          style={{
                            cursor: "pointer",
                            transition: "opacity 100ms ease",
                          }}
                        />
                      );
                    }),
                  )}

                  {/* X axis */}
                  <g transform={`translate(0,${chartHeight})`}>
                    <line
                      x1={0}
                      x2={chartWidth}
                      stroke="var(--relay-grid-color, #e0e0e0)"
                    />
                    {downsampledData.map((_, i) => {
                      const x = (xScale(i) ?? 0) + xScale.bandwidth() / 2;
                      // Show a subset of ticks to avoid crowding
                      const step = Math.max(
                        1,
                        Math.floor(downsampledData.length / 8),
                      );
                      if (i % step !== 0 && i !== downsampledData.length - 1)
                        return null;
                      return (
                        <text
                          key={i}
                          x={x}
                          y={s(20)}
                          textAnchor="middle"
                          style={{
                            fontFamily:
                              resolvedStyles?.axis?.fontFamily ??
                              "var(--relay-font-family)",
                            fontSize: resolvedStyles?.axis?.fontSize ?? s(11),
                            fill: resolvedStyles?.axis?.color ?? "currentColor",
                          }}
                        >
                          {formatXTick(i)}
                        </text>
                      );
                    })}
                  </g>
                  <YAxis yScale={yScale} style={resolvedStyles?.axis} s={s} />
                </g>
              </svg>
              <Tooltip
                data={tooltipData}
                containerWidth={width}
                containerHeight={height}
                formatValue={formatValue}
                renderTooltip={renderTooltip}
                style={resolvedStyles?.tooltip}
                s={s}
              />
            </div>
            {showLegend && legendPosition === "bottom" && (
              <Legend
                items={legendItems}
                onSelect={handleSelectMetric}
                position="bottom"
                style={resolvedStyles?.legend}
                s={s}
              />
            )}
          </div>
        );
      }}
    </ResponsiveContainer>
  );
}
