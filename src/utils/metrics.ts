import type { DataPoint, MetricConfig } from './types';
import { getMetricColor } from '../theme/palette';

/**
 * Auto-detect metric configs from data when the developer doesn't provide them.
 * Scans all data points for numeric keys (excluding 'timestamp') and builds
 * a MetricConfig for each with auto-assigned palette colors.
 */
export function resolveMetrics(
  data: DataPoint[],
  metrics?: MetricConfig[]
): MetricConfig[] {
  if (metrics && metrics.length > 0) return metrics;

  const keys = new Set<string>();
  for (const point of data) {
    for (const key of Object.keys(point)) {
      if (key === 'timestamp') continue;
      if (typeof point[key] === 'number') {
        keys.add(key);
      }
    }
  }

  return Array.from(keys).map((key, i) => ({
    key,
    label: key,
    color: getMetricColor(i),
    visible: true,
  }));
}
