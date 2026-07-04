import * as fs from 'node:fs';
import * as path from 'node:path';
import { readLock } from './lockfile';
import { fix, build, emojiRanges } from './generate';
import {
    checkHashes,
    checkCssConsistency,
    checkRegistryConsistency,
    checkNoOverClaim,
    checkRenderableSet,
} from './verify';
import { spaceless } from './files';
import { FontManifest } from '../../src/basis/faces/fonts.manifest';

/**
 * Font tooling dispatcher, mirroring the locales verify/fix pattern:
 *   npm run fonts             — verify (drift check); nonzero exit on drift
 *   npm run fonts -- --deep   — also verify no range over-claims its cmap
 *   npm run fonts-fix         — regenerate all artifacts from the manifest
 *   npm run fonts-download    — fetch missing fonts from Google, then fix
 */

const CHROME_UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function verify(deep: boolean): Promise<void> {
    const lock = readLock();
    const problems = [
        ...checkHashes(lock),
        ...checkCssConsistency(lock),
        ...(await checkRegistryConsistency(
            lock,
            await import('../../src/basis/faces/faces.generated'),
            await emojiRanges(),
        )),
        ...(deep
            ? [
                  ...(await checkNoOverClaim(lock)),
                  ...(await checkRenderableSet()),
              ]
            : []),
    ];
    if (problems.length > 0) {
        console.error(`Font drift detected (${problems.length}):`);
        for (const p of problems.slice(0, 40)) console.error(`  - ${p}`);
        if (problems.length > 40)
            console.error(`  … and ${problems.length - 40} more`);
        console.error('\nRun `npm run fonts-fix` to regenerate.');
        process.exit(1);
    }
    console.log('Fonts are in sync.');
}

/** Fetch any font files declared in the manifest but missing on disk, from
 * Google Fonts (css2), then regenerate. Google supplies files only; ranges are
 * re-derived from the downloaded cmaps by fix().
 *
 * CAVEAT — this path is not yet exercised end-to-end. It assumes a variable
 * woff2 family sliced by unicode-range and names every slice `<Name>-all-<i>`;
 * static-weight families (which Google serves as separate per-weight files)
 * and non-woff2 formats need extra handling. Verify a new font renders and
 * `npm run fonts -- --deep` passes after adding one. */
async function download(): Promise<void> {
    for (const entry of FontManifest) {
        const dir = path.join('static', 'fonts', spaceless(entry.name));
        if (fs.existsSync(dir) && fs.readdirSync(dir).length > 0) continue;
        const axis = Array.isArray(entry.weights)
            ? `:wght@${entry.weights.join(';')}`
            : `:wght@${entry.weights.min}..${entry.weights.max}`;
        const url = `https://fonts.googleapis.com/css2?family=${entry.source.replaceAll(' ', '+')}${axis}&display=swap`;
        const res = await fetch(url, { headers: { 'User-Agent': CHROME_UA } });
        if (!res.ok) {
            console.error(`  ${entry.name}: css2 ${res.status}; skipping`);
            continue;
        }
        const css = await res.text();
        fs.mkdirSync(dir, { recursive: true });
        let i = 0;
        for (const m of css.matchAll(/src:\s*url\(([^)]+)\)/g)) {
            const font = await fetch(m[1], {
                headers: { 'User-Agent': CHROME_UA },
            });
            const bytes = Buffer.from(await font.arrayBuffer());
            fs.writeFileSync(
                path.join(dir, `${spaceless(entry.name)}-all-${i}.woff2`),
                bytes,
            );
            i++;
        }
        console.log(`  ${entry.name}: downloaded ${i} slice(s)`);
    }
    await fix();
}

const cmd = process.argv[2] ?? 'verify';
const run =
    cmd === 'fix'
        ? fix()
        : cmd === 'build'
          ? build()
          : cmd === 'download'
            ? download()
            : verify(process.argv.includes('--deep'));
run.catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
