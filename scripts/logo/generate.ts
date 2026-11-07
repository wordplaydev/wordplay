import { Resvg } from '@resvg/resvg-js';
import * as fs from 'node:fs';
import {
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
import { castLayer, lockupLayout } from './lockup';
import {
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
export function rasterize(svg: string, width: number): Buffer {
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

/** The 1200×630 social card: the lockup centered over the faded cast. */
function cardSVG(): string {
    const lockup = lockupLayout();
    return (
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">` +
        `<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${LIGHT_BACKGROUND}"/>` +
        castLayer(lockup.exclude) +
        `<g style="color: ${LIGHT_FOREGROUND}" transform="translate(${lockup.markTx} ${lockup.markTy}) scale(${lockup.markScale})">${renderLogoGroup('shapes')}</g>` +
        `<text x="${lockup.textX}" y="${lockup.baseline}" font-family="Noto Sans" font-weight="700" font-size="${lockup.fontSize}" fill="${LIGHT_FOREGROUND}">${CARD_WORDMARK}</text>` +
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
