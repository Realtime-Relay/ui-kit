import React, { useEffect, useMemo, useRef, useState } from "react";
import { RelayApp } from "relayx-app-js";
import {
  TimeSeries,
  RelayProvider,
  useRelayTimeSeries,
  useRelayConnection,
} from "@relayx/ui";
import type { Annotation, DataPoint } from "@relayx/ui";
import { useConfig } from "../hooks/useConfig";

/* ──────────────── Card wrapper ──────────────── */

function Card({
  title,
  description,
  children,
  height = 300,
  resizable = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  height?: number;
  resizable?: boolean;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 16,
        ...(resizable
          ? {
              resize: "both",
              overflow: "auto",
              minWidth: 300,
              minHeight: 200,
              width: "100%",
              height: height + 60,
            }
          : {}),
      }}
    >
      <div
        style={{
          fontWeight: 600,
          marginBottom: 4,
          fontSize: 13,
          color: "#6b7280",
        }}
      >
        {title}
      </div>
      {description && (
        <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>
          {description}
        </div>
      )}
      <div style={{ height }}>{children}</div>
      {resizable && (
        <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>
          drag corner to resize
        </div>
      )}
    </div>
  );
}

/* ──────────────── Annotation Mode Section ──────────────── */

interface AnnotateEvent {
  id: number;
  annotationId: number;
  timestamp: number;
  type: "click" | "start_drag" | "end_drag";
  time: string;
}

function AnnotationModeSection({
  data,
  metricKey,
}: {
  data: Record<string, DataPoint[]>;
  metricKey: string;
}) {
  const [enabled, setEnabled] = useState(false);
  const [events, setEvents] = useState<AnnotateEvent[]>([]);
  const [hoverLog, setHoverLog] = useState<string[]>([]);
  const [userAnnotations, setUserAnnotations] = useState<Annotation[]>([]);
  const dragStartRef = useRef<number | null>(null);
  const nextId = useRef(0);

  const handleAnnotate = (
    annotationId: number,
    ts: number,
    type: "click" | "start_drag" | "end_drag",
  ) => {
    const evt: AnnotateEvent = {
      id: nextId.current++,
      annotationId,
      timestamp: ts,
      type,
      time: new Date(ts).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 2,
      } as any),
    };
    setEvents((prev) => [evt, ...prev].slice(0, 50));

    if (type === "start_drag") {
      dragStartRef.current = ts;
    } else if (type === "click") {
      setUserAnnotations((prev) => [
        ...prev,
        {
          timestamp: ts,
          label: `P${prev.length + 1}`,
          color: "#3b82f6",
          data: {
            id: annotationId,
            type: "point",
            createdAt: new Date(ts).toISOString(),
            note: `User clicked at ${new Date(ts).toLocaleTimeString()}`,
          },
        },
      ]);
      dragStartRef.current = null;
    } else if (type === "end_drag" && dragStartRef.current != null) {
      const start = Math.min(dragStartRef.current, ts);
      const end = Math.max(dragStartRef.current, ts);
      setUserAnnotations((prev) => [
        ...prev,
        {
          start,
          end,
          label: `R${prev.length + 1}`,
          color: "#8b5cf6",
          data: {
            id: annotationId,
            type: "range",
            durationMs: end - start,
            note: `User selected ${((end - start) / 1000).toFixed(1)}s range`,
          },
        },
      ]);
      dragStartRef.current = null;
    }
  };

  return (
    <>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        Annotation Mode
      </h2>
      <p style={{ color: "#6b7280", marginBottom: 16, fontSize: 13 }}>
        Toggle annotation mode on. Click = point annotation, drag = range
        annotation. Zoom is disabled while active.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setEnabled((v) => !v)}
          style={{
            padding: "6px 16px",
            borderRadius: 6,
            border: "none",
            background: enabled ? "#f59e0b" : "#e5e7eb",
            color: enabled ? "#fff" : "#374151",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {enabled ? "✏️ Annotation Mode ON" : "Annotation Mode OFF"}
        </button>
        <button
          onClick={() => {
            setUserAnnotations([]);
            setEvents([]);
          }}
          style={{
            padding: "6px 16px",
            borderRadius: 6,
            border: "1px solid #d1d5db",
            background: "#fff",
            color: "#374151",
            cursor: "pointer",
          }}
        >
          Clear All
        </button>
      </div>

      {/* Chart with tooltip on annotation hover */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <Card
          title="Interactive Annotation Chart"
          description={
            enabled
              ? "Click or drag to annotate — hover annotations to see data tooltip"
              : "Enable annotation mode above"
          }
          height={300}
        >
          <TimeSeries
            data={data}
            metricKey={metricKey}
            annotationMode={enabled}
            onAnnotate={handleAnnotate}
            annotationColor="#f59e0b"
            annotations={userAnnotations}
            zoomEnabled={true}
            onAnnotationHover={(hover, ann) => {
              if (!hover || !ann.data) return;
              return (
                <div
                  style={{
                    background: "#1f2937",
                    color: "#f9fafb",
                    padding: "8px 12px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontFamily: "monospace",
                    whiteSpace: "pre-wrap",
                    maxWidth: 300,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      marginBottom: 4,
                      color: "#f59e0b",
                    }}
                  >
                    {ann.label ?? "Annotation"}
                  </div>
                  {JSON.stringify(ann.data, null, 2)}
                </div>
              );
            }}
          />
        </Card>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 12,
            height: 340,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: 13,
              marginBottom: 8,
              color: "#374151",
            }}
          >
            onAnnotate() Event Log
          </div>
          <div
            style={{
              flex: 1,
              overflow: "auto",
              fontFamily: "monospace",
              fontSize: 11,
              lineHeight: "1.6",
            }}
          >
            {events.length === 0 && (
              <div style={{ color: "#9ca3af", padding: 8 }}>
                No events yet. Enable annotation mode and interact with the
                chart.
              </div>
            )}
            {events.map((e) => (
              <div
                key={e.id}
                style={{
                  padding: "2px 4px",
                  borderBottom: "1px solid #f3f4f6",
                  color:
                    e.type === "click"
                      ? "#3b82f6"
                      : e.type === "start_drag"
                        ? "#f59e0b"
                        : "#8b5cf6",
                }}
              >
                <span style={{ fontWeight: 600 }}>
                  #{e.annotationId} {e.type}
                </span>{" "}
                <span style={{ color: "#6b7280" }}>{e.time}</span>{" "}
                <span style={{ color: "#9ca3af", fontSize: 10 }}>
                  ts={e.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart with log-only hover (no tooltip) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
          marginBottom: 40,
        }}
      >
        <Card
          title="Annotation Hover — Log Only"
          description="onAnnotationHover prints data to the log, returns nothing (no tooltip)"
          height={300}
        >
          <TimeSeries
            data={data}
            metricKey={metricKey}
            annotations={userAnnotations}
            onAnnotationHover={(hover, ann) => {
              const prefix = hover ? "🟢 hover" : "⚪ leave";
              const dataStr = ann.data ? JSON.stringify(ann.data) : "(no data)";
              setHoverLog((prev) =>
                [`${prefix} ${ann.label ?? "?"}: ${dataStr}`, ...prev].slice(
                  0,
                  30,
                ),
              );
              // return nothing — no tooltip
            }}
          />
        </Card>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 12,
            height: 340,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: 13,
              marginBottom: 8,
              color: "#374151",
            }}
          >
            onAnnotationHover() Log
          </div>
          <div
            style={{
              flex: 1,
              overflow: "auto",
              fontFamily: "monospace",
              fontSize: 11,
              lineHeight: "1.6",
            }}
          >
            {hoverLog.length === 0 && (
              <div style={{ color: "#9ca3af", padding: 8 }}>
                Hover over an annotation on the left chart to see events here.
              </div>
            )}
            {hoverLog.map((line, i) => (
              <div
                key={i}
                style={{
                  padding: "2px 4px",
                  borderBottom: "1px solid #f3f4f6",
                  color: "#374151",
                }}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ──────────────── Entry point ──────────────── */

export function TimeSeriesDemo() {
  const { config, isConfigured } = useConfig();

  if (!isConfigured) {
    return (
      <div
        style={{
          padding: 32,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 16,
          color: "#6b7280",
        }}
      >
        <div style={{ fontSize: 48 }}>&#9881;</div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#111827" }}>
          Configuration Required
        </h2>
        <p>
          Go to Settings and enter your RelayX credentials + device ident +
          metrics.
        </p>
      </div>
    );
  }

  return <LiveWrapper config={config} />;
}

function LiveWrapper({ config }: { config: any }) {
  const app = useMemo(
    () =>
      new RelayApp({
        api_key: config.apiKey,
        secret: config.secret,
        mode: config.mode,
      }),
    [config.apiKey, config.secret, config.mode],
  );

  return (
    <RelayProvider app={app as any}>
      <LivePage deviceIdent={config.deviceIdent} metrics={config.metrics} />
    </RelayProvider>
  );
}

function LivePage({
  deviceIdent,
  metrics,
}: {
  deviceIdent: string;
  metrics: string[];
}) {
  const { isConnected } = useRelayConnection();
  const firstMetric = metrics[0] ?? "value";

  const [timeRange] = useState(() => ({
    start: new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString(),
    end: new Date().toISOString(),
  }));

  const { data } = useRelayTimeSeries({
    deviceIdent,
    metrics,
    timeRange,
    mode: "historical",
  });

  const { data: realtimeData } = useRelayTimeSeries({
    deviceIdent,
    metrics,
    timeRange,
    mode: "realtime",
  });

  // Hover/release state display
  const [hoverInfo, setHoverInfo] = useState<string>(
    "Hover over a chart to see events here.",
  );

  // Zone transition log
  const [zoneLog, setZoneLog] = useState<string[]>([]);

  // 7 days of mock data — one reading per hour (168 points) for two metrics.
  const sevenDayData: Record<string, DataPoint[]> = useMemo(() => {
    const COUNT = 24 * 7;
    const NOW = Date.now();
    return {
      "weather-station": Array.from({ length: COUNT }, (_, i) => {
        const t = i / COUNT;
        return {
          timestamp: NOW - (COUNT - i) * 3600_000,
          temperature:
            18 +
            Math.sin((i / 24) * 2 * Math.PI) * 6 +
            Math.sin(t * Math.PI) * 3,
          humidity:
            55 +
            Math.cos((i / 24) * 2 * Math.PI) * 12 +
            Math.cos(t * Math.PI * 2) * 5,
        };
      }),
    };
  }, []);

  // Build multi-device data by offsetting
  const singleDeviceData: Record<string, DataPoint[]> = useMemo(
    () => ({ [deviceIdent]: data }),
    [deviceIdent, data],
  );

  const realtimeDeviceData: Record<string, DataPoint[]> = useMemo(
    () => ({ [deviceIdent]: realtimeData }),
    [deviceIdent, realtimeData],
  );

  const multiDeviceData: Record<string, DataPoint[]> = useMemo(
    () => ({
      [deviceIdent]: data,
      [`${deviceIdent}-zone-b`]: data.map((p) => ({
        ...p,
        [firstMetric]: Number(p[firstMetric] ?? 0) * 0.7,
      })),
      [`${deviceIdent}-zone-c`]: data.map((p) => ({
        ...p,
        [firstMetric]: Number(p[firstMetric] ?? 0) * 1.3,
      })),
    }),
    [data, deviceIdent, firstMetric],
  );

  // Fixed absolute timestamps — set once when we first have enough data.
  // These stay put while the x-axis scrolls, showing annotations drifting left over time.
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  useEffect(() => {
    if (annotations.length > 0 || data.length < 20) return;
    const now = Date.now();
    setAnnotations([
      { timestamp: now, label: "Snapshot", color: "#3b82f6" },
      {
        start: now - 5000,
        end: now + 5000,
        label: "Active Window",
        color: "#f59e0b",
      },
    ]);
  }, [data.length, annotations.length]);

  return (
    <div style={{ padding: 32, maxWidth: 1400, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        Time Series
      </h1>
      <p style={{ color: "#6b7280", marginBottom: 16 }}>
        Live <strong>{firstMetric}</strong> data from{" "}
        <strong>{deviceIdent}</strong>. All charts use the same data with
        different configurations.
      </p>

      {/* Connection status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
          padding: "8px 16px",
          borderRadius: 8,
          fontSize: 13,
          backgroundColor: isConnected ? "#f0fdf4" : "#fffbeb",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: isConnected ? "#22c55e" : "#f59e0b",
          }}
        />
        <span style={{ color: isConnected ? "#16a34a" : "#d97706" }}>
          {isConnected ? `Connected to ${deviceIdent}` : "Connecting..."}
        </span>
        <span style={{ marginLeft: "auto", color: "#9ca3af", fontSize: 12 }}>
          {data.length} points
        </span>
      </div>

      {/* Hover/Release display */}
      <div
        style={{
          padding: "8px 16px",
          marginBottom: 24,
          borderRadius: 8,
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          fontSize: 13,
          fontFamily: "monospace",
          minHeight: 32,
        }}
      >
        {hoverInfo}
      </div>

      {/* ── 7 Day Mock ── */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        7 Day Range (Mock)
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
          marginBottom: 40,
        }}
      >
        <Card
          title="Weather station — 7 days"
          description="168 hourly points across two metrics (temperature, humidity), generated from sine/cosine waves."
        >
          <TimeSeries
            data={sevenDayData}
            metrics={[
              { key: "temperature", label: "Temperature (°C)" },
              { key: "humidity", label: "Humidity (%)" },
            ]}
            showLegend
            legendPosition="bottom"
          />
        </Card>
      </div>

      {/* ── Basic ── */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Basic</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
          marginBottom: 40,
        }}
      >
        <Card
          title="Single Device — Line"
          description="Basic line chart with default settings + onHover/onRelease"
        >
          <TimeSeries
            data={singleDeviceData}
            metricKey={firstMetric}
            onHover={(pt) => {
              if (pt)
                setHoverInfo(
                  `onHover: ${pt.metric} = ${pt.value.toFixed(2)} @ ${new Date(pt.timestamp).toLocaleTimeString()}`,
                );
            }}
            onRelease={(pt) => {
              setHoverInfo(
                pt
                  ? `onRelease: ${pt.metric} = ${pt.value.toFixed(2)}`
                  : "onRelease: null",
              );
            }}
          />
        </Card>

        <Card
          title="Single Device — Area"
          description="Area fill under the line"
        >
          <TimeSeries data={singleDeviceData} metricKey={firstMetric} area />
        </Card>

        <Card
          title="Single Device — Area Custom Color"
          description="Purple area fill"
        >
          <TimeSeries
            data={singleDeviceData}
            metricKey={firstMetric}
            area
          />
        </Card>
      </div>

      {/* ── Multi-Device ── */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        Multi-Device
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
          marginBottom: 40,
        }}
      >
        <Card
          title="3 Devices — Default Legend"
          description="Auto legend: [device]: metric"
        >
          <TimeSeries data={multiDeviceData} metricKey={firstMetric} />
        </Card>

        <Card
          title="3 Devices — Custom Legend Format"
          description="formatLegend callback"
        >
          <TimeSeries
            data={multiDeviceData}
            metricKey={firstMetric}
            formatLegend={(device, metric) =>
              `${device.split("-").pop()} / ${metric}`
            }
          />
        </Card>

        <Card
          title="3 Devices — Area"
          description="Multi-device with area fill"
        >
          <TimeSeries data={multiDeviceData} metricKey={firstMetric} area />
        </Card>
      </div>

      {/* ── Line Thickness & Points ── */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        Line Thickness & Points
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 40,
        }}
      >
        <Card title="Thick Lines (4px)" height={250}>
          <TimeSeries
            data={singleDeviceData}
            metricKey={firstMetric}
            lineThickness={4}
          />
        </Card>

        <Card title="Thin Lines (1px)" height={250}>
          <TimeSeries
            data={singleDeviceData}
            metricKey={firstMetric}
            lineThickness={1}
          />
        </Card>

        <Card title="With Points (r=3)" height={250}>
          <TimeSeries
            data={singleDeviceData}
            metricKey={firstMetric}
            pointSize={3}
          />
        </Card>

        <Card title="Large Points (r=5) + Thin Line" height={250}>
          <TimeSeries
            data={singleDeviceData}
            metricKey={firstMetric}
            pointSize={5}
            lineThickness={1}
          />
        </Card>
      </div>

      {/* ── Annotations ── */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        Annotations
      </h2>
      <p style={{ color: "#6b7280", marginBottom: 16, fontSize: 13 }}>
        Fixed-timestamp annotations drift left as the live window scrolls right
        (30s window).
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
          marginBottom: 40,
        }}
      >
        <Card
          title="Point + Range Annotations (no timeWindow)"
          description="Annotations drift left as data extent grows"
        >
          <TimeSeries
            data={singleDeviceData}
            metricKey={firstMetric}
            annotations={annotations}
          />
        </Card>

        <Card
          title="Annotations with timeWindow (30s)"
          description="Realtime stream only — autoscroll pinned to latest data point"
        >
          <TimeSeries
            data={realtimeDeviceData}
            metricKey={firstMetric}
            annotations={annotations}
            timeWindow={30000}
          />
        </Card>
      </div>

      {/* ── Zoom ── */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Zoom</h2>
      <p style={{ color: "#6b7280", marginBottom: 16, fontSize: 13 }}>
        Click and drag horizontally to zoom into a time range. A "Reset zoom"
        button appears.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
          marginBottom: 40,
        }}
      >
        <Card
          title="Zoomable (default)"
          description="Click-drag to select a time range"
        >
          <TimeSeries data={singleDeviceData} metricKey={firstMetric} />
        </Card>

        <Card
          title="Zoom Disabled"
          description="zoomEnabled=false — no brush interaction"
        >
          <TimeSeries
            data={singleDeviceData}
            metricKey={firstMetric}
            zoomEnabled={false}
          />
        </Card>

        <Card
          title="Fixed Time Range"
          description="start/end props override zoom and data extent"
        >
          <TimeSeries
            data={singleDeviceData}
            metricKey={firstMetric}
            start={Date.now() - 3 * 60_000}
            end={Date.now() - 1 * 60_000}
          />
        </Card>
      </div>

      {/* ── Legend Positions ── */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        Legend Positions
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 40,
        }}
      >
        <Card title="Legend Top" height={250}>
          <TimeSeries
            data={multiDeviceData}
            metricKey={firstMetric}
            legendPosition="top"
          />
        </Card>

        <Card title="Legend Bottom (default)" height={250}>
          <TimeSeries
            data={multiDeviceData}
            metricKey={firstMetric}
            legendPosition="bottom"
          />
        </Card>

        <Card title="Legend Left" height={250}>
          <TimeSeries
            data={multiDeviceData}
            metricKey={firstMetric}
            legendPosition="left"
          />
        </Card>

        <Card title="Legend Right" height={250}>
          <TimeSeries
            data={multiDeviceData}
            metricKey={firstMetric}
            legendPosition="right"
          />
        </Card>

        <Card title="No Legend" height={250}>
          <TimeSeries
            data={singleDeviceData}
            metricKey={firstMetric}
            showLegend={false}
          />
        </Card>

        <Card title="Custom Legend Style" height={250}>
          <TimeSeries
            data={multiDeviceData}
            metricKey={firstMetric}
            styles={{
              legend: { fontSize: 14, fontWeight: 700, color: "#1e293b" },
            }}
          />
        </Card>
      </div>

      {/* ── Styles ── */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        Style Overrides
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 40,
        }}
      >
        <Card title="Dark Theme" height={250}>
          <TimeSeries
            data={multiDeviceData}
            metricKey={firstMetric}
            styles={{
              background: { color: "#0f172a" },
              axis: { color: "#94a3b8" },
              legend: { color: "#e2e8f0" },
            }}
          />
        </Card>

        <Card title="With Title" height={250}>
          <TimeSeries
            data={singleDeviceData}
            metricKey={firstMetric}
            title={`${firstMetric} — ${deviceIdent}`}
          />
        </Card>

        <Card title="No Grid" height={250}>
          <TimeSeries
            data={singleDeviceData}
            metricKey={firstMetric}
            showGrid={false}
          />
        </Card>

        <Card title="Custom Grid" height={250}>
          <TimeSeries
            data={singleDeviceData}
            metricKey={firstMetric}
            gridColor="#dbeafe"
            gridThickness={2}
          />
        </Card>
      </div>

      {/* ── Alert Zones ── */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        Alert Zones
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
          marginBottom: 40,
        }}
      >
        <Card
          title="Two Alert Zones"
          description="Green normal zone, red critical zone"
        >
          <TimeSeries
            data={singleDeviceData}
            metricKey={firstMetric}
            alertZones={[
              { min: 0, max: 30, color: "#22c55e", label: "Normal" },
              { min: 70, max: 100, color: "#ef4444", label: "Critical" },
            ]}
          />
        </Card>

        <Card
          title="Alert Zones + Annotations"
          description="Zones and annotations on the same chart"
        >
          <TimeSeries
            data={singleDeviceData}
            metricKey={firstMetric}
            alertZones={[
              { min: 0, max: 30, color: "#22c55e" },
              { min: 70, max: 100, color: "#ef4444" },
            ]}
            annotations={annotations}
          />
        </Card>
      </div>

      {/* ── Zone Transition Callback ── */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        Zone Transition (onZoneChange)
      </h2>
      <p style={{ color: "#6b7280", marginBottom: 16, fontSize: 13 }}>
        When the latest data point crosses a zone boundary, onZoneChange fires.
        Watch the log as live data moves between zones.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
          marginBottom: 40,
        }}
      >
        <Card
          title="Alert Zones + onZoneChange (multi-device)"
          description="Green (0-30), Warning (30-70), Critical (70-100) — log shows device + metric"
        >
          <TimeSeries
            data={multiDeviceData}
            metricKey={firstMetric}
            alertZones={[
              { min: 0, max: 30, color: "#22c55e", label: "Normal" },
              { min: 30, max: 70, color: "#f59e0b", label: "Warning" },
              { min: 70, max: 100, color: "#ef4444", label: "Critical" },
            ]}
            onZoneChange={(transition) => {
              const prev = transition.previousZone?.label ?? "none";
              const curr = transition.currentZone?.label ?? "none";
              setZoneLog((log) =>
                [
                  `[${transition.device}] ${transition.metric}: ${prev} → ${curr} (${transition.value.toFixed(2)})`,
                  ...log,
                ].slice(0, 30),
              );
            }}
          />
        </Card>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 12,
            height: 340,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: 13,
              marginBottom: 8,
              color: "#374151",
            }}
          >
            onZoneChange() Log
          </div>
          <div
            style={{
              flex: 1,
              overflow: "auto",
              fontFamily: "monospace",
              fontSize: 11,
              lineHeight: "1.6",
            }}
          >
            {zoneLog.length === 0 && (
              <div style={{ color: "#9ca3af", padding: 8 }}>
                Waiting for zone transitions...
              </div>
            )}
            {zoneLog.map((line, i) => (
              <div
                key={i}
                style={{
                  padding: "2px 4px",
                  borderBottom: "1px solid #f3f4f6",
                  color: "#374151",
                }}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Custom Timestamp Formatting ── */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        Custom Timestamp (formatTimestamp)
      </h2>
      <p style={{ color: "#6b7280", marginBottom: 16, fontSize: 13 }}>
        Override the default tooltip timestamp display. Hover over the charts to
        see different formats.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 40,
        }}
      >
        <Card
          title="ISO 8601"
          description="formatTimestamp returns ISO string"
          height={250}
        >
          <TimeSeries
            data={singleDeviceData}
            metricKey={firstMetric}
            formatTimestamp={(ts) => new Date(ts).toISOString()}
          />
        </Card>
        <Card
          title="Relative Time"
          description="formatTimestamp shows 'Xs ago'"
          height={250}
        >
          <TimeSeries
            data={singleDeviceData}
            metricKey={firstMetric}
            formatTimestamp={(ts) => {
              const diff = Math.round((Date.now() - ts) / 1000);
              if (diff < 60) return `${diff}s ago`;
              if (diff < 3600)
                return `${Math.floor(diff / 60)}m ${diff % 60}s ago`;
              return `${Math.floor(diff / 3600)}h ago`;
            }}
          />
        </Card>
        <Card
          title="Custom Format"
          description="DD/MM HH:mm:ss.SSS"
          height={250}
        >
          <TimeSeries
            data={singleDeviceData}
            metricKey={firstMetric}
            formatTimestamp={(ts) => {
              const d = new Date(ts);
              return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}.${d.getMilliseconds().toString().padStart(3, "0")}`;
            }}
          />
        </Card>
        <Card
          title="Default (no formatTimestamp)"
          description="Uses toLocaleDateString + toLocaleTimeString"
          height={250}
        >
          <TimeSeries data={singleDeviceData} metricKey={firstMetric} />
        </Card>
      </div>

      {/* ── Custom Fonts ── */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        Custom Fonts
      </h2>
      <p style={{ color: "#6b7280", marginBottom: 16, fontSize: 13 }}>
        Customize fonts for title, legend, tooltip, and axis via the styles
        prop.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 40,
        }}
      >
        <Card
          title="Monospace Everything"
          description="All text elements use monospace"
          height={300}
        >
          <TimeSeries
            data={singleDeviceData}
            metricKey={firstMetric}
            title="Monospace Chart"
            styles={{
              title: {
                fontFamily: "Courier New, monospace",
                fontSize: 16,
                fontWeight: 700,
                color: "#1e293b",
              },
              legend: {
                fontFamily: "Courier New, monospace",
                fontSize: 11,
                fontWeight: 500,
              },
              tooltip: { fontFamily: "Courier New, monospace", fontSize: 11 },
              axis: {
                fontFamily: "Courier New, monospace",
                fontSize: 10,
                color: "#64748b",
              },
            }}
          />
        </Card>
        <Card
          title="Serif + Large Legend"
          description="Georgia for legend, system for rest"
          height={300}
        >
          <TimeSeries
            data={multiDeviceData}
            metricKey={firstMetric}
            styles={{
              legend: {
                fontFamily: "Georgia, serif",
                fontSize: 14,
                fontWeight: 600,
                color: "#7c3aed",
              },
              title: {
                fontFamily: "Georgia, serif",
                fontSize: 18,
                fontWeight: 700,
              },
            }}
            title="Serif Legend"
          />
        </Card>
        <Card
          title="Small Axis, Bold Tooltip"
          description="Custom per-element font styling"
          height={300}
        >
          <TimeSeries
            data={singleDeviceData}
            metricKey={firstMetric}
            styles={{
              axis: { fontSize: 8, fontWeight: 300, color: "#94a3b8" },
              tooltip: {
                fontFamily: "system-ui",
                fontSize: 14,
                fontWeight: 700,
              },
              legend: { fontSize: 10 },
            }}
          />
        </Card>
        <Card
          title="Colorful Text"
          description="Different colors per text element"
          height={300}
        >
          <TimeSeries
            data={singleDeviceData}
            metricKey={firstMetric}
            title="Colorful"
            styles={{
              title: { color: "#dc2626", fontWeight: 800 },
              legend: { color: "#7c3aed" },
              axis: { color: "#059669" },
              background: { color: "#fefce8" },
            }}
          />
        </Card>
      </div>

      {/* ── Annotation Mode ── */}
      <AnnotationModeSection data={singleDeviceData} metricKey={firstMetric} />

      {/* ── Zoom Color ── */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        Custom Zoom Color
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 40,
        }}
      >
        <Card
          title="Red Zoom Brush"
          description="zoomColor='#ef4444'"
          height={250}
        >
          <TimeSeries
            data={singleDeviceData}
            metricKey={firstMetric}
            zoomColor="#ef4444"
          />
        </Card>
        <Card
          title="Green Zoom Brush"
          description="zoomColor='#22c55e'"
          height={250}
        >
          <TimeSeries
            data={singleDeviceData}
            metricKey={firstMetric}
            zoomColor="#22c55e"
          />
        </Card>
      </div>

      {/* ── Resizable ── */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        Resizable
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
          marginBottom: 40,
        }}
      >
        <Card title="Resizable Chart" resizable height={300}>
          <TimeSeries
            data={multiDeviceData}
            metricKey={firstMetric}
            annotations={annotations}
          />
        </Card>
      </div>

      {/* ── Edge Cases ── */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        Edge Cases
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 40,
        }}
      >
        <Card
          title="Empty Data"
          description="Shows loading skeleton"
          height={200}
        >
          <TimeSeries data={{}} />
        </Card>

        <Card
          title="Empty, Loading Disabled"
          description="Renders nothing"
          height={200}
        >
          <TimeSeries data={{}} showLoading={false} />
        </Card>
      </div>
    </div>
  );
}
