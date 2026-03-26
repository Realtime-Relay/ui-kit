import { useMemo } from 'react';
import type { FontStyle } from './types';
import { resolveFontFamily } from './fonts';

/**
 * Resolves font file URLs in a FontStyle object to @font-face family names.
 * Checks `fontFile` first (explicit file path), then falls back to checking
 * if `fontFamily` is a font URL.
 */
export function resolveFont(style: FontStyle | undefined): FontStyle | undefined {
  if (!style) return style;

  // If fontFile is set, resolve it to a @font-face family
  if (style.fontFile) {
    const resolved = resolveFontFamily(style.fontFile);
    return { ...style, fontFamily: resolved };
  }

  // Fallback: check if fontFamily itself is a font URL
  if (style.fontFamily) {
    const resolved = resolveFontFamily(style.fontFamily);
    if (resolved !== style.fontFamily) {
      return { ...style, fontFamily: resolved };
    }
  }

  return style;
}

/**
 * Hook that resolves all FontStyle entries in a styles object.
 * Handles font file imports automatically.
 */
export function useResolvedStyles<T extends Record<string, FontStyle | any>>(
  styles: T | undefined
): T | undefined {
  return useMemo(() => {
    if (!styles) return styles;
    const resolved = { ...styles };
    for (const key of Object.keys(resolved)) {
      const val = resolved[key];
      if (val && typeof val === 'object' && ('fontFamily' in val || 'fontFile' in val)) {
        (resolved as any)[key] = resolveFont(val);
      }
    }
    return resolved;
  }, [styles]);
}
