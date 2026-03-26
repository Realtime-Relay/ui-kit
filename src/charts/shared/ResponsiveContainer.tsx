import { useRef, useState, useEffect, type ReactNode } from 'react';

export interface Dimensions {
  width: number;
  height: number;
}

interface ResponsiveContainerProps {
  className?: string;
  style?: React.CSSProperties;
  children: (dimensions: Dimensions) => ReactNode;
}

/**
 * Wrapper that observes its own size and passes width/height to children.
 * All chart components use this to fill their parent container.
 */
export function ResponsiveContainer({ className, style, children }: ResponsiveContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions((prev) => {
          if (prev.width === Math.floor(width) && prev.height === Math.floor(height)) return prev;
          return { width: Math.floor(width), height: Math.floor(height) };
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
      style={{ width: '100%', height: '100%', position: 'relative', ...style }}
    >
      {dimensions.width > 0 && dimensions.height > 0 ? children(dimensions) : null}
    </div>
  );
}
