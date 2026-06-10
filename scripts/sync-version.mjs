import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const version = readFileSync(join(root, 'VERSION'), 'utf8').trim();

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Invalid VERSION format: "${version}" (expected MAJOR.MINOR.PATCH)`);
  process.exit(1);
}

for (const pkgPath of ['package.json', 'frontend/package.json', 'backend/package.json']) {
  const fullPath = join(root, pkgPath);
  const pkg = JSON.parse(readFileSync(fullPath, 'utf8'));
  pkg.version = version;
  writeFileSync(fullPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

console.log(`Synced version ${version}`);
