/**
 * Static test page for Playwright — renders all StatCard and StatCardWithGraph variations
 * with hardcoded data. No SDK connection needed. Navigate to /#/test-statcards
 */
import { StatCard, StatCardWithGraph } from "@relayx/ui";

const threeZones = [
  { min: 0, max: 40, color: "#22c55e", label: "Normal" },
  { min: 40, max: 70, color: "#f59e0b", label: "Warning" },
  { min: 70, max: 100, color: "#ef4444", label: "Critical" },
];

/** Generate mock sparkline data: 30 points, 1s apart, oscillating values */
function generateMockSparklineData(count = 30) {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    timestamp: now - (count - 1 - i) * 1000,
    value: 50 + 30 * Math.sin(i * 0.4) + (Math.random() - 0.5) * 5,
  }));
}

const mockData = generateMockSparklineData(30);
const mockData60 = generateMockSparklineData(60);

function Card({
  title,
  children,
  style,
  height = 160,
}: {
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  height?: number;
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
      <div style={{ height, overflow: "hidden" }}>{children}</div>
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

export function TestStatCards() {
  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <h1 data-testid="page-heading">StatCard Test Page</h1>
      <p>Static data — no SDK connection required.</p>

      {/* --- StatCard Variations --- */}
      <h2 data-testid="statcard-section">StatCard Variations</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <Card title="StatCard Default">
          <StatCard
            data={{ value: 42.5, timestamp: null }}
            label="temperature"
          />
        </Card>

        <Card title="StatCard String Value">
          <StatCard
            data={{ value: "Running", timestamp: null }}
            label="status"
          />
        </Card>

        <Card title="StatCard Boolean Value">
          <StatCard data={{ value: true, timestamp: null }} label="active" />
        </Card>

        <Card title="StatCard Object Value">
          <StatCard
            data={{ value: { temp: 23.5, humidity: 60 }, timestamp: null }}
            label="payload"
          />
        </Card>

        <Card title="StatCard Custom Format">
          <StatCard
            data={{ value: 1234.567, timestamp: null }}
            formatValue={(v) => `$${Number(v).toFixed(2)}`}
            label="price"
          />
        </Card>

        <Card title="StatCard With Timestamp">
          <StatCard
            data={{ value: 72.5, timestamp: Date.now() }}
            label="temperature"
            showLastUpdated
          />
        </Card>

        <Card title="StatCard Custom Timestamp">
          <StatCard
            data={{ value: 55, timestamp: Date.now() }}
            label="temperature"
            showLastUpdated
            formatTimestamp={(ts) => "custom-ts"}
          />
        </Card>

        <Card title="StatCard No Timestamp">
          <StatCard
            data={{ value: 50, timestamp: Date.now() }}
            label="temperature"
          />
        </Card>

        <Card title="StatCard Alert Zones Green">
          <StatCard
            data={{ value: 20, timestamp: null }}
            label="temperature"
            alertZones={threeZones}
          />
        </Card>

        <Card title="StatCard Alert Zones Red">
          <StatCard
            data={{ value: 85, timestamp: null }}
            label="temperature"
            alertZones={threeZones}
          />
        </Card>

        <Card title="StatCard Zone Override Color">
          <StatCard
            data={{ value: 85, timestamp: null }}
            label="temperature"
            alertZones={threeZones}
            styles={{ value: { color: "#7c3aed" } }}
          />
        </Card>

        <Card title="StatCard Styled">
          <StatCard
            data={{ value: 42.5, timestamp: null }}
            label="temp"
            styles={{
              value: { fontSize: 48, fontWeight: 700 },
              label: { color: "#3b82f6" },
              background: { color: "#f8fafc" },
            }}
            borderRadius={16}
            borderColor="#3b82f6"
            borderThickness={2}
          />
        </Card>

        <Card title="StatCard Sharp Edges">
          <StatCard
            data={{ value: 50, timestamp: null }}
            borderRadius="sharp"
          />
        </Card>

        <Card title="StatCard Explicit Size" style={{ height: "auto" }}>
          <StatCard
            data={{ value: 50, timestamp: null }}
            label="temperature"
            styles={{ width: 250, height: 120 }}
          />
        </Card>

        <Card title="StatCard Loading">
          <StatCard
            data={{ value: null, timestamp: null } as any}
            showLoading={true}
          />
        </Card>

        <Card title="StatCard Null No Loading">
          <StatCard
            data={{ value: null, timestamp: null } as any}
            showLoading={false}
          />
        </Card>
      </div>

      {/* --- StatCardWithGraph Variations --- */}
      <h2 data-testid="sparkline-section">StatCardWithGraph Variations</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <Card title="Sparkline Default">
          <StatCardWithGraph
            data={{ value: 65, timestamp: null }}
            label="temperature"
            sparklineData={mockData}
            sparklineExtractor={(p) => p.value}
          />
        </Card>

        <Card title="Sparkline With Timestamp">
          <StatCardWithGraph
            data={{ value: 65, timestamp: Date.now() }}
            label="temperature"
            sparklineData={mockData}
            sparklineExtractor={(p) => p.value}
            showLastUpdated
          />
        </Card>

        <Card title="Sparkline Alert Zones Green">
          <StatCardWithGraph
            data={{ value: 25, timestamp: null }}
            label="temperature"
            sparklineData={mockData}
            sparklineExtractor={(p) => p.value}
            alertZones={threeZones}
          />
        </Card>

        <Card title="Sparkline Alert Zones Red">
          <StatCardWithGraph
            data={{ value: 85, timestamp: null }}
            label="temperature"
            sparklineData={mockData}
            sparklineExtractor={(p) => p.value}
            alertZones={threeZones}
          />
        </Card>

        <Card title="Sparkline Zone Color Override">
          <StatCardWithGraph
            data={{ value: 85, timestamp: null }}
            label="temperature"
            sparklineData={mockData}
            sparklineExtractor={(p) => p.value}
            alertZones={threeZones}
            graphLineColor="#7c3aed"
          />
        </Card>

        <Card title="Sparkline Custom Format">
          <StatCardWithGraph
            data={{ value: { temp: 42.5 }, timestamp: null }}
            label="payload"
            sparklineData={mockData}
            sparklineExtractor={(p) => p.value}
            formatValue={(v) => `Temp: ${v.temp}\u00b0C`}
          />
        </Card>

        <Card title="Sparkline String Value">
          <StatCardWithGraph
            data={{ value: "Online", timestamp: null }}
            sparklineData={mockData}
            sparklineExtractor={(p) => p.value}
            alertZones={threeZones}
          />
        </Card>

        <Card title="Sparkline No Extractor">
          <StatCardWithGraph
            data={{ value: 50, timestamp: null }}
            sparklineData={mockData}
          />
        </Card>

        <Card title="Sparkline Dark Theme">
          <StatCardWithGraph
            data={{ value: 65, timestamp: null }}
            label="temperature"
            sparklineData={mockData}
            sparklineExtractor={(p) => p.value}
            styles={{
              background: { color: "#0f172a" },
              value: { color: "#ffffff" },
              label: { color: "#94a3b8" },
            }}
          />
        </Card>

        <Card title="Sparkline Loading">
          <StatCardWithGraph
            data={{ value: null, timestamp: null } as any}
            showLoading={true}
          />
        </Card>

        <Card title="Sparkline Custom Window">
          <StatCardWithGraph
            data={{ value: 65, timestamp: null }}
            label="temperature"
            sparklineData={mockData60}
            sparklineExtractor={(p) => p.value}
            sparklineWindow={10000}
          />
        </Card>

        <Card title="Sparkline Custom Graph Color">
          <StatCardWithGraph
            data={{ value: 65, timestamp: null }}
            label="temperature"
            sparklineData={mockData}
            sparklineExtractor={(p) => p.value}
            graphLineColor="#ef4444"
          />
        </Card>
      </div>

      {/* --- Resizable --- */}
      <h2 data-testid="resizable-section">Resizable Cards</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <ResizableCard title="Resizable StatCard">
          <StatCard
            data={{ value: 42.5, timestamp: null }}
            label="temperature"
            alertZones={threeZones}
          />
        </ResizableCard>

        <ResizableCard title="Resizable StatCardWithGraph">
          <StatCardWithGraph
            data={{ value: 65, timestamp: null }}
            label="temperature"
            sparklineData={mockData}
            sparklineExtractor={(p) => p.value}
            alertZones={threeZones}
          />
        </ResizableCard>
      </div>
    </div>
  );
}
