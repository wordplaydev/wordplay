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
    CARD_HEIGHT,
    CARD_WIDTH,
    CARD_WORDMARK,
    CardFontPath,
    CardPath,
    DARK_FOREGROUND,
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
            fontFiles: [CardFontPath],
            loadSystemFonts: false,
            defaultFontFamily: 'Noto Sans',
        },
    });
    return Buffer.from(resvg.render().asPng());
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

    return (
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">` +
        `<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${LIGHT_BACKGROUND}"/>` +
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
