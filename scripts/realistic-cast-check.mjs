import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const output = path.resolve('public/devlog');
await mkdir(output, { recursive: true });
const errors = [];
const checks = [];
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto('http://127.0.0.1:5177/?lang=en&debug=1&cinematics=1&scoutTheme=dark', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__bely?.ready, null, { timeout: 90000 });
  await page.waitForFunction(() => window.__bely.cinematic.state().castLoaded || !window.__bely.cinematic.state().active, null, { timeout: 90000 });
  assert.equal(await page.evaluate(() => window.__bely.cinematic.state().castLoaded), true, JSON.stringify(errors));
  for (const [level, name] of [['first-flick', 'mariam'], ['king-of-the-hara', 'youssef']]) {
    await page.evaluate((id) => { window.__bely.cinematic.freeze(false); window.__bely.playLevel(id); }, level);
    await page.waitForFunction(() => window.__bely.cinematic.state().time > 10, null, { timeout: 30000 });
    await page.evaluate(() => window.__bely.cinematic.freeze(true));
    const state = await page.evaluate(() => window.__bely.cinematic.state());
    assert.ok(state.castSource.includes('Rocketbox'));
    assert.equal(state.avatars.length, 3);
    assert.ok(state.clips.includes('Walk_Loop') && state.clips.includes('Idle_Talking_Loop'));
    await page.screenshot({ path: path.join(output, `07-realistic-${name}.png`) });
    checks.push({ level, state, pixels: await page.evaluate(() => window.__bely.pixels()) });
    console.log(`CAPTURED realistic introduction: ${name}`);
  }
  await page.evaluate(() => { window.__bely.cinematic.skip(); window.__bely.cinematic.disable(true); });
  assert.equal(await page.evaluate(() => window.__bely.state().match.paused), false);
  assert.deepEqual(errors, []);
  await writeFile(path.join(output, '07-realistic-cast-check.json'), JSON.stringify({ timestamp: new Date().toISOString(), checks, errors }, null, 2));
  console.log('PASS: realistic textured male/female cast, native rig bindings, cinematic capture, and return to match.');
} catch (error) {
  await writeFile(path.join(output, '07-realistic-cast-check.json'), JSON.stringify({ checks, errors, failure: String(error) }, null, 2));
  throw error;
} finally { await browser.close(); }