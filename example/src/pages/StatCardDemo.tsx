import { useMemo } from 'react';
import { RelayApp } from 'relayx-app-js';
import {
  StatCard,
  StatCardWithGraph,
  RelayProvider,
  useRelayLatest,
  useRelayTimeSeries,
  useRelayConnection,
} from '@relayx/ui';
import { useConfig } from '../hooks/useConfig';

const threeZones = [
  { min: 0, max: 40, color: '#22c55e', label: 'Normal' },
  { min: 40, max: 70, color: '#f59e0b', label: 'Warning' },
  { min: 70, max: 100, color: '#ef4444', label: 'Critical' },
];

export function StatCardDemo() {
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

  return <LiveStatCardWrapper config={config} />;
}

function LiveStatCardWrapper({ config }: { config: any }) {
  const app = useMemo(
    () => new RelayApp({ api_key: config.apiKey, secret: config.secret, mode: config.mode }),
    [config.apiKey, config.secret, config.mode]
  );

  return (
    <RelayProvider app={app as any}>
      <LiveStatCardPage deviceIdent={config.deviceIdent} metrics={config.metrics} />
    </RelayProvider>
  );
}

function Card({ title, children, height = 160, resizable = false }: { title: string; children: React.ReactNode; height?: number; resizable?: boolean }) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 16,
        ...(resizable ? { resize: 'both', overflow: 'auto', minWidth: 200, minHeight: 120, width: 400, height: height + 50 } : {}),
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13, color: '#6b7280' }}>{title}</div>
      <div style={{ height, overflow: 'hidden' }}>{children}</div>
      {resizable && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>↘ drag corner to resize</div>}
    </div>
  );
}

function LiveStatCardPage({ deviceIdent, metrics }: { deviceIdent: string; metrics: string[] }) {
  const { isConnected } = useRelayConnection();
  const firstMetric = metrics[0] ?? 'value';
  const secondMetric = metrics[1];

  const { value: val1, timestamp: ts1 } = useRelayLatest(deviceIdent, firstMetric);
  const { value: val2, timestamp: ts2 } = useRelayLatest(deviceIdent, secondMetric ?? firstMetric);
  const { data: tsData } = useRelayTimeSeries({
    deviceIdent,
    metrics,
    timeRange: {
      start: new Date(Date.now() - 60000).toISOString(),
      end: new Date().toISOString(),
    },
    live: true,
  });

  const v = val1 ?? 0;
  const v2 = val2 ?? 0;
  const lastTs = ts1 ?? ts2 ?? null;

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Stat Cards</h1>
      <p style={{ color: '#6b7280', marginBottom: 16 }}>
        All cards reflect live <strong>{firstMetric}</strong> data from <strong>{deviceIdent}</strong>.
      </p>

      {/* Connection status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24,
        padding: '8px 16px', borderRadius: 8, fontSize: 13,
        backgroundColor: isConnected ? '#f0fdf4' : '#fffbeb',
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: isConnected ? '#22c55e' : '#f59e0b' }} />
        <span style={{ color: isConnected ? '#16a34a' : '#d97706' }}>
          {isConnected ? `Connected to ${deviceIdent}` : 'Connecting...'}
        </span>
      </div>

      {/* --- StatCard Variations --- */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>StatCard Variations</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 40 }}>

        <Card title="Default">
          <StatCard value={v} label={firstMetric} />
        </Card>

        <Card title="With Timestamp">
          <StatCard value={v} label={firstMetric} lastUpdated={lastTs} showLastUpdated />
        </Card>

        <Card title="Custom Format">
          <StatCard
            value={v}
            label={firstMetric}
            formatValue={(val) => `${Number(val).toFixed(1)}°C`}
          />
        </Card>

        <Card title="Alert Zones">
          <StatCard
            value={v}
            numericValue={v}
            label={firstMetric}
            alertZones={threeZones}
            lastUpdated={lastTs}
            showLastUpdated
          />
        </Card>

        <Card title="Zone + Style Override (purple value)">
          <StatCard
            value={v}
            numericValue={v}
            label={firstMetric}
            alertZones={threeZones}
            styles={{ value: { color: '#7c3aed', fontSize: 40, fontWeight: 800 } }}
          />
        </Card>

        <Card title="Custom Background + Border">
          <StatCard
            value={v}
            label={firstMetric}
            styles={{ background: { color: '#f8fafc' } }}
            borderColor="#3b82f6"
            borderThickness={2}
            borderRadius={16}
            lastUpdated={lastTs}
            showLastUpdated
          />
        </Card>

        <Card title="Sharp Edges">
          <StatCard value={v} label={firstMetric} borderRadius="sharp" borderColor="#e5e7eb" borderThickness={1} />
        </Card>

        <Card title="Dark Theme">
          <StatCard
            value={v}
            label={firstMetric}
            lastUpdated={lastTs}
            showLastUpdated
            styles={{
              background: { color: '#0f172a' },
              value: { color: '#ffffff', fontSize: 36 },
              label: { color: '#94a3b8' },
              lastUpdated: { color: '#64748b' },
            }}
          />
        </Card>

        <Card title={`String Value (${firstMetric} status)`}>
          <StatCard value={isConnected ? 'Online' : 'Offline'} label={`${deviceIdent} status`} />
        </Card>

        <Card title="Boolean Value">
          <StatCard value={isConnected} label="connected" />
        </Card>

        <Card title="JSON Object">
          <StatCard
            value={{ [firstMetric]: v, connected: isConnected }}
            label="device payload"
          />
        </Card>

        <Card title="Custom Timestamp Format">
          <StatCard
            value={v}
            label={firstMetric}
            lastUpdated={lastTs}
            showLastUpdated
            formatTimestamp={(ts) => {
              const d = ts instanceof Date ? ts : new Date(ts);
              return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
            }}
          />
        </Card>

        {secondMetric && (
          <Card title={`Second Metric (${secondMetric})`}>
            <StatCard value={v2} label={secondMetric} lastUpdated={ts2} showLastUpdated />
          </Card>
        )}

        <Card title="Explicit Size (250×100)">
          <StatCard value={v} label={firstMetric} styles={{ width: 250, height: 100 }} />
        </Card>
      </div>

      {/* --- StatCardWithGraph Variations --- */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>StatCardWithGraph Variations</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 40 }}>

        <Card title="Default Sparkline" height={180}>
          <StatCardWithGraph
            value={v}
            label={firstMetric}
            sparklineData={tsData}
            sparklineExtractor={(p) => Number(p[firstMetric]) || 0}
            lastUpdated={lastTs}
            showLastUpdated
          />
        </Card>

        <Card title="Sparkline + Alert Zones" height={180}>
          <StatCardWithGraph
            value={v}
            numericValue={v}
            label={firstMetric}
            sparklineData={tsData}
            sparklineExtractor={(p) => Number(p[firstMetric]) || 0}
            alertZones={threeZones}
            lastUpdated={lastTs}
            showLastUpdated
          />
        </Card>

        <Card title="Custom Graph Color (red)" height={180}>
          <StatCardWithGraph
            value={v}
            label={firstMetric}
            sparklineData={tsData}
            sparklineExtractor={(p) => Number(p[firstMetric]) || 0}
            graphLineColor="#ef4444"
          />
        </Card>

        <Card title="Custom Graph Color + Zones (purple overrides)" height={180}>
          <StatCardWithGraph
            value={v}
            numericValue={v}
            label={firstMetric}
            sparklineData={tsData}
            sparklineExtractor={(p) => Number(p[firstMetric]) || 0}
            alertZones={threeZones}
            graphLineColor="#7c3aed"
          />
        </Card>

        <Card title="Dark Theme Sparkline" height={180}>
          <StatCardWithGraph
            value={v}
            label={firstMetric}
            sparklineData={tsData}
            sparklineExtractor={(p) => Number(p[firstMetric]) || 0}
            lastUpdated={lastTs}
            showLastUpdated
            styles={{
              background: { color: '#0f172a' },
              value: { color: '#ffffff', fontSize: 36 },
              label: { color: '#94a3b8' },
              lastUpdated: { color: '#64748b' },
            }}
            graphLineColor="#3b82f6"
          />
        </Card>

        <Card title="Custom Format (°C)" height={180}>
          <StatCardWithGraph
            value={v}
            label={firstMetric}
            formatValue={(val) => `${Number(val).toFixed(1)}°C`}
            sparklineData={tsData}
            sparklineExtractor={(p) => Number(p[firstMetric]) || 0}
          />
        </Card>

        <Card title="10s Window" height={180}>
          <StatCardWithGraph
            value={v}
            label={firstMetric}
            sparklineData={tsData}
            sparklineExtractor={(p) => Number(p[firstMetric]) || 0}
            sparklineWindow={10000}
          />
        </Card>

        <Card title="Custom Border" height={180}>
          <StatCardWithGraph
            value={v}
            label={firstMetric}
            sparklineData={tsData}
            sparklineExtractor={(p) => Number(p[firstMetric]) || 0}
            borderColor="#3b82f6"
            borderThickness={2}
            borderRadius={16}
          />
        </Card>

        {secondMetric && (
          <Card title={`Second Metric (${secondMetric})`} height={180}>
            <StatCardWithGraph
              value={v2}
              label={secondMetric}
              sparklineData={tsData}
              sparklineExtractor={(p) => Number(p[secondMetric]) || 0}
              lastUpdated={ts2}
              showLastUpdated
            />
          </Card>
        )}

        <Card title="String + numericValue + Sparkline" height={180}>
          <StatCardWithGraph
            value={`${firstMetric}: ${isConnected ? 'Active' : 'Inactive'}`}
            numericValue={v}
            label={deviceIdent}
            sparklineData={tsData}
            sparklineExtractor={(p) => Number(p[firstMetric]) || 0}
            alertZones={threeZones}
          />
        </Card>
      </div>

      {/* --- Resizable --- */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Resizable</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 40 }}>

        <Card title="Resizable StatCard" height={140} resizable>
          <StatCard value={v} label={firstMetric} alertZones={threeZones} numericValue={v} lastUpdated={lastTs} showLastUpdated />
        </Card>

        <Card title="Resizable Sparkline" height={160} resizable>
          <StatCardWithGraph
            value={v}
            label={firstMetric}
            sparklineData={tsData}
            sparklineExtractor={(p) => Number(p[firstMetric]) || 0}
            alertZones={threeZones}
            numericValue={v}
            lastUpdated={lastTs}
            showLastUpdated
          />
        </Card>
      </div>
    </div>
  );
}
