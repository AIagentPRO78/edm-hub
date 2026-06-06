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

test('the player is not reset by scrolling (keeps playing while browsing)', async ({ page }) => {
  await page.goto('/');
  await page.locator('.tile').first().click();
  await page.locator('.drawer__row').first().click();
  const nowPlaying = await page.locator('.deck__title').textContent();
  await page.mouse.wheel(0, 2000);
  // scrolling must not tear down or change the player
  await expect(page.locator('.deck iframe')).toHaveCount(1);
  expect(await page.locator('.deck__title').textContent()).toBe(nowPlaying);
});

test('the deck tip button opens the donate modal', async ({ page }) => {
  await page.goto('/');
  await page.locator('.deck .tip-button').click();
  await expect(page.locator('.donate')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('.donate__chip')).toHaveCount(3);
});
