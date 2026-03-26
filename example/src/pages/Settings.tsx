import { useState } from 'react';
import type { AppConfig } from '../hooks/useConfig';

interface SettingsProps {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
}

export function Settings({ config, onSave }: SettingsProps) {
  const [form, setForm] = useState({
    apiKey: config.apiKey,
    secret: config.secret,
    mode: config.mode,
    deviceIdent: config.deviceIdent,
    metricsStr: config.metrics.join(', '),
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const metrics = form.metricsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    onSave({
      apiKey: form.apiKey,
      secret: form.secret,
      mode: form.mode as 'production' | 'test',
      deviceIdent: form.deviceIdent,
      metrics,
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'monospace',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 6,
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#111827' }}>
        Settings
      </h1>
      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 32 }}>
        Configure your RelayX credentials and device to test the UI components with live data.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* API Key */}
        <div>
          <label style={labelStyle}>API Key</label>
          <input
            type="text"
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            placeholder="Your RelayX API key (JWT)"
            style={inputStyle}
          />
        </div>

        {/* Secret */}
        <div>
          <label style={labelStyle}>Secret</label>
          <input
            type="password"
            value={form.secret}
            onChange={(e) => setForm({ ...form, secret: e.target.value })}
            placeholder="Your NKEY seed"
            style={inputStyle}
          />
        </div>

        {/* Mode */}
        <div>
          <label style={labelStyle}>Mode</label>
          <select
            value={form.mode}
            onChange={(e) => setForm({ ...form, mode: e.target.value as 'production' | 'test' })}
            style={{ ...inputStyle, fontFamily: 'inherit' }}
          >
            <option value="production">Production</option>
            <option value="test">Test</option>
          </select>
        </div>

        {/* Device Ident */}
        <div>
          <label style={labelStyle}>Device Ident</label>
          <input
            type="text"
            value={form.deviceIdent}
            onChange={(e) => setForm({ ...form, deviceIdent: e.target.value })}
            placeholder="e.g. sensor-1"
            style={inputStyle}
          />
        </div>

        {/* Metrics */}
        <div>
          <label style={labelStyle}>Metrics (comma-separated)</label>
          <input
            type="text"
            value={form.metricsStr}
            onChange={(e) => setForm({ ...form, metricsStr: e.target.value })}
            placeholder="e.g. temperature, humidity"
            style={inputStyle}
          />
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
            Enter the telemetry metric names your device sends.
          </p>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          type="button"
          style={{
            padding: '12px 24px',
            backgroundColor: saved ? '#22c55e' : '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 200ms ease',
            alignSelf: 'flex-start',
          }}
        >
          {saved ? 'Saved!' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
