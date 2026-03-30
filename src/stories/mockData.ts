import type { DataPoint } from "../utils/types";

/** Generate time series mock data with multiple metrics. */
export function generateTimeSeriesData(
  points = 100,
  metrics = ["temperature", "humidity"],
  intervalMs = 60000,
): DataPoint[] {
  const now = Date.now();
  const data: DataPoint[] = [];

  const baselines: Record<string, number> = {
    temperature: 22,
    humidity: 55,
    pressure: 1013,
    voltage: 3.3,
    rpm: 2400,
  };

  const amplitudes: Record<string, number> = {
    temperature: 8,
    humidity: 20,
    pressure: 15,
    voltage: 0.5,
    rpm: 600,
  };

  for (let i = 0; i < points; i++) {
    const point: DataPoint = {
      timestamp: now - (points - i) * intervalMs,
    };

    for (const metric of metrics) {
      const base = baselines[metric] ?? 50;
      const amp = amplitudes[metric] ?? 10;
      const noise = (Math.random() - 0.5) * amp * 0.3;
      const trend = Math.sin((i / points) * Math.PI * 3) * amp * 0.5;
      point[metric] = parseFloat((base + trend + noise).toFixed(2));
    }

    data.push(point);
  }

  return data;
}

/** Generate sparkline data (single metric). */
export function generateSparklineData(points = 30): DataPoint[] {
  return generateTimeSeriesData(points, ["value"], 300000);
}

/** Generate state timeline data with varying states. */
export function generateStateData(points = 50): DataPoint[] {
  const data = generateTimeSeriesData(points, ["temperature"], 120000);
  return data;
}
