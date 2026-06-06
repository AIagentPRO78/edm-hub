import { test, expect } from '@playwright/test';

const BREAKPOINTS = [320, 768, 1024, 1440];

for (const width of BREAKPOINTS) {
  test(`homepage @ ${width}px`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(`home-${width}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
}
