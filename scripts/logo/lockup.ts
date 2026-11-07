import * as fontkit from 'fontkit';
import {
    LOGO_CENTER_Y,
    LOGO_STROKE_WIDTH,
} from '../../src/components/app/logoMark';
import {
    CARD_CAST,
    CARD_HEIGHT,
    CARD_WIDTH,
    CARD_WORDMARK,
    CardFontPath,
    EmojiFontPath,
    LIGHT_FOREGROUND,
} from './manifest';
import { must } from '#util/nullable.ts';

/**
 * The mark-beside-wordmark lockup and the ensemble cast around it, shared by
 * the social card (generate.ts) and the printable stickers (stickers.ts) so a
 * sticker can never drift from the link preview.
 */

/** Open a vendored single-font file. */
function openFont(path: string): fontkit.Font {
    const opened = fontkit.openSync(path);
    // openSync can return a collection; our vendored files are single fonts.
    return 'fonts' in opened
        ? must(opened.fonts[0], 'the first font of the collection')
        : opened;
}

const fonts = new Map<string, fontkit.Font>();
function font(path: string): fontkit.Font {
    let cached = fonts.get(path);
    if (cached === undefined) {
        cached = openFont(path);
        fonts.set(path, cached);
    }
    return cached;
}

/** A box in card coordinates. */
export type Box = { x: number; y: number; width: number; height: number };

/** The canvas the cast is scattered over; the social card's by default. */
export type Canvas = { width: number; height: number };

/** Whether a cast glyph centered at (x, y) and reaching `half` from its
 *  center would intrude on the lockup. */
export type Keepout = (x: number, y: number, half: number) => boolean;
const CardCanvas: Canvas = { width: CARD_WIDTH, height: CARD_HEIGHT };

/** How text is drawn: as `<text>` the rasterizer shapes with the vendored
 *  font, or as outlined paths, so a print shop never needs the font. */
export type TextMode = 'text' | 'outline';

/** The width of a run of text at the given size, in card units. */
export function textWidth(fontPath: string, text: string, size: number) {
    const face = font(fontPath);
    return (face.layout(text).advanceWidth / face.unitsPerEm) * size;
}

/** Text as one SVG path, its left edge at x and its baseline at y. */
export function outlineText(
    fontPath: string,
    text: string,
    size: number,
    x: number,
    baseline: number,
    fill: string,
    extra = '',
): string {
    const face = font(fontPath);
    const run = face.layout(text);
    const scale = size / face.unitsPerEm;
    let pen = 0;
    let d = '';
    run.glyphs.forEach((glyph, index) => {
        const position = must(run.positions[index], 'a glyph position');
        // Font units are y-up; flip into the card's y-down space.
        d += glyph.path
            .transform(
                scale,
                0,
                0,
                -scale,
                x + (pen + position.xOffset) * scale,
                baseline - position.yOffset * scale,
            )
            .toSVG();
        pen += position.xAdvance;
    });
    return `<path d="${d}" fill="${fill}"${extra}/>`;
}

/** A tiny deterministic PRNG (mulberry32) with a fixed seed: the card's
 *  scatter must produce byte-identical output on every regeneration, or the
 *  lockfile's hash model would see phantom drift. */
function seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
        state |= 0;
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** The card's border inset: the cast never reaches within this of the edge. */
export const CAST_MARGIN = 44;

/** The faded ensemble cast behind the card's lockup: every emoji-named
 *  input stream and output type — a crowd of everything the bubble could be
 *  saying. Placement is organic, not gridded: seeded rejection sampling
 *  scatters glyphs uniformly over the inset canvas, rejecting any that
 *  would enter the lockup's zone or come within a minimum gap of an
 *  already-placed neighbor, so the crowd surrounds the lockup with visible
 *  space between every member and a clear border at the card's edge. */
export function castLayer(
    exclude: Box | Keepout,
    mode: TextMode = 'text',
    canvas: Canvas = CardCanvas,
    /** Glyph size relative to the card's, which also scales the gap; and the
     *  share of the card's density. A small print needs fewer, larger. */
    crowd: { scale: number; density: number } = { scale: 1, density: 1 },
): string {
    // The card holds 44; a larger canvas holds a crowd of the same density.
    const count = Math.round(
        (44 * crowd.density * canvas.width * canvas.height) /
            (CARD_WIDTH * CARD_HEIGHT),
    );
    const intrudes: Keepout =
        typeof exclude === 'function'
            ? exclude
            : (x, y, half) =>
                  x + half > exclude.x &&
                  x - half < exclude.x + exclude.width &&
                  y + half > exclude.y &&
                  y - half < exclude.y + exclude.height;
    const random = seededRandom(414);
    const placed: { x: number; y: number; size: number }[] = [];
    const gap = 14 * crowd.scale;
    let next = 0;
    let layer = '';
    for (let attempt = 0; attempt < 6000 && placed.length < count; attempt++) {
        // Bias early placements large so big glyphs aren't crowded out.
        const max = attempt < 1500 ? 96 : 78;
        const size = (50 + random() * (max - 50)) * crowd.scale;
        const half = size / 2;
        const x =
            CAST_MARGIN +
            half +
            random() * (canvas.width - 2 * (CAST_MARGIN + half));
        const y =
            CAST_MARGIN +
            half +
            random() * (canvas.height - 2 * (CAST_MARGIN + half));
        if (intrudes(x, y, half)) continue;
        if (
            placed.some(
                (other) =>
                    Math.hypot(other.x - x, other.y - y) <
                    other.size / 2 + half + gap,
            )
        )
            continue;
        placed.push({ x, y, size });
        const rotation = -28 + random() * 56;
        const opacity = 0.09 + random() * 0.07;
        const glyph = must(CARD_CAST[next % CARD_CAST.length], 'a cast glyph');
        next++;
        const rotate = `rotate(${rotation.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`;
        const baseline = y + size * 0.35;
        layer +=
            mode === 'text'
                ? `<text x="${x.toFixed(1)}" y="${baseline.toFixed(1)}" text-anchor="middle" font-family="Noto Emoji" font-size="${size.toFixed(1)}" fill="${LIGHT_FOREGROUND}" fill-opacity="${opacity.toFixed(3)}" transform="${rotate}">${glyph}</text>`
                : outlineText(
                      EmojiFontPath,
                      glyph,
                      size,
                      x - textWidth(EmojiFontPath, glyph, size) / 2,
                      baseline,
                      LIGHT_FOREGROUND,
                      ` fill-opacity="${opacity.toFixed(3)}" transform="${rotate}"`,
                  );
    }
    return layer;
}

/** Where the lockup's parts land on the card. */
export type Lockup = {
    /** The wordmark's font size. */
    fontSize: number;
    /** The transform placing the 96×96 mark. */
    markTx: number;
    markTy: number;
    markScale: number;
    /** The wordmark's left edge and baseline. */
    textX: number;
    baseline: number;
    /** The suffix tucked between the wordmark's tails, when there is one. */
    suffix:
        { text: string; size: number; x: number; baseline: number } | undefined;
    /** The zone the card's cast keeps clear of. */
    exclude: Box;
    /** The bubble's ink. */
    markInk: Box;
    /** The wordmark's ink in parts — its body, each descender, the suffix —
     *  so a cast can come closer than one box around them all. */
    parts: Box[];
};

/** The suffix's largest size relative to the wordmark's. */
const SUFFIX_SCALE = 0.5;

/** A descender's ink must reach this far below the baseline, in em, so a
 *  round letter's overshoot doesn't count as a tail. */
const TAIL_DEPTH = 0.05;

/** Each descending glyph's tail, as an x range in font units along the run. */
function tails(face: fontkit.Font, text: string): [number, number][] {
    const run = face.layout(text);
    const ranges: [number, number][] = [];
    let pen = 0;
    run.glyphs.forEach((glyph, index) => {
        const xs: number[] = [];
        for (const command of glyph.path.commands)
            for (let i = 0; i + 1 < command.args.length; i += 2) {
                const [x, y] = [command.args[i], command.args[i + 1]];
                if (
                    x !== undefined &&
                    y !== undefined &&
                    y < -TAIL_DEPTH * face.unitsPerEm
                )
                    xs.push(pen + x);
            }
        if (xs.length > 0) ranges.push([Math.min(...xs), Math.max(...xs)]);
        pen += must(run.positions[index], 'a glyph position').xAdvance;
    });
    return ranges;
}

/** The dots-face mark beside the wordmark, sized so the bubble matches the
 *  W's cap height, both centered on the card. An optional suffix (".dev")
 *  hangs below the baseline in the widest gap between two descenders' tails
 *  (the p and the y). All metrics are measured from the vendored font so a
 *  wordmark or font change can't drift the layout. */
export function lockupLayout(suffix?: string): Lockup {
    const face = font(CardFontPath);
    const fontSize = 150;
    const em = fontSize / face.unitsPerEm;
    // Kept as the card always computed them, so its bytes don't drift.
    const capHeight = (face.capHeight / face.unitsPerEm) * fontSize;
    const wordRun = face.layout(CARD_WORDMARK);
    const wordWidth = (wordRun.advanceWidth / face.unitsPerEm) * fontSize;

    // The bubble body spans y 14–74 (and x 12–84) in mark units, plus the
    // stroke on both edges; scale it to the wordmark's cap height.
    const bodyHeight = 74 - 14 + LOGO_STROKE_WIDTH;
    const scale = capHeight / bodyHeight;
    const markWidth = (84 - 12 + LOGO_STROKE_WIDTH) * scale;
    const gap = 45;

    const centerY = CARD_HEIGHT / 2;
    const left = (CARD_WIDTH - (markWidth + gap + wordWidth)) / 2;
    // Place the bubble body's center (x 48, y LOGO_CENTER_Y in mark units)
    // on the card's vertical center.
    const markTx = left - (12 - LOGO_STROKE_WIDTH / 2) * scale;
    const markTy = centerY - LOGO_CENTER_Y * scale;
    const textX = left + markWidth + gap;
    const baseline = centerY + capHeight / 2;

    const bubbleTop = markTy + (14 - LOGO_STROKE_WIDTH / 2) * scale;
    const bubbleBottom = markTy + (86 + LOGO_STROKE_WIDTH / 2) * scale;
    const descent = -wordRun.bbox.minY * em;
    const markInk = {
        x: left,
        y: bubbleTop,
        width: markWidth,
        height: bubbleBottom - bubbleTop,
    };
    const parts: Box[] = [
        {
            x: textX + wordRun.bbox.minX * em,
            y: baseline - wordRun.bbox.maxY * em,
            width: (wordRun.bbox.maxX - wordRun.bbox.minX) * em,
            height: wordRun.bbox.maxY * em,
        },
    ];
    const tailRanges = tails(face, CARD_WORDMARK).map(
        ([from, to]): [number, number] => [textX + from * em, textX + to * em],
    );
    for (const [from, to] of tailRanges)
        parts.push({ x: from, y: baseline, width: to - from, height: descent });

    // The suffix fills the widest gap between neighboring tails, with a
    // margin either side, and its tallest letter clears the baseline.
    let placed: Lockup['suffix'] = undefined;
    if (suffix !== undefined) {
        let widest: [number, number] = [textX, textX + wordWidth];
        let widestGap = -Infinity;
        for (let i = 0; i + 1 < tailRanges.length; i++) {
            const from = must(tailRanges[i], 'a tail')[1];
            const to = must(tailRanges[i + 1], 'a tail')[0];
            if (to - from > widestGap) {
                widestGap = to - from;
                widest = [from, to];
            }
        }
        const margin = 0.08 * fontSize;
        const ink = face.layout(suffix).bbox;
        const size = Math.min(
            fontSize * SUFFIX_SCALE,
            ((widest[1] - widest[0] - 2 * margin) * face.unitsPerEm) /
                (ink.maxX - ink.minX),
        );
        const unit = size / face.unitsPerEm;
        const middle = (widest[0] + widest[1]) / 2;
        const x = middle - ((ink.minX + ink.maxX) / 2) * unit;
        const suffixBaseline = baseline + 0.06 * fontSize + ink.maxY * unit;
        placed = { text: suffix, size, x, baseline: suffixBaseline };
        parts.push({
            x: x + ink.minX * unit,
            y: suffixBaseline - ink.maxY * unit,
            width: (ink.maxX - ink.minX) * unit,
            height: (ink.maxY - ink.minY) * unit,
        });
    }

    // The zone the card's cast keeps clear of: the lockup's actual extent
    // (bubble top/tail-bottom vs. wordmark cap/descender) plus a small
    // margin — tight, so the cast surrounds the lockup on all sides.
    const textTop = baseline - capHeight;
    const textBottom = baseline + 0.22 * fontSize;
    const lockupTop = Math.min(bubbleTop, textTop) - 24;
    const lockupBottom = Math.max(bubbleBottom, textBottom) + 24;
    const exclude = {
        x: left - 30,
        y: lockupTop,
        width: markWidth + gap + wordWidth + 60,
        height: lockupBottom - lockupTop,
    };

    return {
        fontSize,
        markTx,
        markTy,
        markScale: scale,
        textX,
        baseline,
        suffix: placed,
        exclude,
        markInk,
        parts,
    };
}
