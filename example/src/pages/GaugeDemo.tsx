import { useMemo, useState, useCallback } from 'react';
import { RelayApp } from 'relayx-app-js';
import {
  NeedleGauge,
  ArcGauge,
  ProgressBar,
  RelayProvider,
  useRelayLatest,
  useRelayConnection,
  type ZoneTransition,
} from '@relayx/ui';
import { useConfig } from '../hooks/useConfig';

export function GaugeDemo() {
  const { config, isConfigured } = useConfig();

  if (!isConfigured) {
    return (
      <div style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, color: '#6b7280' }}>
        <div style={{ fontSize: 48 }}>&#9881;</div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111827' }}>Configuration Required</h2>
        <p>Go to Settings and enter your RelayX credentials + device ident + metrics.</p>
      </div>
    );
  }

  return <LiveGaugeWrapper config={config} />;
}

function LiveGaugeWrapper({ config }: { config: any }) {
  const app = useMemo(
    () => new RelayApp({ api_key: config.apiKey, secret: config.secret, mode: config.mode }),
    [config.apiKey, config.secret, config.mode]
  );

  return (
    <RelayProvider app={app as any}>
      <LiveGaugePage deviceIdent={config.deviceIdent} metrics={config.metrics} />
    </RelayProvider>
  );
}

const alertZones3 = [
  { min: 0, max: 30, color: '#22c55e', label: 'Normal' },
  { min: 30, max: 70, color: '#f59e0b', label: 'Warning' },
  { min: 70, max: 100, color: '#ef4444', label: 'Critical' },
];

const alertZones5 = [
  { min: 0, max: 20, color: '#3b82f6' },
  { min: 20, max: 40, color: '#22c55e' },
  { min: 40, max: 60, color: '#f59e0b' },
  { min: 60, max: 80, color: '#f97316' },
  { min: 80, max: 100, color: '#ef4444' },
];

function Card({ title, children, span = 1, minHeight = 180 }: { title: string; children: React.ReactNode; span?: number; minHeight?: number }) {
  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: 16,
      gridColumn: `span ${span}`,
      display: 'flex',
      flexDirection: 'column',
      resize: 'both',
      overflow: 'hidden',
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>{title}</div>
      <div style={{ flex: 1, minHeight }}>{children}</div>
    </div>
  );
}

function LiveGaugePage({ deviceIdent, metrics }: { deviceIdent: string; metrics: string[] }) {
  const { isConnected } = useRelayConnection();
  const firstMetric = metrics[0] ?? 'value';
  const secondMetric = metrics[1];

  const [timeRange] = useState(() => ({
    start: new Date(Date.now() - 10 * 24 * 60 * 60_000).toISOString(),
    end: new Date().toISOString(),
  }));

  const { value: val1, timestamp: ts1 } = useRelayLatest({ deviceIdent, metric: firstMetric, timeRange });
  const { value: val2, timestamp: ts2 } = useRelayLatest({ deviceIdent, metric: secondMetric ?? firstMetric, timeRange });

  const v = val1 ?? 0;
  const v2 = val2 ?? 0;
  const lastTs = ts1 ?? ts2 ?? null;

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Gauges</h1>
      <p style={{ color: '#6b7280', marginBottom: 16 }}>
        All gauges reflect live <strong>{firstMetric}</strong> data from <strong>{deviceIdent}</strong>.
      </p>

      {/* Connection status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24,
        padding: '8px 16px', borderRadius: 8,
        backgroundColor: isConnected ? '#f0fdf4' : '#fef2f2',
        color: isConnected ? '#166534' : '#991b1b',
        fontSize: 13,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: isConnected ? '#22c55e' : '#ef4444' }} />
        {isConnected ? `Connected to ${deviceIdent}` : 'Connecting...'}
      </div>

      {/* ---- NEEDLE GAUGE VARIATIONS ---- */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, marginTop: 8, color: '#111827' }}>
        Needle Gauge Variations
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 40 }}>

        {/* 1. Default — with last updated */}
        <Card title="Default (with timestamp)">
          <NeedleGauge
            value={v}
            label={firstMetric}
            lastUpdated={lastTs}
            showLastUpdated
          />
        </Card>

        {/* 2. With alert zones */}
        <Card title="With 3 Alert Zones">
          <NeedleGauge
            value={v}
            label={firstMetric}
            alertZones={alertZones3}
          />
        </Card>

        {/* 3. With 5 alert zones */}
        <Card title="With 5 Alert Zones">
          <NeedleGauge
            value={v}
            label={firstMetric}
            alertZones={alertZones5}
          />
        </Card>

        {/* 4. Custom unit + timestamp */}
        <Card title="With Unit Suffix + Timestamp">
          <NeedleGauge
            value={v}
            label={firstMetric}
            unit="°C"
            alertZones={alertZones3}
            lastUpdated={lastTs}
            showLastUpdated
          />
        </Card>

        {/* 5. Custom format */}
        <Card title="Custom formatValue (1 decimal + %)">
          <NeedleGauge
            value={v}
            label={firstMetric}
            formatValue={(n) => `${n.toFixed(1)}%`}
          />
        </Card>

        {/* 6. Thick arc + thick needle */}
        <Card title="Thick Arc (28px) + Thick Needle (5px)">
          <NeedleGauge
            value={v}
            label={firstMetric}
            alertZones={alertZones3}
            styles={{
              arcThickness: 28,
              needleThickness: 5,
            }}
          />
        </Card>

        {/* 7. Thin arc + thin needle */}
        <Card title="Thin Arc (6px) + Thin Needle (1px)">
          <NeedleGauge
            value={v}
            label={firstMetric}
            alertZones={alertZones3}
            styles={{
              arcThickness: 6,
              needleThickness: 1,
            }}
          />
        </Card>

        {/* 8. Large value text, custom colors */}
        <Card title="Large Value (36px), Purple Theme">
          <NeedleGauge
            value={v}
            label={firstMetric}
            unit="units"
            styles={{
              value: { fontSize: 36, fontWeight: 800, color: '#7c3aed' },
              label: { fontSize: 14, color: '#7c3aed' },
              unit: { fontSize: 14, color: '#a78bfa' },
              arcThickness: 18,
            }}
          />
        </Card>

        {/* 9. Dark background */}
        <Card title="Dark Background">
          <NeedleGauge
            value={v}
            label={firstMetric}
            unit="°C"
            alertZones={alertZones3}
            styles={{
              background: { color: '#1a1a2e' },
              value: { color: '#ffffff', fontSize: 24 },
              label: { color: '#94a3b8' },
              unit: { color: '#94a3b8' },
            }}
          />
        </Card>

        {/* 10. Custom min/max range */}
        <Card title="Custom Range (-50 to 150)">
          <NeedleGauge
            value={v}
            min={-50}
            max={150}
            label={firstMetric}
            alertZones={[
              { min: -50, max: 0, color: '#3b82f6' },
              { min: 0, max: 50, color: '#22c55e' },
              { min: 50, max: 100, color: '#f59e0b' },
              { min: 100, max: 150, color: '#ef4444' },
            ]}
          />
        </Card>

        {/* 11. Explicit dimensions + dark bg */}
        <Card title="Explicit Size (250×150) + Dark BG">
          <NeedleGauge
            value={v}
            label={firstMetric}
            alertZones={alertZones3}
            styles={{
              width: 250,
              height: 150,
              background: { color: '#1a1a2e' },
              value: { color: '#ffffff' },
              label: { color: '#94a3b8' },
            }}
          />
        </Card>

        {/* 12. Second metric (if available) */}
        <Card title={`Second Metric: ${secondMetric ?? firstMetric}`}>
          <NeedleGauge
            value={v2}
            label={secondMetric ?? firstMetric}
            unit="%"
            alertZones={alertZones3}
            styles={{
              arcThickness: 16,
              needleThickness: 3,
              value: { fontSize: 20, color: '#0891b2' },
              label: { color: '#0891b2' },
            }}
          />
        </Card>

        {/* 13. Rubik SemiBold font */}
        <Card title="Custom Font (Rubik SemiBold .ttf)">
          <NeedleGauge
            value={v}
            label={firstMetric}
            unit="°C"
            alertZones={alertZones3}
            styles={{
              value: { fontSize: 26, fontFile: '/Rubik-SemiBold.ttf' },
              label: { fontSize: 13, fontFile: '/Rubik-SemiBold.ttf' },
              unit: { fontSize: 13, fontFile: '/Rubik-SemiBold.ttf' },
            }}
          />
        </Card>

        {/* 14. Minimal — no zones, no label, no unit */}
        <Card title="Minimal (value only)">
          <NeedleGauge
            value={v}
            styles={{ arcThickness: 10, needleThickness: 2 }}
          />
        </Card>

        {/* 15. Arc Angle 90° */}
        <Card title="Arc Angle: 90°">
          <NeedleGauge
            value={v}
            label={firstMetric}
            alertZones={alertZones3}
            styles={{ arcAngle: 90, arcThickness: 12, needleThickness: 2 }}
          />
        </Card>

        {/* 16. Arc Angle 120° */}
        <Card title="Arc Angle: 120°">
          <NeedleGauge
            value={v}
            label={firstMetric}
            alertZones={alertZones3}
            styles={{ arcAngle: 120, arcThickness: 14 }}
          />
        </Card>

        {/* 17. Arc Angle 200° */}
        <Card title="Arc Angle: 200°">
          <NeedleGauge
            value={v}
            label={firstMetric}
            unit="°C"
            alertZones={alertZones3}
            styles={{ arcAngle: 200, arcThickness: 16, needleThickness: 3 }}
          />
        </Card>

        {/* 18. Arc Angle 240° */}
        <Card title="Arc Angle: 240°">
          <NeedleGauge
            value={v}
            label={firstMetric}
            unit="°C"
            alertZones={alertZones5}
            styles={{ arcAngle: 240, arcThickness: 18, needleThickness: 3 }}
          />
        </Card>

        {/* 19. Arc Angle 270° — dark */}
        <Card title="Arc Angle: 270° (Dark)" minHeight={300}>
          <NeedleGauge
            value={v}
            label={firstMetric}
            unit="°C"
            alertZones={alertZones3}
            styles={{
              arcAngle: 270,
              arcThickness: 10,
              needleThickness: 3,
              background: { color: '#0f172a' },
              value: { color: '#f1f5f9', fontSize: 24 },
              label: { color: '#64748b' },
              unit: { color: '#64748b' },
            }}
          />
        </Card>

        {/* 20. Arc Angle 300° */}
        <Card title="Arc Angle: 300° (max)" minHeight={320}>
          <NeedleGauge
            value={v}
            label={firstMetric}
            alertZones={alertZones3}
            styles={{ arcAngle: 300, arcThickness: 14, needleThickness: 2 }}
          />
        </Card>

        {/* 21. Arc Angle 30° (min) */}
        <Card title="Arc Angle: 30° (min)">
          <NeedleGauge
            value={v}
            label={firstMetric}
            alertZones={alertZones3}
            styles={{ arcAngle: 30, arcThickness: 10 }}
          />
        </Card>
      </div>

      {/* ---- ARC GAUGE VARIATIONS ---- */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#111827' }}>
        Arc Gauge Variations
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 40 }}>

        {/* 1. Default + timestamp */}
        <Card title="Default (with timestamp)">
          <ArcGauge
            value={v}
            label={firstMetric}
            lastUpdated={lastTs}
            showLastUpdated
          />
        </Card>

        {/* 2. With alert zones */}
        <Card title="With 3 Alert Zones">
          <ArcGauge
            value={v}
            label={firstMetric}
            alertZones={alertZones3}
          />
        </Card>

        {/* 3. With 5 alert zones */}
        <Card title="With 5 Alert Zones">
          <ArcGauge
            value={v}
            label={firstMetric}
            alertZones={alertZones5}
          />
        </Card>

        {/* 4. With unit */}
        <Card title="With Unit Suffix (%)">
          <ArcGauge
            value={v}
            label={firstMetric}
            unit="%"
            alertZones={alertZones3}
          />
        </Card>

        {/* 5. Custom format */}
        <Card title="Custom formatValue (integer + suffix)">
          <ArcGauge
            value={v}
            label={firstMetric}
            formatValue={(n) => `${Math.round(n)} pts`}
          />
        </Card>

        {/* 6. Thick arc */}
        <Card title="Thick Arc (36px)">
          <ArcGauge
            value={v}
            label={firstMetric}
            alertZones={alertZones3}
            styles={{ arcThickness: 36 }}
          />
        </Card>

        {/* 7. Thin arc */}
        <Card title="Thin Arc (8px)">
          <ArcGauge
            value={v}
            label={firstMetric}
            alertZones={alertZones3}
            styles={{ arcThickness: 8 }}
          />
        </Card>

        {/* 8. Large value, green theme */}
        <Card title="Large Value (42px), Green Theme">
          <ArcGauge
            value={v}
            label={firstMetric}
            unit="%"
            styles={{
              value: { fontSize: 42, fontWeight: 800, color: '#16a34a' },
              label: { fontSize: 14, color: '#16a34a' },
              unit: { fontSize: 16, color: '#22c55e' },
              arcThickness: 24,
            }}
          />
        </Card>

        {/* 9. Dark background */}
        <Card title="Dark Background">
          <ArcGauge
            value={v}
            label={firstMetric}
            unit="°C"
            alertZones={alertZones3}
            styles={{
              background: { color: '#0f172a' },
              value: { color: '#f1f5f9', fontSize: 28 },
              label: { color: '#64748b' },
              unit: { color: '#64748b' },
              arcThickness: 22,
            }}
          />
        </Card>

        {/* 10. Custom range 0-1000 */}
        <Card title="Custom Range (0-1000)">
          <ArcGauge
            value={v * 10}
            min={0}
            max={1000}
            label={firstMetric}
            formatValue={(n) => `${Math.round(n)}`}
            alertZones={[
              { min: 0, max: 250, color: '#22c55e' },
              { min: 250, max: 500, color: '#84cc16' },
              { min: 500, max: 750, color: '#f59e0b' },
              { min: 750, max: 1000, color: '#ef4444' },
            ]}
          />
        </Card>

        {/* 11. Explicit dimensions + dark bg */}
        <Card title="Explicit Size (250×150) + Dark BG">
          <ArcGauge
            value={v}
            label={firstMetric}
            alertZones={alertZones3}
            styles={{
              width: 250,
              height: 150,
              background: { color: '#0f172a' },
              value: { color: '#f1f5f9' },
              label: { color: '#64748b' },
              unit: { color: '#64748b' },
            }}
          />
        </Card>

        {/* 12. Second metric */}
        <Card title={`Second Metric: ${secondMetric ?? firstMetric}`}>
          <ArcGauge
            value={v2}
            label={secondMetric ?? firstMetric}
            unit="%"
            alertZones={alertZones3}
            styles={{
              arcThickness: 18,
              value: { fontSize: 24, color: '#dc2626' },
              label: { color: '#dc2626' },
            }}
          />
        </Card>

        {/* 13. Rubik SemiBold font */}
        <Card title="Custom Font (Rubik SemiBold .ttf)">
          <ArcGauge
            value={v}
            label={firstMetric}
            unit="°C"
            alertZones={alertZones3}
            styles={{
              value: { fontSize: 30, fontFile: '/Rubik-SemiBold.ttf' },
              label: { fontSize: 13, fontFile: '/Rubik-SemiBold.ttf' },
              unit: { fontSize: 14, fontFile: '/Rubik-SemiBold.ttf' },
              arcThickness: 22,
            }}
          />
        </Card>

        {/* 14. Minimal — no zones, no label */}
        <Card title="Minimal (value only)">
          <ArcGauge
            value={v}
            styles={{ arcThickness: 12 }}
          />
        </Card>

        {/* 15. Arc Angle 90° */}
        <Card title="Arc Angle: 90°">
          <ArcGauge
            value={v}
            label={firstMetric}
            alertZones={alertZones3}
            styles={{ arcAngle: 90, arcThickness: 16 }}
          />
        </Card>

        {/* 16. Arc Angle 120° */}
        <Card title="Arc Angle: 120°">
          <ArcGauge
            value={v}
            label={firstMetric}
            alertZones={alertZones3}
            styles={{ arcAngle: 120, arcThickness: 18 }}
          />
        </Card>

        {/* 17. Arc Angle 200° */}
        <Card title="Arc Angle: 200°">
          <ArcGauge
            value={v}
            label={firstMetric}
            unit="%"
            alertZones={alertZones3}
            styles={{ arcAngle: 200, arcThickness: 20 }}
          />
        </Card>

        {/* 18. Arc Angle 240° */}
        <Card title="Arc Angle: 240°">
          <ArcGauge
            value={v}
            label={firstMetric}
            unit="°C"
            alertZones={alertZones5}
            styles={{ arcAngle: 240, arcThickness: 22 }}
          />
        </Card>

        {/* 19. Arc Angle 270° — dark */}
        <Card title="Arc Angle: 270° (Dark)" minHeight={300}>
          <ArcGauge
            value={v}
            label={firstMetric}
            unit="°C"
            alertZones={alertZones3}
            styles={{
              arcAngle: 270,
              arcThickness: 24,
              background: { color: '#0f172a' },
              value: { color: '#f1f5f9', fontSize: 28 },
              label: { color: '#64748b' },
              unit: { color: '#64748b' },
            }}
          />
        </Card>

        {/* 20. Arc Angle 300° */}
        <Card title="Arc Angle: 300° (max)" minHeight={320}>
          <ArcGauge
            value={v}
            label={firstMetric}
            alertZones={alertZones3}
            styles={{ arcAngle: 300, arcThickness: 18 }}
          />
        </Card>

        {/* 21. Arc Angle 30° (min) */}
        <Card title="Arc Angle: 30° (min)">
          <ArcGauge
            value={v}
            label={firstMetric}
            alertZones={alertZones3}
            styles={{ arcAngle: 30, arcThickness: 14 }}
          />
        </Card>
      </div>

      {/* ---- SIDE BY SIDE COMPARISON ---- */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#111827' }}>
        Side-by-Side Comparison
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 40 }}>
        <Card title="Needle Gauge — Same Value">
          <NeedleGauge
            value={v}
            label={firstMetric}
            unit="°C"
            alertZones={alertZones3}
            styles={{
              arcThickness: 16,
              needleThickness: 3,
              value: { fontSize: 24 },
            }}
          />
        </Card>
        <Card title="Arc Gauge — Same Value">
          <ArcGauge
            value={v}
            label={firstMetric}
            unit="°C"
            alertZones={alertZones3}
            styles={{
              arcThickness: 22,
              value: { fontSize: 28 },
            }}
          />
        </Card>
      </div>

      {/* ---- MIN/MAX STYLING & ZONE BOUNDARY VALUES ---- */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, marginTop: 24, color: '#111827' }}>
        Min/Max Styles & Zone Boundary Values
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
        <Card title="showZoneValues (Needle)" minHeight={220}>
          <NeedleGauge
            value={v}
            label={firstMetric}
            showZoneValues
            alertZones={alertZones3}
            styles={{ minMax: { fontSize: 11, color: '#374151', fontWeight: 600 } }}
          />
        </Card>
        <Card title="showZoneValues (Arc)" minHeight={220}>
          <ArcGauge
            value={v}
            label={firstMetric}
            showZoneValues
            alertZones={alertZones3}
            styles={{ minMax: { fontSize: 11, color: '#374151', fontWeight: 600 } }}
          />
        </Card>
        <Card title="Custom minMax Style (Needle)" minHeight={220}>
          <NeedleGauge
            value={v}
            label={firstMetric}
            showZoneValues
            alertZones={[
              { min: 0, max: 25, color: '#3b82f6' },
              { min: 25, max: 50, color: '#06b6d4' },
              { min: 50, max: 75, color: '#f59e0b' },
              { min: 75, max: 100, color: '#ef4444' },
            ]}
            styles={{
              minMax: { fontSize: 12, color: '#1e40af', fontWeight: 700, fontFamily: 'monospace' },
            }}
          />
        </Card>
        <Card title="Custom minMax Style (Arc)" minHeight={220}>
          <ArcGauge
            value={v}
            label={firstMetric}
            showZoneValues
            alertZones={[
              { min: 0, max: 25, color: '#3b82f6' },
              { min: 25, max: 50, color: '#06b6d4' },
              { min: 50, max: 75, color: '#f59e0b' },
              { min: 75, max: 100, color: '#ef4444' },
            ]}
            styles={{
              minMax: { fontSize: 12, color: '#1e40af', fontWeight: 700, fontFamily: 'monospace' },
            }}
          />
        </Card>
        <Card title="Zone Values + 270° (Needle, Dark)" minHeight={350}>
          <NeedleGauge
            value={v}
            label={firstMetric}
            unit="°C"
            showZoneValues
            alertZones={alertZones3}
            styles={{
              arcAngle: 270,
              background: { color: '#0f172a' },
              value: { color: '#fff', fontSize: 24 },
              label: { color: '#94a3b8' },
              unit: { color: '#94a3b8' },
              minMax: { fontSize: 11, color: '#cbd5e1' },
            }}
          />
        </Card>
        <Card title="Zone Values + 270° (Arc, Dark)" minHeight={350}>
          <ArcGauge
            value={v}
            label={firstMetric}
            unit="°C"
            showZoneValues
            alertZones={alertZones3}
            styles={{
              arcAngle: 270,
              background: { color: '#0f172a' },
              value: { color: '#fff', fontSize: 24 },
              label: { color: '#94a3b8' },
              unit: { color: '#94a3b8' },
              minMax: { fontSize: 11, color: '#cbd5e1' },
            }}
          />
        </Card>
      </div>

      {/* ---- ZONE TRANSITION CALLBACKS ---- */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#111827' }}>
        Zone Transition Callbacks (onZoneChange)
      </h2>
      <ZoneTransitionDemo value={v} metric={firstMetric} />
    </div>
  );
}

function ZoneTransitionDemo({ value, metric }: { value: number; metric: string }) {
  const [log, setLog] = useState<string[]>([]);

  const handleZoneChange = useCallback((t: ZoneTransition) => {
    const prevName = t.previousZone?.label ?? t.previousZone?.color ?? 'none';
    const currName = t.currentZone?.label ?? t.currentZone?.color ?? 'none';
    const time = new Date().toLocaleTimeString();
    setLog((prev) => [
      `[${time}] ${t.value.toFixed(1)} → zone changed: ${prevName} → ${currName}`,
      ...prev.slice(0, 19),
    ]);
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 40 }}>
      {/* Needle Gauge with callback */}
      <Card title="NeedleGauge + onZoneChange">
        <NeedleGauge
          value={value}
          label={metric}
          alertZones={alertZones3}
          onZoneChange={handleZoneChange}
          styles={{ arcAngle: 240, arcThickness: 14, needleThickness: 3 }}
        />
      </Card>

      {/* Arc Gauge with callback */}
      <Card title="ArcGauge + onZoneChange">
        <ArcGauge
          value={value}
          label={metric}
          alertZones={alertZones3}
          onZoneChange={handleZoneChange}
          styles={{ arcAngle: 240, arcThickness: 20 }}
        />
      </Card>

      {/* Progress Bar with callback */}
      <Card title="ProgressBar + onZoneChange">
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', padding: '0 8px' }}>
          <ProgressBar
            value={value}
            alertZones={alertZones3}
            onZoneChange={handleZoneChange}
            formatValue={(n) => `${n.toFixed(1)}%`}
          />
        </div>
      </Card>

      {/* Transition log */}
      <div style={{
        gridColumn: 'span 3',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 16,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
          Zone Transition Log
          {log.length > 0 && (
            <button
              type="button"
              onClick={() => setLog([])}
              style={{
                marginLeft: 12, fontSize: 11, color: '#6b7280', background: 'none',
                border: '1px solid #d1d5db', borderRadius: 4, padding: '2px 8px', cursor: 'pointer',
              }}
            >
              Clear
            </button>
          )}
        </div>
        <div style={{
          fontFamily: 'monospace', fontSize: 12, color: '#374151',
          maxHeight: 200, overflowY: 'auto', lineHeight: 1.6,
        }}>
          {log.length === 0 ? (
            <span style={{ color: '#9ca3af' }}>Waiting for zone transitions... (value must cross a zone boundary)</span>
          ) : (
            log.map((entry, i) => <div key={i}>{entry}</div>)
          )}
        </div>
      </div>
    </div>
  );
}
