import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const checkpoint = process.argv[2] ?? '03';
const fullReview = Number(checkpoint) >= 3;
const output = path.resolve('public/devlog');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11'] });
const errors = [];
const captures = [];
const checks = {};

function observeErrors(page) {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${message.text()} ${message.location().url ?? ''}`); });
}

async function waitReady(page) {
  await page.goto('http://127.0.0.1:5177/?scoutTheme=dark', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__bely?.ready === true, null, { timeout: 60000 });
  await page.locator('#loading').waitFor({ state: 'hidden' });
}

async function frameBoundary(page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function photograph(page, name) {
  await frameBoundary(page);
  const filename = `${checkpoint}-${name}.png`;
  await page.screenshot({ path: path.join(output, filename) });
  const pixels = await page.evaluate(() => window.__bely.pixels());
  assert.ok(pixels.meanBrightness > 8 && pixels.meanBrightness < 246, `${name}: canvas is not blank`);
  const state = await page.evaluate(() => window.__bely.state());
  captures.push({ filename, view: state.view, look: state.look, ...pixels });
  console.log(`CAPTURED ${filename}: ${pixels.width}x${pixels.height}, mean ${pixels.meanBrightness.toFixed(2)}`);
}

async function compose(page, view, look = 'afternoon', hide = false) {
  await page.evaluate(() => { window.__bely.reset(); window.__bely.hideUI(false); });
  await page.locator(`[data-look="${look}"]`).click();
  await page.locator(`[data-view="${view}"]`).click();
  await page.mouse.move(1, 1);
  await page.evaluate((hidden) => window.__bely.hideUI(hidden), hide);
  await frameBoundary(page);
}

async function layoutCheck(page) {
  return page.evaluate(() => {
    const selectors = ['.identity', '.tools', '.scene-label', '.shot-panel', '.dock', '.footer-note', '.performance'];
    const rectangles = selectors.map((selector) => {
      const bounds = document.querySelector(selector).getBoundingClientRect();
      return { selector, left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom };
    });
    const issues = [];
    for (let first = 0; first < rectangles.length; first++) {
      const bounds = rectangles[first];
      if (bounds.left < -1 || bounds.top < -1 || bounds.right > innerWidth + 1 || bounds.bottom > innerHeight + 1) issues.push(`${bounds.selector} exceeds viewport`);
      for (let second = first + 1; second < rectangles.length; second++) {
        const other = rectangles[second];
        const overlapWidth = Math.min(bounds.right, other.right) - Math.max(bounds.left, other.left);
        const overlapHeight = Math.min(bounds.bottom, other.bottom) - Math.max(bounds.top, other.top);
        if (overlapWidth > 1 && overlapHeight > 1) issues.push(`${bounds.selector} overlaps ${other.selector}`);
      }
    }
    const marbles = window.__bely.projectMarbles();
    for (const marble of marbles) {
      if (!marble.visible) continue;
      if (marble.x - marble.radius < 0 || marble.x + marble.radius > innerWidth || marble.y - marble.radius < 0 || marble.y + marble.radius > innerHeight) issues.push(`marble ${marble.index} is cropped`);
    }
    return { viewport: [innerWidth, innerHeight], issues, marbles };
  });
}

try {
  const page = await browser.newPage({ viewport: fullReview ? { width: 1920, height: 1080 } : { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  observeErrors(page);
  await waitReady(page);
  for (const view of ['street', 'macro']) {
    await compose(page, view, 'afternoon', view === 'macro');
    await photograph(page, view);
  }
  if (fullReview) {
    await compose(page, 'street');
    checks.desktopLayout = await layoutCheck(page);
    assert.deepEqual(checks.desktopLayout.issues, []);
    for (const look of ['overcast', 'evening']) {
      await compose(page, 'street', look, true);
      await photograph(page, look);
    }
    await compose(page, 'overhead', 'afternoon', true);
    await photograph(page, 'overhead');

    await compose(page, 'street', 'afternoon', true);
    const originalPose = { position: [0.22, 0.26, 1.45], target: [0, 0.06, 0.13] };
    await page.evaluate((pose) => {
      window.__bely.depthOfField(false);
      window.__bely.camera(pose.position, pose.target);
    }, originalPose);
    const stationaryHashes = [];
    for (let sample = 0; sample < 3; sample++) {
      await frameBoundary(page);
      stationaryHashes.push((await page.evaluate(() => window.__bely.pixels())).hash);
    }
    assert.equal(new Set(stationaryHashes).size, 1, 'static pixels must not contain changing sample noise');
    const motionHashes = [];
    for (let frame = 0; frame < 9; frame++) {
      const angle = -0.35 + frame * 0.145;
      await page.evaluate((azimuth) => window.__bely.camera([Math.sin(azimuth) * 1.15, 0.24, Math.cos(azimuth) * 1.15 + 0.14], [0, 0.04, 0.15]), angle);
      const pixels = await page.evaluate(() => window.__bely.pixels());
      motionHashes.push(pixels.hash);
      if ([0, 4, 8].includes(frame)) await photograph(page, `motion-${frame}`);
    }
    assert.ok(new Set(motionHashes).size >= 8, 'camera movement must change rendered pixels');
    await page.evaluate((pose) => window.__bely.camera(pose.position, pose.target), originalPose);
    const immediateReturn = await page.evaluate(() => window.__bely.pixels());
    await frameBoundary(page);
    const settledReturn = await page.evaluate(() => window.__bely.pixels());
    assert.equal(immediateReturn.hash, stationaryHashes[0], 'first frame after movement must match the original pose without accumulation');
    assert.equal(settledReturn.hash, immediateReturn.hash, 'stationary convergence must not be required');
    checks.temporalStability = { stationaryHashes, motionHashes, immediateReturn: immediateReturn.hash, settledReturn: settledReturn.hash, passed: true };
    console.log('PASS: identical pixels before movement, immediately on return, and after settling.');

    await page.evaluate(() => { window.__bely.depthOfField(true); window.__bely.view('street'); });
    const recording = await page.evaluate(async () => {
      const canvas = document.querySelector('#stage canvas');
      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 10000000 });
      const chunks = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      const finished = new Promise((resolve) => { recorder.onstop = resolve; });
      window.__bely.tour(true);
      recorder.start();
      await new Promise((resolve) => {
        const start = performance.now();
        function frame(now) {
          if (now - start >= 4500) resolve();
          else requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      });
      recorder.stop();
      await finished;
      window.__bely.tour(false);
      stream.getTracks().forEach((track) => track.stop());
      const data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.readAsDataURL(new Blob(chunks, { type: mimeType }));
      });
      return { data, mimeType, performance: window.__bely.performance() };
    });
    const videoFilename = `${checkpoint}-motion.webm`;
    const videoBytes = Buffer.from(recording.data, 'base64');
    await writeFile(path.join(output, videoFilename), videoBytes);
    assert.ok(videoBytes.length > 20000, 'motion recording contains frames');
    checks.motionRecording = { filename: videoFilename, bytes: videoBytes.length, durationSeconds: 4.5, mimeType: recording.mimeType, observedPerformance: recording.performance };
    console.log(`CAPTURED ${videoFilename}: ${(videoBytes.length / 1048576).toFixed(2)} MiB of live camera movement.`);

    await compose(page, 'aim');
    const shooter = await page.evaluate(() => window.__bely.projectMarbles()[0]);
    await page.mouse.move(shooter.x, shooter.y);
    await page.mouse.down();
    await page.mouse.move(shooter.x + 14, shooter.y + 110, { steps: 12 });
    await page.mouse.up();
    await page.waitForFunction(() => window.__bely.state().match.shots === 1 && !window.__bely.state().match.active, null, { timeout: 20000 });
    checks.mouseFlick = await page.evaluate(() => window.__bely.state().match);
    assert.ok(checks.mouseFlick.score > 0, 'a real pointer flick must knock out a target');
    await photograph(page, 'played');
    await page.getByRole('button', { name: 'New round', exact: true }).click();
    assert.equal((await page.evaluate(() => window.__bely.state().match)).shots, 0);
    console.log('PASS: real mouse flick, collision, score, settled next turn, and reset.');

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    observeErrors(mobile);
    await waitReady(mobile);
    await frameBoundary(mobile);
    checks.mobileLayout = await layoutCheck(mobile);
    assert.deepEqual(checks.mobileLayout.issues, []);
    await photograph(mobile, 'mobile');
    await mobile.locator('[data-view="aim"]').click();
    await frameBoundary(mobile);
    const touchShooter = await mobile.evaluate(() => window.__bely.projectMarbles()[0]);
    const touch = await mobile.context().newCDPSession(mobile);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: touchShooter.x, y: touchShooter.y, id: 1 }] });
    for (let move = 1; move <= 8; move++) {
      await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touchShooter.x + move * 0.7, y: touchShooter.y + move * 6, id: 1 }] });
    }
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await mobile.waitForFunction(() => window.__bely.state().match.shots === 1 && !window.__bely.state().match.active, null, { timeout: 20000 });
    checks.touchFlick = await mobile.evaluate(() => window.__bely.state().match);
    await mobile.getByRole('button', { name: 'New round', exact: true }).click();
    assert.equal((await mobile.evaluate(() => window.__bely.state().match)).shots, 0);
    console.log('PASS: 390x844 layout, real touch flick, settled round, and mobile reset.');
    await mobile.close();
  }
  await writeFile(path.join(output, `${checkpoint}-capture.json`), JSON.stringify({ timestamp: new Date().toISOString(), browser: 'Microsoft Edge / Playwright', captures, checks, errors }, null, 2));
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`PASS: ${captures.length} real browser photographs; no page or shader errors.`);
} catch (error) {
  await writeFile(path.join(output, `${checkpoint}-capture.json`), JSON.stringify({ timestamp: new Date().toISOString(), captures, checks, errors, failure: String(error) }, null, 2));
  throw error;
} finally {
  await browser.close();
}