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
      // Mask the two non-deterministic regions so this stays a stable check of
      // OUR layout: the hero runs a continuous shader/beam animation (different
      // frame every run), and artist avatars load from external CDNs on variable
      // timing. The hero logo is covered by the smoke suite instead.
      mask: [page.locator('.hero'), page.locator('.tile__img')],
    });
  });
}
