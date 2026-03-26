/** A single data point with a timestamp and one or more metric values. */
export interface DataPoint {
  timestamp: number;
  [metric: string]: number | string | boolean;
}

/** Defines an alert zone rendered as a colored band on charts and gauges. */
export interface AlertZone {
  min: number;
  max: number;
  color: string;
  label?: string;
}

/** Configuration for a single metric displayed on a chart. */
export interface MetricConfig {
  key: string;
  label?: string;
  color?: string;
  visible?: boolean;
}

/** Font and color styling for a single text element within a component. */
export interface FontStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | string;
  color?: string;
}

/** Background styling shared by all components. */
export interface BackgroundStyle {
  color?: string;
}

/**
 * Minimal interface describing the RelayX App SDK methods used by hooks.
 * This avoids a hard dependency on the SDK package — developers pass their
 * own SDK instance, and we only call these methods.
 */
export interface RelayAppInstance {
  telemetry: {
    stream: (opts: {
      device_ident: string;
      metric: string;
      callback: (data: { metric: string; data: { value: any; timestamp: number } }) => void;
    }) => Promise<void>;
    history: (opts: {
      device_ident: string;
      fields: string[];
      start: string;
      end: string;
    }) => Promise<{ status: string; data: any[] }>;
    latest: (opts: {
      device_ident: string;
      fields: string[];
    }) => Promise<{ status: string; data: any[] }>;
  };
  connection: {
    listeners: (callback: (event: string) => void) => void;
  };
  alert: {
    list: () => Promise<{ status: string; data: any[] }>;
    history: (opts: {
      rule_type: string;
      rule_id: string;
      rule_states: string[];
      start: string;
      end: string;
    }) => Promise<{ status: string; data: any[] }>;
  };
  device: {
    get: (ident: string) => Promise<{ status: string; data: any }>;
  };
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

/** Time range specification for data queries. */
export interface TimeRange {
  start: Date | string;
  end: Date | string;
}

/** Downsampling configuration: false to disable, number for target count, function for custom. */
export type DownsampleConfig = false | number | ((data: DataPoint[]) => DataPoint[]);
