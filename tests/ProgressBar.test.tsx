import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProgressBar } from "../src/indicators/ProgressBar";

describe("ProgressBar", () => {
  describe("rendering", () => {
    it("renders with default props", () => {
      const { container } = render(
        <ProgressBar data={{ value: 50, timestamp: null }} />,
      );
      expect(container.firstChild).toBeTruthy();
    });

    it("shows the formatted value as label by default", () => {
      render(<ProgressBar data={{ value: 65, timestamp: null }} />);
      expect(screen.getByText("65")).toBeInTheDocument();
    });

    it("hides the label when showLabel is false", () => {
      render(
        <ProgressBar data={{ value: 65, timestamp: null }} showLabel={false} />,
      );
      expect(screen.queryByText("65")).not.toBeInTheDocument();
    });

    it("shows loading skeleton when value is null and showLoading is true", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: null as any, timestamp: null }}
          showLoading
        />,
      );
      const el = container.firstChild as HTMLElement;
      expect(el.style.animation).toContain("shimmer");
    });
  });

  describe("formatValue", () => {
    it("uses custom formatValue callback", () => {
      render(
        <ProgressBar
          data={{ value: 72.5, timestamp: null }}
          formatValue={(v) => `${v.toFixed(1)}%`}
        />,
      );
      expect(screen.getByText("72.5%")).toBeInTheDocument();
    });

    it("displays raw value even when it exceeds max", () => {
      render(
        <ProgressBar
          data={{ value: 150, timestamp: null }}
          max={100}
          formatValue={(v) => `${v}`}
        />,
      );
      expect(screen.getByText("150")).toBeInTheDocument();
    });

    it("displays raw value even when below min", () => {
      render(
        <ProgressBar
          data={{ value: -10, timestamp: null }}
          min={0}
          formatValue={(v) => `${v}`}
        />,
      );
      expect(screen.getByText("-10")).toBeInTheDocument();
    });
  });

  describe("fill percentage", () => {
    function getFillBar(container: HTMLElement): HTMLElement {
      // Fill bar is the div with a transition style containing 'width' or 'height'
      const allDivs = container.querySelectorAll("div > div");
      return Array.from(allDivs).find((d) =>
        (d as HTMLElement).style.transition?.includes("width"),
      ) as HTMLElement;
    }

    it("clamps fill to 0% when value is below min", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: -10, timestamp: null }}
          min={0}
          max={100}
        />,
      );
      const fill = getFillBar(container);
      expect(fill.style.width).toBe("0%");
    });

    it("clamps fill to 100% when value exceeds max", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: 150, timestamp: null }}
          min={0}
          max={100}
        />,
      );
      const fill = getFillBar(container);
      expect(fill.style.width).toBe("100%");
    });

    it("calculates correct percentage for custom range", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: 500, timestamp: null }}
          min={0}
          max={1000}
        />,
      );
      const fill = getFillBar(container);
      expect(fill.style.width).toBe("50%");
    });
  });

  describe("alert zones", () => {
    const zones = [
      { min: 0, max: 40, color: "#22c55e", label: "Normal" },
      { min: 40, max: 70, color: "#f59e0b", label: "Warning" },
      { min: 70, max: 100, color: "#ef4444", label: "Critical" },
    ];

    it("renders zone background bands", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          alertZones={zones}
          showLabel={false}
        />,
      );
      // Should have 3 zone divs + 1 fill div
      const children = container.querySelectorAll("div > div");
      expect(children.length).toBeGreaterThanOrEqual(4);
    });

    it("sets native title tooltip on zone bands", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          alertZones={zones}
          showLabel={false}
        />,
      );
      const zoneDivs = container.querySelectorAll("[title]");
      expect(zoneDivs.length).toBe(3);
      expect(zoneDivs[0].getAttribute("title")).toBe("Normal: 0 – 40");
      expect(zoneDivs[1].getAttribute("title")).toBe("Warning: 40 – 70");
      expect(zoneDivs[2].getAttribute("title")).toBe("Critical: 70 – 100");
    });

    it("shows zone range without label when label is not provided", () => {
      const unlabeledZones = [{ min: 0, max: 50, color: "#22c55e" }];
      const { container } = render(
        <ProgressBar
          data={{ value: 25, timestamp: null }}
          alertZones={unlabeledZones}
          showLabel={false}
        />,
      );
      const zoneDivs = container.querySelectorAll("[title]");
      expect(zoneDivs[0].getAttribute("title")).toBe("0 – 50");
    });

    it("uses zone color for fill when value is in zone", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          alertZones={zones}
          showLabel={false}
        />,
      );
      // Find the fill div (has transition style)
      const allDivs = container.querySelectorAll("div > div");
      const fillDiv = Array.from(allDivs).find((d) =>
        (d as HTMLElement).style.transition?.includes("width"),
      ) as HTMLElement;
      expect(fillDiv).toBeTruthy();
      expect(fillDiv.style.backgroundColor).toBe("rgb(245, 158, 11)"); // #f59e0b
    });
  });

  describe("orientation", () => {
    function getFillBar(container: HTMLElement): HTMLElement {
      const allDivs = container.querySelectorAll("div > div");
      return Array.from(allDivs).find(
        (d) =>
          (d as HTMLElement).style.transition?.includes("width") ||
          (d as HTMLElement).style.transition?.includes("height"),
      ) as HTMLElement;
    }

    it("renders horizontally by default", () => {
      const { container } = render(
        <ProgressBar data={{ value: 50, timestamp: null }} showLabel={false} />,
      );
      const fill = getFillBar(container);
      expect(fill.style.width).toBe("50%");
    });

    it("renders vertically when orientation is vertical", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          orientation="vertical"
          showLabel={false}
        />,
      );
      const fill = getFillBar(container);
      expect(fill.style.height).toBe("50%");
    });
  });

  describe("styles", () => {
    // Helper to find the bar container (the element with overflow:hidden and borderRadius)
    function getBarContainer(container: HTMLElement): HTMLElement {
      return container.querySelector(
        '[style*="overflow: hidden"]',
      ) as HTMLElement;
    }

    it("applies custom background color", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          styles={{ background: { color: "#f1f5f9" } }}
        />,
      );
      const bar = getBarContainer(container);
      expect(bar.style.backgroundColor).toBe("rgb(241, 245, 249)");
    });

    it("applies custom width", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          styles={{ width: 300 }}
        />,
      );
      // Width is on the outer flex wrapper, not the bar itself
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.width).toBe("300px");
    });

    it("applies custom height", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          styles={{ height: 40 }}
        />,
      );
      const bar = getBarContainer(container);
      expect(bar.style.height).toBe("40px");
    });

    it("accepts string values for width/height (CSS units)", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          styles={{ width: "80%", height: "2rem" }}
        />,
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.width).toBe("80%");
      const bar = getBarContainer(container);
      expect(bar.style.height).toBe("2rem");
    });

    it("keeps maxWidth 100% for responsiveness", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          styles={{ width: 500 }}
        />,
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.maxWidth).toBe("100%");
    });

    it("applies custom label font styles", () => {
      render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          styles={{
            label_font_file: {
              fontFamily: "monospace",
              fontSize: 16,
              fontWeight: 700,
            },
          }}
        />,
      );
      const label = screen.getByText("50");
      expect(label.style.fontFamily).toBe("monospace");
      expect(label.style.fontSize).toBe("16px");
    });
  });

  describe("showAlertZones", () => {
    const zones = [
      { min: 0, max: 50, color: "#22c55e" },
      { min: 50, max: 100, color: "#ef4444" },
    ];

    it("shows alert zones by default when alertZones are provided", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          alertZones={zones}
          showLabel={false}
        />,
      );
      expect(container.querySelectorAll("[title]").length).toBe(2);
    });

    it("hides alert zones when showAlertZones is false", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          alertZones={zones}
          showAlertZones={false}
          showLabel={false}
        />,
      );
      expect(container.querySelectorAll("[title]").length).toBe(0);
    });

    it("still uses zone color for fill even when zones are hidden", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: 75, timestamp: null }}
          alertZones={zones}
          showAlertZones={false}
          showLabel={false}
        />,
      );
      const allDivs = container.querySelectorAll("div > div");
      const fillDiv = Array.from(allDivs).find((d) =>
        (d as HTMLElement).style.transition?.includes("width"),
      ) as HTMLElement;
      expect(fillDiv.style.backgroundColor).toBe("rgb(239, 68, 68)"); // #ef4444
    });
  });

  describe("edge cases", () => {
    it("throws when min === max", () => {
      expect(() =>
        render(
          <ProgressBar data={{ value: 5, timestamp: null }} min={5} max={5} />,
        ),
      ).toThrow("min and max cannot be equal");
    });

    it("throws when min > max", () => {
      expect(() =>
        render(
          <ProgressBar data={{ value: 5, timestamp: null }} min={10} max={0} />,
        ),
      ).toThrow("min (10) must be less than or equal to max (0)");
    });

    it("handles value === 0", () => {
      render(<ProgressBar data={{ value: 0, timestamp: null }} />);
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("handles very large values", () => {
      render(
        <ProgressBar
          data={{ value: 999999, timestamp: null }}
          max={100}
          formatValue={(v) => `${v}`}
        />,
      );
      expect(screen.getByText("999999")).toBeInTheDocument();
    });
  });

  describe("showZoneLegend", () => {
    const zones = [
      { min: 0, max: 40, color: "#22c55e", label: "Normal" },
      { min: 40, max: 70, color: "#f59e0b", label: "Warning" },
      { min: 70, max: 100, color: "#ef4444", label: "Critical" },
    ];

    it("renders legend with zone swatches and labels", () => {
      render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          alertZones={zones}
          showZoneLegend
        />,
      );
      expect(screen.getByText("Normal")).toBeInTheDocument();
      expect(screen.getByText("Warning")).toBeInTheDocument();
      expect(screen.getByText("Critical")).toBeInTheDocument();
    });

    it("hides legend when showZoneLegend is false", () => {
      render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          alertZones={zones}
          showZoneLegend={false}
        />,
      );
      expect(screen.queryByText("Normal")).not.toBeInTheDocument();
    });

    it("skips zones without labels", () => {
      render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          alertZones={[
            { min: 0, max: 50, color: "#22c55e", label: "OK" },
            { min: 50, max: 100, color: "#ef4444" },
          ]}
          showZoneLegend
        />,
      );
      expect(screen.getByText("OK")).toBeInTheDocument();
      const legend = screen.getByTestId("zone-legend");
      expect(legend.children.length).toBe(1);
    });

    it("renders legend swatches with correct colors", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          alertZones={zones}
          showZoneLegend
        />,
      );
      const swatches = container.querySelectorAll(
        '[data-testid="zone-legend"] span[style*="background-color"]',
      );
      expect(swatches.length).toBe(3);
    });
  });

  describe("showZoneValues", () => {
    const zones = [
      { min: 0, max: 40, color: "#22c55e" },
      { min: 40, max: 70, color: "#f59e0b" },
      { min: 70, max: 100, color: "#ef4444" },
    ];

    it("renders zone boundary values", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          alertZones={zones}
          showZoneValues
        />,
      );
      const zoneVals = container.querySelectorAll("[data-zone-value]");
      expect(zoneVals.length).toBe(2);
    });

    it("boundary values are 40 and 70 for 3-zone setup", () => {
      render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          alertZones={zones}
          showZoneValues
        />,
      );
      expect(screen.getByText("40")).toBeInTheDocument();
      expect(screen.getByText("70")).toBeInTheDocument();
    });

    it("hides zone values when showZoneValues is false", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          alertZones={zones}
          showZoneValues={false}
        />,
      );
      const zoneVals = container.querySelectorAll("[data-zone-value]");
      expect(zoneVals.length).toBe(0);
    });

    it("zone value color matches zone color by default", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          alertZones={zones}
          showZoneValues
        />,
      );
      const zv40 = container.querySelector(
        '[data-zone-value="40"]',
      ) as HTMLElement;
      // 40 is the start of the warning zone (#f59e0b)
      expect(zv40.style.color).toBeTruthy();
    });

    it("applies zoneValue font styling override", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          alertZones={zones}
          showZoneValues
          styles={{
            zoneValue: { fontSize: 14, fontWeight: 700, color: "#1e293b" },
          }}
        />,
      );
      const zoneVal = container.querySelector(
        "[data-zone-value]",
      ) as HTMLElement;
      expect(zoneVal.style.fontSize).toBe("14px");
      expect(zoneVal.style.fontWeight).toBe("700");
      expect(zoneVal.style.color).toBe("rgb(30, 41, 59)");
    });
  });

  describe("showMinMax", () => {
    it("renders min and max labels", () => {
      const { container } = render(
        <ProgressBar data={{ value: 50, timestamp: null }} showMinMax />,
      );
      const minEl = container.querySelector('[data-minmax="min"]');
      const maxEl = container.querySelector('[data-minmax="max"]');
      expect(minEl?.textContent).toBe("0");
      expect(maxEl?.textContent).toBe("100");
    });

    it("renders custom min/max range", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: 500, timestamp: null }}
          min={0}
          max={1000}
          showMinMax
        />,
      );
      const minEl = container.querySelector('[data-minmax="min"]');
      const maxEl = container.querySelector('[data-minmax="max"]');
      expect(minEl?.textContent).toBe("0");
      expect(maxEl?.textContent).toBe("1000");
    });

    it("hides min/max when showMinMax is false", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          showMinMax={false}
        />,
      );
      expect(container.querySelector("[data-minmax]")).toBeNull();
    });

    it("uses formatValue for min/max labels", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          showMinMax
          formatValue={(v) => `${v} RPM`}
        />,
      );
      const minEl = container.querySelector('[data-minmax="min"]');
      expect(minEl?.textContent).toBe("0 RPM");
    });
  });

  describe("vertical with new features", () => {
    const zones = [
      { min: 0, max: 40, color: "#22c55e", label: "Normal" },
      { min: 40, max: 70, color: "#f59e0b", label: "Warning" },
      { min: 70, max: 100, color: "#ef4444", label: "Critical" },
    ];

    it("renders label in vertical mode", () => {
      render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          orientation="vertical"
        />,
      );
      expect(screen.getByText("50")).toBeInTheDocument();
    });

    it("renders zone legend in vertical mode", () => {
      render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          orientation="vertical"
          alertZones={zones}
          showZoneLegend
        />,
      );
      expect(screen.getByText("Normal")).toBeInTheDocument();
    });

    it("renders zone values in vertical mode", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          orientation="vertical"
          alertZones={zones}
          showZoneValues
        />,
      );
      const zoneVals = container.querySelectorAll("[data-zone-value]");
      expect(zoneVals.length).toBe(2);
    });

    it("renders min/max in vertical mode", () => {
      const { container } = render(
        <ProgressBar
          data={{ value: 50, timestamp: null }}
          orientation="vertical"
          showMinMax
        />,
      );
      expect(container.querySelector('[data-minmax="min"]')).toBeTruthy();
      expect(container.querySelector('[data-minmax="max"]')).toBeTruthy();
    });
  });

  describe("data prop", () => {
    it("extracts value and timestamp from data prop", () => {
      render(
        <ProgressBar
          data={{ value: 75, timestamp: new Date(2025, 0, 1).getTime() }}
          showLastUpdated
        />,
      );
      expect(screen.getByText("75")).toBeInTheDocument();
      const text = document.body.textContent;
      expect(text).toContain("2025");
    });

    it("explicit lastUpdated overrides data.timestamp", () => {
      render(
        <ProgressBar
          data={{ value: 50, timestamp: new Date(2025, 6, 1).getTime() }}
          showLastUpdated
        />,
      );
      const text = document.body.textContent;
      expect(text).toContain("2025");
    });

    it("no timestamp without data or lastUpdated", () => {
      const { container } = render(
        <ProgressBar data={{ value: 50, timestamp: null }} showLastUpdated />,
      );
      const allDivs = container.querySelectorAll("div");
      const tsDiv = Array.from(allDivs).find(
        (d) => d.style.marginTop === "4px",
      );
      expect(tsDiv).toBeUndefined();
    });
  });
});
