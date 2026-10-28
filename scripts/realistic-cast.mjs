import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { TGALoader } from 'three/addons/loaders/TGALoader.js';
import sharp from 'sharp';

const cache = path.resolve('node_modules/.cache/bely-rocketbox');
await mkdir(cache, { recursive: true });
const cacheFile = path.join(cache, 'tree.json');
let tree;
try { tree = JSON.parse(await readFile(cacheFile, 'utf8')); } catch {
  const response = await fetch('https://api.github.com/repos/microsoft/Microsoft-Rocketbox/git/trees/master?recursive=1', { headers: { 'User-Agent': 'Bely-asset-import' } });
  if (!response.ok) throw new Error(`Rocketbox catalog HTTP ${response.status}`);
  tree = await response.json();
  if (tree.truncated) throw new Error('Rocketbox catalog was truncated');
  await writeFile(cacheFile, JSON.stringify(tree));
}
const models = tree.tree.filter((item) => /^Assets\/Avatars\/(Adults|Children)\//.test(item.path) && /\.fbx$/i.test(item.path));
const animation = tree.tree.filter((item) => /^Assets\/Animations\/all_animations_max_motextr_static\//.test(item.path) && /\.fbx$/i.test(item.path) && /stand|idle|talk|walk|gesture|greet/i.test(item.path));
if (process.argv.includes('--list')) {
  console.log(JSON.stringify({ models: models.slice(0, 40).map(({ path, size }) => ({ path, size })), animations: animation.slice(0, 32).map(({ path, size }) => ({ path, size })) }, null, 2));
} else {
  const destination = path.resolve('public/assets/realistic-cast');
  await mkdir(destination, { recursive: true });
  const selected = ['Female_Adult_05', 'Male_Adult_01', 'Male_Adult_08'];
  const manifest = { license: 'MIT', source: 'https://github.com/microsoft/Microsoft-Rocketbox', avatars: [], animations: {}, files: [] };
  const chosen = tree.tree.filter((item) => item.type === 'blob' && selected.some((name) => item.path.startsWith(`Assets/Avatars/Adults/${name}/`)) && (/\.(png|jpe?g|tga|bmp)$/i.test(item.path) || selected.some((name) => item.path.endsWith(`/Export/${name}.fbx`))));
  const animationRoot = 'Assets/Animations/all_animations_max_motextr_static/';
  const clips = {
    idle: ['f_idle_breathe_01.max.fbx'],
    talk: ['f_gestic_talk_relaxed_01.max.fbx'],
    walk: ['f_walk_01.max.fbx', 'f_walk_normal.max.fbx', 'f_walk_forward.max.fbx'],
  };
  for (const [name, candidates] of Object.entries(clips)) {
    const entry = candidates.map((filename) => tree.tree.find((item) => item.path === animationRoot + filename)).find(Boolean)
      ?? tree.tree.find((item) => item.path.startsWith(animationRoot) && item.path.endsWith('.fbx') && item.path.includes(`/f_${name}`))
      ?? (name === 'walk' ? tree.tree.find((item) => item.path.startsWith('Assets/Animations/all_animations_max_motextr_xy/f_walk') && item.path.endsWith('.fbx') && !/bruised|drunk|limp|back|injur|hurt|heavy|hurt|turn/i.test(item.path)) : undefined);
    if (!entry) throw new Error(`Missing ${name} animation`);
    chosen.push(entry);
    manifest.animations[name] = entry.path;
  }
  for (const entry of chosen) {
    const relative = entry.path.replace(/^Assets\//, '');
    const rawTexture = /\.tga$/i.test(relative);
    const file = path.join(rawTexture ? cache : destination, relative);
    await mkdir(path.dirname(file), { recursive: true });
    let data;
    try { data = await readFile(file); if (data.length !== entry.size) data = undefined; } catch {
      try { data = await readFile(path.join(destination, relative)); } catch { data = undefined; }
    }
    if (!data) {
      const url = `https://raw.githubusercontent.com/microsoft/Microsoft-Rocketbox/master/${entry.path.split('/').map(encodeURIComponent).join('/')}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${entry.path}: HTTP ${response.status}`);
      data = Buffer.from(await response.arrayBuffer());
      await writeFile(file, data);
    }
    if (rawTexture) {
      await writeFile(file, data);
      const decoded = new TGALoader().parse(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
      const optimized = relative.replace(/\.tga$/i, '.webp');
      const target = path.join(destination, optimized);
      await mkdir(path.dirname(target), { recursive: true });
      const bytes = await sharp(Buffer.from(decoded.data), { raw: { width: decoded.width, height: decoded.height, channels: 4 } }).resize({ width: 1024, height: 1024, fit: 'inside' }).webp({ quality: /normal/i.test(relative) ? 92 : 87, alphaQuality: 100 }).toBuffer();
      await writeFile(target, bytes);
      try { await unlink(path.join(destination, relative)); } catch { console.log(`Raw source retained only in cache: ${relative}`); }
      manifest.files.push({ path: optimized, original: relative, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
      console.log(`${optimized}: ${(bytes.length / 1024).toFixed(0)} KiB`);
    } else {
      manifest.files.push({ path: relative, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') });
      console.log(`${relative}: ${(data.length / 1048576).toFixed(2)} MiB`);
    }
  }
  for (const name of selected) {
    manifest.avatars.push({ id: name, model: `Avatars/Adults/${name}/Export/${name}.fbx`, textures: manifest.files.filter((file) => file.path.includes(`/${name}/`) && /\.(png|jpe?g|webp|bmp)$/i.test(file.path)).map((file) => file.path) });
  }
  for (const name of Object.keys(manifest.animations)) manifest.animations[name] = manifest.animations[name].replace(/^Assets\//, '');
  const license = await fetch('https://raw.githubusercontent.com/microsoft/Microsoft-Rocketbox/master/LICENSE.md');
  if (!license.ok) throw new Error('Missing redistribution license');
  await writeFile(path.join(destination, 'LICENSE.md'), await license.text());
  await writeFile(path.join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`PASS: ${manifest.avatars.length} realistic clothed avatars and ${Object.keys(manifest.animations).length} native animation clips, with MIT notice.`);
}