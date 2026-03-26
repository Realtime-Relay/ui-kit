interface SkeletonProps {
  width: number;
  height: number;
}

export function ChartSkeleton({ width, height }: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        background: `linear-gradient(
          90deg,
          var(--relay-skeleton-base, #e5e7eb) 25%,
          var(--relay-skeleton-shine, #f3f4f6) 50%,
          var(--relay-skeleton-base, #e5e7eb) 75%
        )`,
        backgroundSize: '200% 100%',
        animation: 'relay-skeleton-shimmer 1.5s ease-in-out infinite',
        borderRadius: 'var(--relay-border-radius, 8px)',
      }}
    />
  );
}

export function CardSkeleton({ width, height }: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        background: `linear-gradient(
          90deg,
          var(--relay-skeleton-base, #e5e7eb) 25%,
          var(--relay-skeleton-shine, #f3f4f6) 50%,
          var(--relay-skeleton-base, #e5e7eb) 75%
        )`,
        backgroundSize: '200% 100%',
        animation: 'relay-skeleton-shimmer 1.5s ease-in-out infinite',
        borderRadius: 'var(--relay-border-radius, 8px)',
      }}
    />
  );
}
