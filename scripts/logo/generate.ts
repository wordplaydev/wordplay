import { Resvg } from '@resvg/resvg-js';
import * as fontkit from 'fontkit';
import * as fs from 'node:fs';
import {
    LOGO_CENTER_Y,
    LOGO_STROKE_WIDTH,
    renderLogoGroup,
    renderLogoSVG,
} from '../../src/components/app/logoMark';
import { encodeIco } from './ico';
import {
    hashFile,
    pinnedResvgVersion,
    writeLock,
    type Lockfile,
} from './lockfile';
import {
    CARD_CAST,
    CARD_HEIGHT,
    CARD_WIDTH,
    CARD_WORDMARK,
    CardFontPath,
    CardPath,
    DARK_FOREGROUND,
    EmojiFontPath,
    IcoPath,
    IcoSizes,
    InputFiles,
    LIGHT_BACKGROUND,
    LIGHT_FOREGROUND,
    Rasters,
    SvgPath,
    outputFiles,
} from './manifest';

/** Rasterize an SVG document at the given pixel width. The card font is
 *  always registered; only the card's text uses it. */
function rasterize(svg: string, width: number): Buffer {
    const resvg = new Resvg(svg, {
        fitTo: { mode: 'width', value: width },
        font: {
            fontFiles: [CardFontPath, EmojiFontPath],
            loadSystemFonts: false,
            defaultFontFamily: 'Noto Sans',
        },
    });
    return Buffer.from(resvg.render().asPng());
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
const CAST_MARGIN = 44;

/** The faded ensemble cast behind the card's lockup: every emoji-named
 *  input stream and output type — a crowd of everything the bubble could be
 *  saying. Placement is organic, not gridded: seeded rejection sampling
 *  scatters glyphs uniformly over the inset canvas, rejecting any that
 *  would enter the lockup's zone or come within a minimum gap of an
 *  already-placed neighbor, so the crowd surrounds the lockup with visible
 *  space between every member and a clear border at the card's edge. */
function castLayer(exclude: {
    x: number;
    y: number;
    width: number;
    height: number;
}): string {
    const random = seededRandom(414);
    const placed: { x: number; y: number; size: number }[] = [];
    const gap = 14;
    let next = 0;
    let layer = '';
    for (let attempt = 0; attempt < 6000 && placed.length < 44; attempt++) {
        // Bias early placements large so big glyphs aren't crowded out.
        const max = attempt < 1500 ? 96 : 78;
        const size = 50 + random() * (max - 50);
        const half = size / 2;
        const x =
            CAST_MARGIN +
            half +
            random() * (CARD_WIDTH - 2 * (CAST_MARGIN + half));
        const y =
            CAST_MARGIN +
            half +
            random() * (CARD_HEIGHT - 2 * (CAST_MARGIN + half));
        if (
            x + half > exclude.x &&
            x - half < exclude.x + exclude.width &&
            y + half > exclude.y &&
            y - half < exclude.y + exclude.height
        )
            continue;
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
        const glyph = CARD_CAST[next % CARD_CAST.length];
        next++;
        layer += `<text x="${x.toFixed(1)}" y="${(y + size * 0.35).toFixed(1)}" text-anchor="middle" font-family="Noto Emoji" font-size="${size.toFixed(1)}" fill="${LIGHT_FOREGROUND}" fill-opacity="${opacity.toFixed(3)}" transform="rotate(${rotation.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})">${glyph}</text>`;
    }
    return layer;
}

/** The 1200×630 social card: the dots-face mark beside the wordmark, sized
 *  so the bubble matches the W's cap height, both vertically centered. All
 *  metrics are measured from the vendored font so a wordmark or font change
 *  can't drift the layout. */
function cardSVG(): string {
    const opened = fontkit.openSync(CardFontPath);
    // openSync can return a collection; our vendored file is a single font.
    const font = 'fonts' in opened ? opened.fonts[0] : opened;
    const fontSize = 150;
    const capHeight = (font.capHeight / font.unitsPerEm) * fontSize;
    const textWidth =
        (font.layout(CARD_WORDMARK).advanceWidth / font.unitsPerEm) * fontSize;

    // The bubble body spans y 14–74 (and x 12–84) in mark units, plus the
    // stroke on both edges; scale it to the wordmark's cap height.
    const bodyHeight = 74 - 14 + LOGO_STROKE_WIDTH;
    const scale = capHeight / bodyHeight;
    const markWidth = (84 - 12 + LOGO_STROKE_WIDTH) * scale;
    const gap = 45;

    const centerY = CARD_HEIGHT / 2;
    const left = (CARD_WIDTH - (markWidth + gap + textWidth)) / 2;
    // Place the bubble body's center (x 48, y LOGO_CENTER_Y in mark units)
    // on the card's vertical center.
    const markTx = left - (12 - LOGO_STROKE_WIDTH / 2) * scale;
    const markTy = centerY - LOGO_CENTER_Y * scale;
    const textX = left + markWidth + gap;
    const baseline = centerY + capHeight / 2;

    // The zone the cast keeps clear of: the lockup's actual extent (bubble
    // top/tail-bottom vs. wordmark cap/descender) plus a small margin —
    // tight, so the cast surrounds the lockup on all sides.
    const bubbleTop = markTy + (14 - LOGO_STROKE_WIDTH / 2) * scale;
    const bubbleBottom = markTy + (86 + LOGO_STROKE_WIDTH / 2) * scale;
    const textTop = baseline - capHeight;
    const textBottom = baseline + 0.22 * fontSize;
    const lockupTop = Math.min(bubbleTop, textTop) - 24;
    const lockupBottom = Math.max(bubbleBottom, textBottom) + 24;
    const exclude = {
        x: left - 30,
        y: lockupTop,
        width: markWidth + gap + textWidth + 60,
        height: lockupBottom - lockupTop,
    };

    return (
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">` +
        `<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${LIGHT_BACKGROUND}"/>` +
        castLayer(exclude) +
        `<g style="color: ${LIGHT_FOREGROUND}" transform="translate(${markTx} ${markTy}) scale(${scale})">${renderLogoGroup('shapes')}</g>` +
        `<text x="${textX}" y="${baseline}" font-family="Noto Sans" font-weight="700" font-size="${fontSize}" fill="${LIGHT_FOREGROUND}">${CARD_WORDMARK}</text>` +
        `</svg>`
    );
}

/** Regenerate every asset in the manifest and rewrite the lock. */
export function fix(): void {
    // The adaptive SVG favicon: light foreground normally, dark via media query.
    fs.writeFileSync(
        SvgPath,
        renderLogoSVG('shapes', {
            color: LIGHT_FOREGROUND,
            darkColor: DARK_FOREGROUND,
        }) + '\n',
    );

    for (const raster of Rasters) {
        const svg = renderLogoSVG('shapes', {
            color: LIGHT_FOREGROUND,
            background: raster.background,
            pad: raster.pad,
        });
        fs.writeFileSync(raster.file, rasterize(svg, raster.size));
    }

    fs.writeFileSync(
        IcoPath,
        encodeIco(
            IcoSizes.map((size) => ({
                size,
                data: rasterize(
                    renderLogoSVG('shapes', { color: LIGHT_FOREGROUND }),
                    size,
                ),
            })),
        ),
    );

    fs.writeFileSync(CardPath, rasterize(cardSVG(), CARD_WIDTH));

    const lock: Lockfile = {
        resvg: pinnedResvgVersion(),
        inputs: {},
        outputs: {},
    };
    for (const file of InputFiles) lock.inputs[file] = hashFile(file);
    for (const file of outputFiles()) lock.outputs[file] = hashFile(file);
    writeLock(lock);
    console.log(`Regenerated ${outputFiles().length} logo assets.`);
}
