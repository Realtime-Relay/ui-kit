// Theme
import './theme/variables.css';
export { defaultPalette, getMetricColor } from './theme/palette';

// Context
export { RelayProvider, useRelayApp, useRelayConnection } from './context/RelayProvider';
export type { RelayProviderProps } from './context/RelayProvider';

// Charts
export { TimeSeries } from './charts/TimeSeries';
export type { TimeSeriesProps, TimeSeriesStyles } from './charts/TimeSeries';
export { BarGraph } from './charts/BarGraph';
export type { BarGraphProps, BarGraphStyles } from './charts/BarGraph';

// Gauges
export { NeedleGauge } from './gauges/NeedleGauge';
export type { NeedleGaugeProps, NeedleGaugeStyles } from './gauges/NeedleGauge';
export { ArcGauge } from './gauges/ArcGauge';
export type { ArcGaugeProps, ArcGaugeStyles } from './gauges/ArcGauge';

// Cards
export { StatCard } from './cards/StatCard';
export type { StatCardProps, StatCardStyles } from './cards/StatCard';
export { StatCardWithGraph } from './cards/StatCardWithGraph';
export type { StatCardWithGraphProps, StatCardWithGraphStyles } from './cards/StatCardWithGraph';

// Indicators
export { PresenceIndicator } from './indicators/PresenceIndicator';
export type { PresenceIndicatorProps } from './indicators/PresenceIndicator';
export { ProgressBar } from './indicators/ProgressBar';
export type { ProgressBarProps, ProgressBarStyles } from './indicators/ProgressBar';

// Timelines
export { StateTimeline } from './timelines/StateTimeline';
export type { StateTimelineProps, StateTimelineStyles, StateEntry } from './timelines/StateTimeline';

// Hooks
export { useRelayTimeSeries } from './hooks/useRelayTimeSeries';
export type { UseRelayTimeSeriesOptions, UseRelayTimeSeriesResult } from './hooks/useRelayTimeSeries';
export { useRelayLatest } from './hooks/useRelayLatest';
export type { UseRelayLatestResult } from './hooks/useRelayLatest';
export { useRelayPresence } from './hooks/useRelayPresence';
export type { UseRelayPresenceResult } from './hooks/useRelayPresence';
export { useRelayAlertZones } from './hooks/useRelayAlertZones';
export type { UseRelayAlertZonesResult } from './hooks/useRelayAlertZones';
export { useRelayDeviceStates } from './hooks/useRelayDeviceStates';
export type { UseRelayDeviceStatesResult } from './hooks/useRelayDeviceStates';
export { useRelayAlertTimeline } from './hooks/useRelayAlertTimeline';
export type { UseRelayAlertTimelineResult } from './hooks/useRelayAlertTimeline';

// Utilities
export { defaultFormatValue } from './utils/formatters';
export { lttbDownsample, applyDownsample } from './utils/downsample';
export { normalizeRealtimePoint, normalizeHistoricalPoint, mergeData, applyWindow } from './utils/data';
export { resolveMetrics } from './utils/metrics';

// Types
export type {
  DataPoint,
  AlertZone,
  MetricConfig,
  FontStyle,
  BackgroundStyle,
  RelayAppInstance,
  TimeRange,
  DownsampleConfig,
} from './utils/types';
