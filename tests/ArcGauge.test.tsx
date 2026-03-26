import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArcGauge } from '../src/gauges/ArcGauge';

// Mock ResizeObserver for ResponsiveContainer
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

beforeEach(() => {
  mockObserve.mockClear();
  mockDisconnect.mockClear();

  vi.stubGlobal('ResizeObserver', class {
    constructor(private cb: ResizeObserverCallback) {}
    observe(target: Element) {
      mockObserve(target);
      this.cb(
        [{ contentRect: { width: 300, height: 200 } } as any],
        this as any
      );
    }
    unobserve() {}
    disconnect() { mockDisconnect(); }
  });
});

describe('ArcGauge', () => {
  describe('rendering', () => {
    it('renders an SVG element', () => {
      const { container } = render(<ArcGauge value={50} />);
      expect(container.querySelector('svg')).toBeTruthy();
    });

    it('renders background arc', () => {
      const { container } = render(<ArcGauge value={50} />);
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThanOrEqual(1);
      expect(paths[0].getAttribute('stroke')).toBe('#e5e7eb');
    });

    it('renders value fill arc', () => {
      const { container } = render(<ArcGauge value={50} />);
      const paths = container.querySelectorAll('path');
      // Background + value fill = at least 2 paths
      expect(paths.length).toBeGreaterThanOrEqual(2);
    });

    it('does not render a needle line', () => {
      const { container } = render(<ArcGauge value={50} />);
      const line = container.querySelector('line');
      expect(line).toBeNull();
    });
  });

  describe('value display', () => {
    it('displays the formatted value', () => {
      const { container } = render(<ArcGauge value={75.5} />);
      const texts = container.querySelectorAll('text');
      const valueText = Array.from(texts).find(t => t.textContent?.includes('75.5'));
      expect(valueText).toBeTruthy();
    });

    it('uses custom formatValue', () => {
      const { container } = render(
        <ArcGauge value={50} formatValue={(v) => `${v}%`} />
      );
      const texts = container.querySelectorAll('text');
      const valueText = Array.from(texts).find(t => t.textContent?.includes('50%'));
      expect(valueText).toBeTruthy();
    });

    it('displays unit text inline with value', () => {
      const { container } = render(<ArcGauge value={50} unit="%" />);
      const tspan = container.querySelector('tspan');
      expect(tspan).toBeTruthy();
      expect(tspan?.textContent).toContain('%');
    });

    it('displays label text', () => {
      const { container } = render(<ArcGauge value={50} label="humidity" />);
      const texts = container.querySelectorAll('text');
      const hasLabel = Array.from(texts).some(t => t.textContent === 'humidity');
      expect(hasLabel).toBe(true);
    });

    it('does not render unit when not provided', () => {
      const { container } = render(<ArcGauge value={50} />);
      const texts = container.querySelectorAll('text');
      // value + min + max = 3 texts
      expect(texts.length).toBe(3);
    });

    it('does not render label when not provided', () => {
      const { container } = render(<ArcGauge value={50} />);
      const texts = container.querySelectorAll('text');
      expect(texts.length).toBeLessThanOrEqual(3);
    });
  });

  describe('min/max labels', () => {
    it('displays default min (0) and max (100)', () => {
      const { container } = render(<ArcGauge value={50} />);
      const texts = container.querySelectorAll('text');
      const textContents = Array.from(texts).map(t => t.textContent);
      expect(textContents).toContain('0');
      expect(textContents).toContain('100');
    });

    it('displays custom min and max', () => {
      const { container } = render(<ArcGauge value={50} min={-50} max={150} />);
      const texts = container.querySelectorAll('text');
      const textContents = Array.from(texts).map(t => t.textContent);
      expect(textContents).toContain('-50');
      expect(textContents).toContain('150');
    });
  });

  describe('alert zones', () => {
    const zones = [
      { min: 0, max: 30, color: '#22c55e' },
      { min: 30, max: 70, color: '#f59e0b' },
      { min: 70, max: 100, color: '#ef4444' },
    ];

    it('renders zone arc paths', () => {
      const { container } = render(<ArcGauge value={50} alertZones={zones} />);
      const paths = container.querySelectorAll('path');
      // 1 background + 3 zones + 1 value fill = 5 paths
      expect(paths.length).toBe(5);
    });

    it('zones have 25% opacity', () => {
      const { container } = render(<ArcGauge value={50} alertZones={zones} />);
      const paths = container.querySelectorAll('path');
      // Zone paths (indices 1, 2, 3)
      for (let i = 1; i <= 3; i++) {
        expect(paths[i].getAttribute('opacity')).toBe('0.25');
      }
    });

    it('value fill color matches active zone', () => {
      const { container } = render(<ArcGauge value={80} alertZones={zones} />);
      const paths = container.querySelectorAll('path');
      // Last path is the value fill arc
      const fillArc = paths[paths.length - 1];
      expect(fillArc.getAttribute('stroke')).toBe('#ef4444');
    });

    it('value fill uses default blue when no zones', () => {
      const { container } = render(<ArcGauge value={50} />);
      const paths = container.querySelectorAll('path');
      const fillArc = paths[paths.length - 1];
      expect(fillArc.getAttribute('stroke')).toBe('#3b82f6');
    });
  });

  describe('styles', () => {
    it('applies arc thickness', () => {
      const { container } = render(
        <ArcGauge value={50} styles={{ arcThickness: 30 }} />
      );
      const bgArc = container.querySelector('path');
      expect(bgArc?.getAttribute('stroke-width')).toBe('30');
    });

    it('applies value font size', () => {
      const { container } = render(
        <ArcGauge value={50} styles={{ value: { fontSize: 40 } }} />
      );
      const texts = container.querySelectorAll('text');
      const valueText = Array.from(texts).find(t => t.textContent?.includes('50'));
      expect(valueText?.getAttribute('font-size')).toBe('40');
    });

    it('applies value color', () => {
      const { container } = render(
        <ArcGauge value={50} styles={{ value: { color: '#ff0000' } }} />
      );
      const texts = container.querySelectorAll('text');
      const valueText = Array.from(texts).find(t => t.textContent?.includes('50'));
      expect(valueText?.getAttribute('fill')).toBe('#ff0000');
    });

    it('applies label font size', () => {
      const { container } = render(
        <ArcGauge value={50} label="speed" styles={{ label: { fontSize: 18 } }} />
      );
      const texts = container.querySelectorAll('text');
      const labelText = Array.from(texts).find(t => t.textContent === 'speed');
      expect(labelText?.getAttribute('font-size')).toBe('18');
    });

    it('applies label color', () => {
      const { container } = render(
        <ArcGauge value={50} label="speed" styles={{ label: { color: '#00ff00' } }} />
      );
      const texts = container.querySelectorAll('text');
      const labelText = Array.from(texts).find(t => t.textContent === 'speed');
      expect(labelText?.getAttribute('fill')).toBe('#00ff00');
    });

    it('applies unit font size', () => {
      const { container } = render(
        <ArcGauge value={50} unit="km/h" styles={{ unit: { fontSize: 16 } }} />
      );
      const tspan = container.querySelector('tspan');
      expect(tspan?.getAttribute('font-size')).toBe('16');
    });

    it('applies background color', () => {
      const { container } = render(
        <ArcGauge value={50} styles={{ background: { color: '#1a1a1a' } }} />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.backgroundColor).toBe('rgb(26, 26, 26)');
    });

    it('uses default arc thickness of 20', () => {
      const { container } = render(<ArcGauge value={50} />);
      const bgArc = container.querySelector('path');
      expect(bgArc?.getAttribute('stroke-width')).toBe('20');
    });
  });

  describe('accessibility', () => {
    it('has role="meter"', () => {
      const { container } = render(<ArcGauge value={50} />);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('role')).toBe('meter');
    });

    it('has aria-valuenow', () => {
      const { container } = render(<ArcGauge value={75} />);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('aria-valuenow')).toBe('75');
    });

    it('has aria-valuemin and aria-valuemax', () => {
      const { container } = render(<ArcGauge value={50} min={0} max={200} />);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('aria-valuemin')).toBe('0');
      expect(svg?.getAttribute('aria-valuemax')).toBe('200');
    });

    it('has aria-label from label prop', () => {
      const { container } = render(<ArcGauge value={50} label="RPM" />);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('aria-label')).toBe('RPM');
    });

    it('has default aria-label when no label', () => {
      const { container } = render(<ArcGauge value={50} />);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('aria-label')).toBe('Gauge');
    });
  });

  describe('value clamping', () => {
    it('displays actual value when above max', () => {
      const { container } = render(
        <ArcGauge value={200} max={100} formatValue={(v) => String(v)} />
      );
      const texts = container.querySelectorAll('text');
      const hasValue = Array.from(texts).some(t => t.textContent?.includes('200'));
      expect(hasValue).toBe(true);
    });

    it('displays actual value when below min', () => {
      const { container } = render(
        <ArcGauge value={-10} min={0} formatValue={(v) => String(v)} />
      );
      const texts = container.querySelectorAll('text');
      const hasValue = Array.from(texts).some(t => t.textContent?.includes('-10'));
      expect(hasValue).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('throws when min === max', () => {
      expect(() => render(<ArcGauge value={50} min={50} max={50} />)).toThrow(
        'min and max cannot be equal'
      );
    });

    it('throws when min > max', () => {
      expect(() => render(<ArcGauge value={50} min={100} max={0} />)).toThrow(
        'min (100) must be less than or equal to max (0)'
      );
    });

    it('renders with value=0', () => {
      const { container } = render(<ArcGauge value={0} />);
      expect(container.querySelector('svg')).toBeTruthy();
    });

    it('renders with negative range', () => {
      const { container } = render(<ArcGauge value={-50} min={-100} max={0} />);
      expect(container.querySelector('svg')).toBeTruthy();
    });

    it('renders with very large values', () => {
      const { container } = render(<ArcGauge value={999999} max={1000000} />);
      expect(container.querySelector('svg')).toBeTruthy();
    });

    it('renders with empty alert zones array', () => {
      const { container } = render(<ArcGauge value={50} alertZones={[]} />);
      expect(container.querySelector('svg')).toBeTruthy();
    });
  });
});
