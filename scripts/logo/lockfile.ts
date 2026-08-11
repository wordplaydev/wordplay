import * as crypto from 'node:crypto';
import * as fs from 'node:fs';

/**
 * The logo lockfile records the content hash of every generated asset, of
 * every input that determines them (geometry module, manifest, generator,
 * card font), and the exact resvg version that rasterized them — so `npm run
 * logo` and logoSync.test.ts can detect drift with pure file hashing, no
 * rasterizer needed. Mirrors the fonts/instruments lockfile pattern.
 */

export const LOCK_PATH = 'scripts/logo/logo.lock.json';

export type Lockfile = {
    resvg: string;
    inputs: Record<string, string>;
    outputs: Record<string, string>;
};

export function hashFile(path: string): string {
    return crypto
        .createHash('sha256')
        .update(fs.readFileSync(path))
        .digest('hex');
}

export function readLock(): Lockfile {
    return fs.existsSync(LOCK_PATH)
        ? JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'))
        : { resvg: '', inputs: {}, outputs: {} };
}

export function writeLock(lock: Lockfile): void {
    // Stable key order for clean diffs.
    const sort = (record: Record<string, string>) => {
        const sorted: Record<string, string> = {};
        for (const key of Object.keys(record).sort())
            sorted[key] = record[key];
        return sorted;
    };
    const stable: Lockfile = {
        resvg: lock.resvg,
        inputs: sort(lock.inputs),
        outputs: sort(lock.outputs),
    };
    fs.writeFileSync(LOCK_PATH, JSON.stringify(stable, null, 2) + '\n');
}

/** The resvg version this repo pins, read from package.json rather than the
 *  library so verification never needs the native module. */
export function pinnedResvgVersion(): string {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    return pkg.devDependencies?.['@resvg/resvg-js'] ?? '';
}
