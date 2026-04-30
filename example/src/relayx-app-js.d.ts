declare module "@relay-x/app-sdk" {
  export class RelayApp {
    constructor(opts: {
      api_key: string;
      secret: string;
      mode: string;
      debug?: boolean;
    });
    connection: {
      listeners: (callback: (event: string) => void) => void;
      presence: (
        callback: (data: {
          event: "connected" | "disconnected";
          device_ident: string;
          data: { start: number; stop?: number };
        }) => void,
      ) => void;
    };
    telemetry: {
      stream: (opts: any) => Promise<void>;
      history: (opts: any) => Promise<any>;
      latest: (opts: any) => Promise<any>;
    };
    events: {
      stream: (opts: any) => boolean;
      off: (opts: any) => void;
      history: (opts: any) => Promise<any>;
    };
    log: {
      stream: (opts: any) => Promise<void>;
      off: (opts: any) => Promise<void>;
      history: (opts: any) => Promise<any>;
    };
    command: {
      send: (opts: any) => Promise<any>;
      history: (opts: any) => Promise<any>;
    };
    alert: {
      list: () => Promise<any>;
      history: (opts: any) => Promise<any>;
    };
    device: {
      get: (ident: string) => Promise<any>;
    };
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
  }
}
