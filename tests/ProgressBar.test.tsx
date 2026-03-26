import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProgressBar } from '../src/indicators/ProgressBar';

describe('ProgressBar', () => {
  describe('rendering', () => {
    it('renders with default props', () => {
      const { container } = render(<ProgressBar value={50} />);
      expect(container.firstChild).toBeTruthy();
    });

    it('shows the formatted value as label by default', () => {
      render(<ProgressBar value={65} />);
      expect(screen.getByText('65')).toBeInTheDocument();
    });

    it('hides the label when showLabel is false', () => {
      render(<ProgressBar value={65} showLabel={false} />);
      expect(screen.queryByText('65')).not.toBeInTheDocument();
    });

    it('shows loading skeleton when value is null and showLoading is true', () => {
      const { container } = render(<ProgressBar value={null as any} showLoading />);
      const el = container.firstChild as HTMLElement;
      expect(el.style.animation).toContain('shimmer');
    });
  });

  describe('formatValue', () => {
    it('uses custom formatValue callback', () => {
      render(<ProgressBar value={72.5} formatValue={(v) => `${v.toFixed(1)}%`} />);
      expect(screen.getByText('72.5%')).toBeInTheDocument();
    });

    it('displays raw value even when it exceeds max', () => {
      render(<ProgressBar value={150} max={100} formatValue={(v) => `${v}`} />);
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    it('displays raw value even when below min', () => {
      render(<ProgressBar value={-10} min={0} formatValue={(v) => `${v}`} />);
      expect(screen.getByText('-10')).toBeInTheDocument();
    });
  });

  describe('fill percentage', () => {
    function getFillBar(container: HTMLElement): HTMLElement {
      // Fill bar is the div with a transition style containing 'width' or 'height'
      const allDivs = container.querySelectorAll('div > div');
      return Array.from(allDivs).find(
        (d) => (d as HTMLElement).style.transition?.includes('width')
      ) as HTMLElement;
    }

    it('clamps fill to 0% when value is below min', () => {
      const { container } = render(<ProgressBar value={-10} min={0} max={100} />);
      const fill = getFillBar(container);
      expect(fill.style.width).toBe('0%');
    });

    it('clamps fill to 100% when value exceeds max', () => {
      const { container } = render(<ProgressBar value={150} min={0} max={100} />);
      const fill = getFillBar(container);
      expect(fill.style.width).toBe('100%');
    });

    it('calculates correct percentage for custom range', () => {
      const { container } = render(<ProgressBar value={500} min={0} max={1000} />);
      const fill = getFillBar(container);
      expect(fill.style.width).toBe('50%');
    });
  });

  describe('alert zones', () => {
    const zones = [
      { min: 0, max: 40, color: '#22c55e', label: 'Normal' },
      { min: 40, max: 70, color: '#f59e0b', label: 'Warning' },
      { min: 70, max: 100, color: '#ef4444', label: 'Critical' },
    ];

    it('renders zone background bands', () => {
      const { container } = render(
        <ProgressBar value={50} alertZones={zones} showLabel={false} />
      );
      // Should have 3 zone divs + 1 fill div
      const children = container.querySelectorAll('div > div');
      expect(children.length).toBeGreaterThanOrEqual(4);
    });

    it('sets native title tooltip on zone bands', () => {
      const { container } = render(
        <ProgressBar value={50} alertZones={zones} showLabel={false} />
      );
      const zoneDivs = container.querySelectorAll('[title]');
      expect(zoneDivs.length).toBe(3);
      expect(zoneDivs[0].getAttribute('title')).toBe('Normal: 0 – 40');
      expect(zoneDivs[1].getAttribute('title')).toBe('Warning: 40 – 70');
      expect(zoneDivs[2].getAttribute('title')).toBe('Critical: 70 – 100');
    });

    it('shows zone range without label when label is not provided', () => {
      const unlabeledZones = [{ min: 0, max: 50, color: '#22c55e' }];
      const { container } = render(
        <ProgressBar value={25} alertZones={unlabeledZones} showLabel={false} />
      );
      const zoneDivs = container.querySelectorAll('[title]');
      expect(zoneDivs[0].getAttribute('title')).toBe('0 – 50');
    });

    it('uses zone color for fill when value is in zone', () => {
      const { container } = render(
        <ProgressBar value={50} alertZones={zones} showLabel={false} />
      );
      // Find the fill div (has transition style)
      const allDivs = container.querySelectorAll('div > div');
      const fillDiv = Array.from(allDivs).find(
        (d) => (d as HTMLElement).style.transition?.includes('width')
      ) as HTMLElement;
      expect(fillDiv).toBeTruthy();
      expect(fillDiv.style.backgroundColor).toBe('rgb(245, 158, 11)'); // #f59e0b
    });
  });

  describe('orientation', () => {
    function getFillBar(container: HTMLElement): HTMLElement {
      const allDivs = container.querySelectorAll('div > div');
      return Array.from(allDivs).find(
        (d) => (d as HTMLElement).style.transition?.includes('width') || (d as HTMLElement).style.transition?.includes('height')
      ) as HTMLElement;
    }

    it('renders horizontally by default', () => {
      const { container } = render(<ProgressBar value={50} showLabel={false} />);
      const fill = getFillBar(container);
      expect(fill.style.width).toBe('50%');
    });

    it('renders vertically when orientation is vertical', () => {
      const { container } = render(
        <ProgressBar value={50} orientation="vertical" showLabel={false} />
      );
      const fill = getFillBar(container);
      expect(fill.style.height).toBe('50%');
    });
  });

  describe('styles', () => {
    it('applies custom background color', () => {
      const { container } = render(
        <ProgressBar value={50} styles={{ background: { color: '#f1f5f9' } }} />
      );
      const root = container.firstChild as HTMLElement;
      expect(root.style.backgroundColor).toBe('rgb(241, 245, 249)');
    });

    it('applies custom width', () => {
      const { container } = render(
        <ProgressBar value={50} styles={{ width: 300 }} />
      );
      const root = container.firstChild as HTMLElement;
      expect(root.style.width).toBe('300px');
    });

    it('applies custom height', () => {
      const { container } = render(
        <ProgressBar value={50} styles={{ height: 40 }} />
      );
      const root = container.firstChild as HTMLElement;
      expect(root.style.height).toBe('40px');
    });

    it('accepts string values for width/height (CSS units)', () => {
      const { container } = render(
        <ProgressBar value={50} styles={{ width: '80%', height: '2rem' }} />
      );
      const root = container.firstChild as HTMLElement;
      expect(root.style.width).toBe('80%');
      expect(root.style.height).toBe('2rem');
    });

    it('keeps maxWidth 100% for responsiveness', () => {
      const { container } = render(
        <ProgressBar value={50} styles={{ width: 500 }} />
      );
      const root = container.firstChild as HTMLElement;
      expect(root.style.maxWidth).toBe('100%');
    });

    it('applies custom label font styles', () => {
      render(
        <ProgressBar
          value={50}
          styles={{ label_font_file: { fontFamily: 'monospace', fontSize: 16, fontWeight: 700 } }}
        />
      );
      const label = screen.getByText('50');
      expect(label.style.fontFamily).toBe('monospace');
      expect(label.style.fontSize).toBe('16px');
    });
  });

  describe('showAlertZones', () => {
    const zones = [
      { min: 0, max: 50, color: '#22c55e' },
      { min: 50, max: 100, color: '#ef4444' },
    ];

    it('shows alert zones by default when alertZones are provided', () => {
      const { container } = render(
        <ProgressBar value={50} alertZones={zones} showLabel={false} />
      );
      expect(container.querySelectorAll('[title]').length).toBe(2);
    });

    it('hides alert zones when showAlertZones is false', () => {
      const { container } = render(
        <ProgressBar value={50} alertZones={zones} showAlertZones={false} showLabel={false} />
      );
      expect(container.querySelectorAll('[title]').length).toBe(0);
    });

    it('still uses zone color for fill even when zones are hidden', () => {
      const { container } = render(
        <ProgressBar value={75} alertZones={zones} showAlertZones={false} showLabel={false} />
      );
      const allDivs = container.querySelectorAll('div > div');
      const fillDiv = Array.from(allDivs).find(
        (d) => (d as HTMLElement).style.transition?.includes('width')
      ) as HTMLElement;
      expect(fillDiv.style.backgroundColor).toBe('rgb(239, 68, 68)'); // #ef4444
    });
  });

  describe('edge cases', () => {
    it('throws when min === max', () => {
      expect(() => render(<ProgressBar value={5} min={5} max={5} />)).toThrow(
        'min and max cannot be equal'
      );
    });

    it('throws when min > max', () => {
      expect(() => render(<ProgressBar value={5} min={10} max={0} />)).toThrow(
        'min (10) must be less than or equal to max (0)'
      );
    });

    it('handles value === 0', () => {
      render(<ProgressBar value={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles very large values', () => {
      render(<ProgressBar value={999999} max={100} formatValue={(v) => `${v}`} />);
      expect(screen.getByText('999999')).toBeInTheDocument();
    });
  });
});
