/**
 * Static test page for Playwright — renders all TimeSeries variations with hardcoded data.
 * No SDK connection needed. Navigate to /#/test-timeseries
 */
import { useState, useRef } from 'react';
import { TimeSeries } from '@relayx/ui';
import type { DataPoint, Annotation } from '@relayx/ui';

// ─── Test Data ──────────────────────────────────────────────

const NOW = Date.now();

function makePoints(count: number, metricKey = 'value', offsetFactor = 1, baseTs = NOW): DataPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: baseTs - (count - i) * 60_000,
    [metricKey]: ((Math.sin(i * 0.5) + 1) * 50) * offsetFactor,
  }));
}

function makeMultiMetricPoints(count: number): DataPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: NOW - (count - i) * 60_000,
    temperature: 20 + Math.sin(i * 0.3) * 15,
    humidity: 40 + Math.cos(i * 0.2) * 20,
  }));
}

const singleDevice: Record<string, DataPoint[]> = {
  'sensor-alpha': makePoints(60),
};

const threeDevices: Record<string, DataPoint[]> = {
  'sensor-alpha': makePoints(60),
  'sensor-bravo': makePoints(60, 'value', 0.6),
  'sensor-charlie': makePoints(60, 'value', 1.4),
};

const multiMetricDevice: Record<string, DataPoint[]> = {
  'weather-station': makeMultiMetricPoints(60),
};

const multiDayPoints: DataPoint[] = Array.from({ length: 72 }, (_, i) => ({
  timestamp: NOW - (72 - i) * 3600_000,
  value: (Math.sin(i * 0.2) + 1) * 50,
}));

// Annotations
const pointAnnotations: Annotation[] = [
  { timestamp: NOW - 30 * 60_000, label: 'Deploy v2.1', color: '#3b82f6' },
  { timestamp: NOW - 10 * 60_000, label: 'Alert', color: '#ef4444' },
];

const rangeAnnotations: Annotation[] = [
  { start: NOW - 45 * 60_000, end: NOW - 35 * 60_000, label: 'Maintenance', color: '#f59e0b' },
];

const mixedAnnotations: Annotation[] = [
  ...pointAnnotations,
  ...rangeAnnotations,
];

// ─── Hover/Release state display ────────────────────────────

let hoverDisplayEl: HTMLDivElement | null = null;

function getHoverDisplay() {
  if (!hoverDisplayEl) {
    hoverDisplayEl = document.getElementById('hover-display') as HTMLDivElement;
  }
  return hoverDisplayEl;
}

// ─── Card Components ────────────────────────────────────────

function Card({ title, children, height = 300, style }: { title: string; children: React.ReactNode; height?: number; style?: React.CSSProperties }) {
  return (
    <div
      data-testid={`card-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
      style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, ...style }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>{title}</div>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

function ResizableCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      data-testid={`resizable-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
      style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, resize: 'both', overflow: 'auto', minWidth: 300, minHeight: 200, width: '100%', height: 400 }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>{title}</div>
      <div style={{ height: 'calc(100% - 30px)' }}>{children}</div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────

export function TestTimeSeries() {
  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <h1 data-testid="page-heading">Time Series Test Page</h1>
      <p>Static data — no SDK connection required.</p>

      {/* Hover/Release display */}
      <div
        id="hover-display"
        data-testid="hover-display"
        style={{
          padding: '8px 16px',
          marginBottom: 16,
          borderRadius: 8,
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          fontSize: 13,
          fontFamily: 'monospace',
          minHeight: 32,
        }}
      >
        Hover over a chart to see onHover/onRelease events here.
      </div>

      {/* ── Basic ── */}
      <h2 data-testid="basic-section">Basic</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 32 }}>
        <Card title="Single Device">
          <TimeSeries
            data={singleDevice}
            metricKey="value"
            onHover={(pt) => {
              const el = getHoverDisplay();
              if (el && pt) el.textContent = `onHover: ${pt.metric} = ${pt.value.toFixed(2)} @ ${new Date(pt.timestamp).toLocaleTimeString()}`;
            }}
            onRelease={(pt) => {
              const el = getHoverDisplay();
              if (el) el.textContent = pt ? `onRelease: ${pt.metric} = ${pt.value.toFixed(2)}` : 'onRelease: null';
            }}
          />
        </Card>

        <Card title="Three Devices">
          <TimeSeries data={threeDevices} metricKey="value" />
        </Card>

        <Card title="Multi Metric Single Device">
          <TimeSeries
            data={multiMetricDevice}
            metrics={[
              { key: 'temperature', label: 'Temperature', color: '#ef4444' },
              { key: 'humidity', label: 'Humidity', color: '#3b82f6' },
            ]}
          />
        </Card>

        <Card title="Format Legend">
          <TimeSeries
            data={threeDevices}
            metricKey="value"
            formatLegend={(device, metric) => `${device} / ${metric}`}
          />
        </Card>
      </div>

      {/* ── Line & Points ── */}
      <h2 data-testid="line-section">Line Thickness & Points</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        <Card title="Thick Lines" height={250}>
          <TimeSeries data={singleDevice} metricKey="value" lineThickness={4} />
        </Card>

        <Card title="Thin Lines" height={250}>
          <TimeSeries data={singleDevice} metricKey="value" lineThickness={1} />
        </Card>

        <Card title="Points Small" height={250}>
          <TimeSeries data={{ 'sensor': makePoints(20) }} metricKey="value" pointSize={2} />
        </Card>

        <Card title="Points Large" height={250}>
          <TimeSeries data={{ 'sensor': makePoints(20) }} metricKey="value" pointSize={5} lineThickness={1} />
        </Card>

        <Card title="Per Metric Styles" height={250}>
          <TimeSeries
            data={multiMetricDevice}
            metrics={[
              { key: 'temperature', label: 'Temp', color: '#ef4444', lineThickness: 3, pointSize: 3 },
              { key: 'humidity', label: 'Humidity', color: '#3b82f6', lineThickness: 1 },
            ]}
          />
        </Card>
      </div>

      {/* ── Annotations ── */}
      <h2 data-testid="annotations-section">Annotations</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 32 }}>
        <Card title="Point Annotations">
          <TimeSeries data={singleDevice} metricKey="value" annotations={pointAnnotations} />
        </Card>

        <Card title="Range Annotations">
          <TimeSeries data={singleDevice} metricKey="value" annotations={rangeAnnotations} />
        </Card>

        <Card title="Mixed Annotations">
          <TimeSeries data={singleDevice} metricKey="value" annotations={mixedAnnotations} />
        </Card>
      </div>

      {/* ── Start/End & Zoom ── */}
      <h2 data-testid="zoom-section">Start/End & Zoom</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 32 }}>
        <Card title="Fixed Time Range">
          <TimeSeries
            data={singleDevice}
            metricKey="value"
            start={NOW - 30 * 60_000}
            end={NOW - 10 * 60_000}
          />
        </Card>

        <Card title="Zoom Enabled">
          <TimeSeries data={singleDevice} metricKey="value" zoomEnabled={true} />
        </Card>

        <Card title="Zoom Disabled">
          <TimeSeries data={singleDevice} metricKey="value" zoomEnabled={false} />
        </Card>
      </div>

      {/* ── Legend Positions ── */}
      <h2 data-testid="legend-section">Legend Positions</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        <Card title="Legend Top" height={250}>
          <TimeSeries data={threeDevices} metricKey="value" legendPosition="top" />
        </Card>

        <Card title="Legend Bottom" height={250}>
          <TimeSeries data={threeDevices} metricKey="value" legendPosition="bottom" />
        </Card>

        <Card title="Legend Left" height={250}>
          <TimeSeries data={threeDevices} metricKey="value" legendPosition="left" />
        </Card>

        <Card title="Legend Right" height={250}>
          <TimeSeries data={threeDevices} metricKey="value" legendPosition="right" />
        </Card>

        <Card title="No Legend" height={250}>
          <TimeSeries data={singleDevice} metricKey="value" showLegend={false} />
        </Card>
      </div>

      {/* ── Area & Styles ── */}
      <h2 data-testid="styles-section">Area & Styles</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 32 }}>
        <Card title="Area Chart">
          <TimeSeries data={singleDevice} metricKey="value" area />
        </Card>

        <Card title="Area Custom Color">
          <TimeSeries data={singleDevice} metricKey="value" area areaColor="#8b5cf6" />
        </Card>

        <Card title="Dark Theme">
          <TimeSeries
            data={threeDevices}
            metricKey="value"
            styles={{
              background: { color: '#0f172a' },
              axis: { color: '#94a3b8' },
              legend: { color: '#e2e8f0' },
            }}
          />
        </Card>

        <Card title="With Title">
          <TimeSeries data={singleDevice} metricKey="value" title="Sensor Readings" />
        </Card>

        <Card title="Alert Zones">
          <TimeSeries
            data={singleDevice}
            metricKey="value"
            alertZones={[
              { min: 0, max: 30, color: '#22c55e', label: 'Normal' },
              { min: 70, max: 100, color: '#ef4444', label: 'Critical' },
            ]}
          />
        </Card>

        <Card title="No Grid">
          <TimeSeries data={singleDevice} metricKey="value" showGrid={false} />
        </Card>
      </div>

      {/* ── Edge Cases ── */}
      <h2 data-testid="edge-section">Edge Cases</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 32 }}>
        <Card title="Empty Data" height={200}>
          <TimeSeries data={{}} />
        </Card>

        <Card title="Empty No Loading" height={200}>
          <TimeSeries data={{}} showLoading={false} />
        </Card>

        <Card title="Single Point" height={200}>
          <TimeSeries data={{ d: [{ timestamp: NOW, value: 50 }] }} metricKey="value" />
        </Card>
      </div>

      {/* ── Annotation Mode ── */}
      <h2 data-testid="annotation-mode-section">Annotation Mode</h2>
      <AnnotationModeTestSection />

      {/* ── Zoom Color ── */}
      <h2 data-testid="zoom-color-section">Zoom Color</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        <Card title="Red Zoom" height={250}>
          <TimeSeries data={singleDevice} metricKey="value" zoomColor="#ef4444" />
        </Card>
        <Card title="Green Zoom" height={250}>
          <TimeSeries data={singleDevice} metricKey="value" zoomColor="#22c55e" />
        </Card>
      </div>

      {/* ── Resizable ── */}
      <h2 data-testid="resizable-section">Resizable</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 32 }}>
        <ResizableCard title="Resizable Chart">
          <TimeSeries data={threeDevices} metricKey="value" annotations={pointAnnotations} />
        </ResizableCard>
      </div>
    </div>
  );
}

/* ── Annotation Mode Test Section ── */

function AnnotationModeTestSection() {
  const [enabled, setEnabled] = useState(true);
  const [events, setEvents] = useState<Array<{ id: number; annotationId: number; ts: number; type: string }>>([]);
  const [hoverLog, setHoverLog] = useState<string[]>([]);
  const [userAnnotations, setUserAnnotations] = useState<Annotation[]>([]);
  const dragStartRef = useRef<number | null>(null);
  const nextId = useRef(0);

  const handleAnnotate = (annotationId: number, ts: number, type: 'click' | 'start_drag' | 'end_drag') => {
    setEvents((prev) => [{ id: nextId.current++, annotationId, ts, type }, ...prev].slice(0, 30));

    if (type === 'start_drag') {
      dragStartRef.current = ts;
    } else if (type === 'click') {
      setUserAnnotations((prev) => [...prev, {
        timestamp: ts, label: `P${prev.length + 1}`, color: '#3b82f6',
        data: { id: annotationId, type: 'point', note: 'user click' },
      }]);
      dragStartRef.current = null;
    } else if (type === 'end_drag' && dragStartRef.current != null) {
      const start = Math.min(dragStartRef.current, ts);
      const end = Math.max(dragStartRef.current, ts);
      setUserAnnotations((prev) => [...prev, {
        start, end, label: `R${prev.length + 1}`, color: '#8b5cf6',
        data: { id: annotationId, type: 'range', durationMs: end - start },
      }]);
      dragStartRef.current = null;
    }
  };

  // Pre-built annotations with data for the hover test charts
  const NOW_TS = Date.now();
  const prebuiltAnnotations: Annotation[] = [
    { timestamp: NOW_TS - 30 * 60_000, label: 'Deploy', color: '#3b82f6', data: { version: '2.1.0', env: 'production', author: 'arjun' } },
    { start: NOW_TS - 45 * 60_000, end: NOW_TS - 35 * 60_000, label: 'Maintenance', color: '#8b5cf6', data: { ticket: 'OPS-412', reason: 'DB migration', downtime: '10min' } },
  ];

  const annotationData: Record<string, DataPoint[]> = {
    'sensor-alpha': Array.from({ length: 60 }, (_, i) => ({
      timestamp: NOW_TS - (60 - i) * 60_000,
      value: ((Math.sin(i * 0.5) + 1) * 50),
    })),
  };

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          data-testid="annotation-toggle"
          onClick={() => setEnabled((v) => !v)}
          style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #ccc', cursor: 'pointer', background: enabled ? '#f59e0b' : '#fff', color: enabled ? '#fff' : '#000' }}
        >
          {enabled ? 'Annotation ON' : 'Annotation OFF'}
        </button>
        <button
          data-testid="annotation-clear"
          onClick={() => { setUserAnnotations([]); setEvents([]); setHoverLog([]); }}
          style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #ccc', cursor: 'pointer' }}
        >
          Clear
        </button>
      </div>

      {/* Interactive annotation creation chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card title="Annotation Mode Chart" height={300}>
          <TimeSeries
            data={annotationData}
            metricKey="value"
            annotationMode={enabled}
            onAnnotate={handleAnnotate}
            annotationColor="#f59e0b"
            annotations={userAnnotations}
            zoomEnabled={true}
          />
        </Card>

        <div data-testid="annotation-event-log" style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, height: 340, overflow: 'auto', fontFamily: 'monospace', fontSize: 11 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Event Log</div>
          {events.map((e) => (
            <div key={e.id} data-testid={`event-${e.type}`} style={{ borderBottom: '1px solid #f3f4f6', padding: '2px 0' }}>
              <span data-testid="event-annotation-id" style={{ color: '#9ca3af' }}>#{e.annotationId}</span>{' '}
              <span data-testid="event-type" style={{ fontWeight: 600 }}>{e.type}</span>{' '}
              <span data-testid="event-ts">{e.ts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Annotation hover with tooltip */}
      <Card title="Annotation Hover With Tooltip" height={300}>
        <TimeSeries
          data={annotationData}
          metricKey="value"
          annotations={prebuiltAnnotations}
          onAnnotationHover={(hover, ann) => {
            if (!hover || !ann.data) return;
            return (
              <div data-testid="annotation-tooltip" style={{
                background: '#1f2937', color: '#f9fafb', padding: '8px 12px',
                borderRadius: 6, fontSize: 11, fontFamily: 'monospace',
                whiteSpace: 'pre-wrap', maxWidth: 280,
              }}>
                <div style={{ fontWeight: 700, marginBottom: 4, color: '#f59e0b' }}>{ann.label}</div>
                {JSON.stringify(ann.data, null, 2)}
              </div>
            );
          }}
        />
      </Card>

      {/* Annotation hover — log only (no tooltip) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginTop: 16 }}>
        <Card title="Annotation Hover Log Only" height={300}>
          <TimeSeries
            data={annotationData}
            metricKey="value"
            annotations={prebuiltAnnotations}
            onAnnotationHover={(hover, ann) => {
              const prefix = hover ? 'hover' : 'leave';
              const dataStr = ann.data ? JSON.stringify(ann.data) : '(no data)';
              setHoverLog((prev) => [`${prefix} ${ann.label}: ${dataStr}`, ...prev].slice(0, 30));
            }}
          />
        </Card>

        <div data-testid="annotation-hover-log" style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, height: 340, overflow: 'auto', fontFamily: 'monospace', fontSize: 11 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Hover Log</div>
          {hoverLog.length === 0 && <div style={{ color: '#9ca3af' }}>Hover an annotation on the left chart.</div>}
          {hoverLog.map((line, i) => (
            <div key={i} data-testid="hover-log-entry" style={{ borderBottom: '1px solid #f3f4f6', padding: '2px 0' }}>
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
