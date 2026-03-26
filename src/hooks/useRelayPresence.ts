import { useState, useEffect } from 'react';
import { useRelayApp } from '../context/RelayProvider';

export interface PresenceEvent {
  event: 'connected' | 'disconnected';
  device_ident: string;
  data: { start: number; stop?: number };
}

export interface UseRelayPresenceResult {
  /** Whether the device is online. null = unknown (loading). */
  online: boolean | null;
  /** The last presence event received for this device. */
  lastEvent: PresenceEvent | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Subscribes to real-time device presence via `app.connection.presence()`.
 * Filters events for the specified device ident.
 */
export function useRelayPresence(deviceIdent: string): UseRelayPresenceResult {
  const app = useRelayApp();
  const [online, setOnline] = useState<boolean | null>(null);
  const [lastEvent, setLastEvent] = useState<PresenceEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!app) return;
    let cancelled = false;

    try {
      app.connection.presence((data) => {
        if (cancelled) return;

        console.log('[RelayX presence]', data);

        // Filter for our device
        if (data.device_ident !== deviceIdent) return;

        setLastEvent(data);
        setOnline(data.event === 'connected');
        setIsLoading(false);
      });
    } catch (err) {
      if (!cancelled) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      }
    }

    return () => { cancelled = true; };
  }, [app, deviceIdent]);

  return { online, lastEvent, isLoading, error };
}
