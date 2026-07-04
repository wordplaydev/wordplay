import * as fs from 'node:fs';
import * as path from 'node:path';
import { faceFiles, spaceless } from './files';
import { deriveRange, hashFile } from './deriveRange';
import { FontManifest } from '../../src/basis/faces/fonts.manifest';
import { Faces } from '../../src/basis/faces/Fonts';

/**
 * The font lockfile records, per served font file, its content hash and the
 * unicode-range its @font-face declares. It's the bridge that makes drift
 * detection cheap: generated artifacts are a pure function of (manifest +
 * lockfile), and the lockfile is a pure function of (font files + policy).
 * `npm test` only hashes files against the lockfile (fast); fontkit cmap
 * parsing happens only in `fonts-fix`, only for files whose hash changed.
 */

export const LOCK_PATH = 'src/basis/faces/fonts.lock.json';

export type LockEntry = { hash: string; range: string | null };
export type Lockfile = Record<string, LockEntry>;

export function readLock(): Lockfile {
    return fs.existsSync(LOCK_PATH)
        ? JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'))
        : {};
}

export function writeLock(lock: Lockfile): void {
    // Stable key order for clean diffs.
    const sorted: Lockfile = {};
    for (const key of Object.keys(lock).sort()) sorted[key] = lock[key];
    fs.writeFileSync(LOCK_PATH, JSON.stringify(sorted, null, 2) + '\n');
}

/** Parse both CSS files into a map of served file path → declared range. This
 * is how the initial lockfile captures Google's slice partition (which a cmap
 * can't reconstruct). */
export function parseCssRanges(): Map<string, string> {
    const ranges = new Map<string, string>();
    for (const file of [
        'static/fonts/fonts.css',
        'static/fonts/fonts-fallback.css',
    ]) {
        if (!fs.existsSync(file)) continue;
        const css = fs.readFileSync(file, 'utf8');
        for (const block of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
            const body = block[1];
            const url = body.match(/src:\s*url\(([^)]+)\)/)?.[1];
            const range = body
                .match(/unicode-range:\s*([^;]+);/)?.[1]
                ?.replaceAll(/\s+/g, ' ')
                .trim();
            if (url && range) {
                const rel = url.replace(/^\//, '');
                ranges.set(rel, range);
            }
        }
    }
    return ranges;
}

/** Every served font file for a manifest entry (per its format), relative to static/. */
export function entryFiles(entry: (typeof FontManifest)[number]): string[] {
    return faceFiles(spaceless(entry.name), entry.format);
}

/** Build the lockfile from scratch: hash every served file and record its
 * range. `google` ranges come from the current CSS (the partition capture);
 * `cmap` ranges are derived from the file; `preserve` keeps the current CSS
 * range (or null for whole-file decorative faces with no declared range). */
export async function buildLockfile(
    previous: Lockfile,
    onlyChanged: boolean,
): Promise<Lockfile> {
    const cssRanges = parseCssRanges();
    const lock: Lockfile = {};
    for (const entry of FontManifest) {
        for (const url of entryFiles(entry)) {
            const filePath = path.join('static', url);
            const hash = hashFile(filePath);
            const prev = previous[url];
            // Reuse the cached range when the file is unchanged (fast path).
            if (onlyChanged && prev && prev.hash === hash) {
                lock[url] = prev;
                continue;
            }
            let range: string | null;
            if (entry.rangeSource === 'cmap') {
                range = await deriveRange(filePath, { kind: 'full' });
            } else if (entry.rangeSource === 'preserve') {
                // Decorative faces aren't in CSS; keep their current Faces
                // range (a single string applied to the whole face, or none).
                const current = Faces[entry.name]?.ranges;
                range = typeof current === 'string' ? current : null;
            } else {
                // google: keep the captured slice partition (a cmap can't
                // reconstruct it). previous is the committed lockfile; the CSS
                // fallback only runs during the very first bootstrap.
                range = previous[url]?.range ?? cssRanges.get(url) ?? null;
            }
            lock[url] = { hash, range };
        }
    }
    return lock;
}
