import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/test-progress');
  await page.waitForSelector('[data-testid="page-heading"]');
});

// ─── Page Load ───────────────────────────────────────────────

test.describe('ProgressBar - Page Load', () => {
  test('page heading renders', async ({ page }) => {
    await expect(page.getByTestId('page-heading')).toHaveText('Progress Bar Test Page');
  });

  test('basic section exists', async ({ page }) => {
    await expect(page.getByTestId('basic-section')).toBeVisible();
  });

  test('zones section exists', async ({ page }) => {
    await page.getByTestId('zones-section').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('zones-section')).toBeVisible();
  });
});

// ─── Basic Rendering ─────────────────────────────────────────

test.describe('ProgressBar - Basic Rendering', () => {
  test('default bar renders', async ({ page }) => {
    const card = page.getByTestId('card-default');
    await expect(card).toBeVisible();
    // Should have a container with overflow hidden
    const bar = card.locator('[style*="overflow: hidden"]');
    await expect(bar).toBeVisible();
  });

  test('with label shows value text', async ({ page }) => {
    const card = page.getByTestId('card-with-label');
    const span = card.locator('span');
    await expect(span).toContainText('65');
  });

  test('no label has no span', async ({ page }) => {
    const card = page.getByTestId('card-no-label');
    const bar = card.locator('[style*="overflow: hidden"]').first();
    const spans = bar.locator('span');
    expect(await spans.count()).toBe(0);
  });

  test('formatValue applies custom format', async ({ page }) => {
    const card = page.getByTestId('card-format-value');
    const span = card.locator('span');
    await expect(span).toContainText('65.8°C');
  });
});

// ─── Fill Behavior ───────────────────────────────────────────

test.describe('ProgressBar - Fill Behavior', () => {
  test('value=0 has 0% fill', async ({ page }) => {
    const card = page.getByTestId('card-value-zero');
    const fill = card.locator('[style*="border-radius: inherit"]').first();
    const width = await fill.evaluate(el => el.style.width);
    expect(width).toBe('0%');
  });

  test('value=max has 100% fill', async ({ page }) => {
    const card = page.getByTestId('card-value-max');
    const fill = card.locator('[style*="border-radius: inherit"]').first();
    const width = await fill.evaluate(el => el.style.width);
    expect(width).toBe('100%');
  });

  test('value over max is clamped to 100% fill', async ({ page }) => {
    const card = page.getByTestId('card-value-over-max');
    const fill = card.locator('[style*="border-radius: inherit"]').first();
    const width = await fill.evaluate(el => el.style.width);
    expect(width).toBe('100%');
  });

  test('value under min is clamped to 0% fill', async ({ page }) => {
    const card = page.getByTestId('card-value-under-min');
    const fill = card.locator('[style*="border-radius: inherit"]').first();
    const width = await fill.evaluate(el => el.style.width);
    expect(width).toBe('0%');
  });

  test('fill has smooth transition', async ({ page }) => {
    const card = page.getByTestId('card-default');
    const fill = card.locator('[style*="transition"]').first();
    const transition = await fill.evaluate(el => el.style.transition);
    expect(transition).toContain('300ms');
  });
});

// ─── Alert Zones ─────────────────────────────────────────────

test.describe('ProgressBar - Alert Zones', () => {
  test('traffic light zones render 3 zone bands', async ({ page }) => {
    await page.getByTestId('card-traffic-light-zones').scrollIntoViewIfNeeded();
    const card = page.getByTestId('card-traffic-light-zones');
    const zoneBands = card.locator('[style*="opacity: 0.15"]');
    expect(await zoneBands.count()).toBe(3);
  });

  test('cool-to-hot renders 4 zone bands', async ({ page }) => {
    await page.getByTestId('card-cool-to-hot-zones').scrollIntoViewIfNeeded();
    const card = page.getByTestId('card-cool-to-hot-zones');
    const zoneBands = card.locator('[style*="opacity: 0.15"]');
    expect(await zoneBands.count()).toBe(4);
  });

  test('hidden zones has no zone bands', async ({ page }) => {
    await page.getByTestId('card-zones-hidden').scrollIntoViewIfNeeded();
    const card = page.getByTestId('card-zones-hidden');
    const zoneBands = card.locator('[style*="opacity: 0.15"]');
    expect(await zoneBands.count()).toBe(0);
  });

  test('zone tooltip areas have title attribute', async ({ page }) => {
    await page.getByTestId('card-traffic-light-zones').scrollIntoViewIfNeeded();
    const card = page.getByTestId('card-traffic-light-zones');
    const tooltipAreas = card.locator('[title]');
    expect(await tooltipAreas.count()).toBe(3);
  });

  test('zone tooltip shows correct range', async ({ page }) => {
    await page.getByTestId('card-traffic-light-zones').scrollIntoViewIfNeeded();
    const card = page.getByTestId('card-traffic-light-zones');
    const firstTooltip = card.locator('[title]').first();
    const title = await firstTooltip.getAttribute('title');
    expect(title).toContain('0');
    expect(title).toContain('40');
  });

  test('fill color matches zone color for value in green zone', async ({ page }) => {
    await page.getByTestId('card-zones-value-in-green').scrollIntoViewIfNeeded();
    const card = page.getByTestId('card-zones-value-in-green');
    const fill = card.locator('[style*="border-radius: inherit"]').first();
    const bg = await fill.evaluate(el => getComputedStyle(el).backgroundColor);
    // Green zone: #22c55e = rgb(34, 197, 94)
    expect(bg).toBe('rgb(34, 197, 94)');
  });

  test('fill color matches zone for value in red zone', async ({ page }) => {
    await page.getByTestId('card-zones-value-in-red').scrollIntoViewIfNeeded();
    const card = page.getByTestId('card-zones-value-in-red');
    const fill = card.locator('[style*="border-radius: inherit"]').first();
    const bg = await fill.evaluate(el => getComputedStyle(el).backgroundColor);
    // Red zone: #ef4444 = rgb(239, 68, 68)
    expect(bg).toBe('rgb(239, 68, 68)');
  });
});

// ─── Styling ─────────────────────────────────────────────────

test.describe('ProgressBar - Styling', () => {
  test('custom background color is applied', async ({ page }) => {
    await page.getByTestId('card-custom-background').scrollIntoViewIfNeeded();
    const card = page.getByTestId('card-custom-background');
    const bar = card.locator('[style*="overflow: hidden"]').first();
    const bg = await bar.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(bg).toBe('rgb(241, 245, 249)');
  });

  test('tall bar has 48px height', async ({ page }) => {
    await page.getByTestId('card-tall-bar').scrollIntoViewIfNeeded();
    const card = page.getByTestId('card-tall-bar');
    const bar = card.locator('[style*="overflow: hidden"]').first();
    const height = await bar.evaluate(el => el.style.height);
    expect(height).toBe('48px');
  });

  test('thin bar has 8px height', async ({ page }) => {
    await page.getByTestId('card-thin-bar').scrollIntoViewIfNeeded();
    const card = page.getByTestId('card-thin-bar');
    const bar = card.locator('[style*="overflow: hidden"]').first();
    const height = await bar.evaluate(el => el.style.height);
    expect(height).toBe('8px');
  });

  test('custom width 60% is applied', async ({ page }) => {
    await page.getByTestId('card-custom-width-60pct').scrollIntoViewIfNeeded();
    const card = page.getByTestId('card-custom-width-60pct');
    const bar = card.locator('[style*="overflow: hidden"]').first();
    const width = await bar.evaluate(el => el.style.width);
    expect(width).toBe('60%');
  });

  test('custom width 300px is applied', async ({ page }) => {
    await page.getByTestId('card-custom-width-300px').scrollIntoViewIfNeeded();
    const card = page.getByTestId('card-custom-width-300px');
    const bar = card.locator('[style*="overflow: hidden"]').first();
    const width = await bar.evaluate(el => el.style.width);
    expect(width).toBe('300px');
  });
});

// ─── Orientation ─────────────────────────────────────────────

test.describe('ProgressBar - Orientation', () => {
  test('vertical bar renders', async ({ page }) => {
    await page.getByTestId('card-vertical-default').scrollIntoViewIfNeeded();
    const card = page.getByTestId('card-vertical-default');
    const bar = card.locator('[style*="overflow: hidden"]').first();
    await expect(bar).toBeVisible();
  });

  test('vertical bar with zones renders', async ({ page }) => {
    await page.getByTestId('card-vertical-zones').scrollIntoViewIfNeeded();
    const card = page.getByTestId('card-vertical-zones');
    const bar = card.locator('[style*="overflow: hidden"]').first();
    await expect(bar).toBeVisible();
  });
});

// ─── Loading ─────────────────────────────────────────────────

test.describe('ProgressBar - Loading', () => {
  test('loading state shows skeleton shimmer', async ({ page }) => {
    await page.getByTestId('card-loading-state').scrollIntoViewIfNeeded();
    const card = page.getByTestId('card-loading-state');
    const shimmer = card.locator('[style*="shimmer"]');
    await expect(shimmer).toBeVisible();
  });
});

// ─── Last Updated Timestamp ──────────────────────────────────

test.describe('ProgressBar - Last Updated', () => {
  test('shows timestamp in default format (dd MMM yyyy)', async ({ page }) => {
    await page.getByTestId('lastupdated-section').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const card = page.getByTestId('card-with-timestamp');
    const text = await card.textContent();
    // Default format: "26 Mar 2026 HH:MM:SS.sss +TZ"
    expect(text).toMatch(/\d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}/);
  });

  test('shows timestamp with zones', async ({ page }) => {
    await page.getByTestId('card-timestamp-with-zones').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const card = page.getByTestId('card-timestamp-with-zones');
    const text = await card.textContent();
    expect(text).toMatch(/\d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}/);
  });

  test('custom formatTimestamp renders custom format', async ({ page }) => {
    await page.getByTestId('card-custom-timestamp-format').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const card = page.getByTestId('card-custom-timestamp-format');
    const text = await card.textContent();
    expect(text).toMatch(/\d{1,2}:\d{2} UTC/);
  });

  test('no timestamp without showLastUpdated', async ({ page }) => {
    await page.getByTestId('card-no-timestamp-default-').scrollIntoViewIfNeeded();
    const card = page.getByTestId('card-no-timestamp-default-');
    const text = await card.textContent();
    expect(text).not.toMatch(/\d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}/);
  });
});

// ─── Resizable ───────────────────────────────────────────────

test.describe('ProgressBar - Resizable', () => {
  test('resizable cards have CSS resize property', async ({ page }) => {
    await page.getByTestId('resizable-section').scrollIntoViewIfNeeded();
    const card = page.getByTestId('resizable-resizable-default');
    const resize = await card.evaluate(el => getComputedStyle(el).resize);
    expect(resize).toBe('both');
  });

  test('resizable card shows hint text', async ({ page }) => {
    await page.getByTestId('resizable-section').scrollIntoViewIfNeeded();
    await expect(page.locator('text=drag corner to resize').first()).toBeVisible();
  });
});
