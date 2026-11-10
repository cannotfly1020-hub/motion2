import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const www = join(root, 'www');

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });

for (const file of ['index.html', 'manifest.json', 'sw.js', 'icon-192.png', 'icon-512.png']) {
  const src = join(root, file);
  if (existsSync(src)) cpSync(src, join(www, file));
}

for (const dir of ['batting', 'pitching', 'native', 'libs']) {
  cpSync(join(root, dir), join(www, dir), {
    recursive: true,
    filter: (src) => !src.endsWith('.DS_Store')
  });
}

console.log('www を更新しました');
