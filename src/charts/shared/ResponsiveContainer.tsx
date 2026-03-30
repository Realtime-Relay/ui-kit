import { useRef, useState, useEffect, type ReactNode } from "react";

export interface Dimensions {
  width: number;
  height: number;
}

interface ResponsiveContainerProps {
  className?: string;
  style?: React.CSSProperties;
  explicitWidth?: number | string;
  explicitHeight?: number | string;
  children: (dimensions: Dimensions) => ReactNode;
}

/**
 * Wrapper that observes its own size and passes width/height to children.
 * All chart components use this to fill their parent container.
 *
 * Uses a two-div approach:
 * - Outer div sizes itself via CSS (width/height 100% or explicit)
 * - Inner div is position:absolute to avoid content pushing the outer div bigger
 * - ResizeObserver watches the outer div
 * - This prevents the infinite resize loop where SVG content grows the container
 */
export function ResponsiveContainer({
  className,
  style,
  explicitWidth,
  explicitHeight,
  children,
}: ResponsiveContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const w = Math.floor(width);
        const h = Math.floor(height);
        setDimensions((prev) => {
          if (prev.width === w && prev.height === h) return prev;
          return { width: w, height: h };
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width:
          explicitWidth != null
            ? typeof explicitWidth === "number"
              ? `${explicitWidth}px`
              : explicitWidth
            : "100%",
        height:
          explicitHeight != null
            ? typeof explicitHeight === "number"
              ? `${explicitHeight}px`
              : explicitHeight
            : "100%",
        maxWidth: "100%",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {dimensions.width > 0 && dimensions.height > 0 ? (
        <div style={{ position: "absolute", inset: 0 }}>
          {children(dimensions)}
        </div>
      ) : null}
    </div>
  );
}
