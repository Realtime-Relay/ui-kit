import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StatCard } from '../src/cards/StatCard';
import { StatCardWithGraph } from '../src/cards/StatCardWithGraph';

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------
describe('StatCard', () => {
  // ---- Rendering ----------------------------------------------------------
  describe('rendering', () => {
    it('renders with a numeric value', () => {
      render(<StatCard value={42} />);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('renders with a string value', () => {
      render(<StatCard value="Running" />);
      expect(screen.getByText('Running')).toBeInTheDocument();
    });

    it('renders with a boolean value', () => {
      render(<StatCard value={true} />);
      expect(screen.getByText('true')).toBeInTheDocument();
    });

    it('renders an object value as JSON.stringify', () => {
      render(<StatCard value={{ temp: 23.5 }} />);
      expect(screen.getByText('{"temp":23.5}')).toBeInTheDocument();
    });

    it('shows loading skeleton when value is null', () => {
      const { container } = render(<StatCard value={null} />);
      const el = container.firstChild as HTMLElement;
      expect(el.style.animation).toContain('shimmer');
    });
  });

  // ---- formatValue --------------------------------------------------------
  describe('formatValue', () => {
    it('applies a custom formatter', () => {
      render(<StatCard value={72.5} formatValue={(v) => `${v.toFixed(1)}%`} />);
      expect(screen.getByText('72.5%')).toBeInTheDocument();
    });

    it('default formatter trims trailing decimals', () => {
      render(<StatCard value={23.10} />);
      expect(screen.getByText('23.1')).toBeInTheDocument();
    });

    it('default formatter keeps integers as-is', () => {
      render(<StatCard value={100} />);
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });

  // ---- Label --------------------------------------------------------------
  describe('label', () => {
    it('shows label when provided', () => {
      render(<StatCard value={50} label="Temperature" />);
      expect(screen.getByText('Temperature')).toBeInTheDocument();
    });

    it('does not render label element when not provided', () => {
      const { container } = render(<StatCard value={50} />);
      // Only the value div should be present inside the container
      const children = container.firstChild!.childNodes;
      // With no label and no timestamp the container has only the value div
      expect(children.length).toBe(1);
    });
  });

  // ---- Timestamp ----------------------------------------------------------
  describe('timestamp', () => {
    const ts = new Date('2026-03-15T10:30:45.123Z');

    it('is hidden by default', () => {
      render(<StatCard value={50} lastUpdated={ts} />);
      // defaultFormatTimestamp would produce a string containing "Mar"
      expect(screen.queryByText(/Mar/)).not.toBeInTheDocument();
    });

    it('shows when showLastUpdated is true', () => {
      render(<StatCard value={50} lastUpdated={ts} showLastUpdated />);
      expect(screen.getByText(/Mar/)).toBeInTheDocument();
    });

    it('uses defaultFormatTimestamp (dd MMM pattern)', () => {
      render(<StatCard value={50} lastUpdated={ts} showLastUpdated />);
      // defaultFormatTimestamp produces "15 Mar 2026 ..."
      expect(screen.getByText(/15 Mar 2026/)).toBeInTheDocument();
    });

    it('uses a custom formatTimestamp', () => {
      const custom = () => 'CUSTOM_TS';
      render(
        <StatCard value={50} lastUpdated={ts} showLastUpdated formatTimestamp={custom} />
      );
      expect(screen.getByText('CUSTOM_TS')).toBeInTheDocument();
    });
  });

  // ---- Alert Zones --------------------------------------------------------
  describe('alert zones', () => {
    const zones = [
      { min: 0, max: 30, color: 'green' },
      { min: 30, max: 70, color: 'orange' },
      { min: 70, max: 100, color: 'red' },
    ];

    it('applies zone color to value text', () => {
      const { container } = render(
        <StatCard value={80} alertZones={zones} label="Temp" showLastUpdated lastUpdated={Date.now()} />
      );
      // Value element — font-weight 700
      const valueDivs = container.querySelectorAll<HTMLElement>('div');
      const valueEl = Array.from(valueDivs).find((el) => el.style.fontWeight === '700');
      expect(valueEl?.style.color).toBe('red');
    });

    it('applies zone color to label text', () => {
      const { container } = render(
        <StatCard value={20} alertZones={zones} label="Temp" />
      );
      const divs = container.querySelectorAll<HTMLElement>('div');
      // Label is first child div inside container (font-weight 400, marginBottom set)
      const labelEl = Array.from(divs).find(
        (el) => el.textContent === 'Temp' && el !== container.firstChild
      );
      expect(labelEl?.style.color).toBe('green');
    });

    it('applies zone color to timestamp text', () => {
      const { container } = render(
        <StatCard
          value={50}
          alertZones={zones}
          showLastUpdated
          lastUpdated={Date.now()}
        />
      );
      const divs = container.querySelectorAll<HTMLElement>('div');
      // Timestamp is the last child div (has marginTop)
      const tsEl = Array.from(divs).find((el) => el.style.marginTop !== '');
      expect(tsEl?.style.color).toBe('orange');
    });

    it('styles.value.color overrides zone color', () => {
      const { container } = render(
        <StatCard
          value={80}
          alertZones={zones}
          styles={{ value: { color: 'purple' } }}
        />
      );
      const valueEl = Array.from(
        container.querySelectorAll<HTMLElement>('div')
      ).find((el) => el.style.fontWeight === '700');
      expect(valueEl?.style.color).toBe('purple');
    });

    it('ignores zones for non-numeric value without numericValue', () => {
      const { container } = render(
        <StatCard value="hello" alertZones={zones} />
      );
      const valueEl = Array.from(
        container.querySelectorAll<HTMLElement>('div')
      ).find((el) => el.style.fontWeight === '700');
      // Should fall back to currentColor, not any zone color
      expect(valueEl?.style.color).toBe('currentcolor');
    });

    it('uses numericValue for zone evaluation', () => {
      const { container } = render(
        <StatCard value="Critical" numericValue={85} alertZones={zones} />
      );
      const valueEl = Array.from(
        container.querySelectorAll<HTMLElement>('div')
      ).find((el) => el.style.fontWeight === '700');
      expect(valueEl?.style.color).toBe('red');
    });
  });

  // ---- Validation ---------------------------------------------------------
  describe('validation', () => {
    it('throws on overlapping zones', () => {
      const overlapping = [
        { min: 0, max: 50, color: 'green' },
        { min: 40, max: 100, color: 'red' },
      ];
      expect(() => render(<StatCard value={10} alertZones={overlapping} />)).toThrow(/overlap/i);
    });

    it('throws on inverted zones (min > max)', () => {
      const inverted = [{ min: 100, max: 0, color: 'red' }];
      expect(() => render(<StatCard value={10} alertZones={inverted} />)).toThrow(/greater than max/i);
    });

    it('throws on zone missing min/max', () => {
      const missing = [{ color: 'red' } as any];
      expect(() => render(<StatCard value={10} alertZones={missing} />)).toThrow(/missing/i);
    });

    it('fires onError when value is null', () => {
      const onError = vi.fn();
      render(<StatCard value={null} onError={onError} />);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'invalid_value',
          component: 'StatCard',
        })
      );
    });

    it('fires onError when value is undefined', () => {
      const onError = vi.fn();
      render(<StatCard value={undefined} onError={onError} />);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'invalid_value',
          component: 'StatCard',
        })
      );
    });
  });

  // ---- Styling ------------------------------------------------------------
  describe('styling', () => {
    it('applies background color', () => {
      const { container } = render(
        <StatCard value={50} styles={{ background: { color: '#ff0000' } }} />
      );
      const el = container.firstChild as HTMLElement;
      expect(el.style.backgroundColor).toBe('rgb(255, 0, 0)');
    });

    it('renders a border', () => {
      const { container } = render(
        <StatCard value={50} borderColor="blue" borderThickness={2} />
      );
      const el = container.firstChild as HTMLElement;
      expect(el.style.border).toBe('2px solid blue');
    });

    it('applies sharp border radius', () => {
      const { container } = render(<StatCard value={50} borderRadius="sharp" />);
      const el = container.firstChild as HTMLElement;
      expect(el.style.borderRadius).toBe('0px');
    });

    it('applies rounded border radius', () => {
      const { container } = render(<StatCard value={50} borderRadius="rounded" />);
      const el = container.firstChild as HTMLElement;
      expect(el.style.borderRadius).toBe('var(--relay-border-radius, 8px)');
    });

    it('applies custom numeric border radius', () => {
      const { container } = render(<StatCard value={50} borderRadius={12} />);
      const el = container.firstChild as HTMLElement;
      expect(el.style.borderRadius).toBe('12px');
    });

    it('applies explicit width and height', () => {
      const { container } = render(
        <StatCard value={50} styles={{ width: 200, height: 150 }} />
      );
      const el = container.firstChild as HTMLElement;
      expect(el.style.width).toBe('200px');
      expect(el.style.height).toBe('150px');
    });
  });

  // ---- Edge Cases ---------------------------------------------------------
  describe('edge cases', () => {
    it('retains last valid value when value changes to null', () => {
      const { rerender } = render(<StatCard value={42} />);
      expect(screen.getByText('42')).toBeInTheDocument();

      rerender(<StatCard value={null} />);
      // showLoading is true by default, but lastValidRef should hold 42
      // The component uses renderValue which falls back to lastValidRef
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// StatCardWithGraph
// ---------------------------------------------------------------------------
describe('StatCardWithGraph', () => {
  const now = Date.now();
  const sparkData = Array.from({ length: 10 }, (_, i) => ({
    timestamp: now - (9 - i) * 1000,
    value: 20 + i * 5,
  }));
  const extractor = (p: any) => p.value;

  // ---- Rendering ----------------------------------------------------------
  describe('rendering', () => {
    it('renders with sparkline when extractor provided', () => {
      const { container } = render(
        <StatCardWithGraph
          value={50}
          sparklineData={sparkData}
          sparklineExtractor={extractor}
        />
      );
      expect(container.querySelector('svg')).toBeTruthy();
    });

    it('does not render sparkline without extractor', () => {
      const { container } = render(
        <StatCardWithGraph value={50} sparklineData={sparkData} />
      );
      expect(container.querySelector('svg')).toBeNull();
    });
  });

  // ---- Sparkline ----------------------------------------------------------
  describe('sparkline', () => {
    it('SVG renders with path elements', () => {
      const { container } = render(
        <StatCardWithGraph
          value={50}
          sparklineData={sparkData}
          sparklineExtractor={extractor}
        />
      );
      const svg = container.querySelector('svg')!;
      const paths = svg.querySelectorAll('path');
      // Area fill path + line stroke path
      expect(paths.length).toBe(2);
    });

    it('sparkline covers bottom 60%', () => {
      const { container } = render(
        <StatCardWithGraph
          value={50}
          sparklineData={sparkData}
          sparklineExtractor={extractor}
        />
      );
      const svg = container.querySelector('svg') as SVGElement;
      expect(svg.style.height).toBe('60%');
      expect(svg.style.bottom).toBe('0px');
    });
  });

  // ---- Alert zones on sparkline -------------------------------------------
  describe('alert zones on sparkline', () => {
    const zones = [
      { min: 0, max: 30, color: 'green' },
      { min: 30, max: 70, color: 'orange' },
      { min: 70, max: 100, color: 'red' },
    ];

    it('zone color applied to sparkline when no explicit graphLineColor', () => {
      const { container } = render(
        <StatCardWithGraph
          value={80}
          sparklineData={sparkData}
          sparklineExtractor={extractor}
          alertZones={zones}
        />
      );
      const svg = container.querySelector('svg')!;
      const linePath = svg.querySelectorAll('path')[1]; // line path
      expect(linePath.getAttribute('stroke')).toBe('red');
    });

    it('explicit graphLineColor overrides zone color', () => {
      const { container } = render(
        <StatCardWithGraph
          value={80}
          sparklineData={sparkData}
          sparklineExtractor={extractor}
          alertZones={zones}
          graphLineColor="cyan"
        />
      );
      const svg = container.querySelector('svg')!;
      const linePath = svg.querySelectorAll('path')[1];
      expect(linePath.getAttribute('stroke')).toBe('cyan');
    });
  });

  // ---- Zone change callback -----------------------------------------------
  describe('zone change', () => {
    it('onZoneChange fires when numericValue crosses boundary', () => {
      const zones = [
        { min: 0, max: 50, color: 'green' },
        { min: 50, max: 100, color: 'red' },
      ];
      const onZoneChange = vi.fn();

      const { rerender } = render(
        <StatCardWithGraph
          value={30}
          alertZones={zones}
          onZoneChange={onZoneChange}
        />
      );

      // First render initializes — no callback yet
      expect(onZoneChange).not.toHaveBeenCalled();

      // Cross from green zone to red zone
      rerender(
        <StatCardWithGraph
          value={60}
          alertZones={zones}
          onZoneChange={onZoneChange}
        />
      );

      expect(onZoneChange).toHaveBeenCalledWith(
        expect.objectContaining({
          previousZone: expect.objectContaining({ color: 'green' }),
          currentZone: expect.objectContaining({ color: 'red' }),
          value: 60,
        })
      );
    });
  });

  // ---- Timestamp ----------------------------------------------------------
  describe('timestamp', () => {
    const ts = new Date('2026-03-15T10:30:45.123Z');

    it('is hidden by default', () => {
      render(<StatCardWithGraph value={50} lastUpdated={ts} />);
      expect(screen.queryByText(/Mar/)).not.toBeInTheDocument();
    });

    it('shows when showLastUpdated is true', () => {
      render(<StatCardWithGraph value={50} lastUpdated={ts} showLastUpdated />);
      expect(screen.getByText(/15 Mar 2026/)).toBeInTheDocument();
    });

    it('uses a custom formatTimestamp', () => {
      render(
        <StatCardWithGraph
          value={50}
          lastUpdated={ts}
          showLastUpdated
          formatTimestamp={() => 'CUSTOM'}
        />
      );
      expect(screen.getByText('CUSTOM')).toBeInTheDocument();
    });
  });

  // ---- Loading ------------------------------------------------------------
  describe('loading', () => {
    it('shows skeleton when value is null', () => {
      const { container } = render(<StatCardWithGraph value={null} />);
      const el = container.firstChild as HTMLElement;
      expect(el.style.animation).toContain('shimmer');
    });

    it('does not render sparkline during loading', () => {
      const { container } = render(
        <StatCardWithGraph
          value={null}
          sparklineData={sparkData}
          sparklineExtractor={extractor}
        />
      );
      expect(container.querySelector('svg')).toBeNull();
    });
  });
});
