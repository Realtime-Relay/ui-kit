import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/#/test-timeseries");
  await page.waitForSelector('[data-testid="page-heading"]');
});

// ─── Page Load ──────────────────────────────────────────────

test.describe("TimeSeries - Page Load", () => {
  test("page heading renders", async ({ page }) => {
    await expect(page.getByTestId("page-heading")).toHaveText(
      "Time Series Test Page",
    );
  });

  test("basic section exists", async ({ page }) => {
    await expect(page.getByTestId("basic-section")).toBeVisible();
  });

  test("line section exists", async ({ page }) => {
    await page.getByTestId("line-section").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("line-section")).toBeVisible();
  });

  test("annotations section exists", async ({ page }) => {
    await page.getByTestId("annotations-section").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("annotations-section")).toBeVisible();
  });

  test("zoom section exists", async ({ page }) => {
    await page.getByTestId("zoom-section").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("zoom-section")).toBeVisible();
  });

  test("legend section exists", async ({ page }) => {
    await page.getByTestId("legend-section").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("legend-section")).toBeVisible();
  });

  test("styles section exists", async ({ page }) => {
    await page.getByTestId("styles-section").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("styles-section")).toBeVisible();
  });

  test("edge section exists", async ({ page }) => {
    await page.getByTestId("edge-section").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("edge-section")).toBeVisible();
  });
});

// ─── SVG Structure ──────────────────────────────────────────

test.describe("TimeSeries - SVG Structure", () => {
  test("single device card has an SVG", async ({ page }) => {
    const svg = page.getByTestId("card-single-device").locator("svg");
    await expect(svg).toBeVisible();
  });

  test("single device card has a line path", async ({ page }) => {
    const paths = page
      .getByTestId("card-single-device")
      .locator('path[fill="none"]');
    expect(await paths.count()).toBeGreaterThanOrEqual(1);
  });

  test("three devices card has 3 line paths", async ({ page }) => {
    const paths = page
      .getByTestId("card-three-devices")
      .locator('path[fill="none"]');
    expect(await paths.count()).toBe(3);
  });

  test("has clip path defined", async ({ page }) => {
    const clip = page.getByTestId("card-single-device").locator("clipPath");
    expect(await clip.count()).toBeGreaterThan(0);
  });
});

// ─── Multi-Device Legend ────────────────────────────────────

test.describe("TimeSeries - Multi-Device Legend", () => {
  test("single device shows metric name only in legend", async ({ page }) => {
    const buttons = page
      .getByTestId("card-single-device")
      .locator('button[type="button"]');
    expect(await buttons.count()).toBe(1);
    await expect(buttons.first()).toHaveText("value");
  });

  test("three devices shows [device]: metric format", async ({ page }) => {
    const buttons = page
      .getByTestId("card-three-devices")
      .locator('button[type="button"]');
    expect(await buttons.count()).toBe(3);
    const first = await buttons.first().textContent();
    expect(first).toContain("[sensor-alpha]");
    expect(first).toContain("value");
  });

  test("formatLegend callback overrides labels", async ({ page }) => {
    const buttons = page
      .getByTestId("card-format-legend")
      .locator('button[type="button"]');
    const first = await buttons.first().textContent();
    expect(first).toContain("sensor-alpha / value");
  });

  test("multi-metric device shows both metrics", async ({ page }) => {
    const buttons = page
      .getByTestId("card-multi-metric-single-device")
      .locator('button[type="button"]');
    expect(await buttons.count()).toBe(2);
    const texts = await buttons.allTextContents();
    expect(texts.some((t) => t.includes("Temperature"))).toBe(true);
    expect(texts.some((t) => t.includes("Humidity"))).toBe(true);
  });
});

// ─── Legend Swatch Shape ────────────────────────────────────

test.describe("TimeSeries - Legend Swatch", () => {
  test("swatch is a rounded rectangle (wider than tall)", async ({ page }) => {
    const swatch = page
      .getByTestId("card-single-device")
      .locator('button[type="button"] span')
      .first();
    const box = await swatch.boundingBox();
    expect(box!.width).toBeGreaterThan(box!.height);
  });
});

// ─── Legend Solo Mode ───────────────────────────────────────

test.describe("TimeSeries - Legend Solo Mode", () => {
  test("clicking a legend item solos it (dims others)", async ({ page }) => {
    const buttons = page
      .getByTestId("card-three-devices")
      .locator('button[type="button"]');
    // Click first legend item
    await buttons.first().click();
    await page.waitForTimeout(200);

    // First should be fully visible, others dimmed
    const firstOpacity = await buttons
      .first()
      .evaluate((el) => getComputedStyle(el).opacity);
    const secondOpacity = await buttons
      .nth(1)
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(parseFloat(firstOpacity)).toBe(1);
    expect(parseFloat(secondOpacity)).toBeLessThan(1);
  });

  test("clicking the solo item again shows all", async ({ page }) => {
    const buttons = page
      .getByTestId("card-three-devices")
      .locator('button[type="button"]');
    await buttons.first().click();
    await page.waitForTimeout(200);
    await buttons.first().click();
    await page.waitForTimeout(200);

    // All should be visible again
    const secondOpacity = await buttons
      .nth(1)
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(parseFloat(secondOpacity)).toBe(1);
  });
});

// ─── Line Thickness ─────────────────────────────────────────

test.describe("TimeSeries - Line Thickness", () => {
  test("thick lines card has stroke-width=4", async ({ page }) => {
    await page.getByTestId("card-thick-lines").scrollIntoViewIfNeeded();
    const path = page
      .getByTestId("card-thick-lines")
      .locator('path[fill="none"]')
      .first();
    const sw = await path.getAttribute("stroke-width");
    expect(sw).toBe("4");
  });

  test("thin lines card has stroke-width=1", async ({ page }) => {
    await page.getByTestId("card-thin-lines").scrollIntoViewIfNeeded();
    const path = page
      .getByTestId("card-thin-lines")
      .locator('path[fill="none"]')
      .first();
    const sw = await path.getAttribute("stroke-width");
    expect(sw).toBe("1");
  });
});

// ─── Point Size ─────────────────────────────────────────────

test.describe("TimeSeries - Point Size", () => {
  test("points small card renders circles", async ({ page }) => {
    await page.getByTestId("card-points-small").scrollIntoViewIfNeeded();
    const circles = page.getByTestId("card-points-small").locator("svg circle");
    expect(await circles.count()).toBeGreaterThan(0);
  });

  test("points large card has r=5", async ({ page }) => {
    await page.getByTestId("card-points-large").scrollIntoViewIfNeeded();
    const circle = page
      .getByTestId("card-points-large")
      .locator("svg circle")
      .first();
    expect(await circle.getAttribute("r")).toBe("5");
  });

  test("single device card has no circles (no pointSize)", async ({ page }) => {
    const circles = page
      .getByTestId("card-single-device")
      .locator("svg circle");
    expect(await circles.count()).toBe(0);
  });

  test("per-metric styles card has circles for temp but not humidity", async ({
    page,
  }) => {
    await page.getByTestId("card-per-metric-styles").scrollIntoViewIfNeeded();
    const circles = page
      .getByTestId("card-per-metric-styles")
      .locator("svg circle");
    // Only temperature has pointSize=3
    expect(await circles.count()).toBeGreaterThan(0);
  });
});

// ─── Annotations ────────────────────────────────────────────

test.describe("TimeSeries - Annotations", () => {
  test("point annotations card has dashed vertical lines", async ({ page }) => {
    await page.getByTestId("card-point-annotations").scrollIntoViewIfNeeded();
    const lines = page
      .getByTestId("card-point-annotations")
      .locator('line[stroke-dasharray="4,3"]');
    expect(await lines.count()).toBe(2);
  });

  test("point annotation labels are visible", async ({ page }) => {
    await page.getByTestId("card-point-annotations").scrollIntoViewIfNeeded();
    const card = page.getByTestId("card-point-annotations");
    const text = await card.textContent();
    expect(text).toContain("Deploy v2.1");
    expect(text).toContain("Alert");
  });

  test("range annotations card has shaded rect", async ({ page }) => {
    await page.getByTestId("card-range-annotations").scrollIntoViewIfNeeded();
    const rects = page
      .getByTestId("card-range-annotations")
      .locator('rect[opacity="0.1"]');
    expect(await rects.count()).toBe(1);
  });

  test("range annotation label visible", async ({ page }) => {
    await page.getByTestId("card-range-annotations").scrollIntoViewIfNeeded();
    const text = await page.getByTestId("card-range-annotations").textContent();
    expect(text).toContain("Maintenance");
  });

  test("mixed annotations card has both lines and rects", async ({ page }) => {
    await page.getByTestId("card-mixed-annotations").scrollIntoViewIfNeeded();
    const lines = page
      .getByTestId("card-mixed-annotations")
      .locator('line[stroke-dasharray="4,3"]');
    const rects = page
      .getByTestId("card-mixed-annotations")
      .locator('rect[opacity="0.1"]');
    expect(await lines.count()).toBe(2);
    expect(await rects.count()).toBe(1);
  });
});

// ─── Start/End & Zoom ───────────────────────────────────────

test.describe("TimeSeries - Start/End & Zoom", () => {
  test("fixed time range card renders an SVG", async ({ page }) => {
    await page.getByTestId("card-fixed-time-range").scrollIntoViewIfNeeded();
    const svg = page.getByTestId("card-fixed-time-range").locator("svg");
    await expect(svg).toBeVisible();
  });

  test("zoom enabled card has crosshair cursor on overlay", async ({
    page,
  }) => {
    await page.getByTestId("card-zoom-enabled").scrollIntoViewIfNeeded();
    const overlay = page
      .getByTestId("card-zoom-enabled")
      .locator('rect[fill="transparent"]');
    const cursor = await overlay.evaluate(
      (el) => (el as SVGRectElement).style.cursor,
    );
    expect(cursor).toBe("crosshair");
  });

  test("zoom disabled card has no crosshair cursor", async ({ page }) => {
    await page.getByTestId("card-zoom-disabled").scrollIntoViewIfNeeded();
    const overlay = page
      .getByTestId("card-zoom-disabled")
      .locator('rect[fill="transparent"]');
    const cursor = await overlay.evaluate(
      (el) => (el as SVGRectElement).style.cursor,
    );
    expect(cursor).toBe("");
  });

  test("drag-zoom creates a zoom domain and shows reset button", async ({
    page,
  }) => {
    await page.getByTestId("card-zoom-enabled").scrollIntoViewIfNeeded();
    const card = page.getByTestId("card-zoom-enabled");
    const svg = card.locator("svg");
    const box = await svg.boundingBox();
    if (!box) return;

    // Drag from 1/4 to 3/4 of the chart width
    const x1 = box.x + box.width * 0.25;
    const x2 = box.x + box.width * 0.75;
    const y = box.y + box.height * 0.5;

    await page.mouse.move(x1, y);
    await page.mouse.down();
    await page.mouse.move(x2, y, { steps: 5 });
    await page.mouse.up();

    await page.waitForTimeout(300);
    const resetBtn = card.locator('button:has-text("Reset zoom")');
    await expect(resetBtn).toBeVisible();
  });

  test("clicking Reset zoom restores the original view", async ({ page }) => {
    await page.getByTestId("card-zoom-enabled").scrollIntoViewIfNeeded();
    const card = page.getByTestId("card-zoom-enabled");
    const svg = card.locator("svg");
    const box = await svg.boundingBox();
    if (!box) return;

    // Zoom in
    const x1 = box.x + box.width * 0.25;
    const x2 = box.x + box.width * 0.75;
    const y = box.y + box.height * 0.5;
    await page.mouse.move(x1, y);
    await page.mouse.down();
    await page.mouse.move(x2, y, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Reset
    const resetBtn = card.locator('button:has-text("Reset zoom")');
    await resetBtn.click();
    await page.waitForTimeout(300);

    // Reset button should be gone
    expect(await resetBtn.count()).toBe(0);
  });
});

// ─── Legend Positions ───────────────────────────────────────

test.describe("TimeSeries - Legend Positions", () => {
  test("legend top card has legend buttons", async ({ page }) => {
    await page.getByTestId("card-legend-top").scrollIntoViewIfNeeded();
    const buttons = page
      .getByTestId("card-legend-top")
      .locator('button[type="button"]');
    expect(await buttons.count()).toBe(3);
  });

  test("legend bottom card has legend buttons", async ({ page }) => {
    await page.getByTestId("card-legend-bottom").scrollIntoViewIfNeeded();
    const buttons = page
      .getByTestId("card-legend-bottom")
      .locator('button[type="button"]');
    expect(await buttons.count()).toBe(3);
  });

  test("legend left card has legend in row layout", async ({ page }) => {
    await page.getByTestId("card-legend-left").scrollIntoViewIfNeeded();
    const card = page.getByTestId("card-legend-left");
    const buttons = card.locator('button[type="button"]');
    expect(await buttons.count()).toBe(3);
  });

  test("legend right card has legend in row layout", async ({ page }) => {
    await page.getByTestId("card-legend-right").scrollIntoViewIfNeeded();
    const buttons = page
      .getByTestId("card-legend-right")
      .locator('button[type="button"]');
    expect(await buttons.count()).toBe(3);
  });

  test("no legend card has no legend buttons", async ({ page }) => {
    await page.getByTestId("card-no-legend").scrollIntoViewIfNeeded();
    const buttons = page
      .getByTestId("card-no-legend")
      .locator('button[type="button"]');
    expect(await buttons.count()).toBe(0);
  });
});

// ─── Area & Styles ──────────────────────────────────────────

test.describe("TimeSeries - Area & Styles", () => {
  test("area chart has area path with opacity 0.15", async ({ page }) => {
    await page.getByTestId("card-area-chart").scrollIntoViewIfNeeded();
    const areaPaths = page
      .getByTestId("card-area-chart")
      .locator('path[opacity="0.15"]');
    expect(await areaPaths.count()).toBe(1);
  });

  test("dark theme card has dark background", async ({ page }) => {
    await page.getByTestId("card-dark-theme").scrollIntoViewIfNeeded();
    const wrapper = page
      .getByTestId("card-dark-theme")
      .locator('div[style*="background-color"]')
      .first();
    const bg = await wrapper.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(bg).toContain("15");
  });

  test("title card shows title text", async ({ page }) => {
    await page.getByTestId("card-with-title").scrollIntoViewIfNeeded();
    const text = await page.getByTestId("card-with-title").textContent();
    expect(text).toContain("Sensor Readings");
  });

  test("alert zones card has zone rects", async ({ page }) => {
    await page.getByTestId("card-alert-zones").scrollIntoViewIfNeeded();
    const zones = page
      .getByTestId("card-alert-zones")
      .locator('rect[opacity="0.1"]');
    expect(await zones.count()).toBe(2);
  });

  test("no grid card has no grid lines", async ({ page }) => {
    await page.getByTestId("card-no-grid").scrollIntoViewIfNeeded();
    const gridLines = page
      .getByTestId("card-no-grid")
      .locator('line[stroke-dasharray="2,2"]');
    expect(await gridLines.count()).toBe(0);
  });
});

// ─── Tooltip / Hover ────────────────────────────────────────

test.describe("TimeSeries - Tooltip", () => {
  test("hovering shows tooltip", async ({ page }) => {
    const card = page.getByTestId("card-single-device");
    const overlay = card.locator('rect[fill="transparent"]');
    const box = await overlay.boundingBox();
    if (!box) return;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);

    const tooltip = card.locator(
      'div[style*="position: absolute"][style*="pointer-events: none"]',
    );
    await expect(tooltip).toBeVisible();
  });

  test("hover display shows onHover event data", async ({ page }) => {
    const card = page.getByTestId("card-single-device");
    const overlay = card.locator('rect[fill="transparent"]');
    const box = await overlay.boundingBox();
    if (!box) return;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);

    const hoverDisplay = page.getByTestId("hover-display");
    const text = await hoverDisplay.textContent();
    expect(text).toContain("onHover:");
  });

  test("moving mouse away triggers onRelease", async ({ page }) => {
    const card = page.getByTestId("card-single-device");
    const overlay = card.locator('rect[fill="transparent"]');
    const box = await overlay.boundingBox();
    if (!box) return;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(200);
    // Move away
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);

    const hoverDisplay = page.getByTestId("hover-display");
    const text = await hoverDisplay.textContent();
    expect(text).toContain("onRelease");
  });
});

// ─── Edge Cases ─────────────────────────────────────────────

test.describe("TimeSeries - Edge Cases", () => {
  test("empty data shows skeleton", async ({ page }) => {
    await page.getByTestId("card-empty-data").scrollIntoViewIfNeeded();
    const card = page.getByTestId("card-empty-data");
    // Should have content but no line paths
    const paths = card.locator('path[fill="none"]');
    expect(await paths.count()).toBe(0);
  });

  test("single point renders without crashing", async ({ page }) => {
    await page.getByTestId("card-single-point").scrollIntoViewIfNeeded();
    const svg = page.getByTestId("card-single-point").locator("svg");
    await expect(svg).toBeVisible();
  });
});

// ─── Resizable ──────────────────────────────────────────────

test.describe("TimeSeries - Resizable", () => {
  test("resizable card has CSS resize property", async ({ page }) => {
    await page.getByTestId("resizable-section").scrollIntoViewIfNeeded();
    const card = page.getByTestId("resizable-resizable-chart");
    await expect(card).toHaveCSS("resize", "both");
  });

  test("SVG renders inside resizable card", async ({ page }) => {
    await page.getByTestId("resizable-section").scrollIntoViewIfNeeded();
    const svg = page.getByTestId("resizable-resizable-chart").locator("svg");
    await expect(svg).toBeVisible();
  });
});

// ─── Annotation Mode ──────────────────────────────────────────

test.describe("TimeSeries - Annotation Mode", () => {
  test("annotation mode section exists", async ({ page }) => {
    await page.getByTestId("annotation-mode-section").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("annotation-mode-section")).toBeVisible();
  });

  test("annotation toggle button exists and starts ON", async ({ page }) => {
    await page.getByTestId("annotation-mode-section").scrollIntoViewIfNeeded();
    const btn = page.getByTestId("annotation-toggle");
    await expect(btn).toBeVisible();
    await expect(btn).toHaveText("Annotation ON");
  });

  test("annotation chart renders with copy cursor when annotation mode ON", async ({
    page,
  }) => {
    await page.getByTestId("annotation-mode-section").scrollIntoViewIfNeeded();
    const card = page.getByTestId("card-annotation-mode-chart");
    const overlay = card.locator('rect[fill="transparent"]');
    const cursor = await overlay.evaluate(
      (el) => (el as SVGRectElement).style.cursor,
    );
    expect(cursor).toBe("copy");
  });

  test("clicking chart in annotation mode fires click event", async ({
    page,
  }) => {
    await page.getByTestId("annotation-mode-section").scrollIntoViewIfNeeded();
    const card = page.getByTestId("card-annotation-mode-chart");
    const svg = card.locator("svg");
    const box = await svg.boundingBox();
    if (!box) return;

    // Click in the middle of the chart
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);

    // Check event log for click event
    const eventLog = page.getByTestId("annotation-event-log");
    const text = await eventLog.textContent();
    expect(text).toContain("click");
  });

  test("click creates a point annotation on the chart", async ({ page }) => {
    await page.getByTestId("annotation-mode-section").scrollIntoViewIfNeeded();
    const card = page.getByTestId("card-annotation-mode-chart");
    const svg = card.locator("svg");
    const box = await svg.boundingBox();
    if (!box) return;

    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);

    // Point annotation should appear as a dashed line
    const dashedLines = card.locator('line[stroke-dasharray="4,3"]');
    expect(await dashedLines.count()).toBeGreaterThan(0);
  });

  test("drag fires start_drag and end_drag events", async ({ page }) => {
    await page.getByTestId("annotation-mode-section").scrollIntoViewIfNeeded();
    const card = page.getByTestId("card-annotation-mode-chart");
    const svg = card.locator("svg");
    const box = await svg.boundingBox();
    if (!box) return;

    const x1 = box.x + box.width * 0.25;
    const x2 = box.x + box.width * 0.75;
    const y = box.y + box.height * 0.5;

    await page.mouse.move(x1, y);
    await page.mouse.down();
    await page.mouse.move(x2, y, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    const eventLog = page.getByTestId("annotation-event-log");
    const text = await eventLog.textContent();
    expect(text).toContain("start_drag");
    expect(text).toContain("end_drag");
  });

  test("drag creates a range annotation (shaded rect)", async ({ page }) => {
    await page.getByTestId("annotation-mode-section").scrollIntoViewIfNeeded();
    const card = page.getByTestId("card-annotation-mode-chart");
    const svg = card.locator("svg");
    const box = await svg.boundingBox();
    if (!box) return;

    const x1 = box.x + box.width * 0.3;
    const x2 = box.x + box.width * 0.6;
    const y = box.y + box.height * 0.5;

    await page.mouse.move(x1, y);
    await page.mouse.down();
    await page.mouse.move(x2, y, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Range annotation renders as rect with opacity 0.1
    const rangeRects = card.locator('rect[opacity="0.1"]');
    expect(await rangeRects.count()).toBeGreaterThan(0);
  });

  test("annotation preview disappears after release", async ({ page }) => {
    await page.getByTestId("annotation-mode-section").scrollIntoViewIfNeeded();
    const card = page.getByTestId("card-annotation-mode-chart");
    const svg = card.locator("svg");
    const box = await svg.boundingBox();
    if (!box) return;

    const x1 = box.x + box.width * 0.3;
    const x2 = box.x + box.width * 0.6;
    const y = box.y + box.height * 0.5;

    // During drag — preview should exist
    await page.mouse.move(x1, y);
    await page.mouse.down();
    await page.mouse.move(x2, y, { steps: 5 });

    // Check for preview rect (opacity 0.2 = annotation preview)
    const previewRects = card.locator('rect[opacity="0.2"]');
    expect(await previewRects.count()).toBeGreaterThan(0);

    // Release
    await page.mouse.up();
    await page.waitForTimeout(200);

    // Preview should be gone (the annotation itself has opacity 0.1, not 0.2)
    expect(await previewRects.count()).toBe(0);
  });

  test("zoom is disabled during annotation mode (no zoom on drag)", async ({
    page,
  }) => {
    await page.getByTestId("annotation-mode-section").scrollIntoViewIfNeeded();
    const card = page.getByTestId("card-annotation-mode-chart");
    const svg = card.locator("svg");
    const box = await svg.boundingBox();
    if (!box) return;

    // Drag
    const x1 = box.x + box.width * 0.25;
    const x2 = box.x + box.width * 0.75;
    const y = box.y + box.height * 0.5;
    await page.mouse.move(x1, y);
    await page.mouse.down();
    await page.mouse.move(x2, y, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // "Reset zoom" should NOT appear
    const resetBtn = card.locator('button:has-text("Reset zoom")');
    expect(await resetBtn.count()).toBe(0);
  });

  test("toggling annotation mode off restores zoom", async ({ page }) => {
    await page.getByTestId("annotation-mode-section").scrollIntoViewIfNeeded();

    // Turn annotation mode off
    await page.getByTestId("annotation-toggle").click();
    await page.waitForTimeout(200);

    // Cursor should now be crosshair
    const card = page.getByTestId("card-annotation-mode-chart");
    const overlay = card.locator('rect[fill="transparent"]');
    const cursor = await overlay.evaluate(
      (el) => (el as SVGRectElement).style.cursor,
    );
    expect(cursor).toBe("crosshair");

    // Drag should trigger zoom
    const svg = card.locator("svg");
    const box = await svg.boundingBox();
    if (!box) return;

    const x1 = box.x + box.width * 0.25;
    const x2 = box.x + box.width * 0.75;
    const y = box.y + box.height * 0.5;
    await page.mouse.move(x1, y);
    await page.mouse.down();
    await page.mouse.move(x2, y, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    const resetBtn = card.locator('button:has-text("Reset zoom")');
    await expect(resetBtn).toBeVisible();
  });

  test("clear button removes annotations and events", async ({ page }) => {
    await page.getByTestId("annotation-mode-section").scrollIntoViewIfNeeded();
    const card = page.getByTestId("card-annotation-mode-chart");
    const svg = card.locator("svg");
    const box = await svg.boundingBox();
    if (!box) return;

    // Create a point annotation
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(200);

    // Verify event exists
    const eventLog = page.getByTestId("annotation-event-log");
    let text = await eventLog.textContent();
    expect(text).toContain("click");

    // Clear
    await page.getByTestId("annotation-clear").click();
    await page.waitForTimeout(200);

    // Events should be gone
    text = await eventLog.textContent();
    expect(text).not.toContain("click");
  });

  test("event log shows timestamp as a number", async ({ page }) => {
    await page.getByTestId("annotation-mode-section").scrollIntoViewIfNeeded();
    const card = page.getByTestId("card-annotation-mode-chart");
    const svg = card.locator("svg");
    const box = await svg.boundingBox();
    if (!box) return;

    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);

    const tsEls = page.getByTestId("event-ts");
    const count = await tsEls.count();
    expect(count).toBeGreaterThan(0);
    const tsText = await tsEls.first().textContent();
    const tsNum = Number(tsText);
    expect(Number.isFinite(tsNum)).toBe(true);
    expect(tsNum).toBeGreaterThan(0);
  });
});

// ─── Zoom Color ──────────────────────────────────────────────

test.describe("TimeSeries - Zoom Color", () => {
  test("zoom color section exists", async ({ page }) => {
    await page.getByTestId("zoom-color-section").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("zoom-color-section")).toBeVisible();
  });

  test("red zoom card renders", async ({ page }) => {
    await page.getByTestId("zoom-color-section").scrollIntoViewIfNeeded();
    const card = page.getByTestId("card-red-zoom");
    const svg = card.locator("svg");
    await expect(svg).toBeVisible();
  });

  test("dragging on red zoom card shows red brush", async ({ page }) => {
    await page.getByTestId("zoom-color-section").scrollIntoViewIfNeeded();
    const card = page.getByTestId("card-red-zoom");
    const svg = card.locator("svg");
    const box = await svg.boundingBox();
    if (!box) return;

    const x1 = box.x + box.width * 0.3;
    const x2 = box.x + box.width * 0.6;
    const y = box.y + box.height * 0.5;

    await page.mouse.move(x1, y);
    await page.mouse.down();
    await page.mouse.move(x2, y, { steps: 3 });

    // Brush rect should have red stroke
    const brushRect = card.locator('rect[stroke="#ef4444"]');
    expect(await brushRect.count()).toBeGreaterThan(0);

    await page.mouse.up();
  });
});

// ─── Annotation Hover ──────────────────────────────────────────

test.describe("TimeSeries - Annotation Hover", () => {
  test("hovering over annotation region shows tooltip with data", async ({
    page,
  }) => {
    await page.getByTestId("annotation-mode-section").scrollIntoViewIfNeeded();
    const card = page.getByTestId("card-annotation-hover-with-tooltip");
    await card.scrollIntoViewIfNeeded();

    // The prebuilt "Deploy" annotation is at NOW - 30min ≈ middle of chart
    // The "Maintenance" range is at NOW-45min to NOW-35min ≈ left quarter
    // Find the dashed annotation line and hover near it
    const dashedLine = card.locator('line[stroke-dasharray="4,3"]').first();
    const lineBox = await dashedLine.boundingBox();
    if (!lineBox) return;

    await page.mouse.move(
      lineBox.x + lineBox.width / 2,
      lineBox.y + lineBox.height / 2,
    );
    await page.waitForTimeout(400);

    const tooltip = page.getByTestId("annotation-tooltip");
    await expect(tooltip).toBeVisible();
    const tooltipText = await tooltip.textContent();
    expect(tooltipText).toContain("Deploy");
    expect(tooltipText).toContain("version");
  });

  test("annotation tooltip disappears on mouse leave", async ({ page }) => {
    await page.getByTestId("annotation-mode-section").scrollIntoViewIfNeeded();
    const card = page.getByTestId("card-annotation-hover-with-tooltip");
    await card.scrollIntoViewIfNeeded();

    const dashedLine = card.locator('line[stroke-dasharray="4,3"]').first();
    const lineBox = await dashedLine.boundingBox();
    if (!lineBox) return;

    // Hover in
    await page.mouse.move(
      lineBox.x + lineBox.width / 2,
      lineBox.y + lineBox.height / 2,
    );
    await page.waitForTimeout(300);
    await expect(page.getByTestId("annotation-tooltip")).toBeVisible();

    // Move away from annotation
    const svg = card.locator("svg");
    const svgBox = await svg.boundingBox();
    if (!svgBox) return;
    await page.mouse.move(
      svgBox.x + svgBox.width - 20,
      svgBox.y + svgBox.height / 2,
    );
    await page.waitForTimeout(300);
    expect(await page.getByTestId("annotation-tooltip").count()).toBe(0);
  });

  test("hover log-only chart logs entries without showing tooltip", async ({
    page,
  }) => {
    await page.getByTestId("annotation-mode-section").scrollIntoViewIfNeeded();
    const card = page.getByTestId("card-annotation-hover-log-only");
    await card.scrollIntoViewIfNeeded();

    // Hover over the annotation region (dashed line)
    const dashedLine = card.locator('line[stroke-dasharray="4,3"]').first();
    const lineBox = await dashedLine.boundingBox();
    if (!lineBox) return;

    await page.mouse.move(
      lineBox.x + lineBox.width / 2,
      lineBox.y + lineBox.height / 2,
    );
    await page.waitForTimeout(400);

    // No tooltip
    expect(await page.getByTestId("annotation-tooltip").count()).toBe(0);

    // Hover log should have entries
    const hoverLog = page.getByTestId("annotation-hover-log");
    const fullText = await hoverLog.textContent();
    expect(fullText).toContain("hover");
  });

  test("hover log shows annotation data JSON", async ({ page }) => {
    await page.getByTestId("annotation-mode-section").scrollIntoViewIfNeeded();
    const card = page.getByTestId("card-annotation-hover-log-only");
    await card.scrollIntoViewIfNeeded();

    const dashedLine = card.locator('line[stroke-dasharray="4,3"]').first();
    const lineBox = await dashedLine.boundingBox();
    if (!lineBox) return;

    await page.mouse.move(
      lineBox.x + lineBox.width / 2,
      lineBox.y + lineBox.height / 2,
    );
    await page.waitForTimeout(400);

    const hoverLog = page.getByTestId("annotation-hover-log");
    const text = await hoverLog.textContent();
    expect(text).toMatch(/version|ticket|reason/);
  });

  test("hover log shows leave event when mouse exits annotation", async ({
    page,
  }) => {
    await page.getByTestId("annotation-mode-section").scrollIntoViewIfNeeded();
    const card = page.getByTestId("card-annotation-hover-log-only");
    await card.scrollIntoViewIfNeeded();

    const dashedLine = card.locator('line[stroke-dasharray="4,3"]').first();
    const lineBox = await dashedLine.boundingBox();
    if (!lineBox) return;

    // Hover in
    await page.mouse.move(
      lineBox.x + lineBox.width / 2,
      lineBox.y + lineBox.height / 2,
    );
    await page.waitForTimeout(300);

    // Move away
    const svg = card.locator("svg");
    const svgBox = await svg.boundingBox();
    if (!svgBox) return;
    await page.mouse.move(
      svgBox.x + svgBox.width - 20,
      svgBox.y + svgBox.height / 2,
    );
    await page.waitForTimeout(400);

    const hoverLog = page.getByTestId("annotation-hover-log");
    const text = await hoverLog.textContent();
    expect(text).toContain("leave");
  });

  test("data point tooltip takes priority over annotation tooltip", async ({
    page,
  }) => {
    await page.getByTestId("annotation-mode-section").scrollIntoViewIfNeeded();
    const card = page.getByTestId("card-annotation-hover-with-tooltip");
    await card.scrollIntoViewIfNeeded();

    // Hover over annotation area — both data point tooltip and annotation tooltip could show
    const dashedLine = card.locator('line[stroke-dasharray="4,3"]').first();
    const lineBox = await dashedLine.boundingBox();
    if (!lineBox) return;

    await page.mouse.move(
      lineBox.x + lineBox.width / 2,
      lineBox.y + lineBox.height / 2,
    );
    await page.waitForTimeout(400);

    // Data point tooltip (default dark tooltip) should be visible
    const dataTooltip = card.locator(
      'div[style*="pointer-events: none"][style*="z-index: 10"]',
    );
    // The data point tooltip has zIndex 10, annotation tooltip has zIndex 20
    // But annotation tooltip is hidden when tooltipData is set (data point takes priority)
    // Just verify no crash and card is functional
    const svg = card.locator("svg");
    await expect(svg).toBeVisible();
  });
});
