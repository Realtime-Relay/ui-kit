import type { DataPoint } from './types';

/**
 * Largest Triangle Three Buckets (LTTB) downsampling algorithm.
 * Reduces a time series to `targetCount` points while preserving visual shape.
 *
 * Reference: Sveinn Steinarsson, "Downsampling Time Series for Visual Representation"
 */
export function lttbDownsample(
  data: DataPoint[],
  targetCount: number,
  metricKey: string
): DataPoint[] {
  const length = data.length;
  if (targetCount >= length || targetCount < 3) return data;

  const sampled: DataPoint[] = [data[0]];
  const bucketSize = (length - 2) / (targetCount - 2);

  let prevIndex = 0;

  for (let i = 0; i < targetCount - 2; i++) {
    const bucketStart = Math.floor((i + 1) * bucketSize) + 1;
    const bucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, length - 1);

    // Calculate average point in next bucket
    const nextBucketStart = Math.floor((i + 2) * bucketSize) + 1;
    const nextBucketEnd = Math.min(Math.floor((i + 3) * bucketSize) + 1, length - 1);

    let avgX = 0;
    let avgY = 0;
    let avgCount = 0;
    for (let j = nextBucketStart; j < nextBucketEnd && j < length; j++) {
      avgX += data[j].timestamp;
      avgY += Number(data[j][metricKey]) || 0;
      avgCount++;
    }
    if (avgCount > 0) {
      avgX /= avgCount;
      avgY /= avgCount;
    }

    // Find point in current bucket with largest triangle area
    const prevX = data[prevIndex].timestamp;
    const prevY = Number(data[prevIndex][metricKey]) || 0;

    let maxArea = -1;
    let maxIndex = bucketStart;

    for (let j = bucketStart; j < bucketEnd && j < length; j++) {
      const currX = data[j].timestamp;
      const currY = Number(data[j][metricKey]) || 0;

      const area = Math.abs(
        (prevX - avgX) * (currY - prevY) - (prevX - currX) * (avgY - prevY)
      );

      if (area > maxArea) {
        maxArea = area;
        maxIndex = j;
      }
    }

    sampled.push(data[maxIndex]);
    prevIndex = maxIndex;
  }

  sampled.push(data[length - 1]);
  return sampled;
}

/**
 * Apply downsampling to data based on configuration.
 * - `false`: no downsampling
 * - `number`: target point count
 * - `function`: custom strategy
 * - `undefined`: auto-downsample to 1500 points
 */
export function applyDownsample(
  data: DataPoint[],
  config: false | number | ((data: DataPoint[]) => DataPoint[]) | undefined,
  metricKey: string
): DataPoint[] {
  if (config === false) return data;
  if (typeof config === 'function') return config(data);

  const target = typeof config === 'number' ? config : 1500;
  if (data.length <= target) return data;

  return lttbDownsample(data, target, metricKey);
}
