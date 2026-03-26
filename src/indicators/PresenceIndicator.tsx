export interface PresenceIndicatorProps {
  online: boolean;
  onlineColor?: string;
  offlineColor?: string;
  size?: number;
}

export function PresenceIndicator({
  online,
  onlineColor,
  offlineColor,
  size,
}: PresenceIndicatorProps) {
  const color = online
    ? (onlineColor ?? 'var(--relay-presence-online, #22c55e)')
    : (offlineColor ?? 'var(--relay-presence-offline, #ef4444)');

  const dotSize = size ?? 12;

  return (
    <span
      role="status"
      aria-label={online ? 'Online' : 'Offline'}
      style={{
        display: 'inline-block',
        width: dotSize,
        height: dotSize,
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow: online ? `0 0 0 3px ${color}33` : undefined,
        transition: 'background-color 200ms ease, box-shadow 200ms ease',
        flexShrink: 0,
      }}
    />
  );
}
