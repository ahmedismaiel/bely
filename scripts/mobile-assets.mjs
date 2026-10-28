import { readdir, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const directory = path.resolve('public/assets');
const output = path.join(directory, 'mobile');
await mkdir(output, { recursive: true });
let total = 0;
for (const filename of await readdir(directory)) {
  if (!filename.endsWith('.jpg')) continue;
  const source = path.join(directory, filename);
  const destination = path.join(output, filename);
  const sourceInfo = await stat(source);
  let current = false;
  try { current = (await stat(destination)).mtimeMs >= sourceInfo.mtimeMs; } catch { current = false; }
  if (!current) await sharp(source).resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: filename.includes('nor_gl') ? 90 : 80, mozjpeg: true }).toFile(destination);
  total += (await stat(destination)).size;
}
console.log(`Mobile terrain textures ready: ${(total / 1048576).toFixed(2)} MiB total.`);