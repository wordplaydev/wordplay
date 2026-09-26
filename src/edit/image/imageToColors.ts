/**
 * Turning a picture into Wordplay code (#559, #560).
 *
 * The picture becomes code once, here, rather than being stored and sampled while a
 * program runs: what a creator gets is a source file of `Color` values they can read,
 * edit one square of, and hand to an `@Image`. Nothing is uploaded and nothing but text
 * is kept.
 *
 * Deliberately free of `Value` and DOM imports, so the conversion can be tested without
 * either — the same rule `csv.ts` follows for the paste path.
 */
import { RGBtoLCH } from '@output/Color/ColorJS';

/**
 * How wide a picture may be, in colors.
 *
 * Bytes are not the binding constraint: at about twenty bytes a color even the widest
 * picture here is a fraction of the document limit. What costs is the editor mounting a
 * token view per number, so the ceiling is what a source can be opened and scrolled
 * without stalling. `Lyrics.wp` ships a list of 1,662 evaluates, which is the measured
 * precedent 64 x 48 sits just above.
 */
export const MinResolution = 8;
export const MaxResolution = 64;

/** The slider's step. Eight, because the difference a single color makes is invisible
 *  and every step should be a picture a creator can tell from the last one. */
export const ResolutionStep = 8;

/** What a picture arrives at unless a creator says otherwise. */
export const DefaultResolution = 32;

/** One color's worth of source, rounded the way `Camera` rounds its own frames so an
 *  imported picture and a captured one are written the same way. */
export function colorToWordplay(
    red: number,
    green: number,
    blue: number,
): string {
    const color = RGBtoLCH(red / 255, green / 255, blue / 255);
    const hue = color.coords[2] ?? 0;
    return `🌈(${Math.round(color.coords[0] ?? 0)}% ${Math.round(
        color.coords[1] ?? 0,
    )} ${Math.round(isNaN(hue) ? 0 : hue)}°)`;
}

/**
 * The source of a picture: a doc naming it, then its rows of colors.
 *
 * The blank line under the doc is load-bearing (#1374). A doc touching what follows
 * documents *that* rather than the source, and a source's own doc is what a gallery shows
 * as its description — so without the blank line an imported picture would silently lose
 * its description the moment someone opened it.
 *
 * Rows are written one per line, which is how a creator reads a picture and how they find
 * the square they want to change.
 */
export function colorsToSource(
    rgba: Uint8ClampedArray,
    columns: number,
    rows: number,
    doc: string,
): string {
    const lines: string[] = [];
    for (let y = 0; y < rows; y++) {
        const cells: string[] = [];
        for (let x = 0; x < columns; x++) {
            const i = (y * columns + x) * 4;
            cells.push(
                colorToWordplay(
                    rgba[i] ?? 0,
                    rgba[i + 1] ?? 0,
                    rgba[i + 2] ?? 0,
                ),
            );
        }
        lines.push(`\t[${cells.join(' ')}]`);
    }
    return `¶${doc}¶\n\n[\n${lines.join('\n')}\n]\n`;
}

/** What a source of this size will cost, in bytes, without building it. */
export function estimateBytes(columns: number, rows: number): number {
    // Measured against what `colorsToSource` actually writes for a spread of colors:
    // `🌈(12% 8 29°)` is 20 bytes of UTF-8 plus a separator, and three-digit chroma and
    // hue take it to 23. The high end is the honest one to budget with.
    const perColor = 23;
    const perRow = 4;
    return columns * rows * perColor + rows * perRow;
}
