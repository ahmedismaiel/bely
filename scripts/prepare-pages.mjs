import { readFile, writeFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import path from 'node:path';

const file = path.resolve('dist/devlog.html');
const { document } = parseHTML(await readFile(file, 'utf8'));
for (const script of document.querySelectorAll('script[data-inline-local]')) {
  const source = script.getAttribute('src');
  if (!source?.startsWith('./')) throw new Error('Inline scripts must be local');
  script.textContent = await readFile(path.resolve('public', source), 'utf8');
  script.removeAttribute('src');
  script.removeAttribute('data-inline-local');
}
let rewritten = 0;
for (const element of document.querySelectorAll('[src], [href], [poster]')) {
  for (const attribute of ['src', 'href', 'poster']) {
    const value = element.getAttribute(attribute);
    if (value?.startsWith('/') && !value.startsWith('//')) { element.setAttribute(attribute, `.${value}`); rewritten++; }
  }
}
await writeFile(file, document.toString());
await writeFile(path.resolve('dist/.nojekyll'), '');
console.log(`GitHub Pages preparation complete: ${rewritten} local dev-log URLs made project-relative.`);