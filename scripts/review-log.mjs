import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
const output = path.resolve('public/devlog');
await mkdir(output, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('http://127.0.0.1:5177/devlog.html?scoutTheme=dark', { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    for (const image of document.images) {
      image.loading = 'eager';
      await image.decode();
    }
  });
  await page.screenshot({ path: path.join(output, 'review-desktop.png') });
  await page.getByRole('tab', { name: 'Blue hour', exact: true }).click();
  assert.ok((await page.locator('#lighting-image').getAttribute('src')).endsWith('03-evening.png'));
  await page.locator('#comparison-slider').fill('28');
  assert.ok((await page.locator('#after-image').getAttribute('style')).includes('28%'));
  await page.getByLabel('Needs work', { exact: true }).check();
  await page.getByLabel('Push this street\'s realism further', { exact: true }).check();
  await page.getByLabel('Keep', { exact: true }).fill('Automated persistence check');
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.getByLabel('Needs work', { exact: true }).isChecked(), true);
  assert.equal(await page.getByLabel('Keep', { exact: true }).inputValue(), 'Automated persistence check');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export review', exact: true }).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), 'bely-checkpoint-03-review.json');
  await page.evaluate(() => localStorage.removeItem('bely-review-checkpoint-03'));
  await page.locator('#motion-video').scrollIntoViewIfNeeded();
  await page.evaluate(async () => { await document.querySelector('#motion-video').play(); });
  await page.waitForFunction(() => document.querySelector('#motion-video').currentTime > 0.2);
  assert.ok(await page.evaluate(() => document.querySelector('#motion-video').videoWidth > 0));
  await page.evaluate(() => document.querySelector('#motion-video').pause());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(output, 'review-mobile.png') });
  const layout = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth, brokenImages: Array.from(document.images).filter((image) => image.complete && image.naturalWidth === 0).length }));
  assert.ok(layout.content <= layout.viewport + 1, 'review log must fit a mobile viewport');
  assert.equal(layout.brokenImages, 0);
  assert.deepEqual(errors, []);
  console.log('PASS: review images, lighting tabs, comparison slider, local persistence, JSON export, actual video playback, and 390px layout.');
  console.log('CAPTURED review-desktop.png and review-mobile.png.');
} finally {
  await browser.close();
}