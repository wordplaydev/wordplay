import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, test } from 'vitest';

/**
 * The two whole-file emoji @font-face blocks in static/fonts/fonts.css (the
 * monochrome Noto Emoji, and Safari's SVG Noto Color Emoji) must claim exactly
 * the codepoints their font actually has glyphs for — never a broad
 * U+1F000-1FFFF that shadows codepoints the font lacks (which would tofu
 * instead of falling through). This test regenerates the intended range from
 * the font's cmap and asserts fonts.css matches; if the bundled font is
 * updated, regenerate the ranges from this derivation.
 */

/** Blocks the emoji fonts are intended to cover (BMP symbol blocks + the SMP
 * emoji plane). Intersecting the cmap with these drops text-shadowing low
 * codepoints (space, digits, ©, ®, ™, …) and stray non-emoji glyphs. */
const BLOCKS: [number, number][] = [
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
const FORMAT: [number, number][] = [
    [0x200d, 0x200d],
    [0x20e3, 0x20e3],
    [0xfe0e, 0xfe0f],
    [0xe0020, 0xe007f],
];
const inBlocks = (cp: number) => BLOCKS.some(([a, b]) => cp >= a && cp <= b);

/** The set of codepoints an emoji font file should declare. Loads the font
 * with fontkit the same way Fonts.ts does (dynamic import + collection check). */
async function preciseCodepoints(fontPath: string): Promise<Set<number>> {
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
    const characterSet: number[] = (font as { characterSet: number[] })
        .characterSet;
    const cps = new Set<number>();
    for (const cp of characterSet) if (inBlocks(cp)) cps.add(cp);
    for (const [a, b] of FORMAT) for (let cp = a; cp <= b; cp++) cps.add(cp);
    return cps;
}

/** Parse the unicode-range of the first @font-face block whose src matches. */
function declaredCodepoints(css: string, srcNeedle: string): Set<number> {
    const cps = new Set<number>();
    for (const block of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
        const body = block[1];
        if (!body.includes(srcNeedle)) continue;
        const ur = body.match(/unicode-range:\s*([^;]+);/);
        if (!ur) continue;
        for (const part of ur[1].split(',')) {
            const t = part.trim().replace(/^U\+/i, '');
            const m = t.split('-');
            const lo = parseInt(m[0], 16);
            const hi = m[1] !== undefined ? parseInt(m[1], 16) : lo;
            for (let cp = lo; cp <= hi; cp++) cps.add(cp);
        }
        return cps; // first matching block only
    }
    throw new Error(`No @font-face with src containing ${srcNeedle}`);
}

const css = fs.readFileSync(path.join('static', 'fonts', 'fonts.css'), 'utf8');

describe('emoji @font-face ranges match the fonts glyph coverage', () => {
    test.each([
        [
            'Noto Emoji (mono)',
            'static/fonts/NotoEmoji/NotoEmoji-400.woff2',
            'NotoEmoji-400.woff2',
        ],
        [
            'Noto Color Emoji (Safari SVG)',
            'static/fonts/NotoColorEmoji/NotoColorEmoji.svg.ttf',
            'NotoColorEmoji.svg.ttf',
        ],
    ])(
        '%s declares exactly its glyph coverage',
        async (_name, fontPath, srcNeedle) => {
            const expected = await preciseCodepoints(fontPath);
            const declared = declaredCodepoints(css, srcNeedle);

            // No over-claim: every declared codepoint is one the font has a glyph
            // for (or a needed format char). Over-claiming is what causes tofu.
            const overClaimed = [...declared].filter((cp) => !expected.has(cp));
            expect(overClaimed.map((cp) => 'U+' + cp.toString(16))).toEqual([]);

            // No under-claim: every glyph the font has in the emoji blocks is
            // declared, so no renderable emoji is dropped.
            const underClaimed = [...expected].filter(
                (cp) => !declared.has(cp),
            );
            expect(underClaimed.map((cp) => 'U+' + cp.toString(16))).toEqual(
                [],
            );
        },
    );

    test('neither whole-file emoji face claims the broad U+1F000-1FFFF block', () => {
        for (const srcNeedle of [
            'NotoEmoji-400.woff2',
            'NotoColorEmoji.svg.ttf',
        ]) {
            const declared = declaredCodepoints(css, srcNeedle);
            // A precise range covers only a fraction of the 0x1000 SMP block.
            let smpClaimed = 0;
            for (let cp = 0x1f000; cp <= 0x1ffff; cp++)
                if (declared.has(cp)) smpClaimed++;
            expect(smpClaimed).toBeLessThan(0x1000);
        }
    });
});
