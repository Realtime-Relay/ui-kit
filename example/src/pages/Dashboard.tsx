import { useMemo } from 'react';
import { RelayApp } from 'relayx-app-js';
import {
  RelayProvider,
  useRelayConnection,
  useRelayTimeSeries,
  useRelayLatest,
  TimeSeries,
  BarGraph,
  NeedleGauge,
  ArcGauge,
  StatCard,
  StatCardWithGraph,
  PresenceIndicator,
  ProgressBar,
  StateTimeline,
} from '@relayx/ui';
import type { AppConfig } from '../hooks/useConfig';

interface DashboardProps {
  config: AppConfig;
  onGoToSettings: () => void;
}

export function Dashboard({ config, onGoToSettings }: DashboardProps) {
  const isConfigured =
    config.apiKey.length > 0 &&
    config.secret.length > 0 &&
    config.deviceIdent.length > 0 &&
    config.metrics.length > 0;

  if (!isConfigured) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 16,
          color: '#6b7280',
        }}
      >
        <div style={{ fontSize: 48 }}>&#9881;</div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111827' }}>
          Configuration Required
        </h2>
        <p>Enter your RelayX credentials and device info to get started.</p>
        <button
          onClick={onGoToSettings}
          type="button"
          style={{
            padding: '10px 24px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Go to Settings
        </button>
      </div>
    );
  }

  // Create SDK instance — memoized so it doesn't recreate on every render
  const app = useMemo(
    () =>
      new RelayApp({
        api_key: config.apiKey,
        secret: config.secret,
        mode: config.mode,
      }),
    [config.apiKey, config.secret, config.mode]
  );

  return (
    <RelayProvider app={app as any}>
      <DashboardContent config={config} />
    </RelayProvider>
  );
}

function DashboardContent({ config }: { config: AppConfig }) {
  const { isConnected, error } = useRelayConnection();
  const firstMetric = config.metrics[0];
  const timeRange = {
    start: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // last hour
    end: new Date().toISOString(),
  };

  const { data: tsData, isLoading: tsLoading } = useRelayTimeSeries({
    deviceIdent: config.deviceIdent,
    metrics: config.metrics,
    timeRange,
  });

  const { value: latestValue, timestamp: latestTs } = useRelayLatest(
    config.deviceIdent,
    firstMetric
  );

  return (
    <div style={{ padding: 24, overflow: 'auto', height: '100%' }}>
      {/* Connection status bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 24,
          padding: '8px 16px',
          borderRadius: 8,
          backgroundColor: error ? '#fef2f2' : isConnected ? '#f0fdf4' : '#fffbeb',
          fontSize: 13,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: error ? '#ef4444' : isConnected ? '#22c55e' : '#f59e0b',
          }}
        />
        {error ? (
          <span style={{ color: '#dc2626' }}>Connection error: {error.message}</span>
        ) : isConnected ? (
          <span style={{ color: '#16a34a' }}>
            Connected to <strong>{config.deviceIdent}</strong>
          </span>
        ) : (
          <span style={{ color: '#d97706' }}>Connecting...</span>
        )}
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, color: '#111827' }}>
        Dashboard
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340, 1fr))',
          gap: 20,
        }}
      >
        {/* 1. TimeSeries — Line */}
        <Card title="Time Series (Line)" span={2}>
          <div style={{ height: 300 }}>
            <TimeSeries
              data={tsData}
              title={`${config.metrics.join(', ')} — Line`}
              showLoading={tsLoading}
            />
          </div>
        </Card>

        {/* 2. TimeSeries — Area */}
        <Card title="Time Series (Area)" span={2}>
          <div style={{ height: 300 }}>
            <TimeSeries
              data={tsData}
              title={`${config.metrics.join(', ')} — Area`}
              area
              showLoading={tsLoading}
            />
          </div>
        </Card>

        {/* 3. Bar Graph */}
        <Card title="Bar Graph" span={2}>
          <div style={{ height: 300 }}>
            <BarGraph
              data={tsData.slice(-30)}
              title={`${firstMetric} — Last 30 Points`}
              showLoading={tsLoading}
            />
          </div>
        </Card>

        {/* 4. Needle Gauge */}
        <Card title="Needle Gauge">
          <div style={{ height: 200 }}>
            <NeedleGauge
              value={latestValue ?? 0}
              label={firstMetric}
              unit=""
              min={0}
              max={100}
              alertZones={[
                { min: 0, max: 40, color: '#22c55e' },
                { min: 40, max: 70, color: '#f59e0b' },
                { min: 70, max: 100, color: '#ef4444' },
              ]}
            />
          </div>
        </Card>

        {/* 5. Arc Gauge */}
        <Card title="Arc Gauge">
          <div style={{ height: 200 }}>
            <ArcGauge
              value={latestValue ?? 0}
              label={firstMetric}
              unit=""
              min={0}
              max={100}
              alertZones={[
                { min: 0, max: 30, color: '#3b82f6' },
                { min: 30, max: 60, color: '#8b5cf6' },
                { min: 60, max: 100, color: '#ec4899' },
              ]}
            />
          </div>
        </Card>

        {/* 6. Stat Card */}
        <Card title="Stat Card">
          <div style={{ height: 140 }}>
            <StatCard
              value={latestValue ?? '--'}
              label={firstMetric}
              formatValue={(v) => v.toFixed(2)}
              lastUpdated={latestTs ?? undefined}
              showLastUpdated
              borderColor="#e0e0e0"
              borderThickness={1}
              borderRadius="rounded"
            />
          </div>
        </Card>

        {/* 7. Stat Card with Graph */}
        <Card title="Stat Card + Sparkline">
          <div style={{ height: 160 }}>
            <StatCardWithGraph
              value={latestValue ?? '--'}
              label={firstMetric}
              formatValue={(v) => v.toFixed(2)}
              sparklineData={tsData.slice(-50)}
              sparklineMetric={firstMetric}
              graphLineColor="#3b82f6"
              borderColor="#e0e0e0"
              borderThickness={1}
              borderRadius="rounded"
              lastUpdated={latestTs ?? undefined}
              showLastUpdated
            />
          </div>
        </Card>

        {/* 8. Presence Indicator */}
        <Card title="Presence Indicator">
          <div
            style={{
              height: 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              fontSize: 16,
            }}
          >
            <PresenceIndicator online={isConnected} size={16} />
            <span style={{ fontWeight: 600, color: isConnected ? '#16a34a' : '#dc2626' }}>
              {config.deviceIdent} — {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
        </Card>

        {/* 9. Progress Bar */}
        <Card title="Progress Bar">
          <div style={{ height: 80, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
            <ProgressBar
              value={latestValue ?? 0}
              min={0}
              max={100}
              formatValue={(v) => v.toFixed(1)}
              alertZones={[
                { min: 0, max: 40, color: '#22c55e' },
                { min: 40, max: 70, color: '#f59e0b' },
                { min: 70, max: 100, color: '#ef4444' },
              ]}
            />
          </div>
        </Card>

        {/* 10. State Timeline */}
        <Card title="State Timeline" span={2}>
          <div style={{ height: 120 }}>
            <StateTimeline
              data={tsData}
              metricKey={firstMetric}
              stateMapper={(value: number) => {
                if (value > 70) return 'critical';
                if (value > 40) return 'warning';
                return 'normal';
              }}
              stateColors={{
                normal: '#22c55e',
                warning: '#f59e0b',
                critical: '#ef4444',
              }}
              showLoading={tsLoading}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({
  title,
  children,
  span = 1,
}: {
  title: string;
  children: React.ReactNode;
  span?: number;
}) {
  return (
    <div
      style={{
        gridColumn: span > 1 ? `span ${span}` : undefined,
        backgroundColor: '#fff',
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #f3f4f6',
          fontSize: 13,
          fontWeight: 600,
          color: '#374151',
        }}
      >
        {title}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}
