import { parseFontUrl } from './files';
import { entryFiles } from './lockfile';
import type { Lockfile } from './lockfile';
import { FontManifest } from '../../src/basis/faces/fonts.manifest';
import type { FontManifestEntry } from '../../src/basis/faces/fonts.manifest';

/**
 * Builds the runtime face registry (Faces + FallbackFaces) from the manifest +
 * lockfile — the single-source replacement for the two hand-authored tables.
 * Emoji faces' ranges are cmap-derived (rangeSource 'emoji') and injected via
 * the emojiRanges argument to buildFaces.
 */

export type FaceRecord = {
    weights: { min: number; max: number } | number[];
    italic: boolean;
    scripts: readonly string[];
    format: string;
    preloaded?: boolean;
    ranges?: string | string[];
};

/** The ordered slice ranges for a face, or a single string / undefined for a
 * whole-file face — matching how Faces.ranges is shaped today. */
export function facesRanges(
    entry: FontManifestEntry,
    lock: Lockfile,
): string | string[] | undefined {
    const bySlice = new Map<number, string>();
    let wholeRange: string | null = null;
    let sliced = false;
    for (const url of entryFiles(entry)) {
        const { slice } = parseFontUrl(`/${url}`);
        const range = lock[url]?.range ?? null;
        if (slice !== undefined) {
            sliced = true;
            if (range !== null && !bySlice.has(slice))
                bySlice.set(slice, range);
        } else if (range !== null) {
            wholeRange = range;
        }
    }
    if (sliced) {
        return [...bySlice.keys()]
            .sort((a, b) => a - b)
            .map((i) => bySlice.get(i) as string);
    }
    return wholeRange ?? undefined;
}

function weights(entry: FontManifestEntry): FaceRecord['weights'] {
    return 'min' in entry.weights
        ? { min: entry.weights.min, max: entry.weights.max }
        : [...entry.weights];
}

export function buildFaces(
    lock: Lockfile,
    emojiRanges: Record<string, string> = {},
): Record<string, FaceRecord> {
    const faces: Record<string, FaceRecord> = {};
    for (const entry of FontManifest) {
        if (!entry.roles.includes('creator')) continue;
        const ranges =
            entry.rangeSource === 'emoji'
                ? emojiRanges[entry.name]
                : facesRanges(entry, lock);
        faces[entry.name] = {
            weights: weights(entry),
            italic: entry.italic,
            scripts: [...entry.scripts],
            format: entry.format,
            ...(entry.delivery === 'preload' ? { preloaded: true } : {}),
            ...(ranges !== undefined ? { ranges } : {}),
        };
    }
    return faces;
}

/** Fixed Han-unification order for the CJK fallback faces: locale-preferred
 * fonts precede the fallback chain, so this only decides glyph style for
 * viewers whose locale doesn't cover Han. */
const CJK_ORDER = [
    'Noto Sans Simplified Chinese',
    'Noto Sans Traditional Chinese',
    'Noto Sans Japanese',
    'Noto Sans Korean',
];

export function buildFallback(lock: Lockfile): {
    name: string;
    scripts: readonly string[];
    weights: FaceRecord['weights'];
    ranges: string[];
}[] {
    const all = FontManifest.filter((e) => e.roles.includes('fallback')).map(
        (entry) => {
            const ranges = facesRanges(entry, lock);
            return {
                name: entry.name,
                scripts: [...entry.scripts],
                weights: weights(entry),
                ranges: Array.isArray(ranges) ? ranges : ranges ? [ranges] : [],
            };
        },
    );
    // Chain order: script faces (alphabetical), then symbol faces (no scripts),
    // then CJK in the fixed Han-unification order. Locale fonts precede this
    // chain, so CJK-locale users get locale-correct glyphs regardless.
    const isCjk = (n: string) => CJK_ORDER.includes(n);
    const byName = (a: { name: string }, b: { name: string }) =>
        a.name.localeCompare(b.name);
    return [
        ...all
            .filter((f) => !isCjk(f.name) && f.scripts.length > 0)
            .sort(byName),
        ...all.filter((f) => f.scripts.length === 0).sort(byName),
        ...CJK_ORDER.map((n) => all.find((f) => f.name === n)).filter(
            (f): f is (typeof all)[number] => f !== undefined,
        ),
    ];
}
