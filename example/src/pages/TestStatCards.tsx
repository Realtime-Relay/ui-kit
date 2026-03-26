/**
 * Static test page for Playwright — renders all StatCard and StatCardWithGraph variations
 * with hardcoded data. No SDK connection needed. Navigate to /#/test-statcards
 */
import {
  StatCard,
  StatCardWithGraph,
} from '@relayx/ui';

const threeZones = [
  { min: 0, max: 40, color: '#22c55e', label: 'Normal' },
  { min: 40, max: 70, color: '#f59e0b', label: 'Warning' },
  { min: 70, max: 100, color: '#ef4444', label: 'Critical' },
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

function Card({ title, children, style, height = 160 }: { title: string; children: React.ReactNode; style?: React.CSSProperties; height?: number }) {
  return (
    <div
      data-testid={`card-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 16,
        ...style,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>{title}</div>
      <div style={{ height, overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

function ResizableCard({ title, children, minHeight = 150 }: { title: string; children: React.ReactNode; minHeight?: number }) {
  return (
    <div
      data-testid={`resizable-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 16,
        resize: 'both',
        overflow: 'auto',
        minWidth: 120,
        minHeight,
        width: 350,
        height: 280,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>{title}</div>
      <div style={{ height: 'calc(100% - 30px)' }}>{children}</div>
    </div>
  );
}

export function TestStatCards() {
  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1 data-testid="page-heading">StatCard Test Page</h1>
      <p>Static data — no SDK connection required.</p>

      {/* --- StatCard Variations --- */}
      <h2 data-testid="statcard-section">StatCard Variations</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>

        <Card title="StatCard Default">
          <StatCard value={42.5} label="temperature" />
        </Card>

        <Card title="StatCard String Value">
          <StatCard value="Running" label="status" />
        </Card>

        <Card title="StatCard Boolean Value">
          <StatCard value={true} label="active" />
        </Card>

        <Card title="StatCard Object Value">
          <StatCard value={{ temp: 23.5, humidity: 60 }} label="payload" />
        </Card>

        <Card title="StatCard Custom Format">
          <StatCard
            value={1234.567}
            formatValue={(v) => `$${Number(v).toFixed(2)}`}
            label="price"
          />
        </Card>

        <Card title="StatCard With Timestamp">
          <StatCard
            value={72.5}
            label="temperature"
            lastUpdated={Date.now()}
            showLastUpdated
          />
        </Card>

        <Card title="StatCard Custom Timestamp">
          <StatCard
            value={55}
            label="temperature"
            lastUpdated={Date.now()}
            showLastUpdated
            formatTimestamp={(ts) => 'custom-ts'}
          />
        </Card>

        <Card title="StatCard No Timestamp">
          <StatCard
            value={50}
            label="temperature"
            lastUpdated={Date.now()}
          />
        </Card>

        <Card title="StatCard Alert Zones Green">
          <StatCard
            value={20}
            numericValue={20}
            label="temperature"
            alertZones={threeZones}
          />
        </Card>

        <Card title="StatCard Alert Zones Red">
          <StatCard
            value={85}
            numericValue={85}
            label="temperature"
            alertZones={threeZones}
          />
        </Card>

        <Card title="StatCard Zone Override Color">
          <StatCard
            value={85}
            numericValue={85}
            label="temperature"
            alertZones={threeZones}
            styles={{ value: { color: '#7c3aed' } }}
          />
        </Card>

        <Card title="StatCard Styled">
          <StatCard
            value={42.5}
            label="temp"
            styles={{
              value: { fontSize: 48, fontWeight: 700 },
              label: { color: '#3b82f6' },
              background: { color: '#f8fafc' },
            }}
            borderRadius={16}
            borderColor="#3b82f6"
            borderThickness={2}
          />
        </Card>

        <Card title="StatCard Sharp Edges">
          <StatCard value={50} borderRadius="sharp" />
        </Card>

        <Card title="StatCard Explicit Size" style={{ height: 'auto' }}>
          <StatCard
            value={50}
            label="temperature"
            styles={{ width: 250, height: 120 }}
          />
        </Card>

        <Card title="StatCard Loading">
          <StatCard value={null as any} showLoading={true} />
        </Card>

        <Card title="StatCard Null No Loading">
          <StatCard value={null as any} showLoading={false} />
        </Card>
      </div>

      {/* --- StatCardWithGraph Variations --- */}
      <h2 data-testid="sparkline-section">StatCardWithGraph Variations</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>

        <Card title="Sparkline Default">
          <StatCardWithGraph
            value={65}
            label="temperature"
            sparklineData={mockData}
            sparklineExtractor={(p) => p.value}
          />
        </Card>

        <Card title="Sparkline With Timestamp">
          <StatCardWithGraph
            value={65}
            label="temperature"
            sparklineData={mockData}
            sparklineExtractor={(p) => p.value}
            showLastUpdated
            lastUpdated={Date.now()}
          />
        </Card>

        <Card title="Sparkline Alert Zones Green">
          <StatCardWithGraph
            value={25}
            numericValue={25}
            label="temperature"
            sparklineData={mockData}
            sparklineExtractor={(p) => p.value}
            alertZones={threeZones}
          />
        </Card>

        <Card title="Sparkline Alert Zones Red">
          <StatCardWithGraph
            value={85}
            numericValue={85}
            label="temperature"
            sparklineData={mockData}
            sparklineExtractor={(p) => p.value}
            alertZones={threeZones}
          />
        </Card>

        <Card title="Sparkline Zone Color Override">
          <StatCardWithGraph
            value={85}
            numericValue={85}
            label="temperature"
            sparklineData={mockData}
            sparklineExtractor={(p) => p.value}
            alertZones={threeZones}
            graphLineColor="#7c3aed"
          />
        </Card>

        <Card title="Sparkline Custom Format">
          <StatCardWithGraph
            value={{ temp: 42.5 }}
            numericValue={42.5}
            label="payload"
            sparklineData={mockData}
            sparklineExtractor={(p) => p.value}
            formatValue={(v) => `Temp: ${v.temp}\u00b0C`}
          />
        </Card>

        <Card title="Sparkline String Value">
          <StatCardWithGraph
            value="Online"
            numericValue={75}
            sparklineData={mockData}
            sparklineExtractor={(p) => p.value}
            alertZones={threeZones}
          />
        </Card>

        <Card title="Sparkline No Extractor">
          <StatCardWithGraph
            value={50}
            sparklineData={mockData}
          />
        </Card>

        <Card title="Sparkline Dark Theme">
          <StatCardWithGraph
            value={65}
            label="temperature"
            sparklineData={mockData}
            sparklineExtractor={(p) => p.value}
            styles={{
              background: { color: '#0f172a' },
              value: { color: '#ffffff' },
              label: { color: '#94a3b8' },
            }}
          />
        </Card>

        <Card title="Sparkline Loading">
          <StatCardWithGraph value={null as any} showLoading={true} />
        </Card>

        <Card title="Sparkline Custom Window">
          <StatCardWithGraph
            value={65}
            label="temperature"
            sparklineData={mockData60}
            sparklineExtractor={(p) => p.value}
            sparklineWindow={10000}
          />
        </Card>

        <Card title="Sparkline Custom Graph Color">
          <StatCardWithGraph
            value={65}
            label="temperature"
            sparklineData={mockData}
            sparklineExtractor={(p) => p.value}
            graphLineColor="#ef4444"
          />
        </Card>
      </div>

      {/* --- Resizable --- */}
      <h2 data-testid="resizable-section">Resizable Cards</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>

        <ResizableCard title="Resizable StatCard">
          <StatCard
            value={42.5}
            label="temperature"
            alertZones={threeZones}
          />
        </ResizableCard>

        <ResizableCard title="Resizable StatCardWithGraph">
          <StatCardWithGraph
            value={65}
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
