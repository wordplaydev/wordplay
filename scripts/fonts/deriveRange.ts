import * as fs from 'node:fs';
import * as crypto from 'node:crypto';

/**
 * A font file's cmap is the single source of truth for what it can render.
 * deriveRange reads that cmap and produces the CSS unicode-range the font's
 * @font-face should declare — never more (over-claiming shadows codepoints the
 * font lacks, causing tofu) and never less (dropping renderable glyphs).
 *
 * This is the one derivation every range in the font system flows through:
 * Noto Sans, emoji, fallback, decorative, and the keycap face.
 */

/** An inclusive [lo, hi] codepoint interval. */
export type Interval = [number, number];

/** How to turn a font file's cmap into its declared range. */
export type RangeMode =
    | { kind: 'full' } // every codepoint the font has a glyph for
    | {
          kind: 'blocks';
          blocks: readonly Interval[];
          format: readonly Interval[];
      } // cmap ∩ blocks, plus format chars (emoji)
    | { kind: 'only'; include: readonly Interval[] }; // only these codepoints, if the font has them (keycap face)

const inRanges = (cp: number, ranges: readonly Interval[]) =>
    ranges.some(([a, b]) => cp >= a && cp <= b);

/** The blocks the emoji fonts are intended to cover (BMP symbol blocks + the
 * SMP emoji plane). Intersecting the cmap with these drops text-shadowing low
 * codepoints (space, digits, ©, ®, ™, …) and stray non-emoji glyphs. */
export const EMOJI_BLOCKS: readonly Interval[] = [
    [0x2194, 0x21ff],
    [0x2300, 0x23ff],
    [0x2460, 0x24ff],
    [0x2500, 0x25ff],
    [0x2600, 0x26ff],
    [0x2700, 0x27bf],
    [0x2900, 0x29ff],
    [0x2b00, 0x2bff],
    [0x3030, 0x3030],
    [0x303d, 0x303d],
    [0x3297, 0x3297],
    [0x3299, 0x3299],
    [0x1f000, 0x1ffff],
];
/** Zero-width format codepoints emoji sequences need even without a glyph:
 * ZWJ, keycap combiner, variation selectors, and flag tag chars. */
export const EMOJI_FORMAT: readonly Interval[] = [
    [0x200d, 0x200d],
    [0x20e3, 0x20e3],
    [0xfe0e, 0xfe0f],
    [0xe0020, 0xe007f],
];

/** The cmap-derived range for a whole-file emoji font (mono woff2 or the Safari
 * SVG color face): the same derivation the drift test guards. */
export function deriveEmojiRange(fontPath: string): Promise<string> {
    return deriveRange(fontPath, {
        kind: 'blocks',
        blocks: EMOJI_BLOCKS,
        format: EMOJI_FORMAT,
    });
}

/** The whole-file each emoji face's range is derived from. */
export const EMOJI_WHOLE_FILE: Record<string, string> = {
    'Noto Emoji': 'static/fonts/NotoEmoji/NotoEmoji-400.woff2',
    'Noto Color Emoji': 'static/fonts/NotoColorEmoji/NotoColorEmoji.svg.ttf',
};

/** Load a font file's cmap codepoints with fontkit, the same way Fonts.ts and
 * Contour.ts do (dynamic import + collection check). */
export async function readCharacterSet(fontPath: string): Promise<number[]> {
    const mod = await import('fontkit');
    const fontkit: { create(data: Uint8Array): unknown } =
        'create' in mod
            ? (mod as { create(data: Uint8Array): unknown })
            : (mod as { default: { create(data: Uint8Array): unknown } })
                  .default;
    const created = fontkit.create(new Uint8Array(fs.readFileSync(fontPath)));
    const font =
        created !== null && typeof created === 'object' && 'fonts' in created
            ? (created as { fonts: unknown[] }).fonts[0]
            : created;
    return (font as { characterSet: number[] }).characterSet;
}

/** Merge a sorted codepoint list into compact intervals and format as a CSS
 * unicode-range string (lowercase hex, matching Google's slice style). */
export function toRangeString(codepoints: Iterable<number>): string {
    const sorted = [...new Set(codepoints)].sort((a, b) => a - b);
    const iv: Interval[] = [];
    for (const cp of sorted) {
        const last = iv[iv.length - 1];
        if (last && cp <= last[1] + 1) last[1] = cp;
        else iv.push([cp, cp]);
    }
    return iv
        .map(([a, b]) =>
            a === b
                ? `U+${a.toString(16)}`
                : `U+${a.toString(16)}-${b.toString(16)}`,
        )
        .join(', ');
}

/** Derive the CSS unicode-range for a font file per the given mode. */
export async function deriveRange(
    fontPath: string,
    mode: RangeMode,
): Promise<string> {
    const cmap = await readCharacterSet(fontPath);
    const cps = new Set<number>();
    switch (mode.kind) {
        case 'full':
            for (const cp of cmap) cps.add(cp);
            break;
        case 'blocks':
            for (const cp of cmap) if (inRanges(cp, mode.blocks)) cps.add(cp);
            for (const [a, b] of mode.format)
                for (let cp = a; cp <= b; cp++) cps.add(cp);
            break;
        case 'only':
            for (const cp of cmap) if (inRanges(cp, mode.include)) cps.add(cp);
            break;
    }
    return toRangeString(cps);
}

/** Short content hash of a font file, for cheap drift detection. */
export function hashFile(fontPath: string): string {
    return crypto
        .createHash('sha256')
        .update(fs.readFileSync(fontPath))
        .digest('hex')
        .slice(0, 16);
}
