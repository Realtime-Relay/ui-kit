/**
 * Static test page for Playwright — renders all StateTimeline variations with hardcoded data.
 * No SDK connection needed. Navigate to /#/test-timelines
 */
import { StateTimeline } from "@relayx/ui";
import type { DataPoint, StateEntry } from "@relayx/ui";

// ─── Test Data ──────────────────────────────────────────────

const NOW = Date.now();

function makePoints(count: number, offsetFactor = 1): DataPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: NOW - (count - i) * 60_000,
    value: ((i * 23 + 7) % 100) * offsetFactor,
  }));
}

const singleDevice: Record<string, DataPoint[]> = {
  "sensor-alpha": makePoints(30),
};

const threeDevices: Record<string, DataPoint[]> = {
  "sensor-alpha": makePoints(30),
  "sensor-bravo": makePoints(30, 0.6),
  "sensor-charlie": makePoints(30, 1.4),
};

const longNameDevices: Record<string, DataPoint[]> = {
  "warehouse-floor-sensor-unit-alpha-01": makePoints(20),
  "rooftop-hvac-monitor-bravo-02": makePoints(20, 0.7),
  "cold-storage-temp-probe-charlie-03": makePoints(20, 1.3),
};

const emptyDeviceArrays: Record<string, DataPoint[]> = {
  "device-x": [],
  "device-y": [],
  "device-z": [],
};

const mixedEmptyPopulated: Record<string, DataPoint[]> = {
  "active-sensor": makePoints(20),
  "offline-sensor-1": [],
  "offline-sensor-2": [],
};

// Multi-day data: timestamps spanning 3 days
const multiDayData: Record<string, DataPoint[]> = {
  "multi-day-sensor": Array.from({ length: 30 }, (_, i) => ({
    timestamp: NOW - (30 - i) * 4 * 3600_000, // 4 hours apart = spans ~5 days
    value: (i * 23 + 7) % 100,
  })),
};

// ─── State Mappers ──────────────────────────────────────────

const threeStateMapper = (v: any) => {
  const n = Number(v);
  if (n >= 70) return "critical";
  if (n >= 40) return "warning";
  return "normal";
};

const onlineOfflineMapper = (v: any) => (Number(v) > 30 ? "online" : "offline");

const fiveStateMapper = (v: any) => {
  const n = Number(v);
  if (n >= 90) return "error";
  if (n >= 70) return "critical";
  if (n >= 50) return "warning";
  if (n >= 20) return "running";
  return "idle";
};

const temperatureMapper = (v: any) => {
  const n = Number(v);
  if (n >= 80) return "hot";
  if (n >= 55) return "warm";
  if (n >= 30) return "normal";
  return "cold";
};

// ─── Card Components ────────────────────────────────────────

function Card({
  title,
  children,
  height = 120,
  style,
}: {
  title: string;
  children: React.ReactNode;
  height?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      data-testid={`card-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 16,
        ...style,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
        {title}
      </div>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

function ResizableCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-testid={`resizable-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 16,
        resize: "both",
        overflow: "auto",
        minWidth: 300,
        minHeight: 100,
        width: "100%",
        height: 200,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
        {title}
      </div>
      <div style={{ height: "calc(100% - 30px)" }}>{children}</div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────

export function TestStateTimeline() {
  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <h1 data-testid="page-heading">State Timeline Test Page</h1>
      <p>Static data — no SDK connection required.</p>

      {/* --- Basic --- */}
      <h2 data-testid="timeline-section">Timeline Variations</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <Card title="Single Device">
          <StateTimeline
            data={singleDevice}
            stateMapper={threeStateMapper}
            metricKey="value"
          />
        </Card>

        <Card title="Three Devices" height={160}>
          <StateTimeline
            data={threeDevices}
            stateMapper={threeStateMapper}
            metricKey="value"
          />
        </Card>

        <Card title="Custom Colors" height={160}>
          <StateTimeline
            data={threeDevices}
            stateMapper={temperatureMapper}
            metricKey="value"
            stateColors={{
              cold: "#38bdf8",
              normal: "#22c55e",
              warm: "#f97316",
              hot: "#dc2626",
            }}
          />
        </Card>

        <Card title="Labels Right" height={160}>
          <StateTimeline
            data={threeDevices}
            stateMapper={threeStateMapper}
            metricKey="value"
            labelAlign="right"
          />
        </Card>

        <Card title="Custom Row Height" height={200}>
          <StateTimeline
            data={threeDevices}
            stateMapper={threeStateMapper}
            metricKey="value"
            rowHeight={48}
          />
        </Card>

        <Card title="Two States" height={100}>
          <StateTimeline
            data={singleDevice}
            stateMapper={onlineOfflineMapper}
            metricKey="value"
          />
        </Card>

        <Card title="Five States" height={100}>
          <StateTimeline
            data={singleDevice}
            stateMapper={fiveStateMapper}
            metricKey="value"
          />
        </Card>

        <Card title="Long Device Names" height={160}>
          <StateTimeline
            data={longNameDevices}
            stateMapper={threeStateMapper}
            metricKey="value"
          />
        </Card>
      </div>

      {/* --- Styles --- */}
      <h2 data-testid="styles-section">Style Variations</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <Card title="Dark Theme" height={160}>
          <StateTimeline
            data={threeDevices}
            stateMapper={threeStateMapper}
            metricKey="value"
            styles={{
              background: { color: "#0f172a" },
              label: { color: "#94a3b8" },
              rowLabel: { color: "#e2e8f0" },
            }}
          />
        </Card>

        <Card title="Format Tooltip" height={100}>
          <StateTimeline
            data={singleDevice}
            stateMapper={threeStateMapper}
            metricKey="value"
            formatTooltip={(entry: StateEntry, deviceName: string) => {
              const dur = Math.round((entry.end - entry.start) / 1000);
              return `${deviceName}: ${entry.state} (${dur}s)`;
            }}
          />
        </Card>

        <Card title="Render Tooltip" height={100}>
          <StateTimeline
            data={singleDevice}
            stateMapper={threeStateMapper}
            metricKey="value"
            renderTooltip={(entry: StateEntry, deviceName: string) => (
              <div data-tooltip-custom>
                <strong>{deviceName}</strong>: {entry.state}
              </div>
            )}
          />
        </Card>

        <Card title="Same Day Data" height={100}>
          <StateTimeline
            data={singleDevice}
            stateMapper={threeStateMapper}
            metricKey="value"
          />
        </Card>

        <Card title="Multi Day Data" height={100}>
          <StateTimeline
            data={multiDayData}
            stateMapper={threeStateMapper}
            metricKey="value"
          />
        </Card>
      </div>

      {/* --- Edge Cases --- */}
      <h2 data-testid="edge-section">Edge Cases</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <Card title="Empty Data" height={100}>
          <StateTimeline
            data={{}}
            stateMapper={threeStateMapper}
            metricKey="value"
          />
        </Card>

        <Card title="Empty No Loading" height={100}>
          <StateTimeline
            data={{}}
            stateMapper={threeStateMapper}
            metricKey="value"
            showLoading={false}
          />
        </Card>

        <Card title="Empty Device Arrays" height={160}>
          <StateTimeline
            data={emptyDeviceArrays}
            stateMapper={threeStateMapper}
            metricKey="value"
          />
        </Card>

        <Card title="Mixed Empty Populated" height={160}>
          <StateTimeline
            data={mixedEmptyPopulated}
            stateMapper={threeStateMapper}
            metricKey="value"
          />
        </Card>
      </div>

      {/* --- Resizable --- */}
      <h2 data-testid="resizable-section">Resizable</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <ResizableCard title="Resizable Timeline">
          <StateTimeline
            data={threeDevices}
            stateMapper={threeStateMapper}
            metricKey="value"
          />
        </ResizableCard>
      </div>
    </div>
  );
}
