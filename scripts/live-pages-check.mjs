import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = 'https://ahmedismaiel.github.io/bely/';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
await mkdir('node_modules/.cache', { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  const response = await page.goto(`${base}?lang=ar&debug=1`, { waitUntil: 'networkidle', timeout: 90000 });
  assert.equal(response.status(), 200);
  await page.waitForFunction(() => window.__bely?.ready, null, { timeout: 90000 });
  await page.locator('#loading').waitFor({ state: 'hidden' });
  const game = await page.evaluate(() => ({ state: window.__bely.state(), pixels: window.__bely.pixels(), origin: performance.timeOrigin }));
  assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
  assert.equal(game.state.mobileProfile, true);
  assert.ok(game.pixels.meanBrightness > 8 && game.pixels.meanBrightness < 245);
  await page.locator('#open-collection').click();
  const studio = page.frameLocator('#showroom-overlay iframe');
  await page.waitForFunction(() => document.querySelector('#showroom-overlay iframe')?.contentWindow?.__showroom?.ready === true, null, { timeout: 90000 });
  await studio.locator('#studio-loading').waitFor({ state: 'hidden', timeout: 90000 });
  assert.ok(await studio.locator('.studio-skin').count() >= 90);
  await studio.locator('[data-pose="core"]').click();
  await studio.locator('#back-to-game').click();
  await page.locator('#showroom-overlay').waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => performance.timeOrigin), game.origin);
  assert.equal(await page.evaluate(() => window.__bely.state().match.paused), false);
  console.log('PASS: live Arabic mobile game, nonblank WebGL canvas, 100-marble studio, and state-preserving return.');
  const log = await page.goto(`${base}devlog.html?lang=ar`, { waitUntil: 'networkidle' });
  assert.equal(log.status(), 200);
  assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
  assert.ok(/[\u0600-\u06ff]/.test(await page.locator('h1').innerText()));
  const hero = page.locator('main > figure img').first();
  await hero.evaluate((image) => image.decode());
  assert.ok(await hero.evaluate((image) => image.naturalWidth > 0));
  assert.deepEqual(errors, []);
  console.log('PASS: live bilingual dev log and its images; no browser, shader, or HTTP errors.');
  console.log(`LIVE: ${base}`);
  await writeFile('node_modules/.cache/bely-live-check.json', JSON.stringify({ status: 'passed', url: base, timestamp: new Date().toISOString(), errors }, null, 2));
} catch (error) {
  await writeFile('node_modules/.cache/bely-live-check.json', JSON.stringify({ status: 'failed', url: base, error: String(error), errors }, null, 2));
  throw error;
} finally { await browser.close(); }