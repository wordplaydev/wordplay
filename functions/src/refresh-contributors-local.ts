/**
 * Run locally to populate contributors.json without going through the cloud function.
 * Usage (from repo root): npx tsx functions/src/refresh-contributors-local.ts
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { fetchContributorsData } from './contributors.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));

const envText = readFileSync(resolve(scriptDir, '../.env'), 'utf-8');
const token = envText.match(/GITHUB_TOKEN\s*=\s*(\S+)/)?.[1] ?? '';
if (!token) {
    console.error('GITHUB_TOKEN not set in functions/.env');
    process.exit(1);
}

const data = await fetchContributorsData(token, (msg) => console.log(msg));

const dest = resolve(
    scriptDir,
    '../../src/routes/[[locale]]/thanks/contributors.json',
);
writeFileSync(dest, JSON.stringify(data, null, 2));
console.log(`Saved to ${dest}`);
