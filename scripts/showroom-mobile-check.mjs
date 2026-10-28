import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const prefix = '/bely-project/';
for (const args of [['scripts/mobile-assets.mjs'], ['node_modules/typescript/bin/tsc'], ['node_modules/vite/bin/vite.js', 'build', `--base=${prefix}`], ['scripts/prepare-pages.mjs']]) {
  const result = await execute(process.execPath, args, { maxBuffer: 8 * 1024 * 1024 });
  console.log(result.stdout.trim());
}
const directory = path.resolve('dist');
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.gltf': 'model/gltf+json', '.webm': 'video/webm' };
const server = http.createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  if (!pathname.startsWith(prefix)) { response.writeHead(404); response.end(); return; }
  const file = path.resolve(directory, pathname.slice(prefix.length) || 'index.html');
  if (!file.startsWith(`${directory}${path.sep}`)) { response.writeHead(403); response.end(); return; }
  try { const data = await readFile(file); response.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' }); response.end(data); }
  catch { response.writeHead(404); response.end(); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}${prefix}`;
const output = path.resolve('public/devlog');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
const checks = {};
function observe(page) {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
}
async function frames(page, count = 4) {
  await page.evaluate((total) => new Promise((resolve) => { let left = total; function next() { if (--left <= 0) resolve(); else requestAnimationFrame(next); } requestAnimationFrame(next); }), count);
}
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 960 }, deviceScaleFactor: 1 });
  observe(page);
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto(`${base}marbles.html?lang=en&scoutTheme=dark`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__showroom?.ready);
  assert.ok((await page.locator('.studio-skin').first().boundingBox()).height > 90, 'catalog tiles must not collapse');
  const poses = {};
  for (const pose of ['hero', 'low', 'core', 'top', 'profile']) {
    await page.evaluate((next) => window.__showroom.pose(next, false), pose);
    await frames(page);
    const pixels = await page.evaluate(() => window.__showroom.pixels());
    assert.ok(pixels.brightness > 8 && pixels.brightness < 245);
    poses[pose] = pixels.hash;
    await page.screenshot({ path: path.join(output, `06-studio-${pose}.png`) });
  }
  assert.ok(new Set(Object.values(poses)).size >= 4);
  assert.equal(requests.some((url) => /assets\/(characters|models|realistic-cast)\//.test(url)), false);
  await page.locator('#studio-material').selectOption('Metal');
  assert.equal(await page.locator('.studio-skin').count(), 10);
  await page.locator('[data-skin="metal-1"]').click();
  assert.equal((await page.evaluate(() => window.__showroom.state())).skin, 'metal-1');
  await page.evaluate(() => { window.__showroom.pose('hero', false); window.__showroom.motion(true); });
  await page.waitForFunction(() => window.__showroom.state().pose !== 'hero', null, { timeout: 12000 });
  await page.evaluate(() => window.__showroom.motion(false));
  checks.studio = { poses, catalogSize: true, filters: true, automaticShowcase: true, noGameAssets: true };
  console.log('PASS: standalone studio, five poses, full-size thumbnails, filters, automatic showcase, and no game-world model requests.');

  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  observe(phone);
  await phone.goto(`${base}marbles.html?lang=ar&scoutTheme=dark`, { waitUntil: 'networkidle' });
  await phone.waitForFunction(() => window.__showroom?.ready);
  assert.equal(await phone.locator('html').getAttribute('dir'), 'rtl');
  assert.equal((await phone.evaluate(() => window.__showroom.state())).pixelRatio, 1);
  const canvas = await phone.locator('#studio canvas').boundingBox();
  const touch = await phone.context().newCDPSession(phone);
  const before = await phone.evaluate(() => window.__showroom.state().camera);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: canvas.width * 0.4, y: canvas.height * 0.35, id: 1 }] });
  for (let step = 1; step <= 7; step++) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: canvas.width * 0.4 + step * 7, y: canvas.height * 0.35, id: 1 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await frames(phone, 8);
  assert.notDeepEqual(await phone.evaluate(() => window.__showroom.state().camera), before);
  await phone.evaluate(() => window.__showroom.pose('hero', false));
  await frames(phone);
  const layout = await phone.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, boxes: ['.studio-catalog', '.studio-controls', '.studio-header'].map((selector) => { const bounds = document.querySelector(selector).getBoundingClientRect(); return { selector, left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom }; }) }));
  assert.equal(layout.overflow, false);
  layout.boxes.forEach((box) => assert.ok(box.left >= -1 && box.right <= 391 && box.top >= -1 && box.bottom <= 845, box.selector));
  await phone.screenshot({ path: path.join(output, '06-studio-mobile-arabic.png') });
  checks.mobileStudio = { touchOrbit: true, pixelRatio: 1, layout };

  await phone.goto(`${base}index.html?lang=ar&debug=1&scoutTheme=dark`, { waitUntil: 'networkidle' });
  await phone.waitForFunction(() => window.__bely?.ready, null, { timeout: 120000 });
  await phone.locator('#loading').waitFor({ state: 'hidden' });
  const game = await phone.evaluate(() => window.__bely.state());
  assert.equal(game.mobileProfile, true);
  assert.equal(game.pixelRatio, 1);
  assert.equal(game.depthOfField, false);
  assert.equal(await phone.evaluate(() => window.__bely.cinematic.state().skipAll), true);
  const gamePixels = await phone.evaluate(() => window.__bely.pixels());
  assert.ok(gamePixels.meanBrightness > 8 && gamePixels.meanBrightness < 245);
  await phone.screenshot({ path: path.join(output, '06-game-mobile.png') });
  const origin = await phone.evaluate(() => performance.timeOrigin);
  await phone.locator('#open-collection').click();
  const studio = phone.frameLocator('#showroom-overlay iframe');
  await studio.locator('#studio-loading').waitFor({ state: 'hidden', timeout: 45000 });
  await studio.locator('#back-to-game').click();
  assert.equal(await phone.evaluate(() => performance.timeOrigin), origin);
  checks.mobileGame = { profile: true, depthOfFieldOff: true, introsOff: true, pixels: gamePixels, modalPreservesDocument: true };
  await page.goto(`${base}devlog.html?lang=ar&scoutTheme=dark`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
  await page.locator('[data-photo="evening"]').click();
  await page.locator('#lighting-image').evaluate((image) => image.decode());
  assert.ok(/[\u0600-\u06ff]/.test(await page.locator('h1').innerText()));
  checks.projectPath = { base: prefix, game: true, studio: true, arabicBlog: true };
  assert.deepEqual(errors, []);
  await writeFile(path.join(output, '06-showroom-mobile-checks.json'), JSON.stringify({ timestamp: new Date().toISOString(), checks, errors }, null, 2));
  console.log('PASS: phone-layout touch showroom, mobile game defaults, no-restart studio overlay, and Arabic dev log under a GitHub Pages project path.');
} catch (error) {
  await writeFile(path.join(output, '06-showroom-mobile-checks.json'), JSON.stringify({ checks, errors, failure: String(error) }, null, 2));
  throw error;
} finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }