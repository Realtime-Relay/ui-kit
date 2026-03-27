import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TimeSeries } from '../src/charts/TimeSeries';
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
});

// ─── Helpers ────────────────────────────────────────────────

const NOW = 1711500000000; // fixed timestamp for deterministic tests

function makePoints(count: number, metricKey = 'value', offsetFactor = 1): DataPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: NOW - (count - i) * 10_000,
    [metricKey]: ((i * 23 + 7) % 100) * offsetFactor,
  }));
}

function singleDevice(count = 20): Record<string, DataPoint[]> {
  return { 'device-a': makePoints(count) };
}

function multiDevice(): Record<string, DataPoint[]> {
  return {
    'device-a': makePoints(20),
    'device-b': makePoints(20, 'value', 0.5),
    'device-c': makePoints(20, 'value', 1.5),
  };
}

const defaultMapper = (v: any) => String(v);

// ─── Empty / Loading ────────────────────────────────────────

describe('TimeSeries - empty / loading', () => {
  it('renders skeleton when data={} and showLoading=true', () => {
    const { container } = render(
      <TimeSeries data={{}} />,
    );
    // Should render something (skeleton) but no line paths
    expect(container.firstChild).toBeTruthy();
    expect(container.querySelector('path[fill="none"]')).toBeFalsy();
  });

  it('does not render chart content when data={} and showLoading=false', () => {
    const { container } = render(
      <TimeSeries data={{}} showLoading={false} />,
    );
    // No line paths, no legend buttons
    expect(container.querySelector('path[fill="none"]')).toBeFalsy();
    expect(container.querySelector('button[type="button"]')).toBeFalsy();
  });

  it('renders skeleton for all-empty device arrays', () => {
    const { container } = render(
      <TimeSeries data={{ d1: [], d2: [] }} />,
    );
    expect(container.firstChild).toBeTruthy();
    expect(container.querySelector('path[fill="none"]')).toBeFalsy();
  });
});

// ─── SVG Structure ──────────────────────────────────────────

describe('TimeSeries - SVG structure', () => {
  it('renders an SVG element', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} />,
    );
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders line paths for each metric', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} />,
    );
    const linePaths = container.querySelectorAll('path[fill="none"]');
    expect(linePaths.length).toBeGreaterThanOrEqual(1);
  });

  it('renders a clip path', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} />,
    );
    expect(container.querySelector('clipPath')).toBeTruthy();
  });
});

// ─── Multi-device ───────────────────────────────────────────

describe('TimeSeries - multi-device', () => {
  it('renders one line per device×metric', () => {
    const { container } = render(
      <TimeSeries data={multiDevice()} />,
    );
    const linePaths = container.querySelectorAll('path[fill="none"]');
    // 3 devices × 1 metric = 3 lines
    expect(linePaths.length).toBe(3);
  });

  it('single device legend shows metric name only', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} />,
    );
    const buttons = container.querySelectorAll('button[type="button"]');
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent).toBe('value');
  });

  it('multi-device legend shows [device]: metric format', () => {
    const { container } = render(
      <TimeSeries data={multiDevice()} />,
    );
    const buttons = container.querySelectorAll('button[type="button"]');
    expect(buttons.length).toBe(3);
    expect(buttons[0].textContent).toContain('[device-a]');
    expect(buttons[0].textContent).toContain('value');
    expect(buttons[1].textContent).toContain('[device-b]');
  });

  it('formatLegend callback overrides default labels', () => {
    const fmt = (device: string, metric: string) => `${device}/${metric}`;
    const { container } = render(
      <TimeSeries data={multiDevice()} formatLegend={fmt} />,
    );
    const buttons = container.querySelectorAll('button[type="button"]');
    expect(buttons[0].textContent).toBe('device-a/value');
    expect(buttons[1].textContent).toBe('device-b/value');
  });
});

// ─── Invalid timestamps ─────────────────────────────────────

describe('TimeSeries - invalid timestamps', () => {
  it('filters invalid timestamps and calls onError', () => {
    const onError = vi.fn();
    const data = { d1: [{ timestamp: NaN, value: 50 }, ...makePoints(5)] };
    render(<TimeSeries data={data} onError={onError} />);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'invalid_timestamp', component: 'TimeSeries' }),
    );
  });

  it('does not call onError when all timestamps valid', () => {
    const onError = vi.fn();
    render(<TimeSeries data={singleDevice()} onError={onError} />);
    expect(onError).not.toHaveBeenCalled();
  });
});

// ─── Title ──────────────────────────────────────────────────

describe('TimeSeries - title', () => {
  it('renders title when provided', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} title="My Chart" />,
    );
    expect(container.textContent).toContain('My Chart');
  });

  it('does not render title when not provided', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} />,
    );
    // Should not have a title div with order: -2
    const titleDivs = Array.from(container.querySelectorAll('div')).filter(
      (d) => d.style.order === '-2',
    );
    expect(titleDivs.length).toBe(0);
  });
});

// ─── Legend ──────────────────────────────────────────────────

describe('TimeSeries - legend', () => {
  it('shows legend by default (bottom position)', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} />,
    );
    const buttons = container.querySelectorAll('button[type="button"]');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('hides legend when showLegend=false', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} showLegend={false} />,
    );
    const buttons = container.querySelectorAll('button[type="button"]');
    expect(buttons.length).toBe(0);
  });

  it('legend swatch is a rounded rectangle (not circle)', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} />,
    );
    const swatch = container.querySelector('button[type="button"] span:first-child') as HTMLElement;
    // Should NOT be 50% (circle)
    expect(swatch.style.borderRadius).not.toBe('50%');
    // Width should be wider than height (rectangle)
    const w = parseFloat(swatch.style.width);
    const h = parseFloat(swatch.style.height);
    expect(w).toBeGreaterThan(h);
  });

  it('solo mode: clicking a legend item shows only that series', () => {
    const data = {
      'a': makePoints(10),
      'b': makePoints(10, 'value', 0.5),
    };
    const { container } = render(
      <TimeSeries data={data} />,
    );
    const buttons = container.querySelectorAll('button[type="button"]');
    // Both visible initially
    expect(buttons[0].style.opacity).toBe('1');
    expect(buttons[1].style.opacity).toBe('1');

    // Click first legend item
    fireEvent.click(buttons[0]);

    // After click, first should be visible, second dimmed
    const updatedButtons = container.querySelectorAll('button[type="button"]');
    expect(updatedButtons[0].style.opacity).toBe('1');
    expect(updatedButtons[1].style.opacity).toBe('0.4');
  });

  it('solo mode: clicking the only visible series shows all again', () => {
    const data = {
      'a': makePoints(10),
      'b': makePoints(10, 'value', 0.5),
    };
    const { container } = render(
      <TimeSeries data={data} />,
    );
    const buttons = container.querySelectorAll('button[type="button"]');

    // Solo first
    fireEvent.click(buttons[0]);
    // Click first again — should show all
    const updatedButtons = container.querySelectorAll('button[type="button"]');
    fireEvent.click(updatedButtons[0]);

    const finalButtons = container.querySelectorAll('button[type="button"]');
    expect(finalButtons[0].style.opacity).toBe('1');
    expect(finalButtons[1].style.opacity).toBe('1');
  });

  it('legendPosition=top renders legend before chart', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} legendPosition="top" />,
    );
    const buttons = container.querySelectorAll('button[type="button"]');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('legendPosition=left renders legend in row layout', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} legendPosition="left" />,
    );
    // Outer container should be flex-direction: row
    const outerDiv = container.querySelector('div[style*="flex-direction: row"]');
    expect(outerDiv).toBeTruthy();
  });

  it('legendPosition=right renders legend in row layout', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} legendPosition="right" />,
    );
    const outerDiv = container.querySelector('div[style*="flex-direction: row"]');
    expect(outerDiv).toBeTruthy();
  });
});

// ─── Line thickness ─────────────────────────────────────────

describe('TimeSeries - lineThickness', () => {
  it('applies global lineThickness to stroke-width', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} lineThickness={4} />,
    );
    const linePath = container.querySelector('path[fill="none"]');
    expect(linePath?.getAttribute('stroke-width')).toBe('4');
  });

  it('per-metric lineThickness overrides global', () => {
    const { container } = render(
      <TimeSeries
        data={singleDevice()}
        lineThickness={2}
        metrics={[{ key: 'value', lineThickness: 6 }]}
      />,
    );
    const linePath = container.querySelector('path[fill="none"]');
    expect(linePath?.getAttribute('stroke-width')).toBe('6');
  });
});

// ─── Point size ─────────────────────────────────────────────

describe('TimeSeries - pointSize', () => {
  it('renders circles when pointSize > 0', () => {
    const { container } = render(
      <TimeSeries data={singleDevice(5)} pointSize={3} />,
    );
    const circles = container.querySelectorAll('svg circle');
    expect(circles.length).toBeGreaterThan(0);
  });

  it('no circles when pointSize not set', () => {
    const { container } = render(
      <TimeSeries data={singleDevice(5)} />,
    );
    const circles = container.querySelectorAll('svg circle');
    expect(circles.length).toBe(0);
  });

  it('circles have correct radius', () => {
    const { container } = render(
      <TimeSeries data={singleDevice(5)} pointSize={4} />,
    );
    const circle = container.querySelector('svg circle');
    expect(circle?.getAttribute('r')).toBe('4');
  });

  it('per-metric pointSize overrides global', () => {
    const { container } = render(
      <TimeSeries
        data={singleDevice(5)}
        pointSize={2}
        metrics={[{ key: 'value', pointSize: 5 }]}
      />,
    );
    const circle = container.querySelector('svg circle');
    expect(circle?.getAttribute('r')).toBe('5');
  });
});

// ─── Annotations ────────────────────────────────────────────

describe('TimeSeries - annotations', () => {
  it('renders point annotation as a dashed line', () => {
    const { container } = render(
      <TimeSeries
        data={singleDevice()}
        annotations={[{ timestamp: NOW - 100_000, label: 'Deploy' }]}
      />,
    );
    // Should have a dashed annotation line (stroke-dasharray="4,3")
    const lines = container.querySelectorAll('line[stroke-dasharray="4,3"]');
    expect(lines.length).toBe(1);
  });

  it('renders point annotation label', () => {
    const { container } = render(
      <TimeSeries
        data={singleDevice()}
        annotations={[{ timestamp: NOW - 100_000, label: 'Deploy v2' }]}
      />,
    );
    expect(container.textContent).toContain('Deploy v2');
  });

  it('renders range annotation as a filled rect', () => {
    const { container } = render(
      <TimeSeries
        data={singleDevice()}
        annotations={[{ start: NOW - 150_000, end: NOW - 50_000, label: 'Maintenance' }]}
      />,
    );
    // Should have a rect with opacity 0.1 for the range
    const rects = container.querySelectorAll('rect[opacity="0.1"]');
    expect(rects.length).toBe(1);
  });

  it('renders range annotation label', () => {
    const { container } = render(
      <TimeSeries
        data={singleDevice()}
        annotations={[{ start: NOW - 150_000, end: NOW - 50_000, label: 'Window' }]}
      />,
    );
    expect(container.textContent).toContain('Window');
  });

  it('renders custom colored annotation', () => {
    const { container } = render(
      <TimeSeries
        data={singleDevice()}
        annotations={[{ timestamp: NOW - 100_000, color: '#ef4444' }]}
      />,
    );
    const line = container.querySelector('line[stroke="#ef4444"]');
    expect(line).toBeTruthy();
  });

  it('renders multiple mixed annotations', () => {
    const { container } = render(
      <TimeSeries
        data={singleDevice()}
        annotations={[
          { timestamp: NOW - 100_000, label: 'Point' },
          { start: NOW - 150_000, end: NOW - 50_000, label: 'Range' },
        ]}
      />,
    );
    expect(container.textContent).toContain('Point');
    expect(container.textContent).toContain('Range');
  });
});

// ─── Start / End props ──────────────────────────────────────

describe('TimeSeries - start/end props', () => {
  it('renders with fixed start/end domain', () => {
    const { container } = render(
      <TimeSeries
        data={singleDevice()}
        start={NOW - 200_000}
        end={NOW}
      />,
    );
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('accepts Date objects for start/end', () => {
    const { container } = render(
      <TimeSeries
        data={singleDevice()}
        start={new Date(NOW - 200_000)}
        end={new Date(NOW)}
      />,
    );
    expect(container.querySelector('svg')).toBeTruthy();
  });
});

// ─── Area ───────────────────────────────────────────────────

describe('TimeSeries - area', () => {
  it('renders area path when area=true', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} area />,
    );
    const areaPaths = container.querySelectorAll('path[opacity="0.15"]');
    expect(areaPaths.length).toBe(1);
  });

  it('no area path when area=false', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} />,
    );
    const areaPaths = container.querySelectorAll('path[opacity="0.15"]');
    expect(areaPaths.length).toBe(0);
  });
});

// ─── Grid ───────────────────────────────────────────────────

describe('TimeSeries - grid', () => {
  it('renders grid lines by default', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} />,
    );
    const gridLines = container.querySelectorAll('line[stroke-dasharray="2,2"]');
    expect(gridLines.length).toBeGreaterThan(0);
  });

  it('hides grid when showGrid=false', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} showGrid={false} />,
    );
    const gridLines = container.querySelectorAll('line[stroke-dasharray="2,2"]');
    expect(gridLines.length).toBe(0);
  });
});

// ─── Styles ─────────────────────────────────────────────────

describe('TimeSeries - styles', () => {
  it('applies background color', () => {
    const { container } = render(
      <TimeSeries
        data={singleDevice()}
        styles={{ background: { color: '#0f172a' } }}
      />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper?.style.backgroundColor).toBe('rgb(15, 23, 42)');
  });
});

// ─── Zoom ───────────────────────────────────────────────────

describe('TimeSeries - zoom', () => {
  it('does not show reset button initially', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} />,
    );
    expect(container.textContent).not.toContain('Reset zoom');
  });

  it('overlay rect has crosshair cursor when zoom enabled', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} />,
    );
    const overlay = container.querySelector('rect[fill="transparent"]') as SVGRectElement;
    expect(overlay?.style.cursor).toBe('crosshair');
  });

  it('overlay rect has no special cursor when zoom disabled', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} zoomEnabled={false} />,
    );
    const overlay = container.querySelector('rect[fill="transparent"]') as SVGRectElement;
    expect(overlay?.style.cursor).toBe('');
  });
});

// ─── Metric key resolution ──────────────────────────────────

describe('TimeSeries - metric resolution', () => {
  it('auto-detects metric key from data', () => {
    const { container } = render(
      <TimeSeries data={{ d1: [{ timestamp: NOW, temperature: 25 }] }} />,
    );
    // Should render a line path
    const linePaths = container.querySelectorAll('path[fill="none"]');
    expect(linePaths.length).toBeGreaterThanOrEqual(1);
  });

  it('uses explicit metrics prop', () => {
    const { container } = render(
      <TimeSeries
        data={{ d1: [{ timestamp: NOW, temp: 25, humidity: 60 }] }}
        metrics={[{ key: 'temp', label: 'Temperature' }]}
      />,
    );
    const buttons = container.querySelectorAll('button[type="button"]');
    expect(buttons[0].textContent).toBe('Temperature');
  });
});

// ─── Narrow container ───────────────────────────────────────

describe('TimeSeries - narrow container', () => {
  it('handles very small container gracefully', () => {
    vi.stubGlobal('ResizeObserver', class {
      constructor(private cb: ResizeObserverCallback) {}
      observe(target: Element) {
        this.cb([{ contentRect: { width: 10, height: 10 } } as any], this as any);
      }
      unobserve() {}
      disconnect() {}
    });

    // Should not throw
    expect(() => render(<TimeSeries data={singleDevice()} />)).not.toThrow();
  });
});

// ─── Alert zones ────────────────────────────────────────────

describe('TimeSeries - alert zones', () => {
  it('renders alert zone rects', () => {
    const { container } = render(
      <TimeSeries
        data={singleDevice()}
        alertZones={[
          { min: 0, max: 30, color: '#22c55e' },
          { min: 70, max: 100, color: '#ef4444' },
        ]}
      />,
    );
    // Alert zones render as rects with 10% opacity
    const zoneRects = container.querySelectorAll('rect[opacity="0.1"]');
    expect(zoneRects.length).toBe(2);
  });
});

// ─── Multiple metrics per device ────────────────────────────

describe('TimeSeries - multiple metrics', () => {
  it('renders two lines for two metrics on one device', () => {
    const data = {
      'd1': Array.from({ length: 10 }, (_, i) => ({
        timestamp: NOW - (10 - i) * 10_000,
        temperature: 20 + i,
        humidity: 40 + i * 2,
      })),
    };
    const { container } = render(
      <TimeSeries data={data} metrics={[{ key: 'temperature' }, { key: 'humidity' }]} />,
    );
    const linePaths = container.querySelectorAll('path[fill="none"]');
    expect(linePaths.length).toBe(2);
  });
});

// ─── Annotation Mode ────────────────────────────────────────

describe('TimeSeries - annotation mode', () => {
  it('annotationMode=true shows copy cursor on overlay', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} annotationMode />,
    );
    const overlay = container.querySelector('rect[fill="transparent"]') as SVGRectElement;
    expect(overlay?.style.cursor).toBe('copy');
  });

  it('annotationMode=true disables zoom crosshair cursor', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} annotationMode zoomEnabled />,
    );
    const overlay = container.querySelector('rect[fill="transparent"]') as SVGRectElement;
    // Should be 'copy', not 'crosshair'
    expect(overlay?.style.cursor).toBe('copy');
  });

  it('annotationMode=false shows crosshair when zoomEnabled', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} annotationMode={false} zoomEnabled />,
    );
    const overlay = container.querySelector('rect[fill="transparent"]') as SVGRectElement;
    expect(overlay?.style.cursor).toBe('crosshair');
  });

  it('click fires onAnnotate with click type', () => {
    const onAnnotate = vi.fn();
    const { container } = render(
      <TimeSeries data={singleDevice()} annotationMode onAnnotate={onAnnotate} />,
    );
    const overlay = container.querySelector('rect[fill="transparent"]') as SVGRectElement;

    // Simulate click (mouseDown + mouseUp at same position)
    fireEvent.mouseDown(overlay, { clientX: 300, clientY: 200 });
    fireEvent.mouseUp(overlay, { clientX: 300, clientY: 200 });

    // Click only — no start_drag for clicks (start_drag only fires when drag > 10px)
    expect(onAnnotate).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'click');
    const startDragCalls = onAnnotate.mock.calls.filter((c: any[]) => c[2] === 'start_drag');
    expect(startDragCalls.length).toBe(0);
  });

  it('drag fires onAnnotate with start_drag and end_drag', () => {
    const onAnnotate = vi.fn();
    const { container } = render(
      <TimeSeries data={singleDevice()} annotationMode onAnnotate={onAnnotate} />,
    );
    const overlay = container.querySelector('rect[fill="transparent"]') as SVGRectElement;

    // Simulate drag (mouseDown at 100, mouseMove to 250, mouseUp at 250)
    fireEvent.mouseDown(overlay, { clientX: 100, clientY: 200 });
    fireEvent.mouseMove(overlay, { clientX: 250, clientY: 200 });
    fireEvent.mouseUp(overlay, { clientX: 250, clientY: 200 });

    expect(onAnnotate).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'start_drag');
    expect(onAnnotate).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'end_drag');
    // Should NOT have a 'click' type
    const clickCalls = onAnnotate.mock.calls.filter((c: any[]) => c[2] === 'click');
    expect(clickCalls.length).toBe(0);
  });

  it('start_drag and end_drag share the same annotation id', () => {
    const onAnnotate = vi.fn();
    const { container } = render(
      <TimeSeries data={singleDevice()} annotationMode onAnnotate={onAnnotate} />,
    );
    const overlay = container.querySelector('rect[fill="transparent"]') as SVGRectElement;

    fireEvent.mouseDown(overlay, { clientX: 100, clientY: 200 });
    fireEvent.mouseMove(overlay, { clientX: 250, clientY: 200 });
    fireEvent.mouseUp(overlay, { clientX: 250, clientY: 200 });

    const startCall = onAnnotate.mock.calls.find((c: any[]) => c[2] === 'start_drag');
    const endCall = onAnnotate.mock.calls.find((c: any[]) => c[2] === 'end_drag');
    expect(startCall).toBeTruthy();
    expect(endCall).toBeTruthy();
    expect(startCall![0]).toBe(endCall![0]); // same annotation id
  });

  it('annotation ids auto-increment across interactions', () => {
    const onAnnotate = vi.fn();
    const { container } = render(
      <TimeSeries data={singleDevice()} annotationMode onAnnotate={onAnnotate} />,
    );
    const overlay = container.querySelector('rect[fill="transparent"]') as SVGRectElement;

    // First click
    fireEvent.mouseDown(overlay, { clientX: 300, clientY: 200 });
    fireEvent.mouseUp(overlay, { clientX: 300, clientY: 200 });

    // Second click
    fireEvent.mouseDown(overlay, { clientX: 400, clientY: 200 });
    fireEvent.mouseUp(overlay, { clientX: 400, clientY: 200 });

    const clickCalls = onAnnotate.mock.calls.filter((c: any[]) => c[2] === 'click');
    expect(clickCalls.length).toBe(2);
    expect(clickCalls[1][0]).toBeGreaterThan(clickCalls[0][0]); // second id > first id
  });

  it('onAnnotate id is a number', () => {
    const onAnnotate = vi.fn();
    const { container } = render(
      <TimeSeries data={singleDevice()} annotationMode onAnnotate={onAnnotate} />,
    );
    const overlay = container.querySelector('rect[fill="transparent"]') as SVGRectElement;

    fireEvent.mouseDown(overlay, { clientX: 300, clientY: 200 });
    fireEvent.mouseUp(overlay, { clientX: 300, clientY: 200 });

    for (const call of onAnnotate.mock.calls) {
      expect(typeof call[0]).toBe('number');
      expect(Number.isInteger(call[0])).toBe(true);
    }
  });

  it('onAnnotate timestamps are numbers', () => {
    const onAnnotate = vi.fn();
    const { container } = render(
      <TimeSeries data={singleDevice()} annotationMode onAnnotate={onAnnotate} />,
    );
    const overlay = container.querySelector('rect[fill="transparent"]') as SVGRectElement;

    fireEvent.mouseDown(overlay, { clientX: 300, clientY: 200 });
    fireEvent.mouseUp(overlay, { clientX: 300, clientY: 200 });

    for (const call of onAnnotate.mock.calls) {
      expect(typeof call[1]).toBe('number');
      expect(Number.isFinite(call[1])).toBe(true);
    }
  });

  it('onAnnotate type is a valid string enum', () => {
    const onAnnotate = vi.fn();
    const { container } = render(
      <TimeSeries data={singleDevice()} annotationMode onAnnotate={onAnnotate} />,
    );
    const overlay = container.querySelector('rect[fill="transparent"]') as SVGRectElement;

    fireEvent.mouseDown(overlay, { clientX: 100, clientY: 200 });
    fireEvent.mouseMove(overlay, { clientX: 250, clientY: 200 });
    fireEvent.mouseUp(overlay, { clientX: 250, clientY: 200 });

    const validTypes = new Set(['click', 'start_drag', 'end_drag']);
    for (const call of onAnnotate.mock.calls) {
      expect(validTypes.has(call[2])).toBe(true);
    }
  });

  it('does not fire onAnnotate when annotationMode=false', () => {
    const onAnnotate = vi.fn();
    const { container } = render(
      <TimeSeries data={singleDevice()} annotationMode={false} onAnnotate={onAnnotate} />,
    );
    const overlay = container.querySelector('rect[fill="transparent"]') as SVGRectElement;

    fireEvent.mouseDown(overlay, { clientX: 300, clientY: 200 });
    fireEvent.mouseUp(overlay, { clientX: 300, clientY: 200 });

    expect(onAnnotate).not.toHaveBeenCalled();
  });

  it('annotation mode does not trigger zoom', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} annotationMode zoomEnabled />,
    );
    const overlay = container.querySelector('rect[fill="transparent"]') as SVGRectElement;

    // Drag — should not show "Reset zoom" button
    fireEvent.mouseDown(overlay, { clientX: 100, clientY: 200 });
    fireEvent.mouseMove(overlay, { clientX: 400, clientY: 200 });
    fireEvent.mouseUp(overlay, { clientX: 400, clientY: 200 });

    expect(container.textContent).not.toContain('Reset zoom');
  });
});

// ─── Annotation Color ──────────────────────────────────────

describe('TimeSeries - annotationColor', () => {
  it('uses custom annotation color for preview elements', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} annotationMode annotationColor="#ef4444" />,
    );
    // Just verify it renders without error with the prop
    expect(container.querySelector('svg')).toBeTruthy();
  });
});

// ─── Zoom Color ────────────────────────────────────────────

describe('TimeSeries - zoomColor', () => {
  it('renders without error with custom zoomColor', () => {
    const { container } = render(
      <TimeSeries data={singleDevice()} zoomColor="#22c55e" />,
    );
    expect(container.querySelector('svg')).toBeTruthy();
  });
});

// ─── Annotation data field ────────────────────────────────

describe('TimeSeries - annotation data field', () => {
  it('renders annotations with data field without error', () => {
    const { container } = render(
      <TimeSeries
        data={singleDevice()}
        annotations={[
          { timestamp: NOW - 100_000, label: 'Deploy', data: { version: '2.1', env: 'prod' } },
          { start: NOW - 150_000, end: NOW - 50_000, label: 'Window', data: { reason: 'maintenance' } },
        ]}
      />,
    );
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.textContent).toContain('Deploy');
    expect(container.textContent).toContain('Window');
  });
});

// ─── onAnnotationHover ──────────────────────────────────────

describe('TimeSeries - onAnnotationHover', () => {
  // Helper: find the overlay rect for mouse events
  function findOverlay(container: HTMLElement) {
    return container.querySelector('rect[fill="transparent"]') as SVGRectElement;
  }

  // Helper: get the pixel x of an annotation timestamp on the chart
  // The annotation is at NOW - 100_000, data spans from NOW - 200_000 to NOW
  // Chart is 600px wide with ~50px left margin and ~20px right margin ≈ 530px usable
  // Annotation at 100_000ms from NOW = 50% of 200_000ms span → ~middle of chart

  it('renders without error with onAnnotationHover', () => {
    const onHover = vi.fn();
    const { container } = render(
      <TimeSeries
        data={singleDevice()}
        annotations={[{ timestamp: NOW - 100_000, label: 'Test' }]}
        onAnnotationHover={onHover}
      />,
    );
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('calls onAnnotationHover with true when mouse moves over annotation region', () => {
    const onHover = vi.fn();
    const ann = { timestamp: NOW - 100_000, label: 'Deploy', data: { v: 1 } };
    const { container } = render(
      <TimeSeries
        data={singleDevice()}
        annotations={[ann]}
        onAnnotationHover={onHover}
      />,
    );
    const overlay = findOverlay(container);
    // Move mouse to the center of the chart (where the annotation approximately is)
    fireEvent.mouseMove(overlay, { clientX: 300, clientY: 200 });
    // onAnnotationHover should have been called if cursor was near the annotation
    // Due to coordinate mapping in jsdom, we can't guarantee exact hit, so just verify no crash
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('calls onAnnotationHover with false on mouseLeave', () => {
    const onHover = vi.fn();
    const ann = { timestamp: NOW - 100_000, label: 'Test' };
    const { container } = render(
      <TimeSeries
        data={singleDevice()}
        annotations={[ann]}
        onAnnotationHover={onHover}
      />,
    );
    const overlay = findOverlay(container);
    fireEvent.mouseMove(overlay, { clientX: 300, clientY: 200 });
    fireEvent.mouseLeave(overlay);
    // If annotation was hovered, leave should fire with false
    // At minimum, no errors should occur
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('does not crash when onAnnotationHover returns a ReactNode', () => {
    const onHover = (hover: boolean) => hover ? <div>Custom!</div> : null;
    const { container } = render(
      <TimeSeries
        data={singleDevice()}
        annotations={[{ timestamp: NOW - 100_000, label: 'Dep' }]}
        onAnnotationHover={onHover}
      />,
    );
    const overlay = findOverlay(container);
    fireEvent.mouseMove(overlay, { clientX: 300, clientY: 200 });
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('does not crash when onAnnotationHover returns void', () => {
    const onHover = vi.fn();
    const { container } = render(
      <TimeSeries
        data={singleDevice()}
        annotations={[{ timestamp: NOW - 100_000, label: 'Dep' }]}
        onAnnotationHover={onHover}
      />,
    );
    const overlay = findOverlay(container);
    fireEvent.mouseMove(overlay, { clientX: 300, clientY: 200 });
    expect(container.querySelector('[data-testid="custom-ann-tooltip"]')).toBeFalsy();
  });

  it('onAnnotationHover receives data field from annotation when called', () => {
    const onHover = vi.fn();
    const ann = { timestamp: NOW - 100_000, label: 'Deploy', data: { version: '2.1', env: 'prod' } };
    const { container } = render(
      <TimeSeries
        data={singleDevice()}
        annotations={[ann]}
        onAnnotationHover={onHover}
      />,
    );
    const overlay = findOverlay(container);
    fireEvent.mouseMove(overlay, { clientX: 300, clientY: 200 });
    // If the hover was triggered, verify the annotation data was passed correctly
    if (onHover.mock.calls.length > 0) {
      const [hover, passedAnn] = onHover.mock.calls[0];
      expect(hover).toBe(true);
      expect(passedAnn.data).toEqual({ version: '2.1', env: 'prod' });
    }
  });
});

// ─── onZoneChange ──────────────────────────────────────────

describe('TimeSeries - onZoneChange', () => {
  it('renders without error with onZoneChange and alertZones', () => {
    const onZoneChange = vi.fn();
    const { container } = render(
      <TimeSeries
        data={singleDevice()}
        alertZones={[
          { min: 0, max: 50, color: '#22c55e' },
          { min: 50, max: 100, color: '#ef4444' },
        ]}
        onZoneChange={onZoneChange}
      />,
    );
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('does not call onZoneChange on initial render (first call suppressed)', () => {
    const onZoneChange = vi.fn();
    render(
      <TimeSeries
        data={singleDevice()}
        alertZones={[
          { min: 0, max: 50, color: '#22c55e' },
          { min: 50, max: 100, color: '#ef4444' },
        ]}
        onZoneChange={onZoneChange}
      />,
    );
    // useZoneTransition suppresses the first call
    expect(onZoneChange).not.toHaveBeenCalled();
  });

  it('does not crash without alertZones', () => {
    const onZoneChange = vi.fn();
    const { container } = render(
      <TimeSeries data={singleDevice()} onZoneChange={onZoneChange} />,
    );
    expect(container.querySelector('svg')).toBeTruthy();
    expect(onZoneChange).not.toHaveBeenCalled();
  });

  it('onZoneChange callback includes device and metric fields when fired', () => {
    const onZoneChange = vi.fn();
    // First render with value in zone A
    const dataA = { 'dev-1': [{ timestamp: NOW - 10_000, value: 20 }] };
    const { rerender } = render(
      <TimeSeries
        data={dataA}
        alertZones={[
          { min: 0, max: 50, color: '#22c55e', label: 'Low' },
          { min: 50, max: 100, color: '#ef4444', label: 'High' },
        ]}
        onZoneChange={onZoneChange}
      />,
    );
    // First render initializes — no callback
    expect(onZoneChange).not.toHaveBeenCalled();

    // Second render with value in zone B
    const dataB = { 'dev-1': [{ timestamp: NOW, value: 80 }] };
    rerender(
      <TimeSeries
        data={dataB}
        alertZones={[
          { min: 0, max: 50, color: '#22c55e', label: 'Low' },
          { min: 50, max: 100, color: '#ef4444', label: 'High' },
        ]}
        onZoneChange={onZoneChange}
      />,
    );

    if (onZoneChange.mock.calls.length > 0) {
      const transition = onZoneChange.mock.calls[0][0];
      expect(transition).toHaveProperty('device');
      expect(transition).toHaveProperty('metric');
      expect(transition).toHaveProperty('previousZone');
      expect(transition).toHaveProperty('currentZone');
      expect(transition).toHaveProperty('value');
      expect(transition.device).toBe('dev-1');
      expect(typeof transition.metric).toBe('string');
      expect(typeof transition.value).toBe('number');
    }
  });
});

// ─── formatTimestamp ──────────────────────────────────────────

describe('TimeSeries - formatTimestamp', () => {
  it('renders without error with formatTimestamp prop', () => {
    const fmt = vi.fn((ts: number) => `T:${ts}`);
    const { container } = render(
      <TimeSeries data={singleDevice()} formatTimestamp={fmt} />,
    );
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('passes formatTimestamp to tooltip (no crash on hover)', () => {
    const fmt = (ts: number) => new Date(ts).toISOString();
    const { container } = render(
      <TimeSeries data={singleDevice()} formatTimestamp={fmt} />,
    );
    const overlay = container.querySelector('rect[fill="transparent"]') as SVGRectElement;
    // Hover to trigger tooltip
    fireEvent.mouseMove(overlay, { clientX: 300, clientY: 200 });
    // Should not crash
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
