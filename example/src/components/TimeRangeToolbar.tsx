interface TimeRangeToolbarProps {
  isLive: boolean;
  onToggleLive: (live: boolean) => void;
  liveWindow: number;
  onLiveWindowChange: (ms: number) => void;
  startTime: string;
  endTime: string;
  onStartChange: (val: string) => void;
  onEndChange: (val: string) => void;
  onApply: () => void;
}

const LIVE_WINDOWS = [
  { label: "30s", value: 30_000 },
  { label: "1m", value: 60_000 },
  { label: "5m", value: 300_000 },
  { label: "15m", value: 900_000 },
  { label: "1h", value: 3_600_000 },
];

const pillBase: React.CSSProperties = {
  padding: "6px 14px",
  border: "none",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 150ms ease",
};

export function TimeRangeToolbar({
  isLive,
  onToggleLive,
  liveWindow,
  onLiveWindowChange,
  startTime,
  endTime,
  onStartChange,
  onEndChange,
  onApply,
}: TimeRangeToolbarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 20,
        flexWrap: "wrap",
      }}
    >
      {/* Live / Historical toggle */}
      <div
        style={{
          display: "flex",
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid #d1d5db",
        }}
      >
        <button
          type="button"
          onClick={() => onToggleLive(true)}
          style={{
            ...pillBase,
            backgroundColor: isLive ? "#22c55e" : "#fff",
            color: isLive ? "#fff" : "#374151",
            borderRadius: 0,
          }}
        >
          Live
        </button>
        <button
          type="button"
          onClick={() => onToggleLive(false)}
          style={{
            ...pillBase,
            backgroundColor: !isLive ? "#3b82f6" : "#fff",
            color: !isLive ? "#fff" : "#374151",
            borderRadius: 0,
            borderLeft: "1px solid #d1d5db",
          }}
        >
          Historical
        </button>
      </div>

      {isLive ? (
        /* Live mode: window size selector */
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "#6b7280" }}>Window:</span>
          <div
            style={{
              display: "flex",
              borderRadius: 6,
              overflow: "hidden",
              border: "1px solid #d1d5db",
            }}
          >
            {LIVE_WINDOWS.map((w) => (
              <button
                key={w.value}
                type="button"
                onClick={() => onLiveWindowChange(w.value)}
                style={{
                  padding: "4px 10px",
                  border: "none",
                  borderRight: "1px solid #d1d5db",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  backgroundColor: liveWindow === w.value ? "#1e293b" : "#fff",
                  color: liveWindow === w.value ? "#fff" : "#374151",
                  transition: "all 100ms ease",
                }}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Historical mode: date range inputs */
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "#6b7280" }}>From:</span>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => onStartChange(e.target.value)}
            style={inputStyle}
          />
          <span style={{ fontSize: 13, color: "#6b7280" }}>To:</span>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => onEndChange(e.target.value)}
            style={inputStyle}
          />
          <button
            type="button"
            onClick={onApply}
            style={{
              padding: "6px 16px",
              backgroundColor: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "5px 8px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "monospace",
};
