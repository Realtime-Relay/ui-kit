import { useMemo, useState, useEffect } from "react";
import { RelayApp } from "@relay-x/app-sdk";
import {
  StateTimeline,
  RelayProvider,
  useRelayTimeSeries,
  useRelayConnection,
} from "@relayx/ui";
import type { StateEntry, DataPoint } from "@relayx/ui";
import { useConfig } from "../hooks/useConfig";

/* ──────────────── Card wrapper ──────────────── */

function Card({
  title,
  description,
  children,
  height = 120,
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
              minHeight: 100,
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
      <div style={{ height, overflow: "hidden" }}>{children}</div>
      {resizable && (
        <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>
          ↘ drag corner to resize
        </div>
      )}
    </div>
  );
}

/* ──────────────── State mappers ──────────────── */

/** Numeric thresholds → three severity levels */
const threeStateMapper = (v: any) => {
  const n = Number(v);
  if (n >= 70) return "critical";
  if (n >= 40) return "warning";
  return "normal";
};

/** Binary online/offline based on a threshold */
const onlineOfflineMapper = (v: any) => (Number(v) > 0 ? "online" : "offline");

/** Five severity levels */
const fiveStateMapper = (v: any) => {
  const n = Number(v);
  if (n >= 90) return "error";
  if (n >= 70) return "critical";
  if (n >= 50) return "warning";
  if (n >= 20) return "running";
  return "idle";
};

/** Temperature-style mapping */
const temperatureMapper = (v: any) => {
  const n = Number(v);
  if (n >= 80) return "hot";
  if (n >= 55) return "warm";
  if (n >= 30) return "normal";
  return "cold";
};

/** Collapse into healthy / degraded / down */
const collapsedMapper = (v: any) => {
  const state = fiveStateMapper(v);
  if (state === "error" || state === "critical") return "down";
  if (state === "warning") return "degraded";
  return "healthy";
};

/* ──────────────── Dynamic devices demo ──────────────── */

function DynamicDevicesDemo({
  data,
  deviceIdent,
  firstMetric,
}: {
  data: DataPoint[];
  deviceIdent: string;
  firstMetric: string;
}) {
  const [deviceCount, setDeviceCount] = useState(1);

  useEffect(() => {
    if (deviceCount >= 3) return;
    const timer = setTimeout(() => setDeviceCount((c) => c + 1), 10_000);
    return () => clearTimeout(timer);
  }, [deviceCount]);

  const dynamicData = useMemo(() => {
    const result: Record<string, DataPoint[]> = {
      [`${deviceIdent}-primary`]: data,
    };
    if (deviceCount >= 2) {
      result[`${deviceIdent}-secondary`] = data.map((p) => ({
        ...p,
        [firstMetric]: Number(p[firstMetric] ?? 0) * 0.6,
      }));
    }
    if (deviceCount >= 3) {
      result[`${deviceIdent}-tertiary`] = data.map((p) => ({
        ...p,
        [firstMetric]: Number(p[firstMetric] ?? 0) * 1.4,
      }));
    }
    return result;
  }, [data, deviceIdent, firstMetric, deviceCount]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 16,
        marginBottom: 40,
      }}
    >
      <Card
        title={`${deviceCount} of 3 devices online`}
        description={
          deviceCount < 3 ? `Next device in 10s…` : "All devices online"
        }
        height={80 + deviceCount * 40}
      >
        <StateTimeline
          data={dynamicData}
          stateMapper={threeStateMapper}
          metricKey={firstMetric}
        />
      </Card>
    </div>
  );
}

/* ──────────────── Entry point ──────────────── */

export function StateTimelineDemo() {
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
    start: new Date(Date.now() - 10 * 24 * 60 * 60_000).toISOString(),
    end: new Date().toISOString(),
  }));

  const { data } = useRelayTimeSeries({
    deviceIdent,
    metrics,
    timeRange,
    mode: "both",
  });

  const singleDeviceData = useMemo(
    () => ({ [deviceIdent]: data }),
    [deviceIdent, data],
  );

  const stackedData = useMemo(
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

  const twoDevices = useMemo(
    () => ({
      [deviceIdent]: data,
      [`${deviceIdent}-backup`]: data.map((p) => ({
        ...p,
        [firstMetric]: Number(p[firstMetric] ?? 0) > 50 ? 0 : 100,
      })),
    }),
    [data, deviceIdent, firstMetric],
  );

  const longNameDevices = useMemo(
    () => ({
      "warehouse-floor-sensor-unit-alpha-01or-unit-alpha-01": data,
      "rooftop-hvac-monitor-bravo-02": data.map((p) => ({
        ...p,
        [firstMetric]: Number(p[firstMetric] ?? 0) * 0.6,
      })),
      "cold-storage-temp-probe-charlie-03": data.map((p) => ({
        ...p,
        [firstMetric]: Number(p[firstMetric] ?? 0) * 1.4,
      })),
    }),
    [data, firstMetric],
  );

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        State Timeline
      </h1>
      <p style={{ color: "#6b7280", marginBottom: 16 }}>
        All timelines reflect live <strong>{firstMetric}</strong> data from{" "}
        <strong>{deviceIdent}</strong>. The same data is rendered with different
        state mappers, colors, and styles.
      </p>

      {/* Connection status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 24,
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
          title="Online / Offline (default colors)"
          description="Binary mapper: value > 0 → online, else offline"
        >
          <StateTimeline
            data={singleDeviceData}
            stateMapper={onlineOfflineMapper}
            metricKey={firstMetric}
          />
        </Card>

        <Card
          title="Three States: Normal / Warning / Critical"
          description="Thresholds at 40 and 70"
        >
          <StateTimeline
            data={singleDeviceData}
            stateMapper={threeStateMapper}
            metricKey={firstMetric}
          />
        </Card>

        <Card
          title="Five States"
          description="idle / running / warning / critical / error — fallback palette kicks in"
        >
          <StateTimeline
            data={singleDeviceData}
            stateMapper={fiveStateMapper}
            metricKey={firstMetric}
          />
        </Card>
      </div>

      {/* ── Custom colors ── */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        Custom Colors
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
          title="Temperature States (custom palette)"
          description="cold → blue, normal → green, warm → orange, hot → red"
        >
          <StateTimeline
            data={singleDeviceData}
            stateMapper={temperatureMapper}
            metricKey={firstMetric}
            stateColors={{
              cold: "#38bdf8",
              normal: "#22c55e",
              warm: "#f97316",
              hot: "#dc2626",
            }}
          />
        </Card>

        <Card
          title="Override default colors"
          description="'online' overridden to purple, 'offline' to slate"
        >
          <StateTimeline
            data={singleDeviceData}
            stateMapper={onlineOfflineMapper}
            metricKey={firstMetric}
            stateColors={{ online: "#8b5cf6", offline: "#475569" }}
          />
        </Card>
      </div>

      {/* ── State mapper ── */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        State Mapper
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
          title="Derived states via mapper"
          description="Five raw states collapsed into healthy / degraded / down"
        >
          <StateTimeline
            data={singleDeviceData}
            metricKey={firstMetric}
            stateMapper={collapsedMapper}
            stateColors={{
              healthy: "#22c55e",
              degraded: "#f59e0b",
              down: "#ef4444",
            }}
          />
        </Card>
      </div>

      {/* ── Tooltips ── */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        Tooltips
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
          title="Default tooltip"
          description="Hover to see state + time range"
        >
          <StateTimeline
            data={singleDeviceData}
            stateMapper={threeStateMapper}
            metricKey={firstMetric}
          />
        </Card>

        <Card
          title="formatTooltip (string)"
          description="Custom string formatter showing duration"
        >
          <StateTimeline
            data={singleDeviceData}
            stateMapper={threeStateMapper}
            metricKey={firstMetric}
            formatTooltip={(entry: StateEntry, _deviceName: string) => {
              const durationSec = Math.round((entry.end - entry.start) / 1000);
              return `${entry.state.toUpperCase()} — ${durationSec}s`;
            }}
          />
        </Card>

        <Card
          title="renderTooltip (JSX)"
          description="Rich tooltip with colored badge"
          height={130}
        >
          <StateTimeline
            data={singleDeviceData}
            stateMapper={threeStateMapper}
            metricKey={firstMetric}
            renderTooltip={(entry: StateEntry, _deviceName: string) => (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: entry.color ?? "#fff",
                      display: "inline-block",
                    }}
                  />
                  <strong>{entry.state}</strong>
                </div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>
                  {new Date(entry.start).toLocaleTimeString()} →{" "}
                  {new Date(entry.end).toLocaleTimeString()}
                </div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>
                  Duration: {Math.round((entry.end - entry.start) / 1000)}s
                </div>
              </div>
            )}
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
        <Card
          title="Dark background"
          description="Dark background with light label colors"
        >
          <StateTimeline
            data={singleDeviceData}
            stateMapper={threeStateMapper}
            metricKey={firstMetric}
            styles={{
              background: { color: "#0f172a" },
              label: { color: "#94a3b8", fontSize: 11 },
              rowLabel: { color: "#e2e8f0" },
              tooltip: { color: "#e2e8f0", fontSize: 12 },
            }}
          />
        </Card>

        <Card
          title="Large labels, custom font"
          description="Bigger axis labels, monospace font"
        >
          <StateTimeline
            data={singleDeviceData}
            stateMapper={threeStateMapper}
            metricKey={firstMetric}
            styles={{
              label: {
                fontSize: 14,
                fontFamily: "monospace",
                color: "#1e293b",
              },
            }}
          />
        </Card>

        <Card title="Subtle background" description="Light gray background">
          <StateTimeline
            data={singleDeviceData}
            stateMapper={onlineOfflineMapper}
            metricKey={firstMetric}
            styles={{ background: { color: "#f8fafc" } }}
          />
        </Card>

        <Card
          title="Warm background + custom tooltip"
          description="Cream background, warm tooltip style"
        >
          <StateTimeline
            data={singleDeviceData}
            stateMapper={temperatureMapper}
            metricKey={firstMetric}
            stateColors={{
              cold: "#38bdf8",
              normal: "#22c55e",
              warm: "#f97316",
              hot: "#dc2626",
            }}
            styles={{
              background: { color: "#fffbeb" },
              label: { color: "#92400e" },
              tooltip: { color: "#78350f", fontSize: 13 },
            }}
          />
        </Card>
      </div>

      {/* ── Edge cases ── */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        Edge Cases
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
          title="Empty data"
          description="Shows loading skeleton when data is empty"
        >
          <StateTimeline
            data={{}}
            stateMapper={threeStateMapper}
            metricKey={firstMetric}
          />
        </Card>

        <Card
          title="Empty data, loading disabled"
          description="showLoading=false with empty data — renders nothing"
        >
          <StateTimeline
            data={{}}
            stateMapper={threeStateMapper}
            metricKey={firstMetric}
            showLoading={false}
          />
        </Card>

        <Card
          title="Devices with empty arrays"
          description="3 devices exist but have no data points"
          height={160}
        >
          <StateTimeline
            data={{
              "sensor-alpha": [],
              "sensor-bravo": [],
              "sensor-charlie": [],
            }}
            stateMapper={threeStateMapper}
            metricKey={firstMetric}
          />
        </Card>

        <Card
          title="Mix of empty and populated"
          description="One device has data, two have empty arrays"
          height={160}
        >
          <StateTimeline
            data={{
              [deviceIdent]: data,
              "sensor-offline-1": [],
              "sensor-offline-2": [],
            }}
            stateMapper={threeStateMapper}
            metricKey={firstMetric}
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
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 40,
        }}
      >
        <Card title="Resizable — Three States" height={120} resizable>
          <StateTimeline
            data={singleDeviceData}
            stateMapper={threeStateMapper}
            metricKey={firstMetric}
          />
        </Card>

        <Card title="Resizable — Dark Theme" height={120} resizable>
          <StateTimeline
            data={singleDeviceData}
            stateMapper={temperatureMapper}
            metricKey={firstMetric}
            stateColors={{
              cold: "#38bdf8",
              normal: "#22c55e",
              warm: "#f97316",
              hot: "#dc2626",
            }}
            styles={{
              background: { color: "#0f172a" },
              label: { color: "#94a3b8" },
              rowLabel: { color: "#e2e8f0" },
            }}
          />
        </Card>
      </div>

      {/* ── Stacked ── */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        Stacked (Multi-Device)
      </h2>
      <p style={{ color: "#6b7280", marginBottom: 16, fontSize: 13 }}>
        Same live data simulated across multiple devices with value offsets.
      </p>
      {(() => {
        return (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 16,
              marginBottom: 40,
            }}
          >
            <Card
              title="3 Devices — Three State Mapper"
              description="Same metric with value offsets across zones"
              height={160}
            >
              <StateTimeline
                data={stackedData}
                stateMapper={threeStateMapper}
                metricKey={firstMetric}
              />
            </Card>

            <Card
              title="3 Devices — Custom Temperature Colors"
              description="Temperature palette across devices"
              height={160}
            >
              <StateTimeline
                data={stackedData}
                stateMapper={temperatureMapper}
                metricKey={firstMetric}
                stateColors={{
                  cold: "#38bdf8",
                  normal: "#22c55e",
                  warm: "#f97316",
                  hot: "#dc2626",
                }}
              />
            </Card>

            <Card
              title="2 Devices — Online / Offline"
              description="Primary vs backup device"
              height={120}
            >
              <StateTimeline
                data={twoDevices}
                stateMapper={onlineOfflineMapper}
                metricKey={firstMetric}
              />
            </Card>

            <Card
              title="Single Device (graceful fallback)"
              description="One device renders as a labeled single row"
              height={90}
            >
              <StateTimeline
                data={singleDeviceData}
                stateMapper={threeStateMapper}
                metricKey={firstMetric}
              />
            </Card>

            <Card
              title="Tall Rows (rowHeight=48)"
              description="Larger row height for better readability with many states"
              height={240}
            >
              <StateTimeline
                data={stackedData}
                stateMapper={fiveStateMapper}
                metricKey={firstMetric}
                rowHeight={48}
              />
            </Card>

            <Card
              title="Single Device — Temperature"
              description="StateTimeline with a single device entry and custom colors"
              height={90}
            >
              <StateTimeline
                data={singleDeviceData}
                stateMapper={temperatureMapper}
                metricKey={firstMetric}
                stateColors={{
                  cold: "#38bdf8",
                  normal: "#22c55e",
                  warm: "#f97316",
                  hot: "#dc2626",
                }}
              />
            </Card>

            <Card
              title="Resizable Stacked"
              description="Drag the corner to resize and observe responsive behavior"
              height={160}
              resizable
            >
              <StateTimeline
                data={stackedData}
                stateMapper={threeStateMapper}
                metricKey={firstMetric}
              />
            </Card>

            <Card
              title="Dark Theme Stacked"
              description="3 devices with dark background"
              height={180}
            >
              <StateTimeline
                data={stackedData}
                stateMapper={collapsedMapper}
                metricKey={firstMetric}
                stateColors={{
                  healthy: "#22c55e",
                  degraded: "#f59e0b",
                  down: "#ef4444",
                }}
                styles={{
                  background: { color: "#0f172a" },
                  label: { color: "#94a3b8" },
                  rowLabel: { color: "#e2e8f0" },
                }}
              />
            </Card>

            <Card
              title="Long Device Names (auto-sized labels)"
              description="Label column auto-measures to fit long names"
              height={160}
            >
              <StateTimeline
                data={longNameDevices}
                stateMapper={threeStateMapper}
                metricKey={firstMetric}
              />
            </Card>

            <Card
              title="Labels on Right"
              description="labelAlign='right' places device names after the bars"
              height={160}
            >
              <StateTimeline
                data={stackedData}
                stateMapper={temperatureMapper}
                metricKey={firstMetric}
                labelAlign="right"
                stateColors={{
                  cold: "#38bdf8",
                  normal: "#22c55e",
                  warm: "#f97316",
                  hot: "#dc2626",
                }}
              />
            </Card>

            <Card
              title="Long Names + Right Aligned"
              description="Auto-sized labels on the right side"
              height={160}
            >
              <StateTimeline
                data={longNameDevices}
                stateMapper={fiveStateMapper}
                metricKey={firstMetric}
                labelAlign="right"
              />
            </Card>
          </div>
        );
      })()}

      {/* ── Dynamic devices ── */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        Dynamic Devices
      </h2>
      <p style={{ color: "#6b7280", marginBottom: 16, fontSize: 13 }}>
        New devices appear at 10-second intervals. Watch the timeline expand as
        devices come online.
      </p>
      <DynamicDevicesDemo
        data={data}
        deviceIdent={deviceIdent}
        firstMetric={firstMetric}
      />

      {/* ── Error callback ── */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        Error Handling
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
          title="onError callback (check console)"
          description="Data includes an invalid timestamp — onError fires"
        >
          <StateTimeline
            data={{
              [deviceIdent]: [
                { timestamp: NaN, [firstMetric]: 50 },
                ...data.slice(0, 30),
              ],
            }}
            stateMapper={threeStateMapper}
            metricKey={firstMetric}
            onError={(err) => console.warn("[StateTimeline onError]", err)}
          />
        </Card>
      </div>
    </div>
  );
}
