import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), 'dist');

function htmlFilesIn(directory) {
  const files = [];

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...htmlFilesIn(path));
    } else if (entry.endsWith('.html')) {
      files.push(path);
    }
  }

  return files;
}

for (const path of htmlFilesIn(root)) {
  const html = readFileSync(path, 'utf8');
  const patched = html.replace(
    /<script src="(\/_expo\/static\/js\/web\/entry-[^"]+\.js)" defer><\/script>/g,
    '<script type="module" src="$1"></script>'
  );

  if (patched !== html) {
    writeFileSync(path, patched);
  }
}
