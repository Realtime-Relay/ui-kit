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
  lineThickness?: number;
  pointSize?: number;
}

/** A point annotation rendered as a vertical line at a specific timestamp. */
export interface PointAnnotation {
  timestamp: number;
  label?: string;
  color?: string;
  /** Arbitrary JSON data attached to this annotation. Passed to onAnnotationHover. */
  data?: Record<string, unknown>;
}

/** A range annotation rendered as a shaded band between two timestamps. */
export interface RangeAnnotation {
  start: number;
  end: number;
  label?: string;
  color?: string;
  /** Arbitrary JSON data attached to this annotation. Passed to onAnnotationHover. */
  data?: Record<string, unknown>;
}

/** An annotation on a time series chart — either a point or a range. */
export type Annotation = PointAnnotation | RangeAnnotation;

/** Font and color styling for a single text element within a component. */
export interface FontStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | string;
  color?: string;
  /** URL or path to a .otf/.ttf/.woff/.woff2 file. Auto-generates @font-face. */
  fontFile?: string;
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
      metric: string | string[];
      callback: (data: {
        metric: string;
        data: { value: any; timestamp: number };
      }) => void;
    }) => Promise<void>;
    history: (opts: {
      device_ident: string;
      fields: string[];
      start: string;
      end: string;
      interval?: string;
      aggregate_fn?: string;
    }) => Promise<Record<string, { value: any; timestamp: number }[]>>;
    latest: (opts: {
      device_ident: string;
      fields: string[];
      start: string;
      end: string;
    }) => Promise<Record<string, { value: any; timestamp: number }>>;
    off: (opts: { device_ident: string; metric?: string[] }) => Promise<void>;
  };
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
  alert: {
    list: () => Promise<{ status: string; data: any[] }>;
    history: (opts: {
      rule_type: "DEVICE" | "RULE";
      device_ident?: string;
      rule_id?: string;
      rule_states: string[];
      incident_id?: string;
      start: string;
      end: string;
    }) => Promise<any>;
  };
  events: {
    stream: (opts: {
      name: string;
      device_ident: string | string[];
      callback: (payload: Record<string, any>) => void;
    }) => boolean;
    off: (opts: { name: string }) => void;
    history: (opts: {
      device_ident: string;
      event_names: string[];
      start: string;
      end: string;
    }) => Promise<Record<string, { value: any; timestamp: number }[]>>;
  };
  log: {
    stream: (opts: {
      device_ident: string;
      levels?: string | string[];
      callback: (entry: {
        level: "info" | "warn" | "error";
        data: string;
        timestamp: number;
      }) => void;
    }) => Promise<void>;
    off: (opts: { device_ident: string }) => Promise<void>;
    history: (opts: {
      device_ident: string;
      levels?: string[];
      start: string;
      end: string;
    }) => Promise<{
      info: { value: any; timestamp: number }[];
      warn: { value: any; timestamp: number }[];
      error: { value: any; timestamp: number }[];
    }>;
  };
  command: {
    history: (opts: {
      name: string;
      device_idents: string[];
      start: string;
      end: string;
    }) => Promise<
      Record<
        string,
        Array<{ value: any; timestamp: number }> | { error: string }
      >
    >;
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

/** A single value + timestamp pair from useRelayLatest or similar hooks. */
export interface RelayDataPoint {
  value: number | null;
  timestamp: number | null;
}

/** Downsampling configuration: false to disable, number for target count, function for custom. */
export type DownsampleConfig =
  | false
  | number
  | ((data: DataPoint[]) => DataPoint[]);
