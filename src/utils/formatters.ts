/** Default value formatter — shows up to 2 decimal places, trimming trailing zeros. */
export function defaultFormatValue(value: number): string {
  if (Number.isInteger(value)) return value.toString();
  return parseFloat(value.toFixed(2)).toString();
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Default timestamp formatter.
 * Output: dd MMM yyyy HH:MM:SS.sss +TZ
 * Example: 26 Mar 2026 22:39:40.123 +05:30
 */
export function defaultFormatTimestamp(ts: Date | number): string {
  const d = ts instanceof Date ? ts : new Date(ts);

  const dd = String(d.getDate()).padStart(2, "0");
  const mmm = MONTHS[d.getMonth()];
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");

  // Timezone offset: getTimezoneOffset() returns minutes, negative for east of UTC
  const offsetMin = d.getTimezoneOffset();
  const sign = offsetMin <= 0 ? "+" : "-";
  const absOffset = Math.abs(offsetMin);
  const tzHH = String(Math.floor(absOffset / 60)).padStart(2, "0");
  const tzMM = String(absOffset % 60).padStart(2, "0");

  return `${dd} ${mmm} ${yyyy} ${hh}:${mm}:${ss}.${ms} ${sign}${tzHH}:${tzMM}`;
}

/**
 * Format a Date for axis tick labels in a specific IANA timezone.
 * When `timezone` is undefined, uses the browser's local timezone.
 * `opts` is passed through to Intl.DateTimeFormat.
 */
export function formatAxisTime(
  d: Date,
  timezone: string | undefined,
  opts: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat([], { ...opts, timeZone: timezone }).format(d);
}
