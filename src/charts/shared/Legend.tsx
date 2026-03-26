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
  position: 'top' | 'bottom';
  style?: FontStyle;
  /** Proportional scaler created by the parent chart. Defaults to identity. */
  s?: (px: number) => number;
}

export function Legend({ items, onSelect, position, style, s = identity }: LegendProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: `${s(8)}px ${s(16)}px`,
        justifyContent: 'center',
        padding: `${s(4)}px 0`,
        fontFamily: style?.fontFamily ?? 'var(--relay-font-family)',
        fontSize: style?.fontSize ?? 'var(--relay-font-size-sm)',
        fontWeight: style?.fontWeight ?? 'var(--relay-font-weight-normal)',
        color: style?.color,
        order: position === 'top' ? -1 : 1,
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
              width: s(10),
              height: s(10),
              borderRadius: '50%',
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
