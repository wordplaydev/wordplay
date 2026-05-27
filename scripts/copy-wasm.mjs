// Copy WASM (and accompanying loader JS) from npm packages into static/ so
// they're served from our own origin instead of a CDN. Add new entries to
// SOURCES below to bundle additional WASM-bearing dependencies.
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

/** WASM sources to copy from node_modules into static/. */
const SOURCES = [
    {
        name: 'MediaPipe Tasks Vision',
        from: join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm'),
        to: join(root, 'static', 'wasm'),
        matches: (file) => file.endsWith('.wasm') || file.endsWith('.js'),
    },
];

for (const { name, from, to, matches } of SOURCES) {
    if (!existsSync(from)) {
        console.warn(
            `${name}: source ${from} not found; skipping. ` +
                `Run "npm install" first.`,
        );
        continue;
    }
    mkdirSync(to, { recursive: true });
    const files = readdirSync(from).filter(matches);
    for (const file of files) copyFileSync(join(from, file), join(to, file));
    console.log(`${name}: copied ${files.length} files to ${to}`);
}
