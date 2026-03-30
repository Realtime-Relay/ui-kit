import { useMemo } from "react";
import { RelayApp } from "relayx-app-js";
import {
  PresenceIndicator,
  RelayProvider,
  useRelayPresence,
  useRelayConnection,
} from "@relayx/ui";
import { useConfig } from "../hooks/useConfig";

export function PresenceDemo() {
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

  return <LivePresenceWrapper config={config} />;
}

function LivePresenceWrapper({ config }: { config: any }) {
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
      <LivePresencePage deviceIdent={config.deviceIdent} />
    </RelayProvider>
  );
}

function LivePresencePage({ deviceIdent }: { deviceIdent: string }) {
  const { isConnected } = useRelayConnection();
  const { online, lastEvent, isLoading } = useRelayPresence(deviceIdent);

  const status = isLoading ? "loading" : online ? "online" : "offline";
  const statusLabel = isLoading
    ? "Waiting for data..."
    : online
      ? "Online"
      : "Offline";

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        Presence Indicator
      </h1>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        All indicators reflect live presence data for{" "}
        <strong>{deviceIdent}</strong>.
      </p>

      {/* SDK connection status */}
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
        }}
      >
        {/* Default 12px */}
        <Card title="Default (12px)">
          <Row>
            <PresenceIndicator online={online ?? false} />
            <span>
              {deviceIdent} — {statusLabel}
            </span>
          </Row>
        </Card>

        {/* Small 8px */}
        <Card title="Small (8px)">
          <Row>
            <PresenceIndicator online={online ?? false} size={8} />
            <span style={{ fontSize: 13 }}>
              {deviceIdent} — {statusLabel}
            </span>
          </Row>
        </Card>

        {/* Large 24px */}
        <Card title="Large (24px)">
          <Row>
            <PresenceIndicator online={online ?? false} size={24} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>{statusLabel}</span>
          </Row>
        </Card>

        {/* Extra large 40px */}
        <Card title="Extra Large (40px)">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: 12,
            }}
          >
            <PresenceIndicator online={online ?? false} size={40} />
            <span style={{ fontSize: 18, fontWeight: 700 }}>{deviceIdent}</span>
            <span style={{ fontSize: 13, color: "#6b7280" }}>
              {statusLabel}
            </span>
          </div>
        </Card>

        {/* Custom Colors: Blue / Gray */}
        <Card title="Custom Colors (Blue / Gray)">
          <Row>
            <PresenceIndicator
              online={online ?? false}
              onlineColor="#3b82f6"
              offlineColor="#9ca3af"
              size={16}
            />
            <span>{statusLabel}</span>
          </Row>
        </Card>

        {/* Custom Colors: Purple / Orange */}
        <Card title="Custom Colors (Purple / Orange)">
          <Row>
            <PresenceIndicator
              online={online ?? false}
              onlineColor="#8b5cf6"
              offlineColor="#f97316"
              size={16}
            />
            <span>{statusLabel}</span>
          </Row>
        </Card>

        {/* Custom Colors: Cyan / Pink */}
        <Card title="Custom Colors (Cyan / Pink)">
          <Row>
            <PresenceIndicator
              online={online ?? false}
              onlineColor="#06b6d4"
              offlineColor="#ec4899"
              size={16}
            />
            <span>{statusLabel}</span>
          </Row>
        </Card>

        {/* Inline with text */}
        <Card title="Inline Usage">
          <p style={{ fontSize: 14, lineHeight: 2 }}>
            The device <PresenceIndicator online={online ?? false} size={10} />{" "}
            <strong>{deviceIdent}</strong> is currently{" "}
            <strong>{statusLabel.toLowerCase()}</strong>.
          </p>
        </Card>

        {/* With last event details */}
        <Card title="With Event Details" span={2}>
          <Row>
            <PresenceIndicator online={online ?? false} size={16} />
            <div>
              <div style={{ fontWeight: 600 }}>
                {deviceIdent} — {statusLabel}
              </div>
              {lastEvent ? (
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  Last event: <strong>{lastEvent.event}</strong> at{" "}
                  {new Date(lastEvent.data.start).toLocaleString()}
                  {lastEvent.data.stop && (
                    <>
                      {" "}
                      — stopped at{" "}
                      {new Date(lastEvent.data.stop).toLocaleString()}
                    </>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                  No presence events received yet
                </div>
              )}
            </div>
          </Row>
        </Card>

        {/* Dashboard-style header bar */}
        <Card title="Dashboard Header Style" span={2}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              backgroundColor: "#f8fafc",
              borderRadius: 8,
            }}
          >
            <PresenceIndicator online={online ?? false} size={12} />
            <span
              style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 600 }}
            >
              {deviceIdent}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 4,
                backgroundColor: online ? "#dcfce7" : "#fef2f2",
                color: online ? "#166534" : "#991b1b",
              }}
            >
              {statusLabel.toUpperCase()}
            </span>
            {lastEvent && (
              <span
                style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}
              >
                since {new Date(lastEvent.data.start).toLocaleTimeString()}
              </span>
            )}
          </div>
        </Card>

        {/* Multiple sizes side by side */}
        <Card title="All Sizes" span={2}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {[6, 8, 10, 12, 16, 20, 24, 32, 40].map((s) => (
              <div
                key={s}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <PresenceIndicator online={online ?? false} size={s} />
                <span style={{ fontSize: 10, color: "#9ca3af" }}>{s}px</span>
              </div>
            ))}
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
        backgroundColor: "#fff",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid #f3f4f6",
          fontSize: 13,
          fontWeight: 600,
          color: "#374151",
        }}
      >
        {title}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {children}
    </div>
  );
}
