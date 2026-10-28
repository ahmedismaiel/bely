import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import path from 'node:path';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:5177/devlog.html?lang=en&scoutTheme=dark', { waitUntil: 'networkidle' });
  await page.locator('#keep').fill('Preserve this review while switching language');
  await page.locator('input[name="verdict"][value="rework"]').check();
  await page.locator('#blog-language').selectOption('ar');
  assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
  assert.ok(/[\u0600-\u06ff]/.test(await page.locator('h1').innerText()));
  assert.ok(/[\u0600-\u06ff]/.test(await page.locator('#engineering details').first().innerText()));
  assert.equal(await page.locator('#keep').inputValue(), 'Preserve this review while switching language');
  assert.equal(await page.locator('input[name="verdict"][value="rework"]').isChecked(), true);
  await page.locator('#change').fill('A note written after switching');
  await page.waitForFunction(() => /[\u0600-\u06ff]/.test(document.querySelector('#save-status').textContent));
  await page.locator('[data-photo="evening"]').click();
  await page.waitForFunction(() => /[\u0600-\u06ff]/.test(document.querySelector('#lighting-caption').textContent));
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: path.resolve('public/devlog/06-blog-arabic.png') });
  await page.locator('#blog-language').selectOption('en');
  assert.equal(await page.locator('html').getAttribute('dir'), 'ltr');
  assert.equal(await page.locator('#keep').inputValue(), 'Preserve this review while switching language');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#blog-language').selectOption('ar');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({ path: path.resolve('public/devlog/06-blog-arabic-mobile.png') });
  assert.deepEqual(errors, []);
  console.log('PASS: Arabic blog, RTL, technical content, captions, live save status, language switching without losing notes, and mobile layout.');
} finally { await browser.close(); }