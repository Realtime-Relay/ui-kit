import { useState, useEffect } from 'react';
import { useRelayApp } from '../context/RelayProvider';

export interface UseRelayPresenceResult {
  online: boolean | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Subscribes to device presence status.
 * Returns online/offline state that updates in real-time.
 *
 * Note: This relies on the SDK's connection event system.
 * The exact implementation depends on how the SDK exposes
 * presence data — this is a foundation that can be extended.
 */
export function useRelayPresence(deviceIdent: string): UseRelayPresenceResult {
  const app = useRelayApp();
  const [online, setOnline] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!app) return;
    let cancelled = false;

    // Try to get initial device status
    async function fetchStatus() {
      try {
        const result = await app!.device.get(deviceIdent);
        if (!cancelled && result.data) {
          // The device object may have an online/connected status field
          const isOnline = result.data.online ?? result.data.connected ?? null;
          setOnline(isOnline);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    }

    fetchStatus();

    // Listen for connection state changes as a proxy for presence
    app!.connection.listeners((event: string) => {
      if (cancelled) return;
      if (event === 'connected' || event === 'reconnected') {
        // Re-fetch device status on reconnect
        fetchStatus();
      }
    });

    return () => { cancelled = true; };
  }, [app, deviceIdent]);

  return { online, isLoading, error };
}
