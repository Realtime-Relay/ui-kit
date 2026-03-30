/**
 * Static test page for Playwright — renders all ProgressBar variations with hardcoded data.
 * No SDK connection needed. Navigate to /#/test-progress
 */
import { ProgressBar } from "@relayx/ui";

const trafficZones = [
  { min: 0, max: 40, color: "#22c55e", label: "Normal" },
  { min: 40, max: 70, color: "#f59e0b", label: "Warning" },
  { min: 70, max: 100, color: "#ef4444", label: "Critical" },
];

const coolToHotZones = [
  { min: 0, max: 25, color: "#3b82f6", label: "Cold" },
  { min: 25, max: 50, color: "#22c55e", label: "Cool" },
  { min: 50, max: 75, color: "#f59e0b", label: "Warm" },
  { min: 75, max: 100, color: "#ef4444", label: "Hot" },
];

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-testid={`card-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 16,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
        {title}
      </div>
      {children}
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
        minWidth: 120,
        minHeight: 80,
        width: 400,
        height: 120,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
        {title}
      </div>
      <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 4 }}>
        ↘ drag corner to resize
      </div>
      {children}
    </div>
  );
}

export function TestProgressBar() {
  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <h1 data-testid="page-heading">Progress Bar Test Page</h1>
      <p>Static data — no SDK connection required.</p>

      {/* --- Basic --- */}
      <h2 data-testid="basic-section">Basic Variations</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <Card title="Default">
          <ProgressBar data={{ value: 50, timestamp: null }} />
        </Card>

        <Card title="Value Zero">
          <ProgressBar data={{ value: 0, timestamp: null }} />
        </Card>

        <Card title="Value Max">
          <ProgressBar data={{ value: 100, timestamp: null }} />
        </Card>

        <Card title="Value Over Max">
          <ProgressBar data={{ value: 120, timestamp: null }} max={100} />
        </Card>

        <Card title="Value Under Min">
          <ProgressBar data={{ value: -10, timestamp: null }} min={0} />
        </Card>

        <Card title="Custom Range">
          <ProgressBar
            data={{ value: 250, timestamp: null }}
            min={0}
            max={500}
          />
        </Card>

        <Card title="With Label">
          <ProgressBar data={{ value: 65, timestamp: null }} showLabel />
        </Card>

        <Card title="No Label">
          <ProgressBar
            data={{ value: 65, timestamp: null }}
            showLabel={false}
          />
        </Card>

        <Card title="Format Value">
          <ProgressBar
            data={{ value: 65.789, timestamp: null }}
            showLabel
            formatValue={(v) => v.toFixed(1) + "°C"}
          />
        </Card>
      </div>

      {/* --- Alert Zones --- */}
      <h2 data-testid="zones-section">Alert Zone Variations</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <Card title="Traffic Light Zones">
          <ProgressBar
            data={{ value: 55, timestamp: null }}
            alertZones={trafficZones}
            showLabel
          />
        </Card>

        <Card title="Cool To Hot Zones">
          <ProgressBar
            data={{ value: 60, timestamp: null }}
            alertZones={coolToHotZones}
            showLabel
          />
        </Card>

        <Card title="Zones Value In Green">
          <ProgressBar
            data={{ value: 20, timestamp: null }}
            alertZones={trafficZones}
            showLabel
          />
        </Card>

        <Card title="Zones Value In Yellow">
          <ProgressBar
            data={{ value: 55, timestamp: null }}
            alertZones={trafficZones}
            showLabel
          />
        </Card>

        <Card title="Zones Value In Red">
          <ProgressBar
            data={{ value: 85, timestamp: null }}
            alertZones={trafficZones}
            showLabel
          />
        </Card>

        <Card title="Zones Hidden">
          <ProgressBar
            data={{ value: 50, timestamp: null }}
            alertZones={trafficZones}
            showAlertZones={false}
            showLabel
          />
        </Card>
      </div>

      {/* --- Styling --- */}
      <h2 data-testid="styling-section">Styling Variations</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <Card title="Custom Background">
          <ProgressBar
            data={{ value: 50, timestamp: null }}
            showLabel
            styles={{ background: { color: "#f1f5f9" } }}
          />
        </Card>

        <Card title="Tall Bar">
          <ProgressBar
            data={{ value: 65, timestamp: null }}
            showLabel
            styles={{ height: 48 }}
          />
        </Card>

        <Card title="Thin Bar">
          <ProgressBar
            data={{ value: 65, timestamp: null }}
            showLabel={false}
            styles={{ height: 8 }}
          />
        </Card>

        <Card title="Custom Width 60pct">
          <ProgressBar
            data={{ value: 50, timestamp: null }}
            showLabel
            styles={{ width: "60%" }}
          />
        </Card>

        <Card title="Custom Width 300px">
          <ProgressBar
            data={{ value: 50, timestamp: null }}
            showLabel
            styles={{ width: "300px" }}
          />
        </Card>

        <Card title="Custom Label Font">
          <ProgressBar
            data={{ value: 75, timestamp: null }}
            showLabel
            styles={{
              label: { fontSize: 18, fontWeight: 700, color: "#ffffff" },
            }}
          />
        </Card>
      </div>

      {/* --- Orientation --- */}
      <h2 data-testid="orientation-section">Orientation</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <Card title="Vertical Default">
          <div style={{ height: 200 }}>
            <ProgressBar
              data={{ value: 65, timestamp: null }}
              orientation="vertical"
              showLabel
            />
          </div>
        </Card>

        <Card title="Vertical Zones">
          <div style={{ height: 200 }}>
            <ProgressBar
              data={{ value: 55, timestamp: null }}
              orientation="vertical"
              alertZones={trafficZones}
              showLabel
            />
          </div>
        </Card>

        <Card title="Vertical No Label">
          <div style={{ height: 200 }}>
            <ProgressBar
              data={{ value: 40, timestamp: null }}
              orientation="vertical"
              showLabel={false}
            />
          </div>
        </Card>

        <Card title="Vertical Custom Width">
          <div style={{ height: 200 }}>
            <ProgressBar
              data={{ value: 80, timestamp: null }}
              orientation="vertical"
              showLabel
              styles={{ width: "60px" }}
            />
          </div>
        </Card>
      </div>

      {/* --- Loading --- */}
      <h2 data-testid="loading-section">Loading State</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <Card title="Loading State">
          <ProgressBar
            data={{ value: null, timestamp: null } as any}
            showLoading={true}
          />
        </Card>

        <Card title="Loading Disabled">
          <ProgressBar
            data={{ value: null, timestamp: null } as any}
            showLoading={false}
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
        <Card title="With Timestamp">
          <ProgressBar
            data={{ value: 65, timestamp: Date.now() }}
            showLabel
            showLastUpdated
          />
        </Card>

        <Card title="Timestamp With Zones">
          <ProgressBar
            data={{ value: 55, timestamp: Date.now() }}
            alertZones={trafficZones}
            showLabel
            showLastUpdated
          />
        </Card>

        <Card title="Custom Timestamp Format">
          <ProgressBar
            data={{ value: 75, timestamp: Date.now() - 120000 }}
            showLabel
            showLastUpdated
            formatTimestamp={(ts) => {
              const d = ts instanceof Date ? ts : new Date(ts);
              return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")} UTC`;
            }}
            styles={{
              lastUpdated: { fontSize: 13, color: "#3b82f6", fontWeight: 600 },
            }}
          />
        </Card>

        <Card title="No Timestamp (default)">
          <ProgressBar data={{ value: 50, timestamp: Date.now() }} showLabel />
        </Card>
      </div>

      <h2 data-testid="resizable-section">Resizable</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <ResizableCard title="Resizable Default">
          <ProgressBar data={{ value: 65, timestamp: null }} showLabel />
        </ResizableCard>

        <ResizableCard title="Resizable With Zones">
          <ProgressBar
            data={{ value: 55, timestamp: null }}
            alertZones={trafficZones}
            showLabel
          />
        </ResizableCard>

        <ResizableCard title="Resizable Tall">
          <ProgressBar
            data={{ value: 75, timestamp: null }}
            showLabel
            styles={{ height: 48 }}
          />
        </ResizableCard>

        <ResizableCard title="Resizable Cool To Hot">
          <ProgressBar
            data={{ value: 60, timestamp: null }}
            alertZones={coolToHotZones}
            showLabel
          />
        </ResizableCard>
      </div>
    </div>
  );
}
