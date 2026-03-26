import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { RelayAppInstance } from '../utils/types';

interface RelayContextValue {
  app: RelayAppInstance | null;
  isConnected: boolean;
  error: Error | null;
}

const RelayContext = createContext<RelayContextValue>({
  app: null,
  isConnected: false,
  error: null,
});

export interface RelayProviderProps {
  /**
   * A pre-built RelayApp instance. The provider will call connect() on mount
   * and disconnect() on unmount.
   *
   * ```tsx
   * import { RelayApp } from 'relayx-app-js';
   *
   * const app = new RelayApp({ api_key: '...', secret: '...', mode: 'production' });
   *
   * <RelayProvider app={app}>
   *   <App />
   * </RelayProvider>
   * ```
   */
  app: RelayAppInstance;
  children: ReactNode;
}

/**
 * Wraps your app and manages the RelayX SDK connection lifecycle.
 * Pass a RelayApp instance — the provider connects on mount and disconnects on unmount.
 */
export function RelayProvider({ app, children }: RelayProviderProps) {
  const [state, setState] = useState<RelayContextValue>({
    app: null,
    isConnected: false,
    error: null,
  });
  const appRef = useRef<RelayAppInstance | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        app.connection.listeners((event: string) => {
          if (cancelled) return;

          if (event === 'connected' || event === 'reconnected') {
            setState({ app, isConnected: true, error: null });
          } else if (event === 'disconnected') {
            setState((prev) => ({ ...prev, isConnected: false }));
          } else if (event === 'auth_failed') {
            setState({
              app: null,
              isConnected: false,
              error: new Error('RelayX authentication failed. Check your API key and secret.'),
            });
          }
        });

        await app.connect();
        appRef.current = app;

        if (!cancelled) {
          setState({ app, isConnected: true, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            app: null,
            isConnected: false,
            error: err instanceof Error ? err : new Error(String(err)),
          });
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      appRef.current?.disconnect();
      appRef.current = null;
    };
  }, [app]);

  return <RelayContext.Provider value={state}>{children}</RelayContext.Provider>;
}

/**
 * Returns the connected RelayApp SDK instance, or null if not yet connected.
 * Returns null while the SDK is initializing — hooks should handle this gracefully.
 */
export function useRelayApp(): RelayAppInstance | null {
  const { app } = useContext(RelayContext);
  return app;
}

/**
 * Returns the full connection state: { app, isConnected, error }.
 * Useful for showing connection status in the UI.
 */
export function useRelayConnection(): RelayContextValue {
  return useContext(RelayContext);
}
