import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { unzipSync } from 'three/addons/libs/fflate.module.js';

const cache = path.resolve('node_modules/.cache/bely-character-assets');
const destination = path.resolve('public/assets/characters');
await mkdir(cache, { recursive: true });
await mkdir(destination, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const manifest = [];
try {
  for (const pack of ['universal-base-characters', 'universal-animation-library']) {
    const archive = path.join(cache, `${pack}.zip`);
    let exists = false;
    try { exists = (await stat(archive)).size > 10000; } catch { exists = false; }
    if (!exists) {
      const page = await browser.newPage({ acceptDownloads: true });
      await page.goto(`https://quaternius.itch.io/${pack}/purchase`, { waitUntil: 'domcontentloaded' });
      await page.getByText('No thanks, just take me to the downloads', { exact: true }).click();
      const upload = page.locator('.upload').filter({ hasText: /Standard/i }).first();
      await upload.waitFor({ timeout: 30000 });
      const downloadPromise = page.waitForEvent('download', { timeout: 120000 });
      await upload.locator('.download_btn').click();
      const download = await downloadPromise;
      await download.saveAs(archive);
      await page.close();
    }
    const bytes = await readFile(archive);
    const entries = unzipSync(bytes);
    const names = Object.keys(entries).filter((name) => /\.(glb|gltf|bin|png|jpe?g|txt)$/i.test(name));
    for (const name of names) {
      const target = path.resolve(destination, pack, name);
      if (!target.startsWith(`${destination}${path.sep}`)) throw new Error('Unsafe archive path');
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, entries[name]);
    }
    manifest.push({ pack, source: `https://quaternius.itch.io/${pack}`, license: 'CC0-1.0', author: 'Quaternius', archiveSha256: createHash('sha256').update(bytes).digest('hex'), modelFiles: names.filter((name) => /\.(gltf|glb)$/i.test(name)) });
    console.log(`${pack}: ${Math.round(bytes.length / 1048576)} MiB, model files:`);
    console.log(manifest.at(-1).modelFiles.join('\n'));
    const primary = names.find((name) => /Superhero_Female_FullBody\.gltf|UAL1_Standard\.glb/.test(name));
    if (primary) {
      const data = entries[primary];
      const document = primary.endsWith('.gltf') ? JSON.parse(Buffer.from(data).toString('utf8')) : JSON.parse(Buffer.from(data).subarray(20, 20 + Buffer.from(data).readUInt32LE(12)).toString('utf8'));
      console.log(JSON.stringify({ pack, materials: document.materials?.map((item) => item.name), meshes: document.meshes?.map((item) => item.name), nodes: document.nodes?.map((item) => item.name).filter(Boolean), clips: document.animations?.map((item) => item.name), buffers: document.buffers?.map((item) => item.uri?.slice(0, 100)) }));
    }
  }
  await writeFile(path.join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('PASS: free CC0 character and animation sources downloaded, with provenance.');
} finally { await browser.close(); }