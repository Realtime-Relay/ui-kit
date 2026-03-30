import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { scaleTime } from "d3";
import type { DataPoint, FontStyle, BackgroundStyle } from "../utils/types";
import { ResponsiveContainer } from "../charts/shared/ResponsiveContainer";
import { resolveFont } from "../utils/useResolvedStyles";
import { ChartSkeleton } from "../charts/shared/Skeleton";
import { isValidTimestamp, type ComponentError } from "../utils/validation";
import { getStateColor, groupStateEntries } from "./stateUtils";
import type { StateEntry } from "./stateUtils";

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
  labelAlign?: "left" | "right";
  showLoading?: boolean;
  onError?: (error: ComponentError) => void;
}

/** Hit region stored during canvas draw for mouse interaction */
interface HitRect {
  x: number;
  y: number;
  w: number;
  h: number;
  entry: StateEntry;
  deviceName: string;
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
  labelAlign = "left",
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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hitRectsRef = useRef<HitRect[]>([]);

  const deviceNames = useMemo(() => Object.keys(data), [data]);

  // Validate and filter data per device
  const validDataMap = useMemo(() => {
    if (!onError) return data;
    const result: Record<string, DataPoint[]> = {};
    for (const name of deviceNames) {
      result[name] = (data[name] ?? []).filter((point) => {
        if (!isValidTimestamp(point.timestamp)) {
          onError({
            type: "invalid_timestamp",
            message: `StateTimeline [${name}]: invalid timestamp, received ${point.timestamp}`,
            rawValue: point.timestamp,
            component: "StateTimeline",
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
        const keys = Object.keys(points[0]).filter((k) => k !== "timestamp");
        if (keys.length > 0) return keys[0];
      }
    }
    return "";
  }, [validDataMap, deviceNames, metricKeyProp]);

  // Group state entries per device
  const entriesMap = useMemo(() => {
    const result: Record<string, StateEntry[]> = {};
    for (const name of deviceNames) {
      result[name] = groupStateEntries(
        validDataMap[name] ?? [],
        metricKey,
        stateMapper,
      );
    }
    return result;
  }, [validDataMap, deviceNames, metricKey, stateMapper]);

  // Global time domain — data is pre-sorted, just check first/last
  const globalExtent = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const name of deviceNames) {
      const points = validDataMap[name];
      if (!points || points.length === 0) continue;
      const first = points[0].timestamp;
      const last = points[points.length - 1].timestamp;
      if (first < min) min = first;
      if (last > max) max = last;
    }
    if (min === Infinity) return null;
    return [min, max] as [number, number];
  }, [validDataMap, deviceNames]);

  // Unique states for legend + consistent color indexing
  const uniqueStates = useMemo(() => {
    const set = new Set<string>();
    for (const name of deviceNames) {
      for (const e of entriesMap[name] ?? []) {
        set.add(e.state);
      }
    }
    return Array.from(set);
  }, [entriesMap, deviceNames]);

  // No devices — show skeleton
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
      style={{ backgroundColor: styles?.background?.color ?? "transparent" }}
    >
      {({ width }) => {
        const BAR_HEIGHT = rowHeightProp ?? 28;
        const ROW_GAP = 6;
        const LABEL_GAP = 8;
        const X_AXIS_HEIGHT = 20;
        const LEGEND_HEIGHT = 24;
        const MARGIN = { top: 8, right: 12, bottom: 8, left: 12 };

        const rowLabelFontSize = rowLabelStyleR?.fontSize ?? 12;
        const rowLabelFontFamily =
          rowLabelStyleR?.fontFamily ?? "system-ui, sans-serif";
        const rowLabelFontWeight = rowLabelStyleR?.fontWeight ?? 500;
        const rowLabelColor = rowLabelStyleR?.color ?? "#374151";
        const axisLabelFontSize = labelStyleR?.fontSize ?? 11;
        const axisLabelFontFamily =
          labelStyleR?.fontFamily ?? "system-ui, sans-serif";
        const axisLabelColor = labelStyleR?.color ?? "#9ca3af";
        const emptyRowColor = styles?.emptyRowColor ?? "#f3f4f6";

        // Measure label width using an offscreen canvas
        const labelFont = `${rowLabelFontWeight} ${rowLabelFontSize}px ${rowLabelFontFamily}`;
        let maxLabelWidth = 0;
        const offscreen = document.createElement("canvas").getContext("2d");
        if (offscreen) {
          offscreen.font = labelFont;
          for (const name of deviceNames) {
            const w = offscreen.measureText(name).width;
            if (w > maxLabelWidth) maxLabelWidth = w;
          }
        }
        const LABEL_WIDTH =
          maxLabelWidth > 0 ? Math.ceil(maxLabelWidth) + 16 : 120;

        const chartWidth =
          width - MARGIN.left - LABEL_WIDTH - LABEL_GAP - MARGIN.right;
        if (chartWidth <= 0) return null;

        const labelsOnRight = labelAlign === "right";
        const barsX = labelsOnRight
          ? MARGIN.left
          : MARGIN.left + LABEL_WIDTH + LABEL_GAP;
        const hasData = globalExtent !== null;
        const canvasHeight =
          MARGIN.top +
          rowCount * BAR_HEIGHT +
          (rowCount - 1) * ROW_GAP +
          X_AXIS_HEIGHT +
          MARGIN.bottom;

        const xScale = hasData
          ? scaleTime()
              .domain([new Date(globalExtent[0]), new Date(globalExtent[1])])
              .range([0, chartWidth])
          : null;
        const spansDays = hasData
          ? new Date(globalExtent[0]).toDateString() !==
            new Date(globalExtent[1]).toDateString()
          : false;

        return (
          <CanvasRenderer
            canvasRef={canvasRef}
            hitRectsRef={hitRectsRef}
            width={width}
            canvasHeight={canvasHeight}
            deviceNames={deviceNames}
            entriesMap={entriesMap}
            uniqueStates={uniqueStates}
            xScale={xScale}
            spansDays={spansDays}
            barsX={barsX}
            chartWidth={chartWidth}
            labelsOnRight={labelsOnRight}
            BAR_HEIGHT={BAR_HEIGHT}
            ROW_GAP={ROW_GAP}
            MARGIN={MARGIN}
            LABEL_WIDTH={LABEL_WIDTH}
            labelFont={labelFont}
            rowLabelColor={rowLabelColor}
            axisLabelFontSize={axisLabelFontSize}
            axisLabelFontFamily={axisLabelFontFamily}
            axisLabelColor={axisLabelColor}
            emptyRowColor={emptyRowColor}
            stateColors={stateColors}
            hoveredEntry={hoveredEntry}
            setHoveredEntry={setHoveredEntry}
            // Legend
            hasData={hasData}
            LEGEND_HEIGHT={LEGEND_HEIGHT}
            labelStyleR={labelStyleR}
            // Tooltip
            formatTooltip={formatTooltip}
            renderTooltip={renderTooltip}
            tooltipStyleR={tooltipStyleR}
          />
        );
      }}
    </ResponsiveContainer>
  );
}

/** Inner component that owns the canvas draw effect */
function CanvasRenderer({
  canvasRef,
  hitRectsRef,
  width,
  canvasHeight,
  deviceNames,
  entriesMap,
  uniqueStates,
  xScale,
  spansDays,
  barsX,
  chartWidth,
  labelsOnRight,
  BAR_HEIGHT,
  ROW_GAP,
  MARGIN,
  LABEL_WIDTH,
  labelFont,
  rowLabelColor,
  axisLabelFontSize,
  axisLabelFontFamily,
  axisLabelColor,
  emptyRowColor,
  stateColors,
  hoveredEntry,
  setHoveredEntry,
  hasData,
  LEGEND_HEIGHT,
  labelStyleR,
  formatTooltip,
  renderTooltip,
  tooltipStyleR,
}: any) {
  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = canvasHeight * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, width, canvasHeight);

    const hitRects: HitRect[] = [];
    const rowCount = deviceNames.length;

    for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
      const name = deviceNames[rowIdx];
      const yOffset = MARGIN.top + rowIdx * (BAR_HEIGHT + ROW_GAP);
      const entries: StateEntry[] = entriesMap[name] ?? [];

      // Row label
      ctx.save();
      ctx.font = labelFont;
      ctx.fillStyle = rowLabelColor;
      ctx.textBaseline = "middle";
      if (labelsOnRight) {
        ctx.textAlign = "end";
        ctx.fillText(name, width - MARGIN.right, yOffset + BAR_HEIGHT / 2);
      } else {
        ctx.textAlign = "start";
        ctx.fillText(name, MARGIN.left, yOffset + BAR_HEIGHT / 2);
      }
      ctx.restore();

      // State bars
      if (entries.length === 0) {
        // Empty row background
        ctx.fillStyle = emptyRowColor;
        ctx.fillRect(barsX, yOffset, chartWidth, BAR_HEIGHT);
      } else if (xScale) {
        for (const entry of entries) {
          const x = xScale(new Date(entry.start));
          const w = Math.max(1, xScale(new Date(entry.end)) - x);
          const color = getStateColor(
            entry.state,
            stateColors,
            uniqueStates.indexOf(entry.state),
          );

          const isHovered = hoveredEntry?.entry === entry;
          ctx.globalAlpha = isHovered ? 1 : 0.8;
          ctx.fillStyle = color;
          ctx.fillRect(barsX + x, yOffset, w, BAR_HEIGHT);

          hitRects.push({
            x: barsX + x,
            y: yOffset,
            w,
            h: BAR_HEIGHT,
            entry,
            deviceName: name,
          });
        }
        ctx.globalAlpha = 1;
      }
    }

    // X-axis labels
    if (xScale) {
      const axisY =
        MARGIN.top + rowCount * BAR_HEIGHT + (rowCount - 1) * ROW_GAP + 4;
      const labelWidth = axisLabelFontSize * 7.5;
      const maxTicks = Math.max(
        2,
        Math.floor(chartWidth / (labelWidth + axisLabelFontSize * 2)),
      );
      const tickCount = Math.min(maxTicks, 6);

      ctx.save();
      ctx.font = `${axisLabelFontSize}px ${axisLabelFontFamily}`;
      ctx.fillStyle = axisLabelColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      for (const tick of xScale.ticks(tickCount)) {
        const tx = barsX + xScale(tick);
        const label = spansDays
          ? tick.toLocaleDateString([], { month: "short", day: "numeric" }) +
            " " +
            tick.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : tick.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        ctx.fillText(label, tx, axisY);
      }
      ctx.restore();
    }

    hitRectsRef.current = hitRects;
  }, [
    canvasRef,
    hitRectsRef,
    width,
    canvasHeight,
    deviceNames,
    entriesMap,
    uniqueStates,
    xScale,
    spansDays,
    barsX,
    chartWidth,
    labelsOnRight,
    BAR_HEIGHT,
    ROW_GAP,
    MARGIN,
    LABEL_WIDTH,
    labelFont,
    rowLabelColor,
    axisLabelFontSize,
    axisLabelFontFamily,
    axisLabelColor,
    emptyRowColor,
    stateColors,
    hoveredEntry,
  ]);

  // Mouse handlers
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      for (const hr of hitRectsRef.current) {
        if (
          mx >= hr.x &&
          mx <= hr.x + hr.w &&
          my >= hr.y &&
          my <= hr.y + hr.h
        ) {
          setHoveredEntry({
            entry: hr.entry,
            deviceName: hr.deviceName,
            x: e.clientX,
            y: e.clientY,
          });
          return;
        }
      }
      setHoveredEntry(null);
    },
    [canvasRef, hitRectsRef, setHoveredEntry],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredEntry(null);
  }, [setHoveredEntry]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <canvas
        ref={canvasRef}
        style={{
          width,
          height: canvasHeight,
          cursor: "default",
          display: "block",
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {/* Legend (HTML) */}
      {hasData && uniqueStates.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
            padding: "4px 0",
            fontFamily: labelStyleR?.fontFamily ?? "var(--relay-font-family)",
            fontSize: labelStyleR?.fontSize ?? 11,
            height: LEGEND_HEIGHT,
          }}
        >
          {uniqueStates.map((state: string, i: number) => (
            <div
              key={state}
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  backgroundColor: getStateColor(state, stateColors, i),
                  display: "inline-block",
                }}
              />
              <span style={{ color: labelStyleR?.color ?? "#6b7280" }}>
                {state}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tooltip */}
      {hoveredEntry && (
        <div
          style={{
            position: "fixed",
            left: hoveredEntry.x + 12,
            top: hoveredEntry.y - 10,
            background: "var(--relay-tooltip-bg, #1a1a1a)",
            color: "var(--relay-tooltip-text, #ffffff)",
            borderRadius: "var(--relay-tooltip-border-radius, 4px)",
            padding: "var(--relay-tooltip-padding, 8px 12px)",
            fontSize: tooltipStyleR?.fontSize ?? 12,
            fontFamily: tooltipStyleR?.fontFamily ?? "var(--relay-font-family)",
            pointerEvents: "none",
            zIndex: 1000,
            whiteSpace: "nowrap",
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
                {new Date(hoveredEntry.entry.start).toLocaleTimeString()} –{" "}
                {new Date(hoveredEntry.entry.end).toLocaleTimeString()}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
