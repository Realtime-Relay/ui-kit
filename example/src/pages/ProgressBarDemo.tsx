import { useMemo } from 'react';
import { RelayApp } from 'relayx-app-js';
import {
  ProgressBar,
  RelayProvider,
  useRelayLatest,
  useRelayConnection,
} from '@relayx/ui';
import { useConfig } from '../hooks/useConfig';

export function ProgressBarDemo() {
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

  return <LiveProgressWrapper config={config} />;
}

function LiveProgressWrapper({ config }: { config: any }) {
  const app = useMemo(
    () => new RelayApp({ api_key: config.apiKey, secret: config.secret, mode: config.mode }),
    [config.apiKey, config.secret, config.mode]
  );

  return (
    <RelayProvider app={app as any}>
      <LiveProgressPage deviceIdent={config.deviceIdent} metrics={config.metrics} />
    </RelayProvider>
  );
}

function LiveProgressPage({ deviceIdent, metrics }: { deviceIdent: string; metrics: string[] }) {
  const { isConnected } = useRelayConnection();
  const firstMetric = metrics[0] ?? 'value';
  const secondMetric = metrics[1];

  const { value: val1 } = useRelayLatest(deviceIdent, firstMetric);
  const { value: val2 } = useRelayLatest(deviceIdent, secondMetric ?? firstMetric);

  const v = val1 ?? 0;
  const v2 = val2 ?? 0;

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Progress Bar</h1>
      <p style={{ color: '#6b7280', marginBottom: 16 }}>
        All bars reflect live <strong>{firstMetric}</strong> data from <strong>{deviceIdent}</strong>.
      </p>

      {/* Connection status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24,
        padding: '8px 16px', borderRadius: 8, fontSize: 13,
        backgroundColor: isConnected ? '#f0fdf4' : '#fffbeb',
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: isConnected ? '#22c55e' : '#f59e0b' }} />
        <span style={{ color: isConnected ? '#16a34a' : '#d97706' }}>
          {isConnected ? `Connected — ${firstMetric}: ${v}` : 'Connecting...'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>

        {/* Default */}
        <Card title="Default" span={2}>
          <div style={{ height: 28 }}>
            <ProgressBar value={v} />
          </div>
        </Card>

        {/* With unit format */}
        <Card title={`${firstMetric} with unit`} span={2}>
          <div style={{ height: 28 }}>
            <ProgressBar value={v} formatValue={(val) => `${val.toFixed(1)}`} />
          </div>
        </Card>

        {/* No label */}
        <Card title="No Label" span={2}>
          <div style={{ height: 20 }}>
            <ProgressBar value={v} showLabel={false} />
          </div>
        </Card>

        {/* Alert zones — traffic light */}
        <Card title="Alert Zones (Traffic Light)" span={2}>
          <div style={{ height: 28 }}>
            <ProgressBar
              value={v}
              formatValue={(val) => `${val.toFixed(1)} *C`}
              alertZones={[
                { min: 0, max: 40, color: '#22c55e' },
                { min: 40, max: 70, color: '#f59e0b' },
                { min: 70, max: 100, color: '#ef4444' },
              ]}
            />
          </div>
        </Card>

        {/* Alert zones — cool to hot */}
        <Card title="Alert Zones (Cool to Hot)" span={2}>
          <div style={{ height: 28 }}>
            <ProgressBar
              value={v}
              formatValue={(val) => `${val.toFixed(1)}°C`}
              alertZones={[
                { min: 0, max: 25, color: '#3b82f6' },
                { min: 25, max: 50, color: '#06b6d4' },
                { min: 50, max: 75, color: '#f59e0b' },
                { min: 75, max: 100, color: '#ef4444' },
              ]}
            />
          </div>
        </Card>

        {/* Custom range 0-1000 */}
        <Card title="Custom Range (0–1000)" span={2}>
          <div style={{ height: 28 }}>
            <ProgressBar
              value={v * 10}
              min={0}
              max={1000}
              formatValue={(val) => `${val.toFixed(0)} RPM`}
            />
          </div>
        </Card>

        {/* Custom background */}
        <Card title="Custom Background" span={2}>
          <div style={{ height: 28 }}>
            <ProgressBar
              value={v}
              formatValue={(val) => `${val.toFixed(1)}`}
              styles={{ background: { color: '#f1f5f9' } }}
            />
          </div>
        </Card>

        {/* Custom label font */}
        <Card title="Monospace Font (14px bold)" span={2}>
          <div style={{ height: 32 }}>
            <ProgressBar
              value={v}
              formatValue={(val) => `${val.toFixed(2)}`}
              styles={{ label_font_file: { fontFamily: 'monospace', fontSize: 14, fontWeight: 700 } }}
            />
          </div>
        </Card>

        {/* Rubik SemiBold font via TTF file */}
        <Card title="Rubik SemiBold (TTF import)" span={2}>
          <div style={{ height: 36 }}>
            <ProgressBar
              value={v}
              formatValue={(val) => `${val.toFixed(1)}°C`}
              styles={{
                label_font_file: { fontFamily: '/fonts/Rubik-SemiBold.ttf', fontSize: 16, fontWeight: 600 },
                height: 36,
              }}
              alertZones={[
                { min: 0, max: 40, color: '#22c55e' },
                { min: 40, max: 70, color: '#f59e0b' },
                { min: 70, max: 100, color: '#ef4444' },
              ]}
            />
          </div>
        </Card>

        {/* Custom width: 60% */}
        <Card title="Custom Width (60%)" span={2}>
          <ProgressBar
            value={v}
            formatValue={(val) => `${val.toFixed(1)}`}
            styles={{ width: '60%', height: 24 }}
          />
        </Card>

        {/* Custom width: 300px */}
        <Card title="Custom Width (300px)" span={2}>
          <ProgressBar
            value={v}
            formatValue={(val) => `${val.toFixed(1)}`}
            styles={{ width: 300, height: 20 }}
          />
        </Card>

        {/* Tall bar */}
        <Card title="Tall Bar (height: 48px)" span={2}>
          <ProgressBar
            value={v}
            formatValue={(val) => `${val.toFixed(1)}%`}
            styles={{ height: 48, label_font_file: { fontSize: 18, fontWeight: 700 } }}
            alertZones={[
              { min: 0, max: 40, color: '#22c55e' },
              { min: 40, max: 70, color: '#f59e0b' },
              { min: 70, max: 100, color: '#ef4444' },
            ]}
          />
        </Card>

        {/* Thin bar */}
        <Card title="Thin Bar (height: 8px)" span={2}>
          <ProgressBar
            value={v}
            showLabel={false}
            styles={{ height: 8 }}
            alertZones={[
              { min: 0, max: 50, color: '#3b82f6' },
              { min: 50, max: 100, color: '#ec4899' },
            ]}
          />
        </Card>

        {/* Hidden alert zones (fill still uses zone color) */}
        <Card title="showAlertZones={false} (zones hidden, fill color still active)" span={2}>
          <ProgressBar
            value={v}
            formatValue={(val) => `${val.toFixed(1)}`}
            styles={{ height: 28 }}
            showAlertZones={false}
            alertZones={[
              { min: 0, max: 40, color: '#22c55e' },
              { min: 40, max: 70, color: '#f59e0b' },
              { min: 70, max: 100, color: '#ef4444' },
            ]}
          />
        </Card>

        {/* Vertical bars */}
        <Card title="Vertical Orientation">
          <div style={{ display: 'flex', gap: 16, height: 200, alignItems: 'flex-end' }}>
            <div style={{ width: 40, height: '100%' }}>
              <ProgressBar value={v} orientation="vertical" showLabel={false} />
            </div>
            <div style={{ width: 40, height: '100%' }}>
              <ProgressBar
                value={v2}
                orientation="vertical"
                showLabel={false}
                alertZones={[
                  { min: 0, max: 50, color: '#22c55e' },
                  { min: 50, max: 80, color: '#f59e0b' },
                  { min: 80, max: 100, color: '#ef4444' },
                ]}
              />
            </div>
            <div style={{ width: 40, height: '100%' }}>
              <ProgressBar
                value={Math.max(0, v - 20)}
                orientation="vertical"
                showLabel={false}
                alertZones={[
                  { min: 0, max: 30, color: '#3b82f6' },
                  { min: 30, max: 60, color: '#8b5cf6' },
                  { min: 60, max: 100, color: '#ec4899' },
                ]}
              />
            </div>
          </div>
        </Card>

        {/* Multi-metric dashboard */}
        <Card title="Multi-Metric Dashboard">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {metrics.map((metric, i) => (
              <MetricProgressRow key={metric} deviceIdent={deviceIdent} metric={metric} />
            ))}
          </div>
        </Card>

        {/* Loading state */}
        <Card title="Loading State" span={2}>
          <div style={{ height: 28 }}>
            <ProgressBar value={null as any} showLoading />
          </div>
        </Card>

        {/* === Resizable variations === */}
        <div style={{ gridColumn: 'span 2', marginTop: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Resizable Variations</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
            Drag the bottom-right corner of each card to resize. Font and layout scale proportionally.
          </p>
        </div>

        <Card title="Resizable — Default" span={2} resizable>
          <div style={{ height: 28 }}>
            <ProgressBar value={v} formatValue={(val) => `${val.toFixed(1)}`} />
          </div>
        </Card>

        <Card title="Resizable — Alert Zones" span={2} resizable>
          <div style={{ height: 32 }}>
            <ProgressBar
              value={v}
              formatValue={(val) => `${val.toFixed(1)}°C`}
              alertZones={[
                { min: 0, max: 40, color: '#22c55e' },
                { min: 40, max: 70, color: '#f59e0b' },
                { min: 70, max: 100, color: '#ef4444' },
              ]}
            />
          </div>
        </Card>

        <Card title="Resizable — Tall + Bold" span={2} resizable>
          <ProgressBar
            value={v}
            formatValue={(val) => `${val.toFixed(0)}%`}
            styles={{ height: 48, label_font_file: { fontSize: 20, fontWeight: 700 } }}
            alertZones={[
              { min: 0, max: 30, color: '#3b82f6' },
              { min: 30, max: 60, color: '#8b5cf6' },
              { min: 60, max: 100, color: '#ec4899' },
            ]}
          />
        </Card>

        <Card title="Resizable — Thin (no label)" span={2} resizable>
          <ProgressBar
            value={v}
            showLabel={false}
            styles={{ height: 10 }}
            alertZones={[
              { min: 0, max: 50, color: '#06b6d4' },
              { min: 50, max: 100, color: '#f97316' },
            ]}
          />
        </Card>

        <Card title="Resizable — Vertical" resizable>
          <div style={{ display: 'flex', gap: 16, height: 200, alignItems: 'flex-end' }}>
            <div style={{ width: 40, height: '100%' }}>
              <ProgressBar
                value={v}
                orientation="vertical"
                showLabel={false}
                alertZones={[
                  { min: 0, max: 50, color: '#22c55e' },
                  { min: 50, max: 80, color: '#f59e0b' },
                  { min: 80, max: 100, color: '#ef4444' },
                ]}
              />
            </div>
            <div style={{ width: 40, height: '100%' }}>
              <ProgressBar value={v2} orientation="vertical" showLabel={false} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/** Individual metric row that subscribes to its own live value */
function MetricProgressRow({ deviceIdent, metric }: { deviceIdent: string; metric: string }) {
  const { value } = useRelayLatest(deviceIdent, metric);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 13, color: '#6b7280', width: 80, fontFamily: 'monospace' }}>{metric}</span>
      <div style={{ flex: 1, height: 22 }}>
        <ProgressBar
          value={value ?? 0}
          min={0}
          max={100}
          formatValue={(v) => `${v.toFixed(1)}`}
          alertZones={[
            { min: 0, max: 60, color: '#22c55e' },
            { min: 60, max: 80, color: '#f59e0b' },
            { min: 80, max: 100, color: '#ef4444' },
          ]}
        />
      </div>
    </div>
  );
}

function Card({ title, children, span = 1, resizable = false }: { title: string; children: React.ReactNode; span?: number; resizable?: boolean }) {
  return (
    <div style={{
      gridColumn: span > 1 ? `span ${span}` : undefined,
      backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden',
      ...(resizable ? { resize: 'both', minWidth: 120, minHeight: 60 } : {}),
    }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13, fontWeight: 600, color: '#374151' }}>
        {title}{resizable && <span style={{ color: '#9ca3af', fontWeight: 400 }}> (drag corner to resize)</span>}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}
