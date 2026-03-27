import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StateTimeline } from '../src/timelines/StateTimeline';
import type { DataPoint } from '../src/utils/types';

// ─── Mocks ──────────────────────────────────────────────────

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
        [{ contentRect: { width: 600, height: 400 } } as any],
        this as any,
      );
    }
    unobserve() {}
    disconnect() { mockDisconnect(); }
  });

  // jsdom doesn't implement getComputedTextLength — stub on SVGElement prototype
  // which covers all SVG elements including text
  (SVGElement.prototype as any).getComputedTextLength = function () { return 80; };
});

// ─── Helpers ────────────────────────────────────────────────

const now = Date.now();
const mapper = (v: any) => {
  const n = Number(v);
  if (n >= 70) return 'critical';
  if (n >= 40) return 'warning';
  return 'normal';
};

function makePoints(count: number, metricKey = 'value'): DataPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: now - (count - i) * 10_000,
    [metricKey]: (i * 30) % 100,
  }));
}

function makeSingleDevice(count = 10): Record<string, DataPoint[]> {
  return { 'device-a': makePoints(count) };
}

function makeMultiDevice(): Record<string, DataPoint[]> {
  return {
    'device-a': makePoints(10),
    'device-b': makePoints(10).map((p) => ({ ...p, value: Number(p.value ?? 0) * 0.5 })),
    'device-c': makePoints(10).map((p) => ({ ...p, value: Number(p.value ?? 0) * 1.5 })),
  };
}

// ─── Empty data ─────────────────────────────────────────────

describe('StateTimeline - empty data', () => {
  it('renders skeleton when data={} and showLoading=true', () => {
    const { container } = render(
      <StateTimeline data={{}} stateMapper={mapper} />,
    );
    // ChartSkeleton renders inside a ResponsiveContainer — check that something renders
    expect(container.firstChild).toBeTruthy();
    // Should NOT have an SVG with data-label (no timeline rendered)
    expect(container.querySelector('[data-label]')).toBeFalsy();
  });

  it('renders nothing when data={} and showLoading=false', () => {
    const { container } = render(
      <StateTimeline data={{}} stateMapper={mapper} showLoading={false} />,
    );
    expect(container.innerHTML).toBe('');
  });
});

// ─── Invalid timestamps ─────────────────────────────────────

describe('StateTimeline - invalid timestamps', () => {
  it('filters NaN timestamps and calls onError', () => {
    const onError = vi.fn();
    const data = { d1: [{ timestamp: NaN, value: 50 }, { timestamp: now, value: 50 }] };
    const { container } = render(
      <StateTimeline data={data} stateMapper={mapper} onError={onError} />,
    );
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'invalid_timestamp', component: 'StateTimeline' }),
    );
    // Should still render the valid point
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('filters negative timestamps', () => {
    const onError = vi.fn();
    const data = { d1: [{ timestamp: -1, value: 50 }, { timestamp: now, value: 50 }] };
    render(<StateTimeline data={data} stateMapper={mapper} onError={onError} />);
    expect(onError).toHaveBeenCalled();
  });

  it('does not call onError when all timestamps are valid', () => {
    const onError = vi.fn();
    render(<StateTimeline data={makeSingleDevice()} stateMapper={mapper} onError={onError} />);
    expect(onError).not.toHaveBeenCalled();
  });

  it('works without onError callback', () => {
    const data = { d1: [{ timestamp: NaN, value: 50 }] };
    // Should not throw
    expect(() => render(<StateTimeline data={data} stateMapper={mapper} />)).not.toThrow();
  });
});

// ─── Metric key resolution ──────────────────────────────────

describe('StateTimeline - metric key resolution', () => {
  it('uses explicit metricKey prop', () => {
    const data = { d1: [{ timestamp: now, temp: 30, humidity: 60 }] };
    const { container } = render(
      <StateTimeline data={data} stateMapper={mapper} metricKey="temp" />,
    );
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('auto-detects first non-timestamp key', () => {
    const data = { d1: [{ timestamp: now, value: 30 }] };
    const { container } = render(
      <StateTimeline data={data} stateMapper={mapper} />,
    );
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('skips empty devices to find first with data', () => {
    const data = { empty: [] as DataPoint[], d2: [{ timestamp: now, value: 30 }] };
    const { container } = render(
      <StateTimeline data={data} stateMapper={mapper} />,
    );
    // Should render 2 rows (one empty, one with data)
    const labels = container.querySelectorAll('[data-label]');
    expect(labels.length).toBe(2);
  });
});

// ─── SVG structure ──────────────────────────────────────────

describe('StateTimeline - SVG structure', () => {
  it('renders an SVG element', () => {
    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} />,
    );
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders one row label per device', () => {
    const { container } = render(
      <StateTimeline data={makeMultiDevice()} stateMapper={mapper} />,
    );
    const labels = container.querySelectorAll('[data-label]');
    expect(labels.length).toBe(3);
  });

  it('row label text matches device names', () => {
    const { container } = render(
      <StateTimeline data={{ 'my-sensor': makePoints(5) }} stateMapper={mapper} />,
    );
    const label = container.querySelector('[data-label]');
    expect(label?.textContent).toBe('my-sensor');
  });

  it('renders state bar rects', () => {
    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} />,
    );
    // State bars have opacity attribute (excludes empty row background rects)
    const bars = container.querySelectorAll('svg rect[opacity]');
    expect(bars.length).toBeGreaterThan(0);
  });
});

// ─── Label alignment ────────────────────────────────────────

describe('StateTimeline - label alignment', () => {
  it('default labelAlign=left uses textAnchor=start', () => {
    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} />,
    );
    const label = container.querySelector('[data-label]');
    expect(label?.getAttribute('text-anchor')).toBe('start');
  });

  it('labelAlign=right uses textAnchor=end', () => {
    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} labelAlign="right" />,
    );
    const label = container.querySelector('[data-label]');
    expect(label?.getAttribute('text-anchor')).toBe('end');
  });
});

// ─── Empty rows ─────────────────────────────────────────────

describe('StateTimeline - empty rows', () => {
  it('devices with empty arrays render a background rect', () => {
    const { container } = render(
      <StateTimeline data={{ 'sensor-a': [], 'sensor-b': [] }} stateMapper={mapper} />,
    );
    const rects = container.querySelectorAll('svg rect');
    // Each empty device gets one background rect
    const emptyRects = Array.from(rects).filter((r) => r.getAttribute('fill') === '#f3f4f6');
    expect(emptyRects.length).toBe(2);
  });

  it('custom emptyRowColor is applied', () => {
    const { container } = render(
      <StateTimeline
        data={{ 'sensor-a': [] }}
        stateMapper={mapper}
        styles={{ emptyRowColor: '#ff0000' }}
      />,
    );
    const rects = container.querySelectorAll('svg rect');
    const redRects = Array.from(rects).filter((r) => r.getAttribute('fill') === '#ff0000');
    expect(redRects.length).toBe(1);
  });

  it('mix of empty and populated devices', () => {
    const data = {
      populated: makePoints(5),
      empty: [] as DataPoint[],
    };
    const { container } = render(
      <StateTimeline data={data} stateMapper={mapper} />,
    );
    const labels = container.querySelectorAll('[data-label]');
    expect(labels.length).toBe(2);
    // Has both state bars and empty background
    const allRects = container.querySelectorAll('svg rect');
    expect(allRects.length).toBeGreaterThan(1);
  });
});

// ─── State bars ─────────────────────────────────────────────

describe('StateTimeline - state bars', () => {
  it('bars have default opacity 0.8', () => {
    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} />,
    );
    const bars = container.querySelectorAll('svg rect[opacity]');
    for (const bar of bars) {
      expect(bar.getAttribute('opacity')).toBe('0.8');
    }
  });

  it('bars have cursor pointer style', () => {
    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} />,
    );
    const bar = container.querySelector('svg rect[opacity]') as SVGRectElement;
    expect(bar?.style.cursor).toBe('pointer');
  });

  it('bars have valid fill colors', () => {
    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} />,
    );
    const bars = container.querySelectorAll('svg rect[opacity]');
    for (const bar of bars) {
      const fill = bar.getAttribute('fill');
      expect(fill).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

// ─── X-axis ─────────────────────────────────────────────────

describe('StateTimeline - x-axis', () => {
  it('renders x-axis tick labels when data exists', () => {
    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} />,
    );
    // Axis labels are text elements without data-label attribute, inside the axis group
    const allText = container.querySelectorAll('svg text:not([data-label])');
    expect(allText.length).toBeGreaterThan(0);
  });

  it('no x-axis when all devices have empty data', () => {
    const { container } = render(
      <StateTimeline data={{ d1: [], d2: [] }} stateMapper={mapper} />,
    );
    // Only row label text elements, no axis labels
    const allText = container.querySelectorAll('svg text:not([data-label])');
    expect(allText.length).toBe(0);
  });
});

// ─── Legend ──────────────────────────────────────────────────

describe('StateTimeline - legend', () => {
  it('renders legend inside foreignObject when states exist', () => {
    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} />,
    );
    const foreignObj = container.querySelector('foreignObject');
    expect(foreignObj).toBeTruthy();
  });

  it('legend contains state names', () => {
    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} />,
    );
    const foreignObj = container.querySelector('foreignObject');
    const text = foreignObj?.textContent ?? '';
    expect(text).toContain('normal');
  });

  it('no legend when all devices have empty data', () => {
    const { container } = render(
      <StateTimeline data={{ d1: [] }} stateMapper={mapper} />,
    );
    const foreignObj = container.querySelector('foreignObject');
    expect(foreignObj).toBeFalsy();
  });
});

// ─── Tooltip ────────────────────────────────────────────────

describe('StateTimeline - tooltip', () => {
  it('no tooltip visible initially', () => {
    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} />,
    );
    const tooltip = container.querySelector('[style*="position: fixed"]');
    expect(tooltip).toBeFalsy();
  });

  it('mouseEnter on a bar shows default tooltip', () => {
    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} />,
    );
    const bar = container.querySelector('svg rect[opacity]') as Element;
    fireEvent.mouseEnter(bar, { clientX: 100, clientY: 200 });
    const tooltip = container.querySelector('[style*="position: fixed"]');
    expect(tooltip).toBeTruthy();
    expect(tooltip?.textContent).toContain('device-a');
  });

  it('mouseLeave hides tooltip', () => {
    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} />,
    );
    const bar = container.querySelector('svg rect[opacity]') as Element;
    fireEvent.mouseEnter(bar, { clientX: 100, clientY: 200 });
    fireEvent.mouseLeave(bar);
    const tooltip = container.querySelector('[style*="position: fixed"]');
    expect(tooltip).toBeFalsy();
  });

  it('formatTooltip overrides default content', () => {
    const fmt = vi.fn((_entry, deviceName) => `Custom: ${deviceName}`);
    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} formatTooltip={fmt} />,
    );
    const bar = container.querySelector('svg rect[opacity]') as Element;
    fireEvent.mouseEnter(bar, { clientX: 100, clientY: 200 });
    expect(fmt).toHaveBeenCalled();
    const tooltip = container.querySelector('[style*="position: fixed"]');
    expect(tooltip?.textContent).toContain('Custom: device-a');
  });

  it('renderTooltip takes priority over formatTooltip', () => {
    const fmt = vi.fn(() => 'format');
    const renderTip = vi.fn((_entry, deviceName) => <span data-custom>{deviceName}-jsx</span>);
    const { container } = render(
      <StateTimeline
        data={makeSingleDevice()}
        stateMapper={mapper}
        formatTooltip={fmt}
        renderTooltip={renderTip}
      />,
    );
    const bar = container.querySelector('svg rect[opacity]') as Element;
    fireEvent.mouseEnter(bar, { clientX: 100, clientY: 200 });
    expect(renderTip).toHaveBeenCalled();
    expect(fmt).not.toHaveBeenCalled();
    expect(container.querySelector('[data-custom]')).toBeTruthy();
  });

  it('mouseMove updates tooltip position', () => {
    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} />,
    );
    const bar = container.querySelector('svg rect[opacity]') as Element;
    fireEvent.mouseEnter(bar, { clientX: 100, clientY: 200 });
    fireEvent.mouseMove(bar, { clientX: 150, clientY: 250 });
    const tooltip = container.querySelector('[style*="position: fixed"]') as HTMLElement;
    expect(tooltip?.style.left).toContain('162'); // 150 + 12
  });
});

// ─── Styles ─────────────────────────────────────────────────

describe('StateTimeline - styles', () => {
  it('applies background color', () => {
    const { container } = render(
      <StateTimeline
        data={makeSingleDevice()}
        stateMapper={mapper}
        styles={{ background: { color: '#0f172a' } }}
      />,
    );
    // ResponsiveContainer gets the backgroundColor
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper?.style.backgroundColor).toBe('rgb(15, 23, 42)');
  });

  it('applies rowLabel font properties to label text', () => {
    const { container } = render(
      <StateTimeline
        data={makeSingleDevice()}
        stateMapper={mapper}
        styles={{ rowLabel: { fontSize: 16, color: '#ff0000' } }}
      />,
    );
    const label = container.querySelector('[data-label]');
    expect(label?.getAttribute('font-size')).toBe('16');
    expect(label?.getAttribute('fill')).toBe('#ff0000');
  });

  it('default background is transparent', () => {
    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper?.style.backgroundColor).toBe('transparent');
  });
});

// ─── rowHeight ──────────────────────────────────────────────

describe('StateTimeline - rowHeight', () => {
  it('default rowHeight=28', () => {
    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} />,
    );
    const bar = container.querySelector('svg rect[opacity]');
    expect(bar?.getAttribute('height')).toBe('28');
  });

  it('custom rowHeight=48 changes bar height', () => {
    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} rowHeight={48} />,
    );
    const bar = container.querySelector('svg rect[opacity]');
    expect(bar?.getAttribute('height')).toBe('48');
  });
});

// ─── Narrow container ───────────────────────────────────────

describe('StateTimeline - narrow container', () => {
  it('returns null when chartWidth <= 0', () => {
    // Override ResizeObserver to return very narrow width
    vi.stubGlobal('ResizeObserver', class {
      constructor(private cb: ResizeObserverCallback) {}
      observe(target: Element) {
        this.cb(
          [{ contentRect: { width: 50, height: 400 } } as any],
          this as any,
        );
      }
      unobserve() {}
      disconnect() {}
    });

    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} />,
    );
    // The ResponsiveContainer wrapper exists but the SVG should not
    expect(container.querySelector('svg')).toBeFalsy();
  });
});

// ─── Label measurement ──────────────────────────────────────

describe('StateTimeline - label measurement', () => {
  it('falls back to 120px when getComputedTextLength returns 0', () => {
    (SVGElement.prototype as any).getComputedTextLength = function () { return 0; };

    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} />,
    );
    // Should still render (using 120px fallback)
    expect(container.querySelector('svg')).toBeTruthy();
  });
});

// ─── Multi-device rendering ─────────────────────────────────

describe('StateTimeline - multi-device', () => {
  it('renders all devices with labels and bars', () => {
    const { container } = render(
      <StateTimeline data={makeMultiDevice()} stateMapper={mapper} />,
    );
    const labels = container.querySelectorAll('[data-label]');
    expect(labels.length).toBe(3);
    expect(labels[0].textContent).toBe('device-a');
    expect(labels[1].textContent).toBe('device-b');
    expect(labels[2].textContent).toBe('device-c');
  });
});
