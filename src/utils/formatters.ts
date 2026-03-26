/** Default value formatter — shows up to 2 decimal places, trimming trailing zeros. */
export function defaultFormatValue(value: number): string {
  if (Number.isInteger(value)) return value.toString();
  return parseFloat(value.toFixed(2)).toString();
}
