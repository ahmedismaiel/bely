import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { EXPERIMENT_MODES, EXPERIMENTS, experimentHeight } from '../src/experiments.ts';

const output = path.resolve('public/devlog');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11'] });
const errors = [];
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('http://127.0.0.1:5177/?scoutTheme=dark&debug=1&cinematics=0', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__bely?.playground, null, { timeout: 120000 });
  await page.locator('#loading').waitFor({ state: 'hidden' });
  for (const mode of EXPERIMENT_MODES) {
    const scenario = EXPERIMENTS.find((item) => item.mode === mode.id && item.stage === 1);
    assert.equal(await page.evaluate((id) => window.__bely.playground.launch(id), scenario.id), true);
    await page.evaluate(() => window.__bely.playground.input('forward', true));
    await page.waitForFunction(() => window.__bely.playground.state().elapsed >= 1.1, null, { timeout: 30000 });
    await page.evaluate(() => window.__bely.playground.input('forward', false));
    const moving = await page.evaluate(() => window.__bely.playground.state());
    assert.ok(moving.position[2] < 1.1, `${mode.id}: forward input must move the marble`);
    assert.ok(moving.position[1] > experimentHeight(scenario, moving.position[0], moving.position[2]) - 0.03, `${mode.id}: terrain collision must not tunnel`);
    await page.waitForFunction(() => window.__bely.playground.state().grounded, null, { timeout: 10000 });
    const jump = await page.evaluate(() => window.__bely.playground.power('jump'));
    assert.equal(jump, true, `${mode.id}: grounded jump must activate`);
    await page.waitForFunction(() => !window.__bely.playground.state().grounded, null, { timeout: 10000 });
    assert.equal(await page.evaluate(() => window.__bely.playground.power('glide')), true);
    const before = await page.evaluate(() => window.__bely.playground.state());
    assert.equal(await page.evaluate(() => window.__bely.playground.power('pulse')), true);
    const after = await page.evaluate(() => window.__bely.playground.state());
    assert.equal(after.pulseCharges, before.pulseCharges - 1);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const pixels = await page.evaluate(() => window.__bely.pixels());
    assert.ok(pixels.meanBrightness > 8 && pixels.meanBrightness < 245);
    await sharp(await page.screenshot()).webp({ quality: 90 }).toFile(path.join(output, `05-mode-${mode.id}.webp`));
    results.push({ mode: mode.id, moving, powers: { jump, glide: true, pulse: true }, pixels });
    console.log(`PASS ${mode.name}: terrain, movement, jump, glide, pulse, nonblank frame.`);
  }
  await page.evaluate(() => window.__bely.playground.leave());
  assert.equal(await page.evaluate(() => window.__bely.playground.state().active), false);
  await page.locator('#open-play-lab').click();
  await page.waitForFunction(() => Array.from(document.querySelectorAll('#idea-grid img')).every((image) => image.complete && image.naturalWidth > 0));
  assert.equal(await page.locator('.idea-card').count(), 40);
  await page.screenshot({ path: path.join(output, '05-idea-catalog.png') });
  await page.locator('#difficulty-filter').selectOption('5');
  assert.equal(await page.locator('.idea-card').count(), 8);
  await page.locator('#idea-search').fill('Coastal');
  assert.ok(await page.locator('.idea-card').count() > 0);
  await writeFile(path.join(output, '05-mode-checks.json'), JSON.stringify({ timestamp: new Date().toISOString(), results, errors }, null, 2));
  assert.deepEqual(errors, []);
  console.log('PASS: six modes, 240-scenario catalog, difficulty/search filters, and return to story.');
} catch (error) {
  await writeFile(path.join(output, '05-mode-checks.json'), JSON.stringify({ results, errors, failure: String(error) }, null, 2));
  throw error;
} finally {
  await browser.close();
}