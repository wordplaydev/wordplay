import * as fs from 'node:fs';
import { castLayer, lockupLayout, outlineText, type Keepout } from './lockup';
import {
    CARD_WORDMARK,
    CardFontPath,
    LIGHT_BACKGROUND,
    LIGHT_FOREGROUND,
    StickerAngle,
    StickerDir,
    StickerDPI,
    StickerInches,
    StickerName,
    StickerSide,
    StickerSuffix,
} from './manifest';

/** The lockup's clearance from the sticker's edge: a tenth of an inch,
 *  outside the print shop's ~1/16" safe zone, so the cut never nicks a
 *  letter. */
const EDGE = StickerSide / StickerInches / 10;

/** How close the cast may come to any part of the lockup, in lockup units. */
const CLEARANCE = 12;

/** The cast at twice the card's size and half its number, since at 1.5"
 *  the card's crowd is too small and faint to notice. */
const CROWD = { scale: 2, density: 0.5 };

/**
 * The printable sticker for Sticker Mule: the social card's wordmark with
 * ".dev" tucked between the p's and y's tails, turned up the diagonal and
 * scaled to fill the square, with the cast in the space it leaves. The
 * bubble is left out so the words can be larger; the cast carries the
 * playfulness. Every glyph is outlined, so the SVG needs no fonts at the
 * print shop.
 */
export function stickerSVG(): string {
    const lockup = lockupLayout(StickerSuffix);
    const parts = lockup.parts;
    const minX = Math.min(...parts.map((p) => p.x));
    const minY = Math.min(...parts.map((p) => p.y));
    const maxX = Math.max(...parts.map((p) => p.x + p.width));
    const maxY = Math.max(...parts.map((p) => p.y + p.height));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const radians = (StickerAngle * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    // Scale the turned ink until its bounding box meets the edge.
    const width = maxX - minX;
    const height = maxY - minY;
    const scale =
        (StickerSide - 2 * EDGE) /
        Math.max(
            Math.abs(width * cos) + Math.abs(height * sin),
            Math.abs(width * sin) + Math.abs(height * cos),
        );
    const middle = StickerSide / 2;

    // Undo the turn and scale to test a glyph against each part in the
    // lockup's own frame, where every part is an axis-aligned box.
    const intrudes: Keepout = (x, y, half) => {
        const dx = (x - middle) / scale;
        const dy = (y - middle) / scale;
        const lx = cx + dx * cos + dy * sin;
        const ly = cy - dx * sin + dy * cos;
        const reach = half / scale + CLEARANCE;
        return parts.some(
            (part) =>
                lx + reach > part.x &&
                lx - reach < part.x + part.width &&
                ly + reach > part.y &&
                ly - reach < part.y + part.height,
        );
    };

    const suffix = lockup.suffix;
    return (
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${StickerSide} ${StickerSide}">` +
        `<rect width="${StickerSide}" height="${StickerSide}" fill="${LIGHT_BACKGROUND}"/>` +
        castLayer(
            intrudes,
            'outline',
            { width: StickerSide, height: StickerSide },
            CROWD,
        ) +
        `<g transform="translate(${middle} ${middle}) rotate(${StickerAngle}) scale(${scale}) translate(${-cx} ${-cy})">` +
        outlineText(
            CardFontPath,
            CARD_WORDMARK,
            lockup.fontSize,
            lockup.textX,
            lockup.baseline,
            LIGHT_FOREGROUND,
        ) +
        (suffix === undefined
            ? ''
            : outlineText(
                  CardFontPath,
                  suffix.text,
                  suffix.size,
                  suffix.x,
                  suffix.baseline,
                  LIGHT_FOREGROUND,
              )) +
        `</g></svg>`
    );
}

/** Write the sticker's outlined SVG and its print-resolution PNG. */
export async function writeStickers(): Promise<void> {
    // Loaded here so building the SVG (and testing it) never needs the
    // native rasterizer.
    const { rasterize } = await import('./generate');
    fs.mkdirSync(StickerDir, { recursive: true });
    const svg = stickerSVG();
    const base = `${StickerDir}/${StickerName}`;
    fs.writeFileSync(`${base}.svg`, svg + '\n');
    fs.writeFileSync(
        `${base}.png`,
        rasterize(svg, Math.round(StickerInches * StickerDPI)),
    );
    console.log(`Wrote ${base}.svg and ${base}.png`);
}
