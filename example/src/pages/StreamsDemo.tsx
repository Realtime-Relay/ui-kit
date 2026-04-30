import { useMemo, useState } from "react";
import { RelayApp } from "@relay-x/app-sdk";
import {
  RelayProvider,
  useRelayConnection,
  useRelayEvents,
  useRelayLogs,
  useRelayCommands,
  useRelayAlerts,
  useRelayTimeSeries,
  type LogLevel,
  type AlertState,
  type AggregateFn,
} from "@relayx/ui";
import { useConfig } from "../hooks/useConfig";

type Mode = "historical" | "realtime" | "both";

export function StreamsDemo() {
  const { config, isConfigured } = useConfig();

  if (!isConfigured) {
    return (
      <div
        style={{
          padding: 32,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 16,
          color: "#6b7280",
        }}
      >
        <div style={{ fontSize: 48 }}>&#9881;</div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#111827" }}>
          Configuration Required
        </h2>
        <p>Go to Settings and enter your RelayX credentials + device ident.</p>
      </div>
    );
  }

  return <Wrapper config={config} />;
}

function Wrapper({ config }: { config: any }) {
  const app = useMemo(
    () =>
      new RelayApp({
        api_key: config.apiKey,
        secret: config.secret,
        mode: config.mode,
      }),
    [config.apiKey, config.secret, config.mode],
  );

  return (
    <RelayProvider app={app as any}>
      <Page deviceIdent={config.deviceIdent} />
    </RelayProvider>
  );
}

function Page({ deviceIdent }: { deviceIdent: string }) {
  const { isConnected } = useRelayConnection();

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        Streams (Events / Logs / Commands / Alerts)
      </h1>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        Hooks wired to the live RelayX backend for{" "}
        <strong>{deviceIdent}</strong>. Configure inputs per section.
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 24,
          padding: "8px 16px",
          borderRadius: 8,
          fontSize: 13,
          backgroundColor: isConnected ? "#f0fdf4" : "#fffbeb",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: isConnected ? "#22c55e" : "#f59e0b",
          }}
        />
        <span style={{ color: isConnected ? "#16a34a" : "#d97706" }}>
          {isConnected ? "Connected to RelayX" : "Connecting..."}
        </span>
      </div>

      <TelemetrySection deviceIdent={deviceIdent} />
      <EventsSection deviceIdent={deviceIdent} />
      <LogsSection deviceIdent={deviceIdent} />
      <CommandsSection deviceIdent={deviceIdent} />
      <AlertsSection deviceIdent={deviceIdent} />
    </div>
  );
}

function defaultRange(hours = 24) {
  const end = new Date();
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
  return { start, end };
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        marginBottom: 32,
        backgroundColor: "#fff",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid #f3f4f6",
          fontSize: 14,
          fontWeight: 600,
          color: "#111827",
          backgroundColor: "#f9fafb",
        }}
      >
        {title}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontSize: 12,
        color: "#374151",
        flex: 1,
        minWidth: 140,
      }}
    >
      <span style={{ fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "6px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "inherit",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12,
  fontFamily: "ui-monospace, monospace",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 10px",
  borderBottom: "1px solid #e5e7eb",
  fontWeight: 600,
  color: "#6b7280",
};

const tdStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderBottom: "1px solid #f3f4f6",
  verticalAlign: "top",
};

function StatusBar({
  isLoading,
  error,
  count,
}: {
  isLoading: boolean;
  error: Error | null;
  count: number;
}) {
  return (
    <div
      style={{
        fontSize: 12,
        color: error ? "#b91c1c" : "#6b7280",
        marginBottom: 8,
      }}
    >
      {isLoading
        ? "Loading…"
        : error
          ? `Error: ${error.message}`
          : `${count} record(s)`}
    </div>
  );
}

// ─── Telemetry ─────────────────────────────────────────────────────────────
const AGG_FNS: AggregateFn[] = [
  "mean",
  "min",
  "max",
  "sum",
  "count",
  "first",
  "last",
  "median",
  "stddev",
];

function TelemetrySection({ deviceIdent }: { deviceIdent: string }) {
  const [metricsText, setMetricsText] = useState("");
  const [mode, setMode] = useState<Mode>("historical");
  const [interval, setInterval] = useState("");
  const [aggregateFn, setAggregateFn] = useState<AggregateFn | "">("");
  const [range, setRange] = useState(defaultRange());
  const [active, setActive] = useState(false);

  const metrics = useMemo(
    () =>
      metricsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [metricsText],
  );

  return (
    <Section title="useRelayTimeSeries (with interval + aggregateFn)">
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <Field label="Metrics (comma-separated)">
          <input
            style={inputStyle}
            value={metricsText}
            onChange={(e) => setMetricsText(e.target.value)}
            placeholder="temperature, humidity"
          />
        </Field>
        <Field label="Mode">
          <select
            style={inputStyle}
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
          >
            <option value="historical">historical</option>
            <option value="realtime">realtime</option>
            <option value="both">both</option>
          </select>
        </Field>
        <Field label="Interval (e.g. 30s, 5m, 1h)">
          <input
            style={inputStyle}
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            placeholder="(none)"
          />
        </Field>
        <Field label="Aggregate fn">
          <select
            style={inputStyle}
            value={aggregateFn}
            onChange={(e) => setAggregateFn(e.target.value as AggregateFn | "")}
          >
            <option value="">(none)</option>
            {AGG_FNS.map((fn) => (
              <option key={fn} value={fn}>
                {fn}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Hours back">
          <input
            type="number"
            style={inputStyle}
            defaultValue={24}
            onChange={(e) =>
              setRange(defaultRange(Number(e.target.value) || 24))
            }
          />
        </Field>
        <button
          type="button"
          style={runBtnStyle(active)}
          onClick={() => setActive((v) => !v)}
          disabled={metrics.length === 0}
        >
          {active ? "Stop" : "Run"}
        </button>
      </div>
      {(interval && !aggregateFn) || (!interval && aggregateFn) ? (
        <div style={{ fontSize: 12, color: "#d97706", marginBottom: 8 }}>
          Tip: pair `interval` with `aggregateFn` — only one is set.
        </div>
      ) : null}
      {active && metrics.length > 0 && (
        <TelemetryTable
          deviceIdent={deviceIdent}
          metrics={metrics}
          mode={mode}
          interval={interval || undefined}
          aggregateFn={aggregateFn || undefined}
          range={range}
        />
      )}
    </Section>
  );
}

function TelemetryTable({
  deviceIdent,
  metrics,
  mode,
  interval,
  aggregateFn,
  range,
}: {
  deviceIdent: string;
  metrics: string[];
  mode: Mode;
  interval?: string;
  aggregateFn?: AggregateFn;
  range: { start: Date; end: Date };
}) {
  const { data, isLoading, error } = useRelayTimeSeries({
    deviceIdent,
    metrics,
    timeRange: range,
    mode,
    interval,
    aggregateFn,
  });
  return (
    <>
      <StatusBar isLoading={isLoading} error={error} count={data.length} />
      <div style={{ maxHeight: 320, overflow: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Timestamp</th>
              {metrics.map((m) => (
                <th key={m} style={thStyle}>
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data
              .slice()
              .reverse()
              .map((p, i) => (
                <tr key={i}>
                  <td style={tdStyle}>
                    {new Date(p.timestamp).toLocaleString()}
                  </td>
                  {metrics.map((m) => (
                    <td key={m} style={tdStyle}>
                      {p[m] !== undefined ? String(p[m]) : ""}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Events ────────────────────────────────────────────────────────────────
function EventsSection({ deviceIdent }: { deviceIdent: string }) {
  const [eventNamesText, setEventNamesText] = useState("");
  const [mode, setMode] = useState<Mode>("historical");
  const [range, setRange] = useState(defaultRange());
  const [active, setActive] = useState(false);

  const eventNames = useMemo(
    () =>
      eventNamesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [eventNamesText],
  );

  return (
    <Section title="useRelayEvents">
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <Field label="Event names (comma-separated)">
          <input
            style={inputStyle}
            value={eventNamesText}
            onChange={(e) => setEventNamesText(e.target.value)}
            placeholder="door_opened, boot"
          />
        </Field>
        <Field label="Mode">
          <select
            style={inputStyle}
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
          >
            <option value="historical">historical</option>
            <option value="realtime">realtime</option>
            <option value="both">both</option>
          </select>
        </Field>
        <Field label="Hours back">
          <input
            type="number"
            style={inputStyle}
            defaultValue={24}
            onChange={(e) =>
              setRange(defaultRange(Number(e.target.value) || 24))
            }
          />
        </Field>
        <button
          type="button"
          style={runBtnStyle(active)}
          onClick={() => setActive((v) => !v)}
          disabled={eventNames.length === 0}
        >
          {active ? "Stop" : "Run"}
        </button>
      </div>
      {active && eventNames.length > 0 && (
        <EventsTable
          deviceIdent={deviceIdent}
          eventNames={eventNames}
          mode={mode}
          range={range}
        />
      )}
    </Section>
  );
}

function EventsTable({
  deviceIdent,
  eventNames,
  mode,
  range,
}: {
  deviceIdent: string;
  eventNames: string[];
  mode: Mode;
  range: { start: Date; end: Date };
}) {
  const { data, isLoading, error } = useRelayEvents({
    deviceIdent,
    eventNames,
    timeRange: range,
    mode,
  });
  return (
    <>
      <StatusBar isLoading={isLoading} error={error} count={data.length} />
      <div style={{ maxHeight: 280, overflow: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Timestamp</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Device</th>
              <th style={thStyle}>Value</th>
            </tr>
          </thead>
          <tbody>
            {data
              .slice()
              .reverse()
              .map((e, i) => (
                <tr key={i}>
                  <td style={tdStyle}>
                    {new Date(e.timestamp).toLocaleString()}
                  </td>
                  <td style={tdStyle}>{e.name}</td>
                  <td style={tdStyle}>{e.deviceIdent}</td>
                  <td style={tdStyle}>{JSON.stringify(e.value)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Logs ──────────────────────────────────────────────────────────────────
function LogsSection({ deviceIdent }: { deviceIdent: string }) {
  const [levels, setLevels] = useState<LogLevel[]>([]);
  const [mode, setMode] = useState<Mode>("historical");
  const [range, setRange] = useState(defaultRange());
  const [active, setActive] = useState(false);

  const toggleLevel = (lvl: LogLevel) =>
    setLevels((prev) =>
      prev.includes(lvl) ? prev.filter((l) => l !== lvl) : [...prev, lvl],
    );

  return (
    <Section title="useRelayLogs">
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
          alignItems: "flex-end",
        }}
      >
        <Field label="Levels (none = all)">
          <div style={{ display: "flex", gap: 8 }}>
            {(["info", "warn", "error"] as LogLevel[]).map((lvl) => (
              <label
                key={lvl}
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <input
                  type="checkbox"
                  checked={levels.includes(lvl)}
                  onChange={() => toggleLevel(lvl)}
                />
                {lvl}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Mode">
          <select
            style={inputStyle}
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
          >
            <option value="historical">historical</option>
            <option value="realtime">realtime</option>
            <option value="both">both</option>
          </select>
        </Field>
        <Field label="Hours back">
          <input
            type="number"
            style={inputStyle}
            defaultValue={24}
            onChange={(e) =>
              setRange(defaultRange(Number(e.target.value) || 24))
            }
          />
        </Field>
        <button
          type="button"
          style={runBtnStyle(active)}
          onClick={() => setActive((v) => !v)}
        >
          {active ? "Stop" : "Run"}
        </button>
      </div>
      {active && (
        <LogsTable
          deviceIdent={deviceIdent}
          levels={levels.length > 0 ? levels : undefined}
          mode={mode}
          range={range}
        />
      )}
    </Section>
  );
}

function LogsTable({
  deviceIdent,
  levels,
  mode,
  range,
}: {
  deviceIdent: string;
  levels: LogLevel[] | undefined;
  mode: Mode;
  range: { start: Date; end: Date };
}) {
  const { data, isLoading, error } = useRelayLogs({
    deviceIdent,
    levels,
    timeRange: range,
    mode,
  });
  const levelColor: Record<LogLevel, string> = {
    info: "#2563eb",
    warn: "#d97706",
    error: "#dc2626",
  };
  return (
    <>
      <StatusBar isLoading={isLoading} error={error} count={data.length} />
      <div style={{ maxHeight: 280, overflow: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Timestamp</th>
              <th style={thStyle}>Level</th>
              <th style={thStyle}>Device</th>
              <th style={thStyle}>Message</th>
            </tr>
          </thead>
          <tbody>
            {data
              .slice()
              .reverse()
              .map((l, i) => (
                <tr key={i}>
                  <td style={tdStyle}>
                    {new Date(l.timestamp).toLocaleString()}
                  </td>
                  <td style={{ ...tdStyle, color: levelColor[l.level] }}>
                    {l.level}
                  </td>
                  <td style={tdStyle}>{l.deviceIdent}</td>
                  <td style={tdStyle}>{l.message}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Commands ──────────────────────────────────────────────────────────────
function CommandsSection({ deviceIdent }: { deviceIdent: string }) {
  const [name, setName] = useState("");
  const [identsText, setIdentsText] = useState(deviceIdent);
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [range, setRange] = useState(defaultRange());
  const [active, setActive] = useState(false);

  const idents = useMemo(
    () =>
      identsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [identsText],
  );

  return (
    <Section title="useRelayCommands">
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <Field label="Command name">
          <input
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="reboot"
          />
        </Field>
        <Field label="Device idents (comma-separated)">
          <input
            style={inputStyle}
            value={identsText}
            onChange={(e) => setIdentsText(e.target.value)}
          />
        </Field>
        <Field label="Refresh interval (ms, 0=off)">
          <input
            type="number"
            style={inputStyle}
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value) || 0)}
          />
        </Field>
        <Field label="Hours back">
          <input
            type="number"
            style={inputStyle}
            defaultValue={24}
            onChange={(e) =>
              setRange(defaultRange(Number(e.target.value) || 24))
            }
          />
        </Field>
        <button
          type="button"
          style={runBtnStyle(active)}
          onClick={() => setActive((v) => !v)}
          disabled={!name || idents.length === 0}
        >
          {active ? "Stop" : "Run"}
        </button>
      </div>
      {active && name && idents.length > 0 && (
        <CommandsTable
          name={name}
          deviceIdents={idents}
          refreshInterval={refreshInterval}
          range={range}
        />
      )}
    </Section>
  );
}

function CommandsTable({
  name,
  deviceIdents,
  refreshInterval,
  range,
}: {
  name: string;
  deviceIdents: string[];
  refreshInterval: number;
  range: { start: Date; end: Date };
}) {
  const { data, isLoading, error, refresh } = useRelayCommands({
    name,
    deviceIdents,
    timeRange: range,
    refreshInterval: refreshInterval > 0 ? refreshInterval : undefined,
  });
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <StatusBar isLoading={isLoading} error={error} count={data.length} />
        <button
          type="button"
          onClick={refresh}
          style={{ ...inputStyle, cursor: "pointer", padding: "4px 10px" }}
        >
          Refresh now
        </button>
      </div>
      <div style={{ maxHeight: 280, overflow: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Timestamp</th>
              <th style={thStyle}>Device</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Value</th>
            </tr>
          </thead>
          <tbody>
            {data
              .slice()
              .reverse()
              .map((c, i) => (
                <tr key={i}>
                  <td style={tdStyle}>
                    {new Date(c.timestamp).toLocaleString()}
                  </td>
                  <td style={tdStyle}>{c.deviceIdent}</td>
                  <td style={tdStyle}>{c.name}</td>
                  <td style={tdStyle}>{JSON.stringify(c.value)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Alerts ────────────────────────────────────────────────────────────────
function AlertsSection({ deviceIdent }: { deviceIdent: string }) {
  const [mode, setMode] = useState<Mode>("historical");
  const [identsText, setIdentsText] = useState("");
  const [ruleIdsText, setRuleIdsText] = useState("");
  const [groupIdsText, setGroupIdsText] = useState("");
  const [range, setRange] = useState(defaultRange());
  const [active, setActive] = useState(false);

  const filters = useMemo(() => {
    const split = (s: string) =>
      s
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    const out: {
      deviceIdents?: string[];
      ruleIds?: string[];
      groupIds?: string[];
    } = {};
    const d = split(identsText);
    const r = split(ruleIdsText);
    const g = split(groupIdsText);
    if (d.length) out.deviceIdents = d;
    if (r.length) out.ruleIds = r;
    if (g.length) out.groupIds = g;
    return out;
  }, [identsText, ruleIdsText, groupIdsText]);

  return (
    <Section title="useRelayAlerts">
      <div
        style={{
          fontSize: 12,
          color: "#6b7280",
          marginBottom: 12,
        }}
      >
        Live + historical alert events across the org. Snake_case payload
        (rule_id, rule_name, device_ident, incident_id, ack, rolling_state,
        …). Default device ident pre-filled: <code>{deviceIdent}</code>.
      </div>
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
          alignItems: "flex-end",
        }}
      >
        <Field label="Mode">
          <select
            style={inputStyle}
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
          >
            <option value="historical">historical</option>
            <option value="realtime">realtime</option>
            <option value="both">both</option>
          </select>
        </Field>
        <Field label="Device idents (csv, blank = any)">
          <input
            style={inputStyle}
            value={identsText}
            onChange={(e) => setIdentsText(e.target.value)}
            placeholder={deviceIdent}
          />
        </Field>
        <Field label="Rule IDs (csv, blank = any)">
          <input
            style={inputStyle}
            value={ruleIdsText}
            onChange={(e) => setRuleIdsText(e.target.value)}
          />
        </Field>
        <Field label="Group IDs (csv, blank = any)">
          <input
            style={inputStyle}
            value={groupIdsText}
            onChange={(e) => setGroupIdsText(e.target.value)}
          />
        </Field>
        <Field label="Hours back">
          <input
            type="number"
            style={inputStyle}
            defaultValue={24}
            onChange={(e) =>
              setRange(defaultRange(Number(e.target.value) || 24))
            }
          />
        </Field>
        <button
          type="button"
          style={runBtnStyle(active)}
          onClick={() => setActive((v) => !v)}
        >
          {active ? "Stop" : "Run"}
        </button>
      </div>
      {active && (
        <AlertsTable mode={mode} filters={filters} range={range} />
      )}
    </Section>
  );
}

function AlertsTable({
  mode,
  filters,
  range,
}: {
  mode: Mode;
  filters: { deviceIdents?: string[]; ruleIds?: string[]; groupIds?: string[] };
  range: { start: Date; end: Date };
}) {
  const { data, isLoading, error } = useRelayAlerts({
    mode,
    filters,
    timeRange: range,
  });
  const stateColor: Record<AlertState, string> = {
    fire: "#dc2626",
    resolved: "#16a34a",
    ack: "#d97706",
  };
  return (
    <>
      <StatusBar isLoading={isLoading} error={error} count={data.length} />
      <div style={{ maxHeight: 320, overflow: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Timestamp</th>
              <th style={thStyle}>State</th>
              <th style={thStyle}>Rule</th>
              <th style={thStyle}>Device</th>
              <th style={thStyle}>Incident</th>
              <th style={thStyle}>Value / Ack</th>
            </tr>
          </thead>
          <tbody>
            {data
              .slice()
              .reverse()
              .map((a, i) => (
                <tr key={i}>
                  <td style={tdStyle}>
                    {new Date(a.timestamp).toLocaleString()}
                  </td>
                  <td style={{ ...tdStyle, color: stateColor[a.state] }}>
                    {a.state}
                  </td>
                  <td style={tdStyle}>
                    {a.rule_name ?? a.rule_id ?? "—"}
                    {a.rule_type ? ` (${a.rule_type})` : ""}
                  </td>
                  <td style={tdStyle}>
                    {a.device_ident ?? a.device_id ?? "—"}
                  </td>
                  <td style={tdStyle}>{a.incident_id ?? "—"}</td>
                  <td style={tdStyle}>
                    {a.ack
                      ? `acked by ${a.ack.acked_by}${a.ack.ack_notes ? ` — "${a.ack.ack_notes}"` : ""}`
                      : JSON.stringify(a.rolling_state ?? a.last_value ?? null)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function runBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "8px 16px",
    border: "none",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    backgroundColor: active ? "#dc2626" : "#2563eb",
    color: "#fff",
    height: "fit-content",
    alignSelf: "flex-end",
  };
}
