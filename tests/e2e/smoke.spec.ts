import { test, expect } from '@playwright/test';

test('hero renders the logo', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1.hero__logo')).toContainText('DJ');
});

test('clicking a tile then a track mounts the deck iframe', async ({ page }) => {
  await page.goto('/');
  await page.locator('.tile').first().click();
  await expect(page.locator('.drawer')).toHaveAttribute('aria-hidden', 'false');
  await page.locator('.drawer__row').first().click();
  const iframe = page.locator('.deck iframe');
  await expect(iframe).toHaveCount(1);
  const src = await iframe.getAttribute('src');
  expect(src).toMatch(/youtube-nocookie\.com|w\.soundcloud\.com|mixcloud\.com\/widget/);
});

test('the deck iframe survives scrolling (keeps playing while browsing)', async ({ page }) => {
  await page.goto('/');
  await page.locator('.tile').first().click();
  await page.locator('.drawer__row').first().click();
  const before = await page.locator('.deck iframe').getAttribute('src');
  await page.mouse.wheel(0, 2000);
  const after = await page.locator('.deck iframe').getAttribute('src');
  expect(after).toBe(before);
});

test('the deck tip button opens the donate modal', async ({ page }) => {
  await page.goto('/');
  await page.locator('.deck .tip-button').click();
  await expect(page.locator('.donate')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('.donate__chip')).toHaveCount(3);
});
