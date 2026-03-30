/**
 * Default color palette for multi-metric charts.
 * Colors are auto-assigned to metrics in order.
 * Designed for good contrast on both light and dark backgrounds.
 */
export const defaultPalette: string[] = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#22c55e", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#f97316", // orange
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#84cc16", // lime
  "#a855f7", // purple
];

/** Returns a color from the palette for a given index, cycling if needed. */
export function getMetricColor(
  index: number,
  palette: string[] = defaultPalette,
): string {
  return palette[index % palette.length];
}
