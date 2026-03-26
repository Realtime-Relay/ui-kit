/**
 * Proportional scaling utility for responsive components.
 *
 * All pixel values (font sizes, strokes, paddings, gaps) are authored
 * for a "reference" container size. When the actual container is smaller
 * or larger, the scaler multiplies every pixel value proportionally.
 *
 * Usage:
 *   const s = createScaler(width, height);
 *   <text fontSize={s(22)} />   // 22px at 200×200, 11px at 100×100
 */

/** Default reference size for gauge-like (square) components. */
export const GAUGE_REFERENCE = 200;

/** Default reference size for chart-like (wide) components. */
export const CHART_REFERENCE = 500;

/**
 * Creates a scaling function based on container dimensions.
 *
 * @param width  - Current container width
 * @param height - Current container height
 * @param reference - The container size at which pixel values are "correct"
 * @param mode - 'min' uses Math.min(w,h) for square components (gauges),
 *               'width' uses width for wide components (charts)
 */
export function createScaler(
  width: number,
  height: number,
  reference: number = GAUGE_REFERENCE,
  mode: 'min' | 'width' = 'min'
): (px: number) => number {
  const dimension = mode === 'min' ? Math.min(width, height) : width;
  const factor = dimension / reference;
  return (px: number) => px * factor;
}
