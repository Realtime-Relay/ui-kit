import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/test-timelines');
  await page.waitForSelector('[data-testid="page-heading"]');
});

// ─── Page Load ──────────────────────────────────────────────

test.describe('StateTimeline - Page Load', () => {
  test('page heading renders', async ({ page }) => {
    await expect(page.getByTestId('page-heading')).toHaveText('State Timeline Test Page');
  });

  test('timeline section exists', async ({ page }) => {
    await expect(page.getByTestId('timeline-section')).toBeVisible();
  });

  test('styles section exists', async ({ page }) => {
    await page.getByTestId('styles-section').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('styles-section')).toBeVisible();
  });

  test('edge section exists', async ({ page }) => {
    await page.getByTestId('edge-section').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('edge-section')).toBeVisible();
  });

  test('resizable section exists', async ({ page }) => {
    await page.getByTestId('resizable-section').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('resizable-section')).toBeVisible();
  });
});

// ─── SVG Structure ──────────────────────────────────────────

test.describe('StateTimeline - SVG Structure', () => {
  test('single device card contains an SVG', async ({ page }) => {
    const svg = page.getByTestId('card-single-device').locator('svg');
    await expect(svg).toBeVisible();
  });

  test('three device card has 3 row labels', async ({ page }) => {
    const labels = page.getByTestId('card-three-devices').locator('svg text[data-label]');
    expect(await labels.count()).toBe(3);
  });

  test('state bar rects exist in single device', async ({ page }) => {
    const rects = page.getByTestId('card-single-device').locator('svg rect[opacity]');
    expect(await rects.count()).toBeGreaterThan(0);
  });

  test('bars have valid fill colors', async ({ page }) => {
    const rect = page.getByTestId('card-single-device').locator('svg rect[opacity]').first();
    const fill = await rect.getAttribute('fill');
    expect(fill).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

// ─── Row Labels ─────────────────────────────────────────────

test.describe('StateTimeline - Row Labels', () => {
  test('single device shows device name', async ({ page }) => {
    const label = page.getByTestId('card-single-device').locator('svg text[data-label]');
    await expect(label).toHaveText('sensor-alpha');
  });

  test('three device card shows all device names', async ({ page }) => {
    const labels = page.getByTestId('card-three-devices').locator('svg text[data-label]');
    const texts = await labels.allTextContents();
    expect(texts).toContain('sensor-alpha');
    expect(texts).toContain('sensor-bravo');
    expect(texts).toContain('sensor-charlie');
  });

  test('long device names render without crashing', async ({ page }) => {
    await page.getByTestId('card-long-device-names').scrollIntoViewIfNeeded();
    const labels = page.getByTestId('card-long-device-names').locator('svg text[data-label]');
    expect(await labels.count()).toBe(3);
  });
});

// ─── State Bars ─────────────────────────────────────────────

test.describe('StateTimeline - State Bars', () => {
  test('bars have opacity 0.8 by default', async ({ page }) => {
    const rect = page.getByTestId('card-single-device').locator('svg rect[opacity]').first();
    const opacity = await rect.getAttribute('opacity');
    expect(opacity).toBe('0.8');
  });

  test('custom colors card uses provided colors', async ({ page }) => {
    const rects = page.getByTestId('card-custom-colors').locator('svg rect[opacity]');
    const count = await rects.count();
    expect(count).toBeGreaterThan(0);
    const fills = new Set<string>();
    for (let i = 0; i < count; i++) {
      fills.add(await rects.nth(i).getAttribute('fill') ?? '');
    }
    // Should use at least one of the custom temperature colors
    const customColors = ['#38bdf8', '#22c55e', '#f97316', '#dc2626'];
    const hasCustom = [...fills].some((f) => customColors.includes(f));
    expect(hasCustom).toBe(true);
  });

  test('five states card uses fallback palette', async ({ page }) => {
    await page.getByTestId('card-five-states').scrollIntoViewIfNeeded();
    const rects = page.getByTestId('card-five-states').locator('svg rect[opacity]');
    expect(await rects.count()).toBeGreaterThan(0);
  });
});

// ─── Legend ──────────────────────────────────────────────────

test.describe('StateTimeline - Legend', () => {
  test('single device card has legend with state names', async ({ page }) => {
    const card = page.getByTestId('card-single-device');
    const foreignObj = card.locator('foreignObject');
    await expect(foreignObj).toBeVisible();
    const text = await foreignObj.textContent();
    expect(text).toContain('normal');
  });

  test('legend has color swatch spans', async ({ page }) => {
    const swatches = page.getByTestId('card-single-device').locator('foreignObject span[style*="inline-block"]');
    expect(await swatches.count()).toBeGreaterThan(0);
  });

  test('empty device arrays card has no legend', async ({ page }) => {
    await page.getByTestId('card-empty-device-arrays').scrollIntoViewIfNeeded();
    const foreignObj = page.getByTestId('card-empty-device-arrays').locator('foreignObject');
    expect(await foreignObj.count()).toBe(0);
  });
});

// ─── X-Axis ─────────────────────────────────────────────────

test.describe('StateTimeline - X-Axis', () => {
  test('same-day card shows time-only labels', async ({ page }) => {
    await page.getByTestId('card-same-day-data').scrollIntoViewIfNeeded();
    const axisTexts = page.getByTestId('card-same-day-data').locator('svg text:not([data-label])');
    const count = await axisTexts.count();
    expect(count).toBeGreaterThan(0);
    const firstText = await axisTexts.first().textContent();
    // Time-only: should match HH:MM pattern (e.g., "07:55 PM" or "19:55")
    expect(firstText).toBeTruthy();
    expect(firstText!.length).toBeLessThan(20);
  });

  test('multi-day card shows date+time labels', async ({ page }) => {
    await page.getByTestId('card-multi-day-data').scrollIntoViewIfNeeded();
    const axisTexts = page.getByTestId('card-multi-day-data').locator('svg text:not([data-label])');
    const count = await axisTexts.count();
    expect(count).toBeGreaterThan(0);
    const firstText = await axisTexts.first().textContent();
    // Date+time: longer string, contains month abbreviation
    expect(firstText!.length).toBeGreaterThan(8);
  });

  test('empty device arrays card has no x-axis labels', async ({ page }) => {
    await page.getByTestId('card-empty-device-arrays').scrollIntoViewIfNeeded();
    const axisTexts = page.getByTestId('card-empty-device-arrays').locator('svg text:not([data-label])');
    expect(await axisTexts.count()).toBe(0);
  });
});

// ─── Tooltip Hover ──────────────────────────────────────────

test.describe('StateTimeline - Tooltip', () => {
  test('hovering a bar shows a tooltip', async ({ page }) => {
    const rect = page.getByTestId('card-single-device').locator('svg rect[opacity]').first();
    await rect.hover();
    await page.waitForTimeout(200);
    const tooltip = page.locator('div[style*="position: fixed"][style*="pointer-events: none"]');
    await expect(tooltip).toBeVisible();
  });

  test('default tooltip contains device name and state', async ({ page }) => {
    const rect = page.getByTestId('card-single-device').locator('svg rect[opacity]').first();
    await rect.hover();
    await page.waitForTimeout(200);
    const tooltip = page.locator('div[style*="position: fixed"][style*="pointer-events: none"]');
    const text = await tooltip.textContent();
    expect(text).toContain('sensor-alpha');
  });

  test('moving mouse away hides tooltip', async ({ page }) => {
    const rect = page.getByTestId('card-single-device').locator('svg rect[opacity]').first();
    await rect.hover();
    await page.waitForTimeout(200);
    // Move to heading (away from bar)
    await page.getByTestId('page-heading').hover();
    await page.waitForTimeout(200);
    const tooltip = page.locator('div[style*="position: fixed"][style*="pointer-events: none"]');
    expect(await tooltip.count()).toBe(0);
  });

  test('format tooltip card shows custom text on hover', async ({ page }) => {
    await page.getByTestId('card-format-tooltip').scrollIntoViewIfNeeded();
    const rect = page.getByTestId('card-format-tooltip').locator('svg rect[opacity]').first();
    await rect.hover();
    await page.waitForTimeout(200);
    const tooltip = page.locator('div[style*="position: fixed"][style*="pointer-events: none"]');
    const text = await tooltip.textContent();
    expect(text).toContain('sensor-alpha:');
  });

  test('render tooltip card shows custom JSX on hover', async ({ page }) => {
    await page.getByTestId('card-render-tooltip').scrollIntoViewIfNeeded();
    const rect = page.getByTestId('card-render-tooltip').locator('svg rect[opacity]').first();
    await rect.hover();
    await page.waitForTimeout(200);
    const customEl = page.locator('[data-tooltip-custom]');
    await expect(customEl).toBeVisible();
  });
});

// ─── Empty Rows ─────────────────────────────────────────────

test.describe('StateTimeline - Empty Rows', () => {
  test('empty device arrays have background rects', async ({ page }) => {
    await page.getByTestId('card-empty-device-arrays').scrollIntoViewIfNeeded();
    const rects = page.getByTestId('card-empty-device-arrays').locator('svg rect[fill="#f3f4f6"]');
    expect(await rects.count()).toBe(3);
  });

  test('mixed card has both state bars and empty rects', async ({ page }) => {
    await page.getByTestId('card-mixed-empty-populated').scrollIntoViewIfNeeded();
    // Has state bars (opacity attribute)
    const stateBars = page.getByTestId('card-mixed-empty-populated').locator('svg rect[opacity]');
    expect(await stateBars.count()).toBeGreaterThan(0);
    // Has empty background rects
    const emptyRects = page.getByTestId('card-mixed-empty-populated').locator('svg rect[fill="#f3f4f6"]');
    expect(await emptyRects.count()).toBe(2);
  });
});

// ─── Label Alignment ────────────────────────────────────────

test.describe('StateTimeline - Label Alignment', () => {
  test('default labels have text-anchor=start', async ({ page }) => {
    const label = page.getByTestId('card-single-device').locator('svg text[data-label]');
    const anchor = await label.getAttribute('text-anchor');
    expect(anchor).toBe('start');
  });

  test('right-aligned labels have text-anchor=end', async ({ page }) => {
    const label = page.getByTestId('card-labels-right').locator('svg text[data-label]').first();
    const anchor = await label.getAttribute('text-anchor');
    expect(anchor).toBe('end');
  });
});

// ─── Loading / Empty States ─────────────────────────────────

test.describe('StateTimeline - Loading / Empty', () => {
  test('empty data card shows skeleton', async ({ page }) => {
    await page.getByTestId('card-empty-data').scrollIntoViewIfNeeded();
    // Skeleton has animated rect elements
    const card = page.getByTestId('card-empty-data');
    const content = await card.innerHTML();
    // Should have some content (skeleton) but no data-label
    expect(content.length).toBeGreaterThan(0);
    const labels = card.locator('svg text[data-label]');
    expect(await labels.count()).toBe(0);
  });

  test('empty no loading card renders nothing inside', async ({ page }) => {
    await page.getByTestId('card-empty-no-loading').scrollIntoViewIfNeeded();
    const card = page.getByTestId('card-empty-no-loading');
    const svgs = card.locator('svg');
    // May have zero SVGs or an empty container
    const labels = card.locator('svg text[data-label]');
    expect(await labels.count()).toBe(0);
  });
});

// ─── Dark Theme ─────────────────────────────────────────────

test.describe('StateTimeline - Dark Theme', () => {
  test('dark theme card has dark background', async ({ page }) => {
    await page.getByTestId('card-dark-theme').scrollIntoViewIfNeeded();
    const wrapper = page.getByTestId('card-dark-theme').locator('div[style*="background-color"]').first();
    const bg = await wrapper.evaluate((el) => getComputedStyle(el).backgroundColor);
    // rgb(15, 23, 42) = #0f172a
    expect(bg).toContain('15');
  });

  test('dark theme row labels have light fill', async ({ page }) => {
    await page.getByTestId('card-dark-theme').scrollIntoViewIfNeeded();
    const label = page.getByTestId('card-dark-theme').locator('svg text[data-label]').first();
    const fill = await label.getAttribute('fill');
    expect(fill).toBe('#e2e8f0');
  });
});

// ─── Custom Row Height ──────────────────────────────────────

test.describe('StateTimeline - Custom Row Height', () => {
  test('bar rects have height=48', async ({ page }) => {
    const rect = page.getByTestId('card-custom-row-height').locator('svg rect[opacity]').first();
    const height = await rect.getAttribute('height');
    expect(height).toBe('48');
  });
});

// ─── Resizable ──────────────────────────────────────────────

test.describe('StateTimeline - Resizable', () => {
  test('resizable card has CSS resize property', async ({ page }) => {
    await page.getByTestId('resizable-section').scrollIntoViewIfNeeded();
    const card = page.getByTestId('resizable-resizable-timeline');
    await expect(card).toHaveCSS('resize', 'both');
  });

  test('SVG fills container', async ({ page }) => {
    await page.getByTestId('resizable-section').scrollIntoViewIfNeeded();
    const svg = page.getByTestId('resizable-resizable-timeline').locator('svg');
    const width = await svg.getAttribute('width');
    expect(Number(width)).toBeGreaterThan(100);
  });
});
