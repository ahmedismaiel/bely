import { chromium } from '@playwright/test';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { ARENAS, LEVELS, SKINS } from '../src/levels.ts';
import { EXPERIMENTS, EXPERIMENT_MODES } from '../src/experiments.ts';

const output = path.resolve('public/devlog');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11'] });
const errors = [];
const captures = [];

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${message.text()} ${message.location().url ?? ''}`); });
  await writeFile(path.join(output, '05-ideas.json'), JSON.stringify({ modes: EXPERIMENT_MODES, scenarios: EXPERIMENTS, note: '240 seeded playable variants, not 240 hand-authored chapters. Completion balance still needs playtesting.' }, null, 2));
  await page.goto('http://127.0.0.1:5177/?scoutTheme=dark&cinematics=0', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__bely?.ready, null, { timeout: 90000 });
  await page.locator('#loading').waitFor({ state: 'hidden' });
  for (const arena of ARENAS) {
    const level = LEVELS.find((entry) => entry.arena === arena.id);
    await page.evaluate((id) => { window.__bely.previewLevel(id); window.__bely.view('vista'); window.__bely.hideUI(true); }, level.id);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const image = await page.screenshot();
    await sharp(image).webp({ quality: 90 }).toFile(path.join(output, `04-${arena.id}.webp`));
    const pixels = await page.evaluate(() => window.__bely.pixels());
    assert.ok(pixels.meanBrightness > 8 && pixels.meanBrightness < 245, `${arena.id}: image must not be blank`);
    captures.push({ arena: arena.id, file: `04-${arena.id}.webp`, ...pixels });
    console.log(`CAPTURED ${arena.name}: ${pixels.width}x${pixels.height}, brightness ${pixels.meanBrightness.toFixed(1)}`);
    await page.evaluate(() => window.__bely.view('street'));
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await sharp(await page.screenshot()).webp({ quality: 90 }).toFile(path.join(output, `04-${arena.id}-ground.webp`));
  }
  await page.setViewportSize({ width: 700, height: 700 });
  await page.evaluate(() => { window.__bely.previewLevel('first-flick'); window.__bely.view('macro'); window.__bely.hideUI(true); });
  for (const skin of SKINS) {
    if (process.argv.includes('--scenes-only')) break;
    await page.evaluate((item) => window.__bely.previewSkin(item.color, item.style, item.finish, item.secondary), skin);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const image = await page.screenshot();
    await sharp(image).resize(280, 280).webp({ quality: 90 }).toFile(path.join(output, `04-skin-${skin.id}.webp`));
    console.log(`CAPTURED collectible ${skin.name}`);
  }
  if (!process.argv.includes('--scenes-only')) {
    const tiles = await Promise.all(SKINS.map(async (skin, index) => ({ input: await readFile(path.join(output, `04-skin-${skin.id}.webp`)), left: index % 10 * 280, top: Math.floor(index / 10) * 280 })));
    await sharp({ create: { width: 2800, height: 2800, channels: 3, background: '#292929' } }).composite(tiles).webp({ quality: 88 }).toFile(path.join(output, '05-marble-atlas.webp'));
  }
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.evaluate(() => { window.__bely.playLevel('first-flick'); window.__bely.hideUI(false); window.__bely.openJourney(); });
  await page.waitForFunction(() => Array.from(document.querySelectorAll('#journey-dialog img')).every((image) => image.complete && image.naturalWidth > 0));
  await page.screenshot({ path: path.join(output, '04-journey.png') });
  await page.getByRole('tab', { name: 'Marble tin' }).click();
  const studio = page.frameLocator('#showroom-overlay iframe');
  await studio.locator('#studio-loading').waitFor({ state: 'hidden', timeout: 45000 });
  await page.screenshot({ path: path.join(output, '04-collection.png') });
  await studio.locator('#back-to-game').click();
  await page.evaluate(() => { window.__bely.closeJourney(); window.__bely.previewLevel('under-the-lights'); window.__bely.view('street'); window.__bely.hideUI(true); });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: path.join(output, '04-night-final.png') });
  await writeFile(path.join(output, '04-capture.json'), JSON.stringify({ timestamp: new Date().toISOString(), captures, errors }, null, 2));
  assert.deepEqual(errors, []);
  console.log(`PASS: six destination photographs, ${SKINS.length} collectible thumbnails, material atlas, journey and collection; no browser or shader errors.`);
} catch (error) {
  await writeFile(path.join(output, '04-capture.json'), JSON.stringify({ timestamp: new Date().toISOString(), captures, errors, failure: String(error) }, null, 2));
  throw error;
} finally {
  await browser.close();
}