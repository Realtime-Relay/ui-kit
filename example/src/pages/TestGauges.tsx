/**
 * Static test page for Playwright — renders all gauge variations with hardcoded data.
 * No SDK connection needed. Navigate to /#/test-gauges
 */
import { NeedleGauge, ArcGauge } from "@relayx/ui";

const threeZones = [
  { min: 0, max: 40, color: "#22c55e", label: "Normal" },
  { min: 40, max: 70, color: "#f59e0b", label: "Warning" },
  { min: 70, max: 100, color: "#ef4444", label: "Critical" },
];

const fiveZones = [
  { min: 0, max: 20, color: "#22c55e" },
  { min: 20, max: 40, color: "#84cc16" },
  { min: 40, max: 60, color: "#f59e0b" },
  { min: 60, max: 80, color: "#f97316" },
  { min: 80, max: 100, color: "#ef4444" },
];

function Card({
  title,
  children,
  style,
}: {
  title: string;
  children: React.ReactNode;
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
      <div style={{ height: 200 }}>{children}</div>
    </div>
  );
}

function ResizableCard({
  title,
  children,
  minHeight = 150,
}: {
  title: string;
  children: React.ReactNode;
  minHeight?: number;
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
        minWidth: 120,
        minHeight,
        width: 350,
        height: 280,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
        {title}
      </div>
      <div style={{ height: "calc(100% - 30px)" }}>{children}</div>
    </div>
  );
}

export function TestGauges() {
  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <h1 data-testid="page-heading">Gauge Test Page</h1>
      <p>Static data — no SDK connection required.</p>

      {/* --- Needle Gauge Variations --- */}
      <h2 data-testid="needle-section">Needle Gauge Variations</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <Card title="Needle Default">
          <NeedleGauge
            data={{ value: 45, timestamp: null }}
            label="temperature"
          />
        </Card>

        <Card title="Needle 3 Zones">
          <NeedleGauge
            data={{ value: 65, timestamp: null }}
            alertZones={threeZones}
            label="temperature"
          />
        </Card>

        <Card title="Needle 5 Zones">
          <NeedleGauge
            data={{ value: 30, timestamp: null }}
            alertZones={fiveZones}
            label="temperature"
          />
        </Card>

        <Card title="Needle Unit Suffix">
          <NeedleGauge
            data={{ value: 72.5, timestamp: null }}
            alertZones={threeZones}
            label="temperature"
            unit="°C"
          />
        </Card>

        <Card title="Needle Format Value">
          <NeedleGauge
            data={{ value: 45.678, timestamp: null }}
            formatValue={(v) => v.toFixed(1) + "%"}
            label="temperature"
          />
        </Card>

        <Card title="Needle Thick Arc">
          <NeedleGauge
            data={{ value: 55, timestamp: null }}
            alertZones={threeZones}
            label="temperature"
            styles={{ arcThickness: 28, needleThickness: 5 }}
          />
        </Card>

        <Card title="Needle Thin Arc">
          <NeedleGauge
            data={{ value: 25, timestamp: null }}
            alertZones={threeZones}
            label="temperature"
            styles={{ arcThickness: 6, needleThickness: 1 }}
          />
        </Card>

        <Card title="Needle Large Value">
          <NeedleGauge
            data={{ value: 88, timestamp: null }}
            label="temperature"
            unit="units"
            styles={{ value: { fontSize: 36, color: "#7c3aed" } }}
          />
        </Card>

        <Card title="Needle Arc 270">
          <NeedleGauge
            data={{ value: 60, timestamp: null }}
            alertZones={threeZones}
            label="temperature"
            unit="°C"
            styles={{ arcAngle: 270 }}
          />
        </Card>

        <Card title="Needle Arc 300">
          <NeedleGauge
            data={{ value: 80, timestamp: null }}
            alertZones={threeZones}
            label="temperature"
            styles={{ arcAngle: 300 }}
          />
        </Card>

        <Card title="Needle Arc 30">
          <NeedleGauge
            data={{ value: 50, timestamp: null }}
            label="temperature"
            styles={{ arcAngle: 30 }}
          />
        </Card>

        <Card title="Needle Arc 90">
          <NeedleGauge
            data={{ value: 75, timestamp: null }}
            alertZones={threeZones}
            label="temperature"
            styles={{ arcAngle: 90 }}
          />
        </Card>

        <Card title="Needle Show Zone Values">
          <NeedleGauge
            data={{ value: 55, timestamp: null }}
            alertZones={[
              { min: 0, max: 30, color: "#22c55e" },
              { min: 30, max: 70, color: "#f59e0b" },
              { min: 70, max: 100, color: "#ef4444" },
            ]}
            showZoneValues
            label="temperature"
          />
        </Card>

        <Card title="Needle Min Max Style">
          <NeedleGauge
            data={{ value: 40, timestamp: null }}
            alertZones={threeZones}
            label="temperature"
            styles={{
              minMax: { fontSize: 14, color: "#3b82f6", fontWeight: 700 },
            }}
          />
        </Card>

        <Card title="Needle Custom Colors">
          <NeedleGauge
            data={{ value: 50, timestamp: null }}
            label="temperature"
            styles={{
              value: { color: "#059669", fontSize: 28, fontWeight: 800 },
              label: { color: "#059669" },
            }}
          />
        </Card>

        <Card title="Needle Dark Background">
          <NeedleGauge
            data={{ value: 60, timestamp: null }}
            alertZones={threeZones}
            label="temperature"
            unit="°C"
            styles={{
              arcAngle: 270,
              background: { color: "#0f172a" },
              value: { color: "#ffffff" },
              label: { color: "#94a3b8" },
              minMax: { color: "#64748b" },
              unit: { color: "#94a3b8" },
            }}
          />
        </Card>

        <Card title="Needle Value Zero">
          <NeedleGauge
            data={{ value: 0, timestamp: null }}
            alertZones={threeZones}
            label="temperature"
          />
        </Card>

        <Card title="Needle Value Max">
          <NeedleGauge
            data={{ value: 100, timestamp: null }}
            alertZones={threeZones}
            label="temperature"
          />
        </Card>

        <Card title="Needle Value Over Max">
          <NeedleGauge
            data={{ value: 120, timestamp: null }}
            max={100}
            alertZones={threeZones}
            label="temperature"
          />
        </Card>

        <Card title="Needle Value Under Min">
          <NeedleGauge
            data={{ value: -10, timestamp: null }}
            min={0}
            alertZones={threeZones}
            label="temperature"
          />
        </Card>

        <Card title="Needle Custom Range">
          <NeedleGauge
            data={{ value: 250, timestamp: null }}
            min={0}
            max={500}
            label="pressure"
            unit="PSI"
          />
        </Card>

        <Card title="Needle No Label">
          <NeedleGauge
            data={{ value: 65, timestamp: null }}
            alertZones={threeZones}
          />
        </Card>

        <Card title="Needle Explicit Size" style={{ height: "auto" }}>
          <NeedleGauge
            data={{ value: 55, timestamp: null }}
            alertZones={threeZones}
            label="temperature"
            styles={{ width: 250, height: 150 }}
          />
        </Card>

        <Card title="Needle Loading">
          <NeedleGauge
            data={{ value: null, timestamp: null } as any}
            label="temperature"
            showLoading={true}
          />
        </Card>
      </div>

      {/* --- Arc Gauge Variations --- */}
      <h2 data-testid="arc-section">Arc Gauge Variations</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <Card title="Arc Default">
          <ArcGauge data={{ value: 45, timestamp: null }} label="temperature" />
        </Card>

        <Card title="Arc 3 Zones">
          <ArcGauge
            data={{ value: 65, timestamp: null }}
            alertZones={threeZones}
            label="temperature"
          />
        </Card>

        <Card title="Arc 5 Zones">
          <ArcGauge
            data={{ value: 30, timestamp: null }}
            alertZones={fiveZones}
            label="temperature"
          />
        </Card>

        <Card title="Arc Unit Suffix">
          <ArcGauge
            data={{ value: 72.5, timestamp: null }}
            alertZones={threeZones}
            label="temperature"
            unit="%"
          />
        </Card>

        <Card title="Arc Format Value">
          <ArcGauge
            data={{ value: 45.678, timestamp: null }}
            formatValue={(v) => v.toFixed(1) + "%"}
            label="temperature"
          />
        </Card>

        <Card title="Arc Thick">
          <ArcGauge
            data={{ value: 55, timestamp: null }}
            alertZones={threeZones}
            label="temperature"
            styles={{ arcThickness: 30 }}
          />
        </Card>

        <Card title="Arc Thin">
          <ArcGauge
            data={{ value: 25, timestamp: null }}
            alertZones={threeZones}
            label="temperature"
            styles={{ arcThickness: 6 }}
          />
        </Card>

        <Card title="Arc Large Value">
          <ArcGauge
            data={{ value: 88, timestamp: null }}
            label="temperature"
            styles={{
              value: { fontSize: 42, color: "#059669", fontWeight: 800 },
            }}
          />
        </Card>

        <Card title="Arc 270">
          <ArcGauge
            data={{ value: 60, timestamp: null }}
            alertZones={threeZones}
            label="temperature"
            unit="°C"
            styles={{ arcAngle: 270 }}
          />
        </Card>

        <Card title="Arc 270 Dark">
          <ArcGauge
            data={{ value: 60, timestamp: null }}
            alertZones={threeZones}
            label="temperature"
            unit="°C"
            styles={{
              arcAngle: 270,
              background: { color: "#0f172a" },
              value: { color: "#ffffff" },
              label: { color: "#94a3b8" },
              minMax: { color: "#64748b" },
              unit: { color: "#94a3b8" },
            }}
          />
        </Card>

        <Card title="Arc 300">
          <ArcGauge
            data={{ value: 80, timestamp: null }}
            alertZones={threeZones}
            label="temperature"
            styles={{ arcAngle: 300 }}
          />
        </Card>

        <Card title="Arc Show Zone Values">
          <ArcGauge
            data={{ value: 55, timestamp: null }}
            alertZones={[
              { min: 0, max: 30, color: "#22c55e" },
              { min: 30, max: 70, color: "#f59e0b" },
              { min: 70, max: 100, color: "#ef4444" },
            ]}
            showZoneValues
            label="temperature"
          />
        </Card>

        <Card title="Arc Value Zero">
          <ArcGauge
            data={{ value: 0, timestamp: null }}
            alertZones={threeZones}
            label="temperature"
          />
        </Card>

        <Card title="Arc Value Max">
          <ArcGauge
            data={{ value: 100, timestamp: null }}
            alertZones={threeZones}
            label="temperature"
          />
        </Card>

        <Card title="Arc Value Over Max">
          <ArcGauge
            data={{ value: 120, timestamp: null }}
            max={100}
            alertZones={threeZones}
            label="temperature"
          />
        </Card>

        <Card title="Arc Custom Range">
          <ArcGauge
            data={{ value: 250, timestamp: null }}
            min={0}
            max={500}
            label="pressure"
            unit="PSI"
          />
        </Card>

        <Card title="Arc No Label">
          <ArcGauge
            data={{ value: 65, timestamp: null }}
            alertZones={threeZones}
          />
        </Card>

        <Card title="Arc Loading">
          <ArcGauge
            data={{ value: null, timestamp: null } as any}
            label="temperature"
            showLoading={true}
          />
        </Card>
      </div>

      {/* --- Resizable --- */}
      {/* --- Last Updated --- */}
      <h2 data-testid="lastupdated-section">Last Updated Timestamp</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <Card title="Needle With Timestamp">
          <NeedleGauge
            data={{ value: 72, timestamp: Date.now() }}
            alertZones={threeZones}
            label="temperature"
            unit="°C"
            showLastUpdated
          />
        </Card>

        <Card title="Arc With Timestamp">
          <ArcGauge
            data={{ value: 72, timestamp: Date.now() }}
            alertZones={threeZones}
            label="temperature"
            unit="°C"
            showLastUpdated
          />
        </Card>

        <Card title="Needle Custom Timestamp Format">
          <NeedleGauge
            data={{ value: 55, timestamp: Date.now() - 60000 }}
            alertZones={threeZones}
            label="temperature"
            showLastUpdated
            formatTimestamp={(ts) => {
              const d = ts instanceof Date ? ts : new Date(ts);
              return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")} UTC`;
            }}
            styles={{
              lastUpdated: { fontSize: 11, color: "#3b82f6", fontWeight: 600 },
            }}
          />
        </Card>

        <Card title="Arc Timestamp 270 Dark">
          <ArcGauge
            data={{ value: 60, timestamp: Date.now() }}
            alertZones={threeZones}
            label="temperature"
            unit="°C"
            showLastUpdated
            styles={{
              arcAngle: 270,
              background: { color: "#0f172a" },
              value: { color: "#ffffff" },
              label: { color: "#94a3b8" },
              lastUpdated: { color: "#64748b", fontSize: 10 },
              minMax: { color: "#64748b" },
              unit: { color: "#94a3b8" },
            }}
          />
        </Card>

        <Card title="Needle No Timestamp (default)">
          <NeedleGauge
            data={{ value: 45, timestamp: Date.now() }}
            alertZones={threeZones}
            label="temperature"
          />
        </Card>

        <Card title="Arc No Timestamp (default)">
          <ArcGauge
            data={{ value: 45, timestamp: Date.now() }}
            alertZones={threeZones}
            label="temperature"
          />
        </Card>
      </div>

      <h2 data-testid="resizable-section">Resizable Gauges</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <ResizableCard title="Resizable Needle">
          <NeedleGauge
            data={{ value: 65, timestamp: null }}
            alertZones={threeZones}
            label="temperature"
            unit="°C"
          />
        </ResizableCard>

        <ResizableCard title="Resizable Arc">
          <ArcGauge
            data={{ value: 65, timestamp: null }}
            alertZones={threeZones}
            label="temperature"
            unit="°C"
          />
        </ResizableCard>

        <ResizableCard title="Resizable Needle 270">
          <NeedleGauge
            data={{ value: 65, timestamp: null }}
            alertZones={threeZones}
            label="temperature"
            styles={{ arcAngle: 270 }}
          />
        </ResizableCard>

        <ResizableCard title="Resizable Arc 270">
          <ArcGauge
            data={{ value: 65, timestamp: null }}
            alertZones={threeZones}
            label="temperature"
            styles={{ arcAngle: 270 }}
          />
        </ResizableCard>
      </div>
    </div>
  );
}
