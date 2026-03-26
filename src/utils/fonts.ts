const FONT_EXTENSIONS = ['.otf', '.ttf', '.woff', '.woff2'];
const loadedFonts = new Map<string, string>();
let fontCounter = 0;

function isFontUrl(value: string): boolean {
  const lower = value.toLowerCase();
  return FONT_EXTENSIONS.some((ext) => lower.endsWith(ext)) || lower.startsWith('data:font/');
}

function getFormat(url: string): string {
  const lower = url.toLowerCase();
  if (lower.endsWith('.woff2')) return 'woff2';
  if (lower.endsWith('.woff')) return 'woff';
  if (lower.endsWith('.ttf')) return 'truetype';
  if (lower.endsWith('.otf')) return 'opentype';
  return 'opentype';
}

/**
 * Resolves a font family value. If it's a font file URL/import,
 * auto-registers a @font-face and returns the generated family name.
 * Otherwise returns the value as-is (a normal CSS font-family string).
 */
export function resolveFontFamily(value: string | undefined): string | undefined {
  if (!value) return value;

  if (!isFontUrl(value)) return value;

  // Already loaded this URL
  if (loadedFonts.has(value)) return loadedFonts.get(value)!;

  // Generate a unique font family name
  const familyName = `relay-custom-font-${++fontCounter}`;

  // Inject @font-face into document
  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: '${familyName}';
      src: url('${value}') format('${getFormat(value)}');
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }
  `;
  document.head.appendChild(style);

  loadedFonts.set(value, familyName);
  return familyName;
}
