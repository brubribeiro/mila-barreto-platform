import { readFileSync } from 'fs';
import { join } from 'path';

export function getAppVersion(): string {
  try {
    return readFileSync(join(__dirname, '../../../VERSION'), 'utf8').trim();
  } catch {
    return process.env.npm_package_version ?? '0.0.0';
  }
}
