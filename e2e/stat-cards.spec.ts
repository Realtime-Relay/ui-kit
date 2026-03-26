import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/test-statcards');
  await page.waitForSelector('[data-testid="page-heading"]');
});

// ─── Page Load ───────────────────────────────────────────────

test.describe('StatCards - Page Load', () => {
  test('page heading renders', async ({ page }) => {
    await expect(page.getByTestId('page-heading')).toHaveText('StatCard Test Page');
  });

  test('statcard section exists', async ({ page }) => {
    await expect(page.getByTestId('statcard-section')).toBeVisible();
  });

  test('sparkline section exists', async ({ page }) => {
    const section = page.getByTestId('sparkline-section');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
  });
});

// ─── StatCard - Value Types ──────────────────────────────────

test.describe('StatCard - Value Types', () => {
  test('default numeric shows "42.5"', async ({ page }) => {
    const card = page.getByTestId('card-statcard-default');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(card).toContainText('42.5');
  });

  test('string value shows "Running"', async ({ page }) => {
    const card = page.getByTestId('card-statcard-string-value');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(card).toContainText('Running');
  });

  test('boolean value shows "true"', async ({ page }) => {
    const card = page.getByTestId('card-statcard-boolean-value');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(card).toContainText('true');
  });

  test('object value shows JSON.stringify output', async ({ page }) => {
    const card = page.getByTestId('card-statcard-object-value');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(card).toContainText('temp');
    await expect(card).toContainText('23.5');
  });

  test('custom formatValue shows "$1234.57"', async ({ page }) => {
    const card = page.getByTestId('card-statcard-custom-format');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(card).toContainText('$1234.57');
  });
});

// ─── StatCard - Labels ───────────────────────────────────────

test.describe('StatCard - Labels', () => {
  test('label "temperature" visible', async ({ page }) => {
    const card = page.getByTestId('card-statcard-default');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(card).toContainText('temperature');
  });

  test('styled card shows "temp" label', async ({ page }) => {
    const card = page.getByTestId('card-statcard-styled');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(card).toContainText('temp');
  });
});

// ─── StatCard - Timestamp ────────────────────────────────────

test.describe('StatCard - Timestamp', () => {
  test('with timestamp card shows dd MMM yyyy pattern', async ({ page }) => {
    const card = page.getByTestId('card-statcard-with-timestamp');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const text = await card.textContent();
    // Matches patterns like "26 Mar 2026" (dd MMM yyyy)
    expect(text).toMatch(/\d{1,2}\s\w{3}\s\d{4}/);
  });

  test('custom timestamp shows "custom-ts"', async ({ page }) => {
    const card = page.getByTestId('card-statcard-custom-timestamp');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(card).toContainText('custom-ts');
  });

  test('no timestamp card does NOT show dd MMM yyyy pattern', async ({ page }) => {
    const card = page.getByTestId('card-statcard-no-timestamp');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const text = await card.textContent();
    expect(text).not.toMatch(/\d{1,2}\s\w{3}\s\d{4}/);
  });
});

// ─── StatCard - Alert Zones ──────────────────────────────────

test.describe('StatCard - Alert Zones', () => {
  test('green zone (value=20): value text has green color', async ({ page }) => {
    const card = page.getByTestId('card-statcard-alert-zones-green');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    // The value div has fontWeight 700
    const valueEl = card.locator('div[style*="font-weight: 700"]');
    await expect(valueEl).toHaveCSS('color', 'rgb(34, 197, 94)');
  });

  test('red zone (value=85): value text has red color', async ({ page }) => {
    const card = page.getByTestId('card-statcard-alert-zones-red');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const valueEl = card.locator('div[style*="font-weight: 700"]');
    await expect(valueEl).toHaveCSS('color', 'rgb(239, 68, 68)');
  });

  test('zone override: value text has purple color, NOT red', async ({ page }) => {
    const card = page.getByTestId('card-statcard-zone-override-color');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const valueEl = card.locator('div[style*="font-weight: 700"]');
    await expect(valueEl).toHaveCSS('color', 'rgb(124, 58, 237)');
  });
});

// ─── StatCard - Styling ──────────────────────────────────────

test.describe('StatCard - Styling', () => {
  test('background color applied', async ({ page }) => {
    const card = page.getByTestId('card-statcard-styled');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    // The inner StatCard container has backgroundColor #f8fafc
    const inner = card.locator('div[style*="background-color"]');
    await expect(inner.first()).toHaveCSS('background-color', 'rgb(248, 250, 252)');
  });

  test('sharp edges has borderRadius 0px', async ({ page }) => {
    const card = page.getByTestId('card-statcard-sharp-edges');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    // The inner StatCard container with border-radius: 0
    const inner = card.locator('div[style*="border-radius: 0"]');
    await expect(inner.first()).toHaveCSS('border-radius', '0px');
  });

  test('explicit size card has correct width/height', async ({ page }) => {
    const card = page.getByTestId('card-statcard-explicit-size');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    // StatCard with styles={{ width: 250, height: 120 }}
    const inner = card.locator('div[style*="width: 250px"]');
    await expect(inner.first()).toHaveCSS('width', '250px');
    await expect(inner.first()).toHaveCSS('height', '120px');
  });
});

// ─── StatCard - Loading ──────────────────────────────────────

test.describe('StatCard - Loading', () => {
  test('loading skeleton visible (shimmer animation)', async ({ page }) => {
    const card = page.getByTestId('card-statcard-loading');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const shimmer = card.locator('div[style*="relay-skeleton-shimmer"]');
    await expect(shimmer).toBeVisible();
  });

  test('null without loading does NOT show shimmer', async ({ page }) => {
    const card = page.getByTestId('card-statcard-null-no-loading');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const shimmer = card.locator('div[style*="relay-skeleton-shimmer"]');
    await expect(shimmer).toHaveCount(0);
  });
});

// ─── StatCardWithGraph - Sparkline ───────────────────────────

test.describe('StatCardWithGraph - Sparkline', () => {
  test('default sparkline has SVG with path elements', async ({ page }) => {
    const card = page.getByTestId('card-sparkline-default');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const svg = card.locator('svg');
    await expect(svg).toBeVisible();
    const paths = card.locator('svg path');
    expect(await paths.count()).toBeGreaterThanOrEqual(1);
  });

  test('SVG has preserveAspectRatio="none"', async ({ page }) => {
    const card = page.getByTestId('card-sparkline-default');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const svg = card.locator('svg');
    await expect(svg).toHaveAttribute('preserveAspectRatio', 'none');
  });

  test('no extractor card has no SVG path', async ({ page }) => {
    const card = page.getByTestId('card-sparkline-no-extractor');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const svg = card.locator('svg');
    // Either no SVG at all or SVG with no path
    const svgCount = await svg.count();
    if (svgCount > 0) {
      const paths = card.locator('svg path');
      await expect(paths).toHaveCount(0);
    }
  });

  test('custom graph color: sparkline path has stroke="#ef4444"', async ({ page }) => {
    const card = page.getByTestId('card-sparkline-custom-graph-color');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    // The line path (not the area fill) has stroke set
    const linePath = card.locator('svg path[stroke="#ef4444"]');
    await expect(linePath).toBeVisible();
  });
});

// ─── StatCardWithGraph - Alert Zone Colors ───────────────────

test.describe('StatCardWithGraph - Alert Zone Colors', () => {
  test('red zone: sparkline stroke color matches red zone', async ({ page }) => {
    const card = page.getByTestId('card-sparkline-alert-zones-red');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    // Zone color for value=85 is #ef4444 (red)
    const linePath = card.locator('svg path[stroke="#ef4444"]');
    await expect(linePath).toBeVisible();
  });

  test('zone color override: sparkline stroke stays purple', async ({ page }) => {
    const card = page.getByTestId('card-sparkline-zone-color-override');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    // graphLineColor="#7c3aed" overrides the zone color
    const linePath = card.locator('svg path[stroke="#7c3aed"]');
    await expect(linePath).toBeVisible();
  });
});

// ─── StatCardWithGraph - Dark Theme ──────────────────────────

test.describe('StatCardWithGraph - Dark Theme', () => {
  test('dark background is applied', async ({ page }) => {
    const card = page.getByTestId('card-sparkline-dark-theme');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    // background: { color: '#0f172a' }
    const inner = card.locator('div[style*="background-color"]');
    await expect(inner.first()).toHaveCSS('background-color', 'rgb(15, 23, 42)');
  });
});

// ─── StatCardWithGraph - Loading ─────────────────────────────

test.describe('StatCardWithGraph - Loading', () => {
  test('loading state has shimmer, no SVG', async ({ page }) => {
    const card = page.getByTestId('card-sparkline-loading');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const shimmer = card.locator('div[style*="relay-skeleton-shimmer"]');
    await expect(shimmer).toBeVisible();
    const svg = card.locator('svg');
    await expect(svg).toHaveCount(0);
  });
});
