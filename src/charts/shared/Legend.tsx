import type { FontStyle } from '../../utils/types';

const identity = (px: number) => px;

export interface LegendItem {
  key: string;
  label: string;
  color: string;
  visible: boolean;
}

interface LegendProps {
  items: LegendItem[];
  /** Called on click — select this metric exclusively (hide others). */
  onSelect: (key: string) => void;
  position: 'top' | 'bottom' | 'left' | 'right';
  style?: FontStyle;
  /** Proportional scaler created by the parent chart. Defaults to identity. */
  s?: (px: number) => number;
}

export function Legend({ items, onSelect, position, style, s = identity }: LegendProps) {
  const isVertical = position === 'left' || position === 'right';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isVertical ? 'column' : 'row',
        flexWrap: 'wrap',
        gap: `${s(8)}px ${isVertical ? s(8) : s(16)}px`,
        justifyContent: isVertical ? 'flex-start' : 'center',
        alignItems: isVertical ? 'flex-start' : undefined,
        padding: isVertical ? `${s(4)}px ${s(8)}px` : `${s(4)}px 0`,
        fontFamily: style?.fontFamily ?? 'var(--relay-font-family)',
        fontSize: style?.fontSize ?? 'var(--relay-font-size-sm)',
        fontWeight: style?.fontWeight ?? 'var(--relay-font-weight-normal)',
        color: style?.color,
        order: position === 'top' || position === 'left' ? -1 : 1,
        ...(isVertical ? { maxWidth: 140, flexShrink: 0, overflow: 'hidden' } : {}),
      }}
    >
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onSelect(item.key)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: s(6),
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: `2px ${s(4)}px`,
            borderRadius: s(4),
            opacity: item.visible ? 1 : 0.4,
            transition: 'opacity 150ms ease',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            fontWeight: 'inherit',
            color: 'inherit',
          }}
          type="button"
          aria-label={`Select ${item.label}`}
        >
          <span
            style={{
              width: s(14),
              height: s(10),
              borderRadius: s(3),
              backgroundColor: item.color,
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
