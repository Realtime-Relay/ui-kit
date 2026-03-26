import type { FontStyle } from '../../utils/types';

export interface LegendItem {
  key: string;
  label: string;
  color: string;
  visible: boolean;
}

interface LegendProps {
  items: LegendItem[];
  onToggle: (key: string) => void;
  position: 'top' | 'bottom';
  style?: FontStyle;
}

export function Legend({ items, onToggle, position, style }: LegendProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px 16px',
        justifyContent: 'center',
        padding: '4px 0',
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
          onClick={() => onToggle(item.key)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
            borderRadius: 4,
            opacity: item.visible ? 1 : 0.4,
            transition: 'opacity 150ms ease',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            fontWeight: 'inherit',
            color: 'inherit',
          }}
          type="button"
          aria-label={`${item.visible ? 'Hide' : 'Show'} ${item.label}`}
        >
          <span
            style={{
              width: 10,
              height: 10,
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
