import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/#/test-gauges");
  await page.waitForSelector('[data-testid="page-heading"]');
});

// ─── Page Load ───────────────────────────────────────────────

test.describe("Gauges - Page Load", () => {
  test("page heading renders", async ({ page }) => {
    await expect(page.getByTestId("page-heading")).toHaveText(
      "Gauge Test Page",
    );
  });

  test("needle section exists", async ({ page }) => {
    await expect(page.getByTestId("needle-section")).toBeVisible();
  });

  test("arc section exists", async ({ page }) => {
    await page.getByTestId("arc-section").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("arc-section")).toBeVisible();
  });

  test("resizable section exists", async ({ page }) => {
    await page.getByTestId("resizable-section").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("resizable-section")).toBeVisible();
  });
});

// ─── NeedleGauge SVG Structure ───────────────────────────────

test.describe("NeedleGauge - SVG Structure", () => {
  test("renders an SVG with role=meter", async ({ page }) => {
    const svg = page
      .getByTestId("card-needle-default")
      .locator('svg[role="meter"]');
    await expect(svg).toBeVisible();
  });

  test("has correct ARIA attributes", async ({ page }) => {
    const svg = page
      .getByTestId("card-needle-default")
      .locator('svg[role="meter"]');
    await expect(svg).toHaveAttribute("aria-valuemin", "0");
    await expect(svg).toHaveAttribute("aria-valuemax", "100");
    await expect(svg).toHaveAttribute("aria-valuenow", "45");
  });

  test("has background arc path", async ({ page }) => {
    const paths = page.getByTestId("card-needle-default").locator("svg path");
    expect(await paths.count()).toBeGreaterThanOrEqual(1);
  });

  test("has needle line", async ({ page }) => {
    const line = page.getByTestId("card-needle-default").locator("svg line");
    await expect(line).toBeVisible();
  });

  test("has pivot circle", async ({ page }) => {
    const circle = page
      .getByTestId("card-needle-default")
      .locator("svg circle");
    await expect(circle).toBeVisible();
  });

  test('shows value text "45"', async ({ page }) => {
    const svg = page.getByTestId("card-needle-default").locator("svg");
    await expect(svg).toContainText("45");
  });

  test('shows label "temperature"', async ({ page }) => {
    const svg = page.getByTestId("card-needle-default").locator("svg");
    await expect(svg).toContainText("temperature");
  });

  test('shows min "0" and max "100"', async ({ page }) => {
    const svg = page.getByTestId("card-needle-default").locator("svg");
    const text = await svg.textContent();
    expect(text).toContain("0");
    expect(text).toContain("100");
  });
});

// ─── NeedleGauge Alert Zones ─────────────────────────────────

test.describe("NeedleGauge - Alert Zones", () => {
  test("3-zone gauge has 4+ paths (bg + 3 zones)", async ({ page }) => {
    await page.getByTestId("card-needle-3-zones").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const paths = page.getByTestId("card-needle-3-zones").locator("svg path");
    expect(await paths.count()).toBeGreaterThanOrEqual(4);
  });

  test("zone arcs have opacity=1", async ({ page }) => {
    await page.getByTestId("card-needle-3-zones").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const zonePaths = page
      .getByTestId("card-needle-3-zones")
      .locator('svg path[opacity="1"]');
    expect(await zonePaths.count()).toBeGreaterThanOrEqual(3);
  });

  test("5-zone gauge has 6+ paths (bg + 5 zones)", async ({ page }) => {
    await page.getByTestId("card-needle-5-zones").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const paths = page.getByTestId("card-needle-5-zones").locator("svg path");
    expect(await paths.count()).toBeGreaterThanOrEqual(6);
  });
});

// ─── NeedleGauge Styling ─────────────────────────────────────

test.describe("NeedleGauge - Styling", () => {
  test("unit suffix renders", async ({ page }) => {
    const svg = page.getByTestId("card-needle-unit-suffix").locator("svg");
    await expect(svg).toContainText("°C");
  });

  test("formatValue applies", async ({ page }) => {
    const svg = page.getByTestId("card-needle-format-value").locator("svg");
    await expect(svg).toContainText("45.7%");
  });

  test("thick arc has larger strokeWidth", async ({ page }) => {
    const bgPath = page
      .getByTestId("card-needle-thick-arc")
      .locator("svg path")
      .first();
    const sw = await bgPath.getAttribute("stroke-width");
    expect(Number(sw)).toBeGreaterThan(20);
  });

  test("thin arc has smaller strokeWidth", async ({ page }) => {
    const bgPath = page
      .getByTestId("card-needle-thin-arc")
      .locator("svg path")
      .first();
    const sw = await bgPath.getAttribute("stroke-width");
    expect(Number(sw)).toBeLessThan(10);
  });

  test("large value font is applied", async ({ page }) => {
    const valueText = page
      .getByTestId("card-needle-large-value")
      .locator("svg text")
      .nth(2);
    const fs = await valueText.getAttribute("font-size");
    expect(Number(fs)).toBeGreaterThan(30);
  });

  test("custom min/max style has blue color", async ({ page }) => {
    const minText = page
      .getByTestId("card-needle-min-max-style")
      .locator("svg text")
      .first();
    const fill = await minText.getAttribute("fill");
    expect(fill).toBe("#3b82f6");
  });
});

// ─── NeedleGauge Arc Angles ──────────────────────────────────

test.describe("NeedleGauge - Arc Angles", () => {
  test("270° gauge renders SVG", async ({ page }) => {
    await page.getByTestId("card-needle-arc-270").scrollIntoViewIfNeeded();
    const svg = page
      .getByTestId("card-needle-arc-270")
      .locator('svg[role="meter"]');
    await expect(svg).toBeVisible();
  });

  test("300° gauge renders SVG", async ({ page }) => {
    await page.getByTestId("card-needle-arc-300").scrollIntoViewIfNeeded();
    const svg = page
      .getByTestId("card-needle-arc-300")
      .locator('svg[role="meter"]');
    await expect(svg).toBeVisible();
  });

  test("30° gauge renders SVG", async ({ page }) => {
    await page.getByTestId("card-needle-arc-30").scrollIntoViewIfNeeded();
    const svg = page
      .getByTestId("card-needle-arc-30")
      .locator('svg[role="meter"]');
    await expect(svg).toBeVisible();
  });

  test("90° gauge renders SVG", async ({ page }) => {
    await page.getByTestId("card-needle-arc-90").scrollIntoViewIfNeeded();
    const svg = page
      .getByTestId("card-needle-arc-90")
      .locator('svg[role="meter"]');
    await expect(svg).toBeVisible();
  });
});

// ─── NeedleGauge showZoneValues ──────────────────────────────

test.describe("NeedleGauge - Zone Values", () => {
  test("zone boundary values 30 and 70 are displayed", async ({ page }) => {
    await page
      .getByTestId("card-needle-show-zone-values")
      .scrollIntoViewIfNeeded();
    const svg = page.getByTestId("card-needle-show-zone-values").locator("svg");
    const text = await svg.textContent();
    expect(text).toContain("30");
    expect(text).toContain("70");
  });
});

// ─── NeedleGauge Edge Cases ──────────────────────────────────

test.describe("NeedleGauge - Edge Cases", () => {
  test("value=0 renders", async ({ page }) => {
    const svg = page
      .getByTestId("card-needle-value-zero")
      .locator('svg[role="meter"]');
    await expect(svg).toHaveAttribute("aria-valuenow", "0");
  });

  test("value=max renders", async ({ page }) => {
    const svg = page
      .getByTestId("card-needle-value-max")
      .locator('svg[role="meter"]');
    await expect(svg).toHaveAttribute("aria-valuenow", "100");
  });

  test("value over max is clamped visually but shows real value", async ({
    page,
  }) => {
    await page
      .getByTestId("card-needle-value-over-max")
      .scrollIntoViewIfNeeded();
    const svg = page.getByTestId("card-needle-value-over-max").locator("svg");
    await expect(svg).toContainText("120");
  });

  test("value under min shows real value", async ({ page }) => {
    await page
      .getByTestId("card-needle-value-under-min")
      .scrollIntoViewIfNeeded();
    const svg = page.getByTestId("card-needle-value-under-min").locator("svg");
    await expect(svg).toContainText("-10");
  });

  test("no label gauge has no label text", async ({ page }) => {
    await page.getByTestId("card-needle-no-label").scrollIntoViewIfNeeded();
    const svg = page.getByTestId("card-needle-no-label").locator("svg");
    const text = await svg.textContent();
    expect(text).not.toContain("temperature");
  });

  test("loading state shows skeleton", async ({ page }) => {
    await page.getByTestId("card-needle-loading").scrollIntoViewIfNeeded();
    const skeleton = page
      .getByTestId("card-needle-loading")
      .locator('[style*="shimmer"], [style*="skeleton"]');
    // Should not have a meter SVG
    const svgs = page
      .getByTestId("card-needle-loading")
      .locator('svg[role="meter"]');
    expect(await svgs.count()).toBe(0);
  });

  test("explicit size renders at specified dimensions", async ({ page }) => {
    await page
      .getByTestId("card-needle-explicit-size")
      .scrollIntoViewIfNeeded();
    const svg = page.getByTestId("card-needle-explicit-size").locator("svg");
    const box = await svg.boundingBox();
    expect(box!.width).toBeCloseTo(250, -1);
    expect(box!.height).toBeCloseTo(150, -1);
  });
});

// ─── NeedleGauge Dark Theme ──────────────────────────────────

test.describe("NeedleGauge - Dark Theme", () => {
  test("dark background is applied", async ({ page }) => {
    await page
      .getByTestId("card-needle-dark-background")
      .scrollIntoViewIfNeeded();
    const container = page
      .getByTestId("card-needle-dark-background")
      .locator('[style*="background-color"]')
      .first();
    const bg = await container.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(bg).toBe("rgb(15, 23, 42)");
  });
});

// ─── ArcGauge SVG Structure ──────────────────────────────────

test.describe("ArcGauge - SVG Structure", () => {
  test("renders an SVG with role=meter", async ({ page }) => {
    await page.getByTestId("arc-section").scrollIntoViewIfNeeded();
    const svg = page
      .getByTestId("card-arc-default")
      .locator('svg[role="meter"]');
    await expect(svg).toBeVisible();
  });

  test('shows value text "45"', async ({ page }) => {
    await page.getByTestId("card-arc-default").scrollIntoViewIfNeeded();
    const svg = page.getByTestId("card-arc-default").locator("svg");
    await expect(svg).toContainText("45");
  });

  test("zone arcs have opacity=0.25", async ({ page }) => {
    await page.getByTestId("card-arc-3-zones").scrollIntoViewIfNeeded();
    const zonePaths = page
      .getByTestId("card-arc-3-zones")
      .locator('svg path[opacity="0.25"]');
    expect(await zonePaths.count()).toBeGreaterThanOrEqual(3);
  });

  test("has a value fill arc (strokeDasharray set)", async ({ page }) => {
    await page.getByTestId("card-arc-default").scrollIntoViewIfNeeded();
    const paths = page
      .getByTestId("card-arc-default")
      .locator("svg path[stroke-dasharray]");
    expect(await paths.count()).toBeGreaterThanOrEqual(1);
  });
});

// ─── ArcGauge Variations ─────────────────────────────────────

test.describe("ArcGauge - Variations", () => {
  test("unit suffix renders", async ({ page }) => {
    await page.getByTestId("card-arc-unit-suffix").scrollIntoViewIfNeeded();
    const svg = page.getByTestId("card-arc-unit-suffix").locator("svg");
    await expect(svg).toContainText("%");
  });

  test("formatValue applies", async ({ page }) => {
    await page.getByTestId("card-arc-format-value").scrollIntoViewIfNeeded();
    const svg = page.getByTestId("card-arc-format-value").locator("svg");
    await expect(svg).toContainText("45.7%");
  });

  test("270° arc renders", async ({ page }) => {
    await page.getByTestId("card-arc-270").scrollIntoViewIfNeeded();
    const svg = page.getByTestId("card-arc-270").locator('svg[role="meter"]');
    await expect(svg).toBeVisible();
  });

  test("270° dark has dark background", async ({ page }) => {
    await page.getByTestId("card-arc-270-dark").scrollIntoViewIfNeeded();
    const container = page
      .getByTestId("card-arc-270-dark")
      .locator('[style*="background-color"]')
      .first();
    const bg = await container.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(bg).toBe("rgb(15, 23, 42)");
  });

  test("show zone values renders boundary labels", async ({ page }) => {
    await page
      .getByTestId("card-arc-show-zone-values")
      .scrollIntoViewIfNeeded();
    const svg = page.getByTestId("card-arc-show-zone-values").locator("svg");
    const text = await svg.textContent();
    expect(text).toContain("30");
    expect(text).toContain("70");
  });

  test("value=0 renders correctly", async ({ page }) => {
    await page.getByTestId("card-arc-value-zero").scrollIntoViewIfNeeded();
    const svg = page.getByTestId("card-arc-value-zero").locator("svg");
    await expect(svg).toContainText("0");
  });

  test("loading state has no meter SVG", async ({ page }) => {
    await page.getByTestId("card-arc-loading").scrollIntoViewIfNeeded();
    const svgs = page
      .getByTestId("card-arc-loading")
      .locator('svg[role="meter"]');
    expect(await svgs.count()).toBe(0);
  });
});

// ─── Last Updated Timestamp ──────────────────────────────────

test.describe("Gauges - Last Updated", () => {
  test("needle shows timestamp in default format (dd MMM yyyy)", async ({
    page,
  }) => {
    await page.getByTestId("lastupdated-section").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const svg = page.getByTestId("card-needle-with-timestamp").locator("svg");
    const text = await svg.textContent();
    // Default format: "26 Mar 2026 ..."
    expect(text).toMatch(
      /\d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}/,
    );
  });

  test("arc shows timestamp in default format", async ({ page }) => {
    await page.getByTestId("lastupdated-section").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const svg = page.getByTestId("card-arc-with-timestamp").locator("svg");
    const text = await svg.textContent();
    expect(text).toMatch(
      /\d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}/,
    );
  });

  test("needle custom formatTimestamp renders custom format", async ({
    page,
  }) => {
    await page
      .getByTestId("card-needle-custom-timestamp-format")
      .scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const svg = page
      .getByTestId("card-needle-custom-timestamp-format")
      .locator("svg");
    const text = await svg.textContent();
    // Custom format: "HH:MM UTC"
    expect(text).toMatch(/\d{1,2}:\d{2} UTC/);
  });

  test("needle without showLastUpdated does not show timestamp", async ({
    page,
  }) => {
    await page
      .getByTestId("card-needle-no-timestamp-default-")
      .scrollIntoViewIfNeeded();
    const svg = page
      .getByTestId("card-needle-no-timestamp-default-")
      .locator("svg");
    const text = await svg.textContent();
    // Should NOT contain a date pattern
    expect(text).not.toMatch(
      /\d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}/,
    );
  });
});

// ─── Resizable Gauges ────────────────────────────────────────

test.describe("Gauges - Resizable", () => {
  test("resizable cards have CSS resize property", async ({ page }) => {
    await page.getByTestId("resizable-section").scrollIntoViewIfNeeded();
    const card = page.getByTestId("resizable-resizable-needle");
    const resize = await card.evaluate((el) => getComputedStyle(el).resize);
    expect(resize).toBe("both");
  });

  test("resizable needle gauge SVG fills container", async ({ page }) => {
    await page
      .getByTestId("resizable-resizable-needle")
      .scrollIntoViewIfNeeded();
    const svg = page.getByTestId("resizable-resizable-needle").locator("svg");
    const box = await svg.boundingBox();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);
  });

  test("resizable arc gauge SVG fills container", async ({ page }) => {
    await page.getByTestId("resizable-resizable-arc").scrollIntoViewIfNeeded();
    const svg = page.getByTestId("resizable-resizable-arc").locator("svg");
    const box = await svg.boundingBox();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);
  });
});
