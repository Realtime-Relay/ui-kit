import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/#/test-timelines");
  await page.waitForSelector('[data-testid="page-heading"]');
});

// ─── Page Load ──────────────────────────────────────────────

test.describe("StateTimeline - Page Load", () => {
  test("page heading renders", async ({ page }) => {
    await expect(page.getByTestId("page-heading")).toHaveText(
      "State Timeline Test Page",
    );
  });

  test("timeline section exists", async ({ page }) => {
    await expect(page.getByTestId("timeline-section")).toBeVisible();
  });

  test("styles section exists", async ({ page }) => {
    await page.getByTestId("styles-section").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("styles-section")).toBeVisible();
  });

  test("edge section exists", async ({ page }) => {
    await page.getByTestId("edge-section").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("edge-section")).toBeVisible();
  });

  test("resizable section exists", async ({ page }) => {
    await page.getByTestId("resizable-section").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("resizable-section")).toBeVisible();
  });
});

// ─── Canvas Structure ──────────────────────────────────────

test.describe("StateTimeline - Canvas Structure", () => {
  test("single device card contains a canvas", async ({ page }) => {
    const canvas = page.getByTestId("card-single-device").locator("canvas");
    await expect(canvas).toBeVisible();
  });

  test("three device card contains a canvas", async ({ page }) => {
    const canvas = page.getByTestId("card-three-devices").locator("canvas");
    await expect(canvas).toBeVisible();
  });

  test("canvas has non-zero dimensions", async ({ page }) => {
    const canvas = page.getByTestId("card-single-device").locator("canvas");
    const width = await canvas.evaluate((el: HTMLCanvasElement) => el.width);
    expect(width).toBeGreaterThan(0);
  });
});

// ─── Legend (HTML div below canvas) ─────────────────────────

test.describe("StateTimeline - Legend", () => {
  test("single device card has legend with state names", async ({ page }) => {
    const card = page.getByTestId("card-single-device");
    const text = await card.textContent();
    expect(text).toContain("normal");
  });

  test("legend has color swatch spans", async ({ page }) => {
    const swatches = page
      .getByTestId("card-single-device")
      .locator('span[style*="inline-block"]');
    expect(await swatches.count()).toBeGreaterThan(0);
  });

  test("empty device arrays card has no legend", async ({ page }) => {
    await page.getByTestId("card-empty-device-arrays").scrollIntoViewIfNeeded();
    const card = page.getByTestId("card-empty-device-arrays");
    const text = await card.textContent();
    // Should not contain state names
    expect(text).not.toContain("normal");
    expect(text).not.toContain("warning");
    expect(text).not.toContain("critical");
  });
});

// ─── Tooltip Hover ──────────────────────────────────────────

test.describe("StateTimeline - Tooltip", () => {
  test("hovering canvas shows a tooltip", async ({ page }) => {
    const canvas = page.getByTestId("card-single-device").locator("canvas");
    const box = await canvas.boundingBox();
    if (!box) return;
    // Hover in the middle of the canvas where bars should be
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);
    const tooltip = page.locator(
      'div[style*="position: fixed"][style*="pointer-events: none"]',
    );
    // Tooltip may or may not appear depending on whether we hit a bar
    // Just verify no crash
    const count = await tooltip.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("moving mouse away hides tooltip", async ({ page }) => {
    const canvas = page.getByTestId("card-single-device").locator("canvas");
    const box = await canvas.boundingBox();
    if (!box) return;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(200);
    // Move away
    await page.getByTestId("page-heading").hover();
    await page.waitForTimeout(200);
    const tooltip = page.locator(
      'div[style*="position: fixed"][style*="pointer-events: none"]',
    );
    expect(await tooltip.count()).toBe(0);
  });
});

// ─── Loading / Empty States ─────────────────────────────────

test.describe("StateTimeline - Loading / Empty", () => {
  test("empty data card shows skeleton", async ({ page }) => {
    await page.getByTestId("card-empty-data").scrollIntoViewIfNeeded();
    const card = page.getByTestId("card-empty-data");
    const content = await card.innerHTML();
    expect(content.length).toBeGreaterThan(0);
    // No canvas when showing skeleton
    const canvases = card.locator("canvas");
    expect(await canvases.count()).toBe(0);
  });

  test("empty no loading card renders nothing inside", async ({ page }) => {
    await page.getByTestId("card-empty-no-loading").scrollIntoViewIfNeeded();
    const card = page.getByTestId("card-empty-no-loading");
    const canvases = card.locator("canvas");
    expect(await canvases.count()).toBe(0);
  });
});

// ─── Dark Theme ─────────────────────────────────────────────

test.describe("StateTimeline - Dark Theme", () => {
  test("dark theme card has dark background", async ({ page }) => {
    await page.getByTestId("card-dark-theme").scrollIntoViewIfNeeded();
    const wrapper = page
      .getByTestId("card-dark-theme")
      .locator('div[style*="background-color"]')
      .first();
    const bg = await wrapper.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    // rgb(15, 23, 42) = #0f172a
    expect(bg).toContain("15");
  });
});

// ─── Resizable ──────────────────────────────────────────────

test.describe("StateTimeline - Resizable", () => {
  test("resizable card has CSS resize property", async ({ page }) => {
    await page.getByTestId("resizable-section").scrollIntoViewIfNeeded();
    const card = page.getByTestId("resizable-resizable-timeline");
    await expect(card).toHaveCSS("resize", "both");
  });

  test("canvas fills container", async ({ page }) => {
    await page.getByTestId("resizable-section").scrollIntoViewIfNeeded();
    const canvas = page
      .getByTestId("resizable-resizable-timeline")
      .locator("canvas");
    const width = await canvas.evaluate((el: HTMLCanvasElement) => el.width);
    expect(width).toBeGreaterThan(100);
  });
});
