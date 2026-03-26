declare module 'relayx-app-js' {
  export class RelayApp {
    constructor(opts: { api_key: string; secret: string; mode: string; debug?: boolean });
    connection: {
      listeners: (callback: (event: string) => void) => void;
    };
    telemetry: {
      stream: (opts: any) => Promise<void>;
      history: (opts: any) => Promise<any>;
      latest: (opts: any) => Promise<any>;
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
