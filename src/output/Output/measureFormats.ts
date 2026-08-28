/**
 * Measuring a run of formatted text on a canvas.
 *
 * Lifted out of `Phrase.getMetrics` so a speech bubble can be measured too. The
 * two callers want different numbers from the same walk: a phrase that wraps
 * reports the wrap width, because that is the box it paints into, while a bubble
 * is `width: max-content` and wants the widest line it actually produced.
 * Rather than measure twice, this returns both.
 */

import type { SupportedFace } from '@basis/faces/Fonts';
import type { WritingLayout } from '@locale/Scripts';
import { LINK_SYMBOL } from '@parser/Symbols';
import getTextMetrics from '@output/Output/getTextMetrics';
import { CSSFallbackFaces } from '@output/Output/Stage';
import { sizeToPx } from '@output/Output/outputToCSS';
import segmentWraps from '@output/Output/segmentWraps';
import type { FormattedText } from '@output/Output/Phrase';

export type FormatMetrics = {
    /** The accumulated width: the last line's width when wrapping, else the whole run. */
    width: number;
    height: number;
    ascent: number;
    descent: number;
    /** The widest line produced, which is what a shrink-to-fit box measures. */
    longestLine: number;
    /** How many lines the run wrapped onto; at least 1. */
    lines: number;
    /** The stacked height of every line but the last, as `getMetrics` counts it. */
    totalHeight: number;
};

export type MeasureOptions = {
    face: SupportedFace;
    /** In metres; converted to pixels for the CSS font string. */
    size: number;
    /** The wrap boundary in pixels, or undefined not to wrap. */
    maxWidth: number | undefined;
    layout: WritingLayout;
    /** The locale string word segmentation is done against. */
    locale: string;
    /**
     * Break the way CSS does rather than the way `getMetrics` always has: break
     * only once a segment truly exceeds the boundary, and ignore the trailing
     * space CSS hangs at a break.
     *
     * Off for a phrase, whose historical behavior must not move — every wrapped
     * phrase on every stage is placed from those numbers. On for a bubble, where
     * counting a line too many permanently widens the framing envelope, which
     * never tightens back.
     */
    exact?: boolean;
};

export default function measureFormats(
    formats: FormattedText[],
    { face, size, maxWidth, layout, locale, exact = false }: MeasureOptions,
): FormatMetrics {
    let width = 0;
    let height = 0;
    let ascent = 0;
    let descent = 0;
    let totalHeight = 0;
    let longestLine = 0;
    let lines = 1;
    /** The width of the current line ignoring the trailing space CSS hangs. */
    let lineInk = 0;
    /** One space in the current font, measured once rather than per segment. */
    let spaceWidth: number | undefined = undefined;
    let spaceFont: string | undefined = undefined;

    for (const formatted of formats) {
        // A custom character reference is measured as one '@'.
        const isCharacter = formatted.text.startsWith(LINK_SYMBOL);
        const textToMeasure = isCharacter ? '@' : formatted.text;
        for (const segment of segmentWraps(textToMeasure, locale)) {
            const cssFont = `${formatted.weight ?? ''} ${
                formatted.italic ? 'italic' : ''
            } ${sizeToPx(size)} "${face}", ${CSSFallbackFaces}`;
            const metrics = getTextMetrics(segment, cssFont, layout);
            if (metrics === undefined) continue;

            ascent = metrics.fontBoundingBoxAscent;
            descent = metrics.fontBoundingBoxDescent;
            height = isCharacter
                ? ascent
                : Math.max(
                      metrics.actualBoundingBoxAscent +
                          metrics.actualBoundingBoxDescent,
                      height,
                  );

            if (maxWidth === undefined) {
                width += metrics.width;
                lineInk = width;
            } else if (!exact) {
                // The phrase path, unchanged: break on `>=`, and count the
                // trailing space `segmentWraps` kept on the segment.
                if (width + metrics.width >= maxWidth) {
                    longestLine = Math.max(longestLine, lineInk);
                    width = 0;
                    totalHeight +=
                        metrics.fontBoundingBoxAscent +
                        metrics.fontBoundingBoxDescent;
                    height = 0;
                    lines++;
                }
                width += metrics.width;
                lineInk = width;
            } else {
                // The bubble path. `segmentWraps` keeps a segment's trailing
                // space and the canvas counts its advance, but CSS hangs it at
                // a break — so neither the break decision nor the widest line
                // may include it, or a bubble measures a line too many and one
                // space too wide, and the framing envelope never gives either
                // back.
                if (spaceWidth === undefined || spaceFont !== cssFont) {
                    spaceWidth =
                        getTextMetrics(' ', cssFont, layout)?.width ?? 0;
                    spaceFont = cssFont;
                }
                const trailing =
                    spaceWidth * (segment.length - segment.trimEnd().length);
                if (width + metrics.width - trailing > maxWidth) {
                    longestLine = Math.max(longestLine, lineInk);
                    width = 0;
                    totalHeight +=
                        metrics.fontBoundingBoxAscent +
                        metrics.fontBoundingBoxDescent;
                    height = 0;
                    lines++;
                }
                width += metrics.width;
                lineInk = width - trailing;
            }
        }
    }

    longestLine = Math.max(longestLine, lineInk);

    return { width, height, ascent, descent, longestLine, lines, totalHeight };
}
