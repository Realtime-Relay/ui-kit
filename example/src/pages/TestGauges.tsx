/**
 * Static test page for Playwright — renders all gauge variations with hardcoded data.
 * No SDK connection needed. Navigate to /#/test-gauges
 */
import {
  NeedleGauge,
  ArcGauge,
} from '@relayx/ui';

const threeZones = [
  { min: 0, max: 40, color: '#22c55e', label: 'Normal' },
  { min: 40, max: 70, color: '#f59e0b', label: 'Warning' },
  { min: 70, max: 100, color: '#ef4444', label: 'Critical' },
];

const fiveZones = [
  { min: 0, max: 20, color: '#22c55e' },
  { min: 20, max: 40, color: '#84cc16' },
  { min: 40, max: 60, color: '#f59e0b' },
  { min: 60, max: 80, color: '#f97316' },
  { min: 80, max: 100, color: '#ef4444' },
];

function Card({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
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
      <div style={{ height: 200 }}>{children}</div>
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

export function TestGauges() {
  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1 data-testid="page-heading">Gauge Test Page</h1>
      <p>Static data — no SDK connection required.</p>

      {/* --- Needle Gauge Variations --- */}
      <h2 data-testid="needle-section">Needle Gauge Variations</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>

        <Card title="Needle Default">
          <NeedleGauge value={45} label="temperature" />
        </Card>

        <Card title="Needle 3 Zones">
          <NeedleGauge value={65} alertZones={threeZones} label="temperature" />
        </Card>

        <Card title="Needle 5 Zones">
          <NeedleGauge value={30} alertZones={fiveZones} label="temperature" />
        </Card>

        <Card title="Needle Unit Suffix">
          <NeedleGauge value={72.5} alertZones={threeZones} label="temperature" unit="°C" />
        </Card>

        <Card title="Needle Format Value">
          <NeedleGauge
            value={45.678}
            formatValue={(v) => v.toFixed(1) + '%'}
            label="temperature"
          />
        </Card>

        <Card title="Needle Thick Arc">
          <NeedleGauge
            value={55}
            alertZones={threeZones}
            label="temperature"
            styles={{ arcThickness: 28, needleThickness: 5 }}
          />
        </Card>

        <Card title="Needle Thin Arc">
          <NeedleGauge
            value={25}
            alertZones={threeZones}
            label="temperature"
            styles={{ arcThickness: 6, needleThickness: 1 }}
          />
        </Card>

        <Card title="Needle Large Value">
          <NeedleGauge
            value={88}
            label="temperature"
            unit="units"
            styles={{ value: { fontSize: 36, color: '#7c3aed' } }}
          />
        </Card>

        <Card title="Needle Arc 270">
          <NeedleGauge
            value={60}
            alertZones={threeZones}
            label="temperature"
            unit="°C"
            styles={{ arcAngle: 270 }}
          />
        </Card>

        <Card title="Needle Arc 300">
          <NeedleGauge
            value={80}
            alertZones={threeZones}
            label="temperature"
            styles={{ arcAngle: 300 }}
          />
        </Card>

        <Card title="Needle Arc 30">
          <NeedleGauge
            value={50}
            label="temperature"
            styles={{ arcAngle: 30 }}
          />
        </Card>

        <Card title="Needle Arc 90">
          <NeedleGauge
            value={75}
            alertZones={threeZones}
            label="temperature"
            styles={{ arcAngle: 90 }}
          />
        </Card>

        <Card title="Needle Show Zone Values">
          <NeedleGauge
            value={55}
            alertZones={[
              { min: 0, max: 30, color: '#22c55e' },
              { min: 30, max: 70, color: '#f59e0b' },
              { min: 70, max: 100, color: '#ef4444' },
            ]}
            showZoneValues
            label="temperature"
          />
        </Card>

        <Card title="Needle Min Max Style">
          <NeedleGauge
            value={40}
            alertZones={threeZones}
            label="temperature"
            styles={{
              minMax: { fontSize: 14, color: '#3b82f6', fontWeight: 700 },
            }}
          />
        </Card>

        <Card title="Needle Custom Colors">
          <NeedleGauge
            value={50}
            label="temperature"
            styles={{
              value: { color: '#059669', fontSize: 28, fontWeight: 800 },
              label: { color: '#059669' },
            }}
          />
        </Card>

        <Card title="Needle Dark Background">
          <NeedleGauge
            value={60}
            alertZones={threeZones}
            label="temperature"
            unit="°C"
            styles={{
              arcAngle: 270,
              background: { color: '#0f172a' },
              value: { color: '#ffffff' },
              label: { color: '#94a3b8' },
              minMax: { color: '#64748b' },
              unit: { color: '#94a3b8' },
            }}
          />
        </Card>

        <Card title="Needle Value Zero">
          <NeedleGauge value={0} alertZones={threeZones} label="temperature" />
        </Card>

        <Card title="Needle Value Max">
          <NeedleGauge value={100} alertZones={threeZones} label="temperature" />
        </Card>

        <Card title="Needle Value Over Max">
          <NeedleGauge value={120} max={100} alertZones={threeZones} label="temperature" />
        </Card>

        <Card title="Needle Value Under Min">
          <NeedleGauge value={-10} min={0} alertZones={threeZones} label="temperature" />
        </Card>

        <Card title="Needle Custom Range">
          <NeedleGauge value={250} min={0} max={500} label="pressure" unit="PSI" />
        </Card>

        <Card title="Needle No Label">
          <NeedleGauge value={65} alertZones={threeZones} />
        </Card>

        <Card title="Needle Explicit Size" style={{ height: 'auto' }}>
          <NeedleGauge
            value={55}
            alertZones={threeZones}
            label="temperature"
            styles={{ width: 250, height: 150 }}
          />
        </Card>

        <Card title="Needle Loading">
          <NeedleGauge value={null as any} label="temperature" showLoading={true} />
        </Card>
      </div>

      {/* --- Arc Gauge Variations --- */}
      <h2 data-testid="arc-section">Arc Gauge Variations</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>

        <Card title="Arc Default">
          <ArcGauge value={45} label="temperature" />
        </Card>

        <Card title="Arc 3 Zones">
          <ArcGauge value={65} alertZones={threeZones} label="temperature" />
        </Card>

        <Card title="Arc 5 Zones">
          <ArcGauge value={30} alertZones={fiveZones} label="temperature" />
        </Card>

        <Card title="Arc Unit Suffix">
          <ArcGauge value={72.5} alertZones={threeZones} label="temperature" unit="%" />
        </Card>

        <Card title="Arc Format Value">
          <ArcGauge
            value={45.678}
            formatValue={(v) => v.toFixed(1) + '%'}
            label="temperature"
          />
        </Card>

        <Card title="Arc Thick">
          <ArcGauge
            value={55}
            alertZones={threeZones}
            label="temperature"
            styles={{ arcThickness: 30 }}
          />
        </Card>

        <Card title="Arc Thin">
          <ArcGauge
            value={25}
            alertZones={threeZones}
            label="temperature"
            styles={{ arcThickness: 6 }}
          />
        </Card>

        <Card title="Arc Large Value">
          <ArcGauge
            value={88}
            label="temperature"
            styles={{ value: { fontSize: 42, color: '#059669', fontWeight: 800 } }}
          />
        </Card>

        <Card title="Arc 270">
          <ArcGauge
            value={60}
            alertZones={threeZones}
            label="temperature"
            unit="°C"
            styles={{ arcAngle: 270 }}
          />
        </Card>

        <Card title="Arc 270 Dark">
          <ArcGauge
            value={60}
            alertZones={threeZones}
            label="temperature"
            unit="°C"
            styles={{
              arcAngle: 270,
              background: { color: '#0f172a' },
              value: { color: '#ffffff' },
              label: { color: '#94a3b8' },
              minMax: { color: '#64748b' },
              unit: { color: '#94a3b8' },
            }}
          />
        </Card>

        <Card title="Arc 300">
          <ArcGauge
            value={80}
            alertZones={threeZones}
            label="temperature"
            styles={{ arcAngle: 300 }}
          />
        </Card>

        <Card title="Arc Show Zone Values">
          <ArcGauge
            value={55}
            alertZones={[
              { min: 0, max: 30, color: '#22c55e' },
              { min: 30, max: 70, color: '#f59e0b' },
              { min: 70, max: 100, color: '#ef4444' },
            ]}
            showZoneValues
            label="temperature"
          />
        </Card>

        <Card title="Arc Value Zero">
          <ArcGauge value={0} alertZones={threeZones} label="temperature" />
        </Card>

        <Card title="Arc Value Max">
          <ArcGauge value={100} alertZones={threeZones} label="temperature" />
        </Card>

        <Card title="Arc Value Over Max">
          <ArcGauge value={120} max={100} alertZones={threeZones} label="temperature" />
        </Card>

        <Card title="Arc Custom Range">
          <ArcGauge value={250} min={0} max={500} label="pressure" unit="PSI" />
        </Card>

        <Card title="Arc No Label">
          <ArcGauge value={65} alertZones={threeZones} />
        </Card>

        <Card title="Arc Loading">
          <ArcGauge value={null as any} label="temperature" showLoading={true} />
        </Card>
      </div>

      {/* --- Resizable --- */}
      <h2 data-testid="resizable-section">Resizable Gauges</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>

        <ResizableCard title="Resizable Needle">
          <NeedleGauge value={65} alertZones={threeZones} label="temperature" unit="°C" />
        </ResizableCard>

        <ResizableCard title="Resizable Arc">
          <ArcGauge value={65} alertZones={threeZones} label="temperature" unit="°C" />
        </ResizableCard>

        <ResizableCard title="Resizable Needle 270">
          <NeedleGauge value={65} alertZones={threeZones} label="temperature" styles={{ arcAngle: 270 }} />
        </ResizableCard>

        <ResizableCard title="Resizable Arc 270">
          <ArcGauge value={65} alertZones={threeZones} label="temperature" styles={{ arcAngle: 270 }} />
        </ResizableCard>
      </div>
    </div>
  );
}
