/**
 * Static test page for Playwright — renders all ProgressBar variations with hardcoded data.
 * No SDK connection needed. Navigate to /#/test-progress
 */
import { ProgressBar } from '@relayx/ui';

const trafficZones = [
  { min: 0, max: 40, color: '#22c55e', label: 'Normal' },
  { min: 40, max: 70, color: '#f59e0b', label: 'Warning' },
  { min: 70, max: 100, color: '#ef4444', label: 'Critical' },
];

const coolToHotZones = [
  { min: 0, max: 25, color: '#3b82f6', label: 'Cold' },
  { min: 25, max: 50, color: '#22c55e', label: 'Cool' },
  { min: 50, max: 75, color: '#f59e0b', label: 'Warm' },
  { min: 75, max: 100, color: '#ef4444', label: 'Hot' },
];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      data-testid={`card-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 16,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>{title}</div>
      {children}
    </div>
  );
}

function ResizableCard({ title, children }: { title: string; children: React.ReactNode }) {
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
        minHeight: 80,
        width: 400,
        height: 120,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>{title}</div>
      <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>↘ drag corner to resize</div>
      {children}
    </div>
  );
}

export function TestProgressBar() {
  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1 data-testid="page-heading">Progress Bar Test Page</h1>
      <p>Static data — no SDK connection required.</p>

      {/* --- Basic --- */}
      <h2 data-testid="basic-section">Basic Variations</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>

        <Card title="Default">
          <ProgressBar value={50} />
        </Card>

        <Card title="Value Zero">
          <ProgressBar value={0} />
        </Card>

        <Card title="Value Max">
          <ProgressBar value={100} />
        </Card>

        <Card title="Value Over Max">
          <ProgressBar value={120} max={100} />
        </Card>

        <Card title="Value Under Min">
          <ProgressBar value={-10} min={0} />
        </Card>

        <Card title="Custom Range">
          <ProgressBar value={250} min={0} max={500} />
        </Card>

        <Card title="With Label">
          <ProgressBar value={65} showLabel />
        </Card>

        <Card title="No Label">
          <ProgressBar value={65} showLabel={false} />
        </Card>

        <Card title="Format Value">
          <ProgressBar value={65.789} showLabel formatValue={(v) => v.toFixed(1) + '°C'} />
        </Card>
      </div>

      {/* --- Alert Zones --- */}
      <h2 data-testid="zones-section">Alert Zone Variations</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>

        <Card title="Traffic Light Zones">
          <ProgressBar value={55} alertZones={trafficZones} showLabel />
        </Card>

        <Card title="Cool To Hot Zones">
          <ProgressBar value={60} alertZones={coolToHotZones} showLabel />
        </Card>

        <Card title="Zones Value In Green">
          <ProgressBar value={20} alertZones={trafficZones} showLabel />
        </Card>

        <Card title="Zones Value In Yellow">
          <ProgressBar value={55} alertZones={trafficZones} showLabel />
        </Card>

        <Card title="Zones Value In Red">
          <ProgressBar value={85} alertZones={trafficZones} showLabel />
        </Card>

        <Card title="Zones Hidden">
          <ProgressBar value={50} alertZones={trafficZones} showAlertZones={false} showLabel />
        </Card>
      </div>

      {/* --- Styling --- */}
      <h2 data-testid="styling-section">Styling Variations</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>

        <Card title="Custom Background">
          <ProgressBar value={50} showLabel styles={{ background: { color: '#f1f5f9' } }} />
        </Card>

        <Card title="Tall Bar">
          <ProgressBar value={65} showLabel styles={{ height: 48 }} />
        </Card>

        <Card title="Thin Bar">
          <ProgressBar value={65} showLabel={false} styles={{ height: 8 }} />
        </Card>

        <Card title="Custom Width 60pct">
          <ProgressBar value={50} showLabel styles={{ width: '60%' }} />
        </Card>

        <Card title="Custom Width 300px">
          <ProgressBar value={50} showLabel styles={{ width: '300px' }} />
        </Card>

        <Card title="Custom Label Font">
          <ProgressBar
            value={75}
            showLabel
            styles={{ label: { fontSize: 18, fontWeight: 700, color: '#ffffff' } }}
          />
        </Card>
      </div>

      {/* --- Orientation --- */}
      <h2 data-testid="orientation-section">Orientation</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>

        <Card title="Vertical Default">
          <div style={{ height: 200 }}>
            <ProgressBar value={65} orientation="vertical" showLabel />
          </div>
        </Card>

        <Card title="Vertical Zones">
          <div style={{ height: 200 }}>
            <ProgressBar value={55} orientation="vertical" alertZones={trafficZones} showLabel />
          </div>
        </Card>

        <Card title="Vertical No Label">
          <div style={{ height: 200 }}>
            <ProgressBar value={40} orientation="vertical" showLabel={false} />
          </div>
        </Card>

        <Card title="Vertical Custom Width">
          <div style={{ height: 200 }}>
            <ProgressBar value={80} orientation="vertical" showLabel styles={{ width: '60px' }} />
          </div>
        </Card>
      </div>

      {/* --- Loading --- */}
      <h2 data-testid="loading-section">Loading State</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>

        <Card title="Loading State">
          <ProgressBar value={null as any} showLoading={true} />
        </Card>

        <Card title="Loading Disabled">
          <ProgressBar value={null as any} showLoading={false} />
        </Card>
      </div>

      {/* --- Resizable --- */}
      {/* --- Last Updated --- */}
      <h2 data-testid="lastupdated-section">Last Updated Timestamp</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>

        <Card title="With Timestamp">
          <ProgressBar value={65} showLabel lastUpdated={Date.now()} showLastUpdated />
        </Card>

        <Card title="Timestamp With Zones">
          <ProgressBar value={55} alertZones={trafficZones} showLabel lastUpdated={Date.now()} showLastUpdated />
        </Card>

        <Card title="Custom Timestamp Format">
          <ProgressBar
            value={75}
            showLabel
            lastUpdated={Date.now() - 120000}
            showLastUpdated
            formatTimestamp={(ts) => {
              const d = ts instanceof Date ? ts : new Date(ts);
              return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')} UTC`;
            }}
            styles={{ lastUpdated: { fontSize: 13, color: '#3b82f6', fontWeight: 600 } }}
          />
        </Card>

        <Card title="No Timestamp (default)">
          <ProgressBar value={50} showLabel lastUpdated={Date.now()} />
        </Card>
      </div>

      <h2 data-testid="resizable-section">Resizable</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>

        <ResizableCard title="Resizable Default">
          <ProgressBar value={65} showLabel />
        </ResizableCard>

        <ResizableCard title="Resizable With Zones">
          <ProgressBar value={55} alertZones={trafficZones} showLabel />
        </ResizableCard>

        <ResizableCard title="Resizable Tall">
          <ProgressBar value={75} showLabel styles={{ height: 48 }} />
        </ResizableCard>

        <ResizableCard title="Resizable Cool To Hot">
          <ProgressBar value={60} alertZones={coolToHotZones} showLabel />
        </ResizableCard>
      </div>
    </div>
  );
}
