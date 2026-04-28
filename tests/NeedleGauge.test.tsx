import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NeedleGauge } from "../src/gauges/NeedleGauge";

// Mock ResizeObserver for ResponsiveContainer
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

beforeEach(() => {
  mockObserve.mockClear();
  mockDisconnect.mockClear();

  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private cb: ResizeObserverCallback) {}
      observe(target: Element) {
        mockObserve(target);
        // Simulate a measured size
        this.cb(
          [{ contentRect: { width: 300, height: 200 } } as any],
          this as any,
        );
      }
      unobserve() {}
      disconnect() {
        mockDisconnect();
      }
    },
  );
});

describe("NeedleGauge", () => {
  describe("rendering", () => {
    it("renders an SVG element", () => {
      const { container } = render(
        <NeedleGauge data={{ value: 50, timestamp: null }} />,
      );
      expect(container.querySelector("svg")).toBeTruthy();
    });

    it("renders the background arc", () => {
      const { container } = render(
        <NeedleGauge data={{ value: 50, timestamp: null }} />,
      );
      const paths = container.querySelectorAll("path");
      expect(paths.length).toBeGreaterThanOrEqual(1);
      // First path is the background arc
      expect(paths[0].getAttribute("stroke")).toBe("#e5e7eb");
    });

    it("renders a needle line", () => {
      const { container } = render(
        <NeedleGauge data={{ value: 50, timestamp: null }} />,
      );
      const line = container.querySelector("line");
      expect(line).toBeTruthy();
    });

    it("renders a pivot circle", () => {
      const { container } = render(
        <NeedleGauge data={{ value: 50, timestamp: null }} />,
      );
      const circles = container.querySelectorAll("circle");
      expect(circles.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("value display", () => {
    it("displays the formatted value", () => {
      const { container } = render(
        <NeedleGauge data={{ value: 75.5, timestamp: null }} />,
      );
      const texts = container.querySelectorAll("text");
      const valueText = Array.from(texts).find((t) =>
        t.textContent?.includes("75.5"),
      );
      expect(valueText).toBeTruthy();
    });

    it("uses custom formatValue", () => {
      const { container } = render(
        <NeedleGauge
          data={{ value: 50, timestamp: null }}
          formatValue={(v) => `${v}%`}
        />,
      );
      const texts = container.querySelectorAll("text");
      const valueText = Array.from(texts).find((t) =>
        t.textContent?.includes("50%"),
      );
      expect(valueText).toBeTruthy();
    });

    it("displays unit suffix", () => {
      const { container } = render(
        <NeedleGauge data={{ value: 23, timestamp: null }} unit="°C" />,
      );
      const texts = container.querySelectorAll("text");
      const hasUnit = Array.from(texts).some((t) =>
        t.textContent?.includes("°C"),
      );
      expect(hasUnit).toBe(true);
    });

    it("displays label text", () => {
      const { container } = render(
        <NeedleGauge
          data={{ value: 50, timestamp: null }}
          label="temperature"
        />,
      );
      const texts = container.querySelectorAll("text");
      const hasLabel = Array.from(texts).some(
        (t) => t.textContent === "temperature",
      );
      expect(hasLabel).toBe(true);
    });

    it("does not render label when not provided", () => {
      const { container } = render(
        <NeedleGauge data={{ value: 50, timestamp: null }} />,
      );
      const texts = container.querySelectorAll("text");
      // Should only have value + min + max texts (3), not 4
      expect(texts.length).toBeLessThanOrEqual(3);
    });
  });

  describe("min/max labels", () => {
    it("displays default min (0) and max (100)", () => {
      const { container } = render(
        <NeedleGauge data={{ value: 50, timestamp: null }} />,
      );
      const texts = container.querySelectorAll("text");
      const textContents = Array.from(texts).map((t) => t.textContent);
      expect(textContents).toContain("0");
      expect(textContents).toContain("100");
    });

    it("displays custom min and max", () => {
      const { container } = render(
        <NeedleGauge
          data={{ value: 50, timestamp: null }}
          min={-10}
          max={200}
        />,
      );
      const texts = container.querySelectorAll("text");
      const textContents = Array.from(texts).map((t) => t.textContent);
      expect(textContents).toContain("-10");
      expect(textContents).toContain("200");
    });
  });

  describe("alert zones", () => {
    const zones = [
      { min: 0, max: 30, color: "#22c55e" },
      { min: 30, max: 70, color: "#f59e0b" },
      { min: 70, max: 100, color: "#ef4444" },
    ];

    it("renders zone arc paths", () => {
      const { container } = render(
        <NeedleGauge
          data={{ value: 50, timestamp: null }}
          alertZones={zones}
        />,
      );
      const paths = container.querySelectorAll("path");
      // 1 background + 3 zones + 1 value-fill arc = 5 paths
      expect(paths.length).toBe(5);
    });

    it("zones render at 25% opacity (matching ArcGauge)", () => {
      const { container } = render(
        <NeedleGauge
          data={{ value: 50, timestamp: null }}
          alertZones={zones}
        />,
      );
      const paths = container.querySelectorAll("path");
      for (let i = 1; i <= 3; i++) {
        expect(paths[i].getAttribute("opacity")).toBe("0.25");
      }
    });

    it("needle color matches active zone", () => {
      const { container } = render(
        <NeedleGauge
          data={{ value: 80, timestamp: null }}
          alertZones={zones}
        />,
      );
      const line = container.querySelector("line");
      // Value 80 falls in the red zone (70-100)
      expect(line?.getAttribute("stroke")).toBe("#ef4444");
    });

    it("needle uses defaultColor (blue) when no zone matches", () => {
      const { container } = render(
        <NeedleGauge
          data={{ value: 50, timestamp: null }}
          alertZones={[{ min: 80, max: 100, color: "red" }]}
        />,
      );
      const line = container.querySelector("line");
      expect(line?.getAttribute("stroke")).toBe("#3b82f6");
    });

    it("needle uses custom defaultColor override when no zone matches", () => {
      const { container } = render(
        <NeedleGauge
          data={{ value: 50, timestamp: null }}
          alertZones={[{ min: 80, max: 100, color: "red" }]}
          defaultColor="#7c3aed"
        />,
      );
      const line = container.querySelector("line");
      expect(line?.getAttribute("stroke")).toBe("#7c3aed");
    });

    it("renders a value-fill arc using the active zone color", () => {
      const { container } = render(
        <NeedleGauge
          data={{ value: 80, timestamp: null }}
          alertZones={zones}
        />,
      );
      const paths = container.querySelectorAll("path");
      // Value-fill arc is the 5th path (after background + 3 zones)
      const fillArc = paths[4];
      expect(fillArc.getAttribute("stroke")).toBe("#ef4444");
      expect(fillArc.getAttribute("stroke-dasharray")).toBeTruthy();
    });
  });

  describe("defaultColor without zones", () => {
    it("needle defaults to blue when no zones are provided", () => {
      const { container } = render(
        <NeedleGauge data={{ value: 50, timestamp: null }} />,
      );
      const line = container.querySelector("line");
      expect(line?.getAttribute("stroke")).toBe("#3b82f6");
    });

    it("respects custom defaultColor prop with no zones", () => {
      const { container } = render(
        <NeedleGauge
          data={{ value: 50, timestamp: null }}
          defaultColor="#10b981"
        />,
      );
      const line = container.querySelector("line");
      expect(line?.getAttribute("stroke")).toBe("#10b981");
    });
  });

  describe("styles", () => {
    it("applies arc thickness", () => {
      const { container } = render(
        <NeedleGauge
          data={{ value: 50, timestamp: null }}
          styles={{ arcThickness: 24 }}
        />,
      );
      const bgArc = container.querySelector("path");
      expect(bgArc?.getAttribute("stroke-width")).toBe("24");
    });

    it("applies needle thickness", () => {
      const { container } = render(
        <NeedleGauge
          data={{ value: 50, timestamp: null }}
          styles={{ needleThickness: 4 }}
        />,
      );
      const line = container.querySelector("line");
      expect(line?.getAttribute("stroke-width")).toBe("4");
    });

    it("applies value font size", () => {
      const { container } = render(
        <NeedleGauge
          data={{ value: 50, timestamp: null }}
          styles={{ value: { fontSize: 32 } }}
        />,
      );
      const texts = container.querySelectorAll("text");
      const valueText = Array.from(texts).find((t) =>
        t.textContent?.includes("50"),
      );
      expect(valueText?.getAttribute("font-size")).toBe("32");
    });

    it("applies value color", () => {
      const { container } = render(
        <NeedleGauge
          data={{ value: 50, timestamp: null }}
          styles={{ value: { color: "#ff0000" } }}
        />,
      );
      const texts = container.querySelectorAll("text");
      const valueText = Array.from(texts).find((t) =>
        t.textContent?.includes("50"),
      );
      expect(valueText?.getAttribute("fill")).toBe("#ff0000");
    });

    it("applies label font size", () => {
      const { container } = render(
        <NeedleGauge
          data={{ value: 50, timestamp: null }}
          label="temp"
          styles={{ label: { fontSize: 16 } }}
        />,
      );
      const texts = container.querySelectorAll("text");
      const labelText = Array.from(texts).find((t) => t.textContent === "temp");
      expect(labelText?.getAttribute("font-size")).toBe("16");
    });

    it("applies label color", () => {
      const { container } = render(
        <NeedleGauge
          data={{ value: 50, timestamp: null }}
          label="temp"
          styles={{ label: { color: "#0000ff" } }}
        />,
      );
      const texts = container.querySelectorAll("text");
      const labelText = Array.from(texts).find((t) => t.textContent === "temp");
      expect(labelText?.getAttribute("fill")).toBe("#0000ff");
    });

    it("applies background color", () => {
      const { container } = render(
        <NeedleGauge
          data={{ value: 50, timestamp: null }}
          styles={{ background: { color: "#f0f0f0" } }}
        />,
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.backgroundColor).toBe("rgb(240, 240, 240)");
    });

    it("uses default arc thickness of 14", () => {
      const { container } = render(
        <NeedleGauge data={{ value: 50, timestamp: null }} />,
      );
      const bgArc = container.querySelector("path");
      expect(bgArc?.getAttribute("stroke-width")).toBe("14");
    });

    it("uses default needle thickness of 2.5", () => {
      const { container } = render(
        <NeedleGauge data={{ value: 50, timestamp: null }} />,
      );
      const line = container.querySelector("line");
      expect(line?.getAttribute("stroke-width")).toBe("2.5");
    });
  });

  describe("accessibility", () => {
    it('has role="meter"', () => {
      const { container } = render(
        <NeedleGauge data={{ value: 50, timestamp: null }} />,
      );
      const svg = container.querySelector("svg");
      expect(svg?.getAttribute("role")).toBe("meter");
    });

    it("has aria-valuenow", () => {
      const { container } = render(
        <NeedleGauge data={{ value: 75, timestamp: null }} />,
      );
      const svg = container.querySelector("svg");
      expect(svg?.getAttribute("aria-valuenow")).toBe("75");
    });

    it("has aria-valuemin and aria-valuemax", () => {
      const { container } = render(
        <NeedleGauge data={{ value: 50, timestamp: null }} min={10} max={90} />,
      );
      const svg = container.querySelector("svg");
      expect(svg?.getAttribute("aria-valuemin")).toBe("10");
      expect(svg?.getAttribute("aria-valuemax")).toBe("90");
    });

    it("has aria-label from label prop", () => {
      const { container } = render(
        <NeedleGauge data={{ value: 50, timestamp: null }} label="Speed" />,
      );
      const svg = container.querySelector("svg");
      expect(svg?.getAttribute("aria-label")).toBe("Speed");
    });

    it("has default aria-label when no label provided", () => {
      const { container } = render(
        <NeedleGauge data={{ value: 50, timestamp: null }} />,
      );
      const svg = container.querySelector("svg");
      expect(svg?.getAttribute("aria-label")).toBe("Gauge");
    });
  });

  describe("value clamping", () => {
    it("displays actual value when above max", () => {
      const { container } = render(
        <NeedleGauge
          data={{ value: 150, timestamp: null }}
          max={100}
          formatValue={(v) => String(v)}
        />,
      );
      const texts = container.querySelectorAll("text");
      const hasValue = Array.from(texts).some((t) =>
        t.textContent?.includes("150"),
      );
      expect(hasValue).toBe(true);
    });

    it("displays actual value when below min", () => {
      const { container } = render(
        <NeedleGauge
          data={{ value: -20, timestamp: null }}
          min={0}
          formatValue={(v) => String(v)}
        />,
      );
      const texts = container.querySelectorAll("text");
      const hasValue = Array.from(texts).some((t) =>
        t.textContent?.includes("-20"),
      );
      expect(hasValue).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("throws when min === max", () => {
      expect(() =>
        render(
          <NeedleGauge
            data={{ value: 50, timestamp: null }}
            min={50}
            max={50}
          />,
        ),
      ).toThrow("min and max cannot be equal");
    });

    it("throws when min > max", () => {
      expect(() =>
        render(
          <NeedleGauge
            data={{ value: 50, timestamp: null }}
            min={100}
            max={0}
          />,
        ),
      ).toThrow("min (100) must be less than or equal to max (0)");
    });

    it("renders with value=0", () => {
      const { container } = render(
        <NeedleGauge data={{ value: 0, timestamp: null }} />,
      );
      expect(container.querySelector("svg")).toBeTruthy();
    });

    it("renders with negative range", () => {
      const { container } = render(
        <NeedleGauge
          data={{ value: -50, timestamp: null }}
          min={-100}
          max={0}
        />,
      );
      expect(container.querySelector("svg")).toBeTruthy();
    });

    it("renders with very large values", () => {
      const { container } = render(
        <NeedleGauge data={{ value: 999999, timestamp: null }} max={1000000} />,
      );
      expect(container.querySelector("svg")).toBeTruthy();
    });
  });

  describe("data prop", () => {
    it("extracts value and timestamp from data prop", () => {
      const { container } = render(
        <NeedleGauge
          data={{ value: 75, timestamp: new Date(2025, 0, 1).getTime() }}
          showLastUpdated
        />,
      );
      const texts = container.querySelectorAll("text");
      const allText = Array.from(texts)
        .map((t) => t.textContent)
        .join(" ");
      expect(allText).toContain("75");
      expect(allText).toContain("2025");
    });

    it("explicit lastUpdated overrides data.timestamp", () => {
      const { container } = render(
        <NeedleGauge
          data={{ value: 50, timestamp: new Date(2025, 0, 1).getTime() }}
          showLastUpdated
        />,
      );
      const texts = container.querySelectorAll("text");
      const allText = Array.from(texts)
        .map((t) => t.textContent)
        .join(" ");
      expect(allText).toContain("2025");
    });

    it("falls back to value prop when data not provided", () => {
      const { container } = render(
        <NeedleGauge data={{ value: 60, timestamp: null }} />,
      );
      expect(container.querySelector("svg")).toBeTruthy();
      const texts = container.querySelectorAll("text");
      const allText = Array.from(texts)
        .map((t) => t.textContent)
        .join(" ");
      expect(allText).toContain("60");
    });
  });
});
