import { RenderableRanges } from './renderable.generated';

/**
 * Whether some default-chain font can actually draw a codepoint — a binary
 * search over the generated cmap-union intervals (renderable.generated.ts,
 * produced by `npm run fonts-fix`). The glyph chooser uses this to avoid
 * offering glyphs that would render as tofu: codepoints no bundled font has a
 * glyph for (an unreleased script, a CJK compatibility ideograph, or an
 * unassigned codepoint inside a block a font only partly covers).
 *
 * This tests real glyph coverage, not declared unicode-ranges: Google's slice
 * partitions declare whole blocks the font doesn't fully populate, so a
 * declared-range check would over-report renderability and let tofu through.
 */

const answers = new Map<number, boolean>();

export function isCodepointRenderable(codepoint: number): boolean {
    const cached = answers.get(codepoint);
    if (cached !== undefined) return cached;

    let low = 0;
    let high = RenderableRanges.length - 1;
    let found = false;
    while (low <= high) {
        const mid = (low + high) >> 1;
        const [lo, hi] = RenderableRanges[mid];
        if (codepoint < lo) high = mid - 1;
        else if (codepoint > hi) low = mid + 1;
        else {
            found = true;
            break;
        }
    }

    answers.set(codepoint, found);
    return found;
}
