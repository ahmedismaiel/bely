import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const destination = path.resolve('public/assets');
await mkdir(destination, { recursive: true });
const assets = [
  { id: 'brown_mud_02', name: 'ground', maps: ['Diffuse', 'nor_gl', 'Rough', 'Displacement'], quality: '2k' },
  { id: 'plastered_wall_02', name: 'plaster', maps: ['Diffuse', 'nor_gl', 'Rough'], quality: '2k' },
  { id: 'aerial_asphalt_01', name: 'stone', maps: ['Diffuse', 'nor_gl', 'Rough'], quality: '2k' },
  { id: 'kloppenheim_06_puresky', name: 'sky', maps: ['hdri'], quality: '1k' },
];
const manifest = [];

for (const asset of assets) {
  const response = await fetch(`https://api.polyhaven.com/files/${asset.id}`);
  if (!response.ok) throw new Error(`${asset.id}: metadata HTTP ${response.status}`);
  const files = await response.json();
  for (const map of asset.maps) {
    const extension = map === 'hdri' ? 'hdr' : 'jpg';
    const entry = files[map]?.[asset.quality]?.[extension];
    if (!entry?.url) throw new Error(`${asset.id}: ${map}/${asset.quality}/${extension} is unavailable`);
    const filename = `${asset.name}-${map.toLowerCase()}.${extension}`;
    const file = path.join(destination, filename);
    let bytes;
    try {
      await stat(file);
      bytes = await readFile(file);
      if (createHash('md5').update(bytes).digest('hex') !== entry.md5) bytes = undefined;
    } catch {
      bytes = undefined;
    }
    if (!bytes) {
      const download = await fetch(entry.url);
      if (!download.ok) throw new Error(`${filename}: HTTP ${download.status}`);
      bytes = Buffer.from(await download.arrayBuffer());
      if (entry.md5 && createHash('md5').update(bytes).digest('hex') !== entry.md5) {
        throw new Error(`${filename}: checksum mismatch`);
      }
      await writeFile(file, bytes);
    }
    manifest.push({
      asset: asset.id, map, quality: asset.quality, file: `/assets/${filename}`,
      bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
      source: `https://polyhaven.com/a/${asset.id}`, download: entry.url, license: 'CC0-1.0',
    });
    console.log(`${filename}: ${(bytes.length / 1048576).toFixed(2)} MiB verified`);
  }
}

for (const id of ['potted_plant_02', 'painted_wooden_chair_02', 'wooden_crate_01']) {
  const response = await fetch(`https://api.polyhaven.com/files/${id}`);
  if (!response.ok) throw new Error(`${id}: metadata HTTP ${response.status}`);
  const files = await response.json();
  const entry = files.gltf?.['1k']?.gltf;
  if (!entry?.url) throw new Error(`${id}: 1k glTF unavailable; formats: ${Object.keys(files).join(', ')}`);
  const modelFiles = { [`${id}.gltf`]: entry, ...entry.include };
  for (const [relativePath, source] of Object.entries(modelFiles)) {
    const file = path.join(destination, 'models', id, relativePath);
    await mkdir(path.dirname(file), { recursive: true });
    let bytes;
    try {
      bytes = await readFile(file);
      if (source.md5 && createHash('md5').update(bytes).digest('hex') !== source.md5) bytes = undefined;
    } catch { bytes = undefined; }
    if (!bytes) {
      const download = await fetch(source.url);
      if (!download.ok) throw new Error(`${id}/${relativePath}: HTTP ${download.status}`);
      bytes = Buffer.from(await download.arrayBuffer());
      if (source.md5 && createHash('md5').update(bytes).digest('hex') !== source.md5) throw new Error(`${id}/${relativePath}: checksum mismatch`);
      await writeFile(file, bytes);
    }
    manifest.push({
      asset: id, map: relativePath, quality: '1k', file: `/assets/models/${id}/${relativePath}`,
      bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
      source: `https://polyhaven.com/a/${id}`, download: source.url, license: 'CC0-1.0',
    });
    console.log(`${id}/${relativePath}: ${(bytes.length / 1048576).toFixed(2)} MiB verified`);
  }
}

await writeFile(path.join(destination, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`PASS: ${manifest.length} local Poly Haven assets downloaded and verified.`);