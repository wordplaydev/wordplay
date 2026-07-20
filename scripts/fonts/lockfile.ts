import * as fs from 'node:fs';
import * as path from 'node:path';
import { faceFiles, spaceless } from './files';
import {
    deriveRange,
    hashFile,
    parseRangeString,
    readCharacterSet,
} from './deriveRange';
import { FontManifest } from '../../src/basis/faces/fonts.manifest';
// NB: the generator must NOT import Fonts.ts — it imports the generated
// faces.generated.ts, which doesn't exist yet on a fresh clone, so importing it
// here would make `fonts-build` fail to bootstrap those very files.

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

/** The served files of every fallback face, as a set for membership tests. */
export function fallbackFileSet(): Set<string> {
    const files = new Set<string>();
    for (const entry of FontManifest)
        if (entry.roles.includes('fallback'))
            for (const url of entryFiles(entry)) files.add(url);
    return files;
}

/** The codepoints declared by the hand-authored emoji island(s) inlined into
 * fonts.css (Noto Emoji, Noto Color Emoji, keycap). These faces sit ahead of the
 * fallback var in every font-family chain, so subtracting their DECLARED ranges
 * from the fallback partition stops a lazy script face from re-claiming an emoji
 * or — critically — a zero-width format char (VS-15/16 U+FE0E/FE0F, ZWJ U+200D,
 * keycap combiner) it doesn't render. Those selectors have no cmap glyph, so they
 * must come from the declared range, not a cmap read. Tofu-safe: the emoji faces
 * (preloaded, one of them font-display:block) serve exactly what they declare
 * (guarded by emojiRange.test.ts). Without this subtraction, every UI emoji icon
 * (each carries a VS selector via withMonoEmoji/withColorEmoji) pulled a whole
 * CJK/Symbol woff2 just to resolve the invisible selector. */
function emojiIslandCoverage(): Set<number> {
    const cov = new Set<number>();
    for (const entry of FontManifest) {
        if (entry.override?.target !== 'fonts.css') continue;
        const css = fs.readFileSync(
            path.join('src/basis/faces', entry.override.cssPartial),
            'utf8',
        );
        for (const m of css.matchAll(/unicode-range:\s*([^;]+);/g))
            for (const cp of parseRangeString(m[1])) cov.add(cp);
    }
    return cov;
}

/** The codepoints the lazy fallback faces don't need to claim because a
 * preloaded face ahead of the fallback var in every font-family chain already
 * covers them: Noto Sans and the emoji island (Noto Emoji / Noto Color Emoji /
 * keycap). Noto Sans is read from its actual cmap — not its declared range,
 * which can over-claim — so subtracting it can never strip a glyph Noto Sans
 * lacks and cause tofu. Coverage is weight-independent, so only the 400 slices
 * are read (keeps this cheap enough for the postinstall/CI build). The emoji
 * faces are read from their declared ranges (see emojiIslandCoverage). Shared by
 * the fallback CSS emitter and its drift check so they can't diverge. */
export async function baseFallbackCoverage(): Promise<Set<number>> {
    const cov = emojiIslandCoverage();
    const noto = FontManifest.find((e) => e.name === 'Noto Sans');
    if (noto === undefined) return cov;
    const all = entryFiles(noto);
    const slices = all.filter(
        (u) => /-400-\d+\./.test(u) && !u.includes('italic'),
    );
    for (const url of slices.length > 0 ? slices : all)
        for (const cp of await readCharacterSet(path.join('static', url)))
            cov.add(cp);
    return cov;
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
                // Decorative faces aren't in CSS; keep the range captured in the
                // committed lockfile (a single string per whole face, or none).
                range = previous[url]?.range ?? null;
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
