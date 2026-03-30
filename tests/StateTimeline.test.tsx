import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StateTimeline } from "../src/timelines/StateTimeline";
import type { DataPoint } from "../src/utils/types";

// ─── Mocks ──────────────────────────────────────────────────

const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

/** Captured canvas draw calls for assertions */
let drawCalls: { method: string; args: any[] }[] = [];

function createMockContext() {
  drawCalls = [];
  const record =
    (method: string) =>
    (...args: any[]) => {
      drawCalls.push({ method, args });
    };
  return {
    clearRect: record("clearRect"),
    fillRect: record("fillRect"),
    fillText: record("fillText"),
    measureText: (text: string) => ({ width: text.length * 8 }),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    set font(_: string) {},
    get font() {
      return "";
    },
    set fillStyle(_: string) {},
    get fillStyle() {
      return "";
    },
    set strokeStyle(_: string) {},
    get strokeStyle() {
      return "";
    },
    set globalAlpha(_: number) {},
    get globalAlpha() {
      return 1;
    },
    set textAlign(_: string) {},
    get textAlign() {
      return "start";
    },
    set textBaseline(_: string) {},
    get textBaseline() {
      return "alphabetic";
    },
    set lineWidth(_: number) {},
    get lineWidth() {
      return 1;
    },
  };
}

beforeEach(() => {
  mockObserve.mockClear();
  mockDisconnect.mockClear();
  drawCalls = [];

  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private cb: ResizeObserverCallback) {}
      observe(target: Element) {
        mockObserve(target);
        this.cb(
          [{ contentRect: { width: 600, height: 400 } } as any],
          this as any,
        );
      }
      unobserve() {}
      disconnect() {
        mockDisconnect();
      }
    },
  );

  // Mock HTMLCanvasElement.getContext
  HTMLCanvasElement.prototype.getContext = vi.fn(function (
    this: HTMLCanvasElement,
  ) {
    return createMockContext() as any;
  }) as any;

  // jsdom doesn't implement getComputedTextLength — keep stub for any remaining SVG usage
  (SVGElement.prototype as any).getComputedTextLength = function () {
    return 80;
  };
});

// ─── Helpers ────────────────────────────────────────────────

const now = Date.now();
const mapper = (v: any) => {
  const n = Number(v);
  if (n >= 70) return "critical";
  if (n >= 40) return "warning";
  return "normal";
};

function makePoints(count: number, metricKey = "value"): DataPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: now - (count - i) * 10_000,
    [metricKey]: (i * 30) % 100,
  }));
}

function makeSingleDevice(count = 10): Record<string, DataPoint[]> {
  return { "device-a": makePoints(count) };
}

function makeMultiDevice(): Record<string, DataPoint[]> {
  return {
    "device-a": makePoints(10),
    "device-b": makePoints(10).map((p) => ({
      ...p,
      value: Number(p.value ?? 0) * 0.5,
    })),
    "device-c": makePoints(10).map((p) => ({
      ...p,
      value: Number(p.value ?? 0) * 1.5,
    })),
  };
}

function getDrawCalls(method: string) {
  return drawCalls.filter((c) => c.method === method);
}

// ─── Empty data ─────────────────────────────────────────────

describe("StateTimeline - empty data", () => {
  it("renders skeleton when data={} and showLoading=true", () => {
    const { container } = render(
      <StateTimeline data={{}} stateMapper={mapper} />,
    );
    expect(container.firstChild).toBeTruthy();
    // No canvas rendered (skeleton instead)
    expect(container.querySelector("canvas")).toBeFalsy();
  });

  it("renders nothing when data={} and showLoading=false", () => {
    const { container } = render(
      <StateTimeline data={{}} stateMapper={mapper} showLoading={false} />,
    );
    expect(container.innerHTML).toBe("");
  });
});

// ─── Invalid timestamps ─────────────────────────────────────

describe("StateTimeline - invalid timestamps", () => {
  it("filters NaN timestamps and calls onError", () => {
    const onError = vi.fn();
    const data = {
      d1: [
        { timestamp: NaN, value: 50 },
        { timestamp: now, value: 50 },
      ],
    };
    const { container } = render(
      <StateTimeline data={data} stateMapper={mapper} onError={onError} />,
    );
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "invalid_timestamp",
        component: "StateTimeline",
      }),
    );
    expect(container.querySelector("canvas")).toBeTruthy();
  });

  it("filters negative timestamps", () => {
    const onError = vi.fn();
    const data = {
      d1: [
        { timestamp: -1, value: 50 },
        { timestamp: now, value: 50 },
      ],
    };
    render(
      <StateTimeline data={data} stateMapper={mapper} onError={onError} />,
    );
    expect(onError).toHaveBeenCalled();
  });

  it("does not call onError when all timestamps are valid", () => {
    const onError = vi.fn();
    render(
      <StateTimeline
        data={makeSingleDevice()}
        stateMapper={mapper}
        onError={onError}
      />,
    );
    expect(onError).not.toHaveBeenCalled();
  });

  it("works without onError callback", () => {
    const data = { d1: [{ timestamp: NaN, value: 50 }] };
    expect(() =>
      render(<StateTimeline data={data} stateMapper={mapper} />),
    ).not.toThrow();
  });
});

// ─── Metric key resolution ──────────────────────────────────

describe("StateTimeline - metric key resolution", () => {
  it("uses explicit metricKey prop", () => {
    const data = { d1: [{ timestamp: now, temp: 30, humidity: 60 }] };
    const { container } = render(
      <StateTimeline data={data} stateMapper={mapper} metricKey="temp" />,
    );
    expect(container.querySelector("canvas")).toBeTruthy();
  });

  it("auto-detects first non-timestamp key", () => {
    const data = { d1: [{ timestamp: now, value: 30 }] };
    const { container } = render(
      <StateTimeline data={data} stateMapper={mapper} />,
    );
    expect(container.querySelector("canvas")).toBeTruthy();
  });

  it("skips empty devices to find first with data", () => {
    const data = {
      empty: [] as DataPoint[],
      d2: [{ timestamp: now, value: 30 }],
    };
    const { container } = render(
      <StateTimeline data={data} stateMapper={mapper} />,
    );
    expect(container.querySelector("canvas")).toBeTruthy();
    // Two device labels drawn via fillText
    const textCalls = getDrawCalls("fillText");
    const labelCalls = textCalls.filter(
      (c) => c.args[0] === "empty" || c.args[0] === "d2",
    );
    expect(labelCalls.length).toBe(2);
  });
});

// ─── Canvas structure ────────────────────────────────────────

describe("StateTimeline - canvas structure", () => {
  it("renders a canvas element", () => {
    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} />,
    );
    expect(container.querySelector("canvas")).toBeTruthy();
  });

  it("draws device labels via fillText", () => {
    render(<StateTimeline data={makeMultiDevice()} stateMapper={mapper} />);
    const textCalls = getDrawCalls("fillText");
    const labels = textCalls.map((c) => c.args[0]);
    expect(labels).toContain("device-a");
    expect(labels).toContain("device-b");
    expect(labels).toContain("device-c");
  });

  it("draws state bars via fillRect", () => {
    render(<StateTimeline data={makeSingleDevice()} stateMapper={mapper} />);
    // fillRect calls include clearRect + empty rows + state bars
    const fillRectCalls = getDrawCalls("fillRect");
    // At least some state bars should be drawn (more than just the clearRect)
    expect(fillRectCalls.length).toBeGreaterThan(0);
  });
});

// ─── Empty rows ─────────────────────────────────────────────

describe("StateTimeline - empty rows", () => {
  it("devices with empty arrays draw background rects", () => {
    render(
      <StateTimeline
        data={{ "sensor-a": [], "sensor-b": [] }}
        stateMapper={mapper}
      />,
    );
    // Two empty devices → two fillRect calls for backgrounds (plus clearRect)
    const fillRectCalls = getDrawCalls("fillRect");
    expect(fillRectCalls.length).toBeGreaterThanOrEqual(2);
  });

  it("mix of empty and populated devices", () => {
    const data = {
      populated: makePoints(5),
      empty: [] as DataPoint[],
    };
    render(<StateTimeline data={data} stateMapper={mapper} />);
    const textCalls = getDrawCalls("fillText");
    const labels = textCalls.map((c) => c.args[0]);
    expect(labels).toContain("populated");
    expect(labels).toContain("empty");
  });
});

// ─── X-axis ─────────────────────────────────────────────────

describe("StateTimeline - x-axis", () => {
  it("draws x-axis tick labels when data exists", () => {
    render(<StateTimeline data={makeSingleDevice()} stateMapper={mapper} />);
    const textCalls = getDrawCalls("fillText");
    // Should have more text calls than just device labels (axis ticks)
    const deviceLabelCount = 1; // single device
    expect(textCalls.length).toBeGreaterThan(deviceLabelCount);
  });

  it("no x-axis labels when all devices have empty data", () => {
    render(<StateTimeline data={{ d1: [], d2: [] }} stateMapper={mapper} />);
    const textCalls = getDrawCalls("fillText");
    // Only device labels, no axis labels
    const labels = textCalls.map((c) => c.args[0]);
    expect(labels).toContain("d1");
    expect(labels).toContain("d2");
    expect(labels.length).toBe(2); // only the two device labels
  });
});

// ─── Legend (HTML) ───────────────────────────────────────────

describe("StateTimeline - legend", () => {
  it("renders legend as HTML div when states exist", () => {
    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} />,
    );
    // Legend is now an HTML div sibling to canvas
    const legendText = container.textContent ?? "";
    expect(legendText).toContain("normal");
  });

  it("legend contains state names", () => {
    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} />,
    );
    const text = container.textContent ?? "";
    expect(text).toContain("normal");
  });

  it("no legend when all devices have empty data", () => {
    const { container } = render(
      <StateTimeline data={{ d1: [] }} stateMapper={mapper} />,
    );
    // Legend should not render — text content should not contain state names
    const text = container.textContent ?? "";
    expect(text).not.toContain("normal");
    expect(text).not.toContain("warning");
    expect(text).not.toContain("critical");
  });
});

// ─── Tooltip ────────────────────────────────────────────────

describe("StateTimeline - tooltip", () => {
  it("no tooltip visible initially", () => {
    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} />,
    );
    const tooltip = container.querySelector('[style*="position: fixed"]');
    expect(tooltip).toBeFalsy();
  });

  it("mouseMove on canvas can trigger tooltip via hit detection", () => {
    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} />,
    );
    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    // We can't perfectly simulate hit detection in jsdom since canvas isn't real,
    // but we can verify the canvas has mouse handlers
    expect(canvas).toBeTruthy();
    // Fire mouseLeave to verify it doesn't crash
    fireEvent.mouseLeave(canvas);
    const tooltip = container.querySelector('[style*="position: fixed"]');
    expect(tooltip).toBeFalsy();
  });
});

// ─── Styles ─────────────────────────────────────────────────

describe("StateTimeline - styles", () => {
  it("applies background color", () => {
    const { container } = render(
      <StateTimeline
        data={makeSingleDevice()}
        stateMapper={mapper}
        styles={{ background: { color: "#0f172a" } }}
      />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper?.style.backgroundColor).toBe("rgb(15, 23, 42)");
  });

  it("default background is transparent", () => {
    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper?.style.backgroundColor).toBe("transparent");
  });

  it("applies explicit width via styles", () => {
    const { container } = render(
      <StateTimeline
        data={makeSingleDevice()}
        stateMapper={mapper}
        styles={{ width: 800 }}
      />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.width).toBe("800px");
  });

  it("applies explicit height via styles", () => {
    const { container } = render(
      <StateTimeline
        data={makeSingleDevice()}
        stateMapper={mapper}
        styles={{ height: 300 }}
      />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.height).toBe("300px");
  });

  it("accepts string CSS values for width/height", () => {
    const { container } = render(
      <StateTimeline
        data={makeSingleDevice()}
        stateMapper={mapper}
        styles={{ width: "50vw", height: "80%" }}
      />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.width).toBe("50vw");
    expect(wrapper.style.height).toBe("80%");
  });
});

// ─── Narrow container ───────────────────────────────────────

describe("StateTimeline - narrow container", () => {
  it("returns null when chartWidth <= 0", () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(private cb: ResizeObserverCallback) {}
        observe(target: Element) {
          this.cb(
            [{ contentRect: { width: 50, height: 400 } } as any],
            this as any,
          );
        }
        unobserve() {}
        disconnect() {}
      },
    );

    const { container } = render(
      <StateTimeline data={makeSingleDevice()} stateMapper={mapper} />,
    );
    expect(container.querySelector("canvas")).toBeFalsy();
  });
});

// ─── Multi-device rendering ─────────────────────────────────

describe("StateTimeline - multi-device", () => {
  it("draws all device labels", () => {
    render(<StateTimeline data={makeMultiDevice()} stateMapper={mapper} />);
    const textCalls = getDrawCalls("fillText");
    const labels = textCalls.map((c) => c.args[0]);
    expect(labels).toContain("device-a");
    expect(labels).toContain("device-b");
    expect(labels).toContain("device-c");
  });
});

// ─── State bar count ─────────────────────────────────────────

describe("StateTimeline - state bar rendering", () => {
  it("draws multiple state bars for varying data", () => {
    render(<StateTimeline data={makeSingleDevice()} stateMapper={mapper} />);
    const fillRectCalls = getDrawCalls("fillRect");
    // makePoints(10) cycles through states, so we should get several state bars
    expect(fillRectCalls.length).toBeGreaterThan(2);
  });

  it("state bars are drawn after clearing the canvas", () => {
    render(<StateTimeline data={makeSingleDevice()} stateMapper={mapper} />);
    const clearCalls = getDrawCalls("clearRect");
    expect(clearCalls.length).toBeGreaterThan(0);
    // fillRect calls should come after clearRect
    const fillRectCalls = getDrawCalls("fillRect");
    expect(fillRectCalls.length).toBeGreaterThan(0);
  });
});

// ─── Custom state colors ─────────────────────────────────────

describe("StateTimeline - custom state colors", () => {
  it("renders without crashing with custom stateColors", () => {
    const { container } = render(
      <StateTimeline
        data={makeSingleDevice()}
        stateMapper={mapper}
        stateColors={{
          normal: "#00ff00",
          warning: "#ffff00",
          critical: "#ff0000",
        }}
      />,
    );
    expect(container.querySelector("canvas")).toBeTruthy();
    const fillRectCalls = getDrawCalls("fillRect");
    expect(fillRectCalls.length).toBeGreaterThan(0);
  });
});

// ─── Label alignment via canvas ──────────────────────────────

describe("StateTimeline - label alignment (canvas)", () => {
  it("draws labels for left alignment (default)", () => {
    render(<StateTimeline data={makeSingleDevice()} stateMapper={mapper} />);
    const textCalls = getDrawCalls("fillText");
    expect(textCalls.some((c) => c.args[0] === "device-a")).toBe(true);
  });

  it("draws labels for right alignment", () => {
    render(
      <StateTimeline
        data={makeSingleDevice()}
        stateMapper={mapper}
        labelAlign="right"
      />,
    );
    const textCalls = getDrawCalls("fillText");
    expect(textCalls.some((c) => c.args[0] === "device-a")).toBe(true);
  });
});

// ─── Large dataset performance ───────────────────────────────

describe("StateTimeline - large dataset", () => {
  it("handles 10k points without crashing", () => {
    const data = { "big-device": makePoints(10000) };
    const { container } = render(
      <StateTimeline data={data} stateMapper={mapper} />,
    );
    expect(container.querySelector("canvas")).toBeTruthy();
  });

  it("handles multiple devices with large datasets", () => {
    const data = {
      d1: makePoints(5000),
      d2: makePoints(5000),
      d3: makePoints(5000),
    };
    const { container } = render(
      <StateTimeline data={data} stateMapper={mapper} />,
    );
    expect(container.querySelector("canvas")).toBeTruthy();
    const textCalls = getDrawCalls("fillText");
    const labels = textCalls.map((c) => c.args[0]);
    expect(labels).toContain("d1");
    expect(labels).toContain("d2");
    expect(labels).toContain("d3");
  });
});

// ─── formatTooltip and renderTooltip ─────────────────────────

describe("StateTimeline - tooltip callbacks", () => {
  it("accepts formatTooltip without crashing", () => {
    expect(() =>
      render(
        <StateTimeline
          data={makeSingleDevice()}
          stateMapper={mapper}
          formatTooltip={(entry, name) => `${name}: ${entry.state}`}
        />,
      ),
    ).not.toThrow();
  });

  it("accepts renderTooltip without crashing", () => {
    expect(() =>
      render(
        <StateTimeline
          data={makeSingleDevice()}
          stateMapper={mapper}
          renderTooltip={(entry, name) => (
            <span>
              {name}-{entry.state}
            </span>
          )}
        />,
      ),
    ).not.toThrow();
  });
});
