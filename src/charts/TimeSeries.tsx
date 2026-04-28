import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useId,
  memo,
} from "react";
import {
  scaleTime,
  scaleLinear,
  line,
  area,
  extent,
  bisector,
  pointer,
  timeFormat,
} from "d3";
import type {
  DataPoint,
  MetricConfig,
  AlertZone,
  Annotation,
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
// useZoneTransition not used — TimeSeries has custom per-series zone tracking
import {
  ResponsiveContainer,
  Tooltip,
  type TooltipData,
  Legend,
  type LegendItem,
  Grid,
  AlertZonesOverlay,
  XAxis,
  YAxis,
  ChartSkeleton,
} from "./shared";

export interface TimeSeriesZoneTransition {
  device: string;
  metric: string;
  previousZone: AlertZone | null;
  currentZone: AlertZone | null;
  value: number;
}

export interface TimeSeriesStyles {
  title?: FontStyle;
  axis?: FontStyle;
  legend?: FontStyle;
  tooltip?: FontStyle;
  background?: BackgroundStyle;
  /** Explicit width. Number = pixels, string = CSS value (e.g. '100%', '50vw'). Default: fills parent. */
  width?: number | string;
  /** Explicit height. Number = pixels, string = CSS value. Default: fills parent. */
  height?: number | string;
}

export interface TimeSeriesProps {
  data: Record<string, DataPoint[]>;
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
  styles?: TimeSeriesStyles;
  area?: boolean;
  alertZones?: AlertZone[];
  showLegend?: boolean;
  legendPosition?: "top" | "bottom" | "left" | "right";
  showLoading?: boolean;
  downsample?: DownsampleConfig;
  /** Time window in milliseconds. Only data within [now - timeWindow, now] is shown. Enables autoscroll. */
  timeWindow?: number;
  /** Enable autoscroll when timeWindow is set. Defaults to true if timeWindow is provided. */
  autoScroll?: boolean;
  /** Fixed start of x-axis domain. Overrides timeWindow and data extent. */
  start?: Date | number;
  /** Fixed end of x-axis domain. Overrides timeWindow and data extent. */
  end?: Date | number;
  /** Global line thickness in pixels. Per-metric override via MetricConfig.lineThickness. */
  lineThickness?: number;
  /** Global point size (radius) in pixels. 0 or undefined = no points. Per-metric override via MetricConfig.pointSize. */
  pointSize?: number;
  /** Enable click-drag zoom along x-axis. Default true. */
  zoomEnabled?: boolean;
  /** Annotations rendered on the chart — vertical lines or shaded bands. */
  annotations?: Annotation[];
  /** Custom legend label formatter. Called for each device×metric combo. */
  formatLegend?: (device: string, metric: string) => string;
  /** Enable annotation mode. Click = point annotation, drag = range annotation. Disables zoom while active. */
  annotationMode?: boolean;
  /** Called during annotation interactions. `id` auto-increments and is shared between start_drag and end_drag of the same annotation. */
  onAnnotate?: (
    id: number,
    timestamp: number,
    type: "click" | "start_drag" | "end_drag",
  ) => void;
  /** Preview color for annotation-in-progress. Default: '#f59e0b' (amber). */
  annotationColor?: string;
  /** Color for the zoom brush selection rectangle (stroke). Default: '#3b82f6'. */
  zoomColor?: string;
  /** Called when the mouse enters/leaves an annotation. Return a ReactNode to show a custom tooltip. */
  onAnnotationHover?: (
    hover: boolean,
    annotation: Annotation,
  ) => React.ReactNode | void;
  /** Called when any device×metric's latest value crosses an alert zone boundary. Includes device and metric info. */
  onZoneChange?: (transition: TimeSeriesZoneTransition) => void;
  /** Custom formatter for timestamps in the default tooltip. Receives epoch ms, returns display string. */
  formatTimestamp?: (timestamp: number) => string;
  onError?: (error: ComponentError) => void;
}

/* ── Internal series type — one per device×metric combo ────── */

interface Series {
  id: string;
  device: string;
  metricKey: string;
  label: string;
  color: string;
  lineThickness?: number;
  pointSize?: number;
  visible: boolean;
  data: DataPoint[];
}

/* ── Annotation type guard ─────────────────────────────────── */

function isRangeAnnotation(
  a: Annotation,
): a is import("../utils/types").RangeAnnotation {
  return "end" in a;
}

/* ── Component ─────────────────────────────────────────────── */

export const TimeSeries = memo(function TimeSeries({
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
  area: showArea = false,
  alertZones = [],
  showLegend = true,
  legendPosition = "bottom",
  showLoading = true,
  downsample,
  timeWindow,
  autoScroll,
  start: startProp,
  end: endProp,
  lineThickness: lineThicknessProp,
  pointSize: pointSizeProp,
  zoomEnabled = true,
  annotations = [],
  formatLegend,
  annotationMode = false,
  onAnnotate,
  annotationColor = "#f59e0b",
  zoomColor = "#3b82f6",
  onAnnotationHover,
  onZoneChange,
  formatTimestamp: formatTimestampProp,
  onError,
}: TimeSeriesProps) {
  validateAlertZones(alertZones, "TimeSeries");

  const resolvedStyles = useResolvedStyles(styles);
  const clipId = useId().replace(/:/g, "_");
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [visibleSeries, setVisibleSeries] = useState<Set<string> | null>(null);
  const [now, setNow] = useState(Date.now());

  // Zoom state
  const [zoomDomain, setZoomDomain] = useState<[Date, Date] | null>(null);
  const [brushStart, setBrushStart] = useState<number | null>(null);
  const [brushEnd, setBrushEnd] = useState<number | null>(null);
  const isDragging = useRef(false);
  const overlayRef = useRef<SVGRectElement>(null);
  const windowMoveRef = useRef<((e: MouseEvent) => void) | null>(null);
  const windowUpRef = useRef<((e: MouseEvent) => void) | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingMouseEvent = useRef<React.MouseEvent<SVGRectElement> | null>(
    null,
  );

  // Annotation ID counter — auto-increments, shared between start_drag/end_drag of same annotation
  const annotationIdRef = useRef(0);
  const currentAnnotationIdRef = useRef(0);
  const annotationDragFired = useRef(false);

  // Annotation hover tooltip
  const [annotationTooltip, setAnnotationTooltip] = useState<{
    content: React.ReactNode;
    x: number;
    y: number;
  } | null>(null);
  const hoveredAnnotationIdx = useRef<number | null>(null);

  // Autoscroll: derive `now` from the latest data timestamp during render.
  // No rAF loop needed — data flush already triggers re-renders at ~60fps.
  // This eliminates double-render jitter (rAF + data flush competing).
  const hasFixedRange = startProp != null && endProp != null;
  const isAutoScroll =
    !hasFixedRange && timeWindow != null && autoScroll !== false && !zoomDomain;

  const latestDataTs = useMemo(() => {
    let max = 0;
    for (const key of Object.keys(data)) {
      const arr = data[key];
      if (arr && arr.length > 0) {
        const last = arr[arr.length - 1].timestamp;
        if (last > max) max = last;
      }
    }
    return max;
  }, [data]);

  // When autoscrolling, use wall clock clamped to latest data + 1s buffer.
  // When not autoscrolling, fall back to static `now` state.
  const effectiveNow =
    isAutoScroll && latestDataTs > 0
      ? Math.min(Date.now(), latestDataTs + 1000)
      : now;

  const deviceNames = useMemo(() => Object.keys(data), [data]);
  const deviceCount = deviceNames.length;

  // Validate and filter data per device
  const validDataMap = useMemo(() => {
    const result: Record<string, DataPoint[]> = {};
    for (const name of deviceNames) {
      result[name] = (data[name] ?? []).filter((point) => {
        if (!isValidTimestamp(point.timestamp)) {
          onError?.({
            type: "invalid_timestamp",
            message: `TimeSeries [${name}]: invalid timestamp, received ${point.timestamp}`,
            rawValue: point.timestamp,
            component: "TimeSeries",
          });
          return false;
        }
        return true;
      });
    }
    return result;
  }, [data, deviceNames, onError]);

  // Resolve metrics from first non-empty device (or use prop)
  const resolvedMetrics = useMemo(() => {
    if (metricsProp)
      return metricsProp.map((m, i) => ({
        ...m,
        color: m.color ?? getMetricColor(i),
      }));
    for (const name of deviceNames) {
      const points = validDataMap[name];
      if (points && points.length > 0) {
        return resolveMetrics(points, undefined);
      }
    }
    return [];
  }, [validDataMap, deviceNames, metricsProp]);

  // Build series list: one per device × metric
  const allSeries = useMemo<Series[]>(() => {
    const result: Series[] = [];
    let colorIdx = 0;
    for (const device of deviceNames) {
      const deviceData = validDataMap[device] ?? [];
      for (const m of resolvedMetrics) {
        const id = deviceCount === 1 ? m.key : `${device}:${m.key}`;
        const label = formatLegend
          ? formatLegend(device, m.label ?? m.key)
          : deviceCount === 1
            ? (m.label ?? m.key)
            : `[${device}]: ${m.label ?? m.key}`;
        result.push({
          id,
          device,
          metricKey: m.key,
          label,
          color:
            deviceCount === 1
              ? (m.color ?? getMetricColor(colorIdx))
              : getMetricColor(colorIdx),
          lineThickness: m.lineThickness,
          pointSize: m.pointSize,
          visible: true,
          data: deviceData,
        });
        colorIdx++;
      }
    }
    return result;
  }, [deviceNames, validDataMap, resolvedMetrics, deviceCount, formatLegend]);

  // Visibility tracking
  const seriesVisibility = useMemo(() => {
    if (visibleSeries) return visibleSeries;
    return new Set(allSeries.map((s) => s.id));
  }, [allSeries, visibleSeries]);

  const activeSeries = useMemo(
    () => allSeries.filter((s) => seriesVisibility.has(s.id)),
    [allSeries, seriesVisibility],
  );

  // Downsample per device — throttle LTTB so it doesn't re-run on every
  // stream flush (which shifts bucket boundaries and causes line jumping).
  // Cache stores the last downsampled snapshot + the timestamp of the last
  // point in that snapshot, so new realtime points can be appended without
  // re-bucketing the entire dataset.
  const downsampleCache = useRef<
    Record<string, { data: DataPoint[]; srcLen: number; lastTs: number }>
  >({});

  const downsampledMap = useMemo(() => {
    const result: Record<string, DataPoint[]> = {};
    const refMetric = resolvedMetrics[0]?.key;

    for (const device of deviceNames) {
      const deviceData = validDataMap[device] ?? [];
      if (deviceData.length === 0) {
        result[device] = [];
        continue;
      }
      if (!refMetric || downsample === false) {
        result[device] = deviceData;
        continue;
      }

      const cached = downsampleCache.current[device];
      // Re-downsample when data grows by >5% or shrinks (zoom/trim) or no cache yet
      if (
        !cached ||
        deviceData.length > cached.srcLen * 1.05 ||
        deviceData.length < cached.srcLen
      ) {
        const sampled = applyDownsample(deviceData, downsample, refMetric);
        const lastTs =
          sampled.length > 0 ? sampled[sampled.length - 1].timestamp : 0;
        downsampleCache.current[device] = {
          data: sampled,
          srcLen: deviceData.length,
          lastTs,
        };
        result[device] = sampled;
      } else {
        // Append any new points that arrived after the cached snapshot (realtime stream)
        const newPoints = deviceData.filter((p) => p.timestamp > cached.lastTs);
        if (newPoints.length > 0) {
          const extended = [...cached.data, ...newPoints];
          cached.lastTs = newPoints[newPoints.length - 1].timestamp;
          cached.data = extended;
          result[device] = extended;
        } else {
          result[device] = cached.data;
        }
      }
    }
    return result;
  }, [validDataMap, deviceNames, downsample, resolvedMetrics]);

  // Zone transition tracking — per device×metric, fires onZoneChange with device + metric info
  const prevZonesRef = useRef<Map<string, AlertZone | null>>(new Map());

  useEffect(() => {
    if (!onZoneChange || alertZones.length === 0 || allSeries.length === 0)
      return;

    for (const ser of allSeries) {
      const points = validDataMap[ser.device] ?? [];
      if (points.length === 0) continue;
      const last = points[points.length - 1];
      const v = Number(last[ser.metricKey]);
      if (!Number.isFinite(v)) continue;

      const currentZone =
        alertZones.find((z) => v >= z.min && v <= z.max) ?? null;
      const key = ser.id; // "device:metric"
      const prev = prevZonesRef.current.get(key);

      // First time seeing this series — initialize without firing
      if (prev === undefined) {
        prevZonesRef.current.set(key, currentZone);
        continue;
      }

      // Check if zone changed (compare by min/max/color, not reference)
      const changed =
        (prev === null) !== (currentZone === null) ||
        (prev !== null &&
          currentZone !== null &&
          (prev.min !== currentZone.min ||
            prev.max !== currentZone.max ||
            prev.color !== currentZone.color));

      if (changed) {
        onZoneChange({
          device: ser.device,
          metric: ser.metricKey,
          previousZone: prev,
          currentZone,
          value: v,
        });
        prevZonesRef.current.set(key, currentZone);
      }
    }
  }, [validDataMap, allSeries, alertZones, onZoneChange]);

  const handleSelectSeries = useCallback(
    (key: string) => {
      setVisibleSeries((prev) => {
        const current = prev ?? new Set(allSeries.map((s) => s.id));
        // Solo mode: if this is the only visible, show all; otherwise show only this one
        if (current.size === 1 && current.has(key)) {
          return new Set(allSeries.map((s) => s.id));
        }
        return new Set([key]);
      });
    },
    [allSeries],
  );

  // Check if all data is empty
  const allEmpty =
    deviceNames.length === 0 ||
    deviceNames.every((n) => (validDataMap[n]?.length ?? 0) === 0);

  // Loading state
  if (showLoading && allEmpty) {
    return (
      <ResponsiveContainer
        explicitWidth={styles?.width}
        explicitHeight={styles?.height}
      >
        {({ width, height }) => <ChartSkeleton width={width} height={height} />}
      </ResponsiveContainer>
    );
  }

  // Legend items
  const legendItems: LegendItem[] = allSeries.map((s) => ({
    key: s.id,
    label: s.label,
    color: s.color,
    visible: seriesVisibility.has(s.id),
  }));

  const isLegendVertical =
    legendPosition === "left" || legendPosition === "right";

  return (
    <ResponsiveContainer
      explicitWidth={styles?.width}
      explicitHeight={styles?.height}
      style={{
        backgroundColor:
          styles?.background?.color ?? "var(--relay-bg-color, transparent)",
      }}
    >
      {({ width, height }) => {
        const rawS = createScaler(width, height, CHART_REFERENCE, "width");
        const s = (px: number) => Math.min(rawS(px), px); // never upscale beyond 1x
        const legendSpace = showLegend ? (isLegendVertical ? 140 : s(30)) : 0;
        const MARGIN = { top: s(20), right: s(20), bottom: s(40), left: s(50) };
        const chartWidth =
          width -
          MARGIN.left -
          MARGIN.right -
          (isLegendVertical ? legendSpace : 0);
        const chartHeight =
          height -
          MARGIN.top -
          MARGIN.bottom -
          (showLegend && !isLegendVertical ? s(30) : 0) -
          (title ? s(24) : 0);

        if (chartWidth <= 0 || chartHeight <= 0) return null;

        // Collect all visible data across devices for domain calculation
        const allVisibleData: { device: string; data: DataPoint[] }[] = [];
        for (const ser of activeSeries) {
          const deviceData = downsampledMap[ser.device] ?? [];
          // Filter to the visible x-range so y-axis rescales on zoom
          let filtered: DataPoint[];
          if (zoomDomain) {
            const z0 = zoomDomain[0].getTime();
            const z1 = zoomDomain[1].getTime();
            filtered = deviceData.filter(
              (d) => d.timestamp >= z0 && d.timestamp <= z1,
            );
          } else if (hasFixedRange) {
            const s0 =
              typeof startProp === "number"
                ? startProp
                : new Date(startProp!).getTime();
            const e0 =
              typeof endProp === "number"
                ? endProp
                : new Date(endProp!).getTime();
            filtered = deviceData.filter(
              (d) => d.timestamp >= s0 && d.timestamp <= e0,
            );
          } else if (timeWindow) {
            filtered = deviceData.filter(
              (d) =>
                d.timestamp >= effectiveNow - timeWindow &&
                d.timestamp <= effectiveNow,
            );
          } else {
            filtered = deviceData;
          }
          allVisibleData.push({ device: ser.device, data: filtered });
        }

        // Flatten for bisector
        const flatVisibleData = allVisibleData.flatMap((d) => d.data);
        // Deduplicate by timestamp for bisector (use first device's data as reference)
        const firstDeviceData = allVisibleData[0]?.data ?? [];

        // X domain
        let xDomainMin: Date;
        let xDomainMax: Date;
        if (zoomDomain) {
          [xDomainMin, xDomainMax] = zoomDomain;
        } else if (hasFixedRange) {
          xDomainMin = new Date(startProp!);
          xDomainMax = new Date(endProp!);
        } else if (timeWindow) {
          xDomainMin = new Date(effectiveNow - timeWindow);
          xDomainMax = new Date(effectiveNow);
        } else {
          const allTimestamps = flatVisibleData.map((d) => d.timestamp);
          const [tMin, tMax] = extent(allTimestamps) as [number, number];
          xDomainMin = new Date(tMin ?? effectiveNow);
          xDomainMax = new Date(tMax ?? effectiveNow);
        }
        const xScale = scaleTime()
          .domain([xDomainMin, xDomainMax])
          .range([0, chartWidth]);

        const tickFormat = timeFormat("%H:%M:%S");

        // Y domain from visible data
        let yMin = Infinity;
        let yMax = -Infinity;
        for (const { data: devData } of allVisibleData) {
          for (const d of devData) {
            for (const ser of activeSeries) {
              const v = Number(d[ser.metricKey]);
              if (!isNaN(v)) {
                if (v < yMin) yMin = v;
                if (v > yMax) yMax = v;
              }
            }
          }
        }
        for (const zone of alertZones) {
          if (zone.min < yMin) yMin = zone.min;
          if (zone.max > yMax) yMax = zone.max;
        }
        if (!isFinite(yMin)) {
          yMin = 0;
          yMax = 1;
        }
        const yPadding = (yMax - yMin) * 0.05 || 1;
        const yDomainMin =
          yMin >= 0 ? Math.max(0, yMin - yPadding) : yMin - yPadding;
        const yScale = scaleLinear()
          .domain([yDomainMin, yMax + yPadding])
          .range([chartHeight, 0])
          .nice();

        // Mouse interaction
        const bisect = bisector<DataPoint, number>((d) => d.timestamp).left;

        // Clamp a pixel x to the visible domain and return epoch ms
        const clampTs = (px: number) => {
          const clamped = Math.max(0, Math.min(px, chartWidth));
          const t = xScale.invert(clamped).getTime();
          return Math.max(
            xDomainMin.getTime(),
            Math.min(t, xDomainMax.getTime()),
          );
        };

        const cleanupWindowListeners = () => {
          if (windowMoveRef.current) {
            window.removeEventListener("mousemove", windowMoveRef.current);
            windowMoveRef.current = null;
          }
          if (windowUpRef.current) {
            window.removeEventListener("mouseup", windowUpRef.current);
            windowUpRef.current = null;
          }
        };

        const handleMouseDown = (event: React.MouseEvent<SVGRectElement>) => {
          const [mx] = pointer(event.nativeEvent, event.currentTarget);
          if (annotationMode) {
            setBrushStart(mx);
            setBrushEnd(mx);
            isDragging.current = true;
            annotationDragFired.current = false;
            currentAnnotationIdRef.current = ++annotationIdRef.current;
            return;
          }
          if (!zoomEnabled) return;
          setBrushStart(mx);
          setBrushEnd(mx);
          isDragging.current = true;

          // Attach window listeners so drag continues outside the chart
          cleanupWindowListeners();
          windowMoveRef.current = (e: MouseEvent) => {
            if (!isDragging.current || !overlayRef.current) return;
            const [wmx] = pointer(e, overlayRef.current);
            const clamped = Math.max(0, Math.min(wmx, chartWidth));
            setBrushEnd(clamped);
          };
          windowUpRef.current = (e: MouseEvent) => {
            if (isDragging.current && overlayRef.current) {
              isDragging.current = false;
              setBrushStart((prevStart) => {
                setBrushEnd((prevEnd) => {
                  if (prevStart != null && prevEnd != null) {
                    const x0 = Math.min(prevStart, prevEnd);
                    const x1 = Math.max(prevStart, prevEnd);
                    if (x1 - x0 > 10) {
                      const t0 = xScale.invert(x0);
                      const t1 = xScale.invert(x1);
                      setZoomDomain([t0, t1]);
                    }
                  }
                  return null;
                });
                return null;
              });
            }
            cleanupWindowListeners();
          };
          window.addEventListener("mousemove", windowMoveRef.current);
          window.addEventListener("mouseup", windowUpRef.current);
        };

        const handleMouseMove = (event: React.MouseEvent<SVGRectElement>) => {
          // Update brush if dragging (annotation or zoom)
          if (isDragging.current && (annotationMode || zoomEnabled)) {
            const [mx] = pointer(event.nativeEvent, event.currentTarget);
            const clamped = Math.max(0, Math.min(mx, chartWidth));
            setBrushEnd(clamped);

            // Fire start_drag once drag exceeds 10px threshold
            if (
              annotationMode &&
              !annotationDragFired.current &&
              brushStart != null &&
              Math.abs(clamped - brushStart) > 10
            ) {
              annotationDragFired.current = true;
              onAnnotate?.(
                currentAnnotationIdRef.current,
                clampTs(brushStart),
                "start_drag",
              );
            }

            return; // Don't update tooltip while dragging
          }

          // Throttle tooltip updates to one per animation frame
          pendingMouseEvent.current = event;
          if (rafRef.current != null) return;
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            const evt = pendingMouseEvent.current;
            if (!evt) return;
            processMouseMove(evt);
          });
        };

        const processMouseMove = (event: React.MouseEvent<SVGRectElement>) => {
          // Tooltip logic
          const [mx, my] = pointer(
            event.nativeEvent,
            overlayRef.current ?? event.currentTarget,
          );
          const x0 = xScale.invert(mx).getTime();
          const refData =
            firstDeviceData.length > 0 ? firstDeviceData : flatVisibleData;
          // Data is already sorted by timestamp from the hook — skip copy+sort
          const idx = bisect(refData, x0, 1);
          const d0 = refData[idx - 1];
          const d1 = refData[idx];

          if (!d0 && !d1) return;

          const closest = !d1
            ? d0
            : !d0
              ? d1
              : x0 - d0.timestamp > d1.timestamp - x0
                ? d1
                : d0;
          const ts = closest.timestamp;

          // Gather values from all active series at this timestamp
          const metricValues = activeSeries.map((ser) => {
            const devData = downsampledMap[ser.device] ?? [];
            // Find closest point in this device's data
            const devSorted = devData; // already sorted from source
            const devIdx = bisect(devSorted, ts, 1);
            const dd0 = devSorted[devIdx - 1];
            const dd1 = devSorted[devIdx];
            const devClosest = !dd1
              ? dd0
              : !dd0
                ? dd1
                : ts - dd0.timestamp > dd1.timestamp - ts
                  ? dd1
                  : dd0;
            return {
              key: ser.id,
              label: ser.label,
              color: ser.color,
              value: devClosest ? Number(devClosest[ser.metricKey]) || 0 : 0,
            };
          });

          const px = xScale(new Date(ts));
          const py = yScale(metricValues[0]?.value ?? 0);

          // Check if cursor is near a data line (pixel distance from cursor to nearest line point)
          const SNAP_PX = 20; // pixel threshold to consider "on a data point"
          let nearLine = false;
          for (const mv of metricValues) {
            const lineY = yScale(mv.value);
            if (Math.abs(my - lineY) <= SNAP_PX) {
              nearLine = true;
              break;
            }
          }

          // Check if cursor is inside an annotation region
          let insideAnnotation = false;
          if (annotations.length > 0) {
            for (const ann of annotations) {
              if (isRangeAnnotation(ann)) {
                const ax0 = xScale(new Date(ann.start));
                const ax1 = xScale(new Date(ann.end));
                if (mx >= ax0 && mx <= ax1) {
                  insideAnnotation = true;
                  break;
                }
              } else {
                const ax = xScale(new Date(ann.timestamp));
                if (Math.abs(mx - ax) <= 4) {
                  insideAnnotation = true;
                  break;
                }
              }
            }
          }

          // When inside an annotation: near line → show data tooltip, hide annotation tooltip
          //                             not near line → hide data tooltip, show annotation tooltip
          // When outside annotation: always show data tooltip
          const suppressDataTooltip = insideAnnotation && !nearLine;

          if (suppressDataTooltip) {
            setTooltipData(null);
          } else {
            setTooltipData({
              point: closest,
              metrics: metricValues,
              x: mx + MARGIN.left,
              y: my + MARGIN.top,
            });
          }

          if (!suppressDataTooltip && onHover && metricValues.length > 0) {
            onHover(
              {
                metric: metricValues[0].key,
                value: metricValues[0].value,
                timestamp: ts,
              },
              event.nativeEvent,
            );
          }

          // Annotation hover detection
          if (onAnnotationHover && annotations.length > 0) {
            const HIT_PX = 4; // hit tolerance in pixels
            let foundIdx: number | null = null;
            for (let ai = 0; ai < annotations.length; ai++) {
              const ann = annotations[ai];
              if (isRangeAnnotation(ann)) {
                const ax0 = xScale(new Date(ann.start));
                const ax1 = xScale(new Date(ann.end));
                if (mx >= ax0 - HIT_PX && mx <= ax1 + HIT_PX) {
                  foundIdx = ai;
                  break;
                }
              } else {
                const ax = xScale(new Date(ann.timestamp));
                if (Math.abs(mx - ax) <= HIT_PX) {
                  foundIdx = ai;
                  break;
                }
              }
            }

            if (
              foundIdx !== null &&
              foundIdx !== hoveredAnnotationIdx.current
            ) {
              // Left previous annotation
              if (hoveredAnnotationIdx.current !== null) {
                onAnnotationHover(
                  false,
                  annotations[hoveredAnnotationIdx.current],
                );
              }
              // Entered new annotation
              hoveredAnnotationIdx.current = foundIdx;
              const ann = annotations[foundIdx];
              const result = onAnnotationHover(true, ann);
              if (result) {
                const [sx, sy] = pointer(event.nativeEvent, svgRef.current!);
                setAnnotationTooltip({ content: result, x: sx, y: sy });
              } else {
                setAnnotationTooltip(null);
              }
            } else if (foundIdx !== null && annotationTooltip) {
              // Still on same annotation — update tooltip position
              const [sx, sy] = pointer(event.nativeEvent, svgRef.current!);
              setAnnotationTooltip((prev) =>
                prev ? { ...prev, x: sx, y: sy } : null,
              );
            } else if (
              foundIdx === null &&
              hoveredAnnotationIdx.current !== null
            ) {
              // Left annotation
              onAnnotationHover(
                false,
                annotations[hoveredAnnotationIdx.current],
              );
              hoveredAnnotationIdx.current = null;
              setAnnotationTooltip(null);
            }
          }
        };

        const handleMouseUp = (event: React.MouseEvent<SVGRectElement>) => {
          if (isDragging.current && brushStart != null && brushEnd != null) {
            isDragging.current = false;

            if (annotationMode) {
              const x0 = Math.min(brushStart, brushEnd);
              const x1 = Math.max(brushStart, brushEnd);
              if (x1 - x0 > 10) {
                // Range annotation — fire end_drag with the release timestamp
                onAnnotate?.(
                  currentAnnotationIdRef.current,
                  clampTs(brushEnd),
                  "end_drag",
                );
              } else {
                // Point annotation — fire click with the clamped timestamp
                onAnnotate?.(
                  currentAnnotationIdRef.current,
                  clampTs(brushStart),
                  "click",
                );
              }
              setBrushStart(null);
              setBrushEnd(null);
              return;
            }

            if (zoomEnabled) {
              const x0 = Math.min(brushStart, brushEnd);
              const x1 = Math.max(brushStart, brushEnd);
              if (x1 - x0 > 10) {
                const t0 = xScale.invert(x0);
                const t1 = xScale.invert(x1);
                setZoomDomain([t0, t1]);
              }
              setBrushStart(null);
              setBrushEnd(null);
            }
          }
        };

        const handleMouseLeave = (event: React.MouseEvent<SVGRectElement>) => {
          // Cancel any pending rAF tooltip update
          if (rafRef.current != null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          pendingMouseEvent.current = null;
          // If dragging, don't cancel — window listeners will handle it
          if (!isDragging.current) {
            setBrushStart(null);
            setBrushEnd(null);
          }
          setTooltipData(null);
          // Clear annotation hover
          if (onAnnotationHover && hoveredAnnotationIdx.current !== null) {
            onAnnotationHover(false, annotations[hoveredAnnotationIdx.current]);
            hoveredAnnotationIdx.current = null;
            setAnnotationTooltip(null);
          }
          if (onRelease) {
            const last = tooltipData?.metrics[0];
            onRelease(
              last
                ? {
                    metric: last.key,
                    value: last.value,
                    timestamp: tooltipData!.point.timestamp,
                  }
                : null,
              event.nativeEvent,
            );
          }
        };

        // Build per-series visible data
        const seriesVisibleData = activeSeries.map((ser) => {
          const deviceData = downsampledMap[ser.device] ?? [];
          let filtered: typeof deviceData;
          if (zoomDomain) {
            filtered = deviceData.filter(
              (d) =>
                d.timestamp >= zoomDomain[0].getTime() &&
                d.timestamp <= zoomDomain[1].getTime(),
            );
          } else if (hasFixedRange) {
            const s0 =
              typeof startProp === "number"
                ? startProp
                : new Date(startProp!).getTime();
            const e0 =
              typeof endProp === "number"
                ? endProp
                : new Date(endProp!).getTime();
            filtered = deviceData.filter(
              (d) => d.timestamp >= s0 && d.timestamp <= e0,
            );
          } else if (timeWindow) {
            filtered = deviceData.filter(
              (d) =>
                d.timestamp >= effectiveNow - timeWindow &&
                d.timestamp <= effectiveNow,
            );
          } else {
            filtered = deviceData;
          }
          return [...filtered].sort((a, b) => a.timestamp - b.timestamp);
        });

        const legendEl = showLegend ? (
          <Legend
            items={legendItems}
            onSelect={handleSelectSeries}
            position={legendPosition}
            style={resolvedStyles?.legend}
            s={s}
          />
        ) : null;

        const isHorizontalLegend = !isLegendVertical;

        return (
          <div
            style={{
              display: "flex",
              flexDirection: isLegendVertical ? "row" : "column",
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
                  order: -2,
                }}
              >
                {title}
              </div>
            )}
            {isHorizontalLegend && legendPosition === "top" && legendEl}
            {isLegendVertical && legendPosition === "left" && legendEl}
            <div style={{ flex: 1, position: "relative", order: 0 }}>
              <svg
                ref={svgRef}
                width={
                  isLegendVertical
                    ? chartWidth + MARGIN.left + MARGIN.right
                    : width
                }
                height={chartHeight + MARGIN.top + MARGIN.bottom}
                style={{ userSelect: "none" }}
              >
                <defs>
                  <clipPath id={clipId}>
                    <rect x={0} y={0} width={chartWidth} height={chartHeight} />
                  </clipPath>
                </defs>
                <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
                  <Grid
                    xScale={xScale}
                    yScale={yScale}
                    width={chartWidth}
                    height={chartHeight}
                    showGrid={showGrid}
                    gridColor={gridColor}
                    gridThickness={gridThickness}
                  />
                  <AlertZonesOverlay
                    zones={alertZones}
                    yScale={yScale}
                    width={chartWidth}
                    height={chartHeight}
                    s={s}
                  />

                  {/* Annotation visuals (rendered below overlay) */}
                  <g
                    clipPath={`url(#${clipId})`}
                    style={{ pointerEvents: "none" }}
                  >
                    {annotations.map((ann, i) => {
                      if (isRangeAnnotation(ann)) {
                        const x0 = xScale(new Date(ann.start));
                        const x1 = xScale(new Date(ann.end));
                        const color = ann.color ?? "#6b7280";
                        return (
                          <g key={`ann-${i}`}>
                            <rect
                              x={x0}
                              y={0}
                              width={x1 - x0}
                              height={chartHeight}
                              fill={color}
                              opacity={0.1}
                            />
                            {ann.label && (
                              <text
                                x={(x0 + x1) / 2}
                                y={s(12)}
                                textAnchor="middle"
                                fontSize={s(10)}
                                fill={color}
                                fontFamily="var(--relay-font-family)"
                              >
                                {ann.label}
                              </text>
                            )}
                          </g>
                        );
                      } else {
                        const x = xScale(new Date(ann.timestamp));
                        const color = ann.color ?? "#6b7280";
                        return (
                          <g key={`ann-${i}`}>
                            <line
                              x1={x}
                              x2={x}
                              y1={0}
                              y2={chartHeight}
                              stroke={color}
                              strokeWidth={1}
                              strokeDasharray="4,3"
                            />
                            {ann.label && (
                              <text
                                x={x + s(4)}
                                y={s(10)}
                                fontSize={s(10)}
                                fill={color}
                                fontFamily="var(--relay-font-family)"
                              >
                                {ann.label}
                              </text>
                            )}
                          </g>
                        );
                      }
                    })}
                  </g>

                  {/* Render lines, areas, and points — clipped to chart bounds */}
                  <g clipPath={`url(#${clipId})`}>
                    {activeSeries.map((ser, serIdx) => {
                      const color = ser.color;
                      const thickness =
                        ser.lineThickness ?? lineThicknessProp ?? s(2);
                      const ptSize = ser.pointSize ?? pointSizeProp;
                      const visData = seriesVisibleData[serIdx] ?? [];

                      const metricLineGen = line<DataPoint>()
                        .defined(
                          (d) =>
                            d[ser.metricKey] !== undefined &&
                            d[ser.metricKey] !== null,
                        )
                        .x((d) => xScale(new Date(d.timestamp)))
                        .y((d) => yScale(Number(d[ser.metricKey]) || 0));

                      const metricAreaGen = area<DataPoint>()
                        .defined(
                          (d) =>
                            d[ser.metricKey] !== undefined &&
                            d[ser.metricKey] !== null,
                        )
                        .x((d) => xScale(new Date(d.timestamp)))
                        .y0(chartHeight)
                        .y1((d) => yScale(Number(d[ser.metricKey]) || 0));

                      return (
                        <g key={ser.id}>
                          {showArea && (
                            <path
                              d={metricAreaGen(visData) ?? ""}
                              fill={color}
                              opacity={0.15}
                            />
                          )}
                          <path
                            d={metricLineGen(visData) ?? ""}
                            fill="none"
                            stroke={color}
                            strokeWidth={thickness}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                          {/* Points */}
                          {ptSize != null &&
                            ptSize > 0 &&
                            visData.map((d, di) => {
                              const v = d[ser.metricKey];
                              if (v === undefined || v === null) return null;
                              return (
                                <circle
                                  key={di}
                                  cx={xScale(new Date(d.timestamp))}
                                  cy={yScale(Number(v) || 0)}
                                  r={ptSize}
                                  fill={color}
                                />
                              );
                            })}
                        </g>
                      );
                    })}
                  </g>

                  {/* Brush / annotation preview overlay */}
                  {brushStart != null &&
                    brushEnd != null &&
                    (() => {
                      const bx0 = Math.min(brushStart, brushEnd);
                      const bx1 = Math.max(brushStart, brushEnd);
                      const isSmall = bx1 - bx0 <= 10;

                      if (annotationMode) {
                        // Annotation preview
                        if (isSmall) {
                          // Point annotation preview — vertical dashed line
                          return (
                            <line
                              x1={brushStart}
                              x2={brushStart}
                              y1={0}
                              y2={chartHeight}
                              stroke={annotationColor}
                              strokeWidth={2}
                              strokeDasharray="4,3"
                            />
                          );
                        }
                        // Range annotation preview — shaded band
                        return (
                          <rect
                            x={bx0}
                            y={0}
                            width={bx1 - bx0}
                            height={chartHeight}
                            fill={annotationColor}
                            opacity={0.2}
                            stroke={annotationColor}
                            strokeWidth={1}
                          />
                        );
                      }

                      // Zoom brush
                      return (
                        <rect
                          x={bx0}
                          y={0}
                          width={bx1 - bx0}
                          height={chartHeight}
                          fill={zoomColor}
                          opacity={0.15}
                          stroke={zoomColor}
                          strokeWidth={1}
                        />
                      );
                    })()}

                  {/* Hover crosshair */}
                  {tooltipData && (
                    <line
                      x1={tooltipData.x - MARGIN.left}
                      x2={tooltipData.x - MARGIN.left}
                      y1={0}
                      y2={chartHeight}
                      stroke="var(--relay-grid-color, #e0e0e0)"
                      strokeWidth={s(1)}
                      strokeDasharray="4,4"
                    />
                  )}

                  <XAxis
                    xScale={xScale}
                    height={chartHeight}
                    style={resolvedStyles?.axis}
                    tickFormat={tickFormat}
                    s={s}
                  />
                  <YAxis yScale={yScale} style={resolvedStyles?.axis} s={s} />

                  {/* Invisible overlay for mouse events */}
                  <rect
                    ref={overlayRef}
                    width={chartWidth}
                    height={chartHeight}
                    fill="transparent"
                    style={{
                      cursor: annotationMode
                        ? "copy"
                        : zoomEnabled
                          ? "crosshair"
                          : undefined,
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                  />

                  {/* No separate annotation hit areas — hover detection is in handleMouseMove */}
                </g>
              </svg>

              {/* Zoom reset button */}
              {zoomDomain && (
                <button
                  onClick={() => setZoomDomain(null)}
                  style={{
                    position: "absolute",
                    top: s(4),
                    right: s(4),
                    background: "var(--relay-tooltip-bg, #1a1a1a)",
                    color: "var(--relay-tooltip-text, #ffffff)",
                    border: "none",
                    borderRadius: s(4),
                    padding: `${s(4)}px ${s(8)}px`,
                    fontSize: s(11),
                    cursor: "pointer",
                    zIndex: 10,
                    fontFamily: "var(--relay-font-family)",
                  }}
                  type="button"
                >
                  Reset zoom
                </button>
              )}

              <Tooltip
                data={tooltipData}
                containerWidth={width}
                containerHeight={height}
                formatValue={formatValue}
                formatTimestamp={formatTimestampProp}
                renderTooltip={renderTooltip}
                style={resolvedStyles?.tooltip}
                s={s}
              />

              {/* Annotation hover tooltip — hidden when data-point tooltip is active (near line) */}
              {annotationTooltip &&
                !tooltipData &&
                (() => {
                  // Clamp to viewport: measure position and flip if needed
                  const tooltipW = 200; // estimated width
                  const tooltipH = 80; // estimated height
                  let left = annotationTooltip.x;
                  let top = annotationTooltip.y - 8;

                  // Horizontal: prefer centered above cursor, flip if overflows
                  if (left + tooltipW / 2 > width) {
                    left = width - tooltipW / 2 - 4;
                  } else if (left - tooltipW / 2 < 0) {
                    left = tooltipW / 2 + 4;
                  }

                  // Vertical: prefer above cursor, flip below if no room
                  if (top - tooltipH < 0) {
                    top = annotationTooltip.y + 16; // below cursor
                  }

                  // Clamp final top
                  top = Math.max(4, Math.min(top, height - 4));

                  return (
                    <div
                      style={{
                        position: "absolute",
                        left,
                        top,
                        transform:
                          top === annotationTooltip.y + 16
                            ? "translate(-50%, 0)"
                            : "translate(-50%, -100%)",
                        pointerEvents: "none",
                        zIndex: 5,
                        maxWidth: width - 8,
                      }}
                    >
                      {annotationTooltip.content}
                    </div>
                  );
                })()}
            </div>
            {isLegendVertical && legendPosition === "right" && legendEl}
            {isHorizontalLegend && legendPosition === "bottom" && legendEl}
          </div>
        );
      }}
    </ResponsiveContainer>
  );
});
