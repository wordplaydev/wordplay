/**
 * Tracing a single character from a font into a character composition (#924).
 *
 * Separate from Character.ts for the same reason paths.ts is: only the character
 * editor traces glyphs, while Character.ts is reachable from the database on
 * every page, and this reaches the font registry and fontkit.
 */
import {
    getContourFont,
    rangeContains,
    resolveWeight,
    type ContourFontError,
    type FontWeight,
    Faces,
} from '@basis/faces/Fonts';
import type { PathCommand } from 'fontkit';
import { hasEmoji } from '@unicode/emoji';
import UnicodeString from '@unicode/UnicodeString';

/** Why tracing a glyph failed, in terms a creator can be told about. */
export type GlyphError =
    // The font file couldn't be reached, wasn't there, or wasn't readable.
    | ContourFontError
    // No such face, or no DOM to fetch with.
    | 'unsupported'
    // The face declares no file covering this character.
    | 'uncovered'
    // fontkit threw laying the character out or reading its outline.
    | 'outline'
    // Laid out, but there's no ink: a space, or a color glyph with no outline.
    | 'empty';

/** What a glyph is traced from. */
export type GlyphSource = {
    character: string;
    face: string;
    weight: FontWeight;
    italic: boolean;
};

/** How many decimals a coordinate keeps. A thousandth of the unit box is a
 *  thirty-second of a cell on the 32x32 grid — far past what anyone can see,
 *  and it keeps a CJK outline from running to tens of kilobytes. */
const Precision = 3;

/** Round without exponent notation, which would fall outside GlyphPathPattern. */
function round(value: number): string {
    return Number(value.toFixed(Precision)).toString();
}

/**
 * Convert fontkit path commands into an SVG `d`, normalized into the unit box.
 *
 * Font outlines are y-up and sized in the font's own units; SVG is y-down and
 * this wants a 0..1 box, so each coordinate is offset by the ink box's corner
 * and divided by its extent, with y inverted. Inverting y reverses the winding
 * of every contour uniformly, so nonzero-winding fill still tells an outer
 * contour from a counter — the hole in an `o` stays a hole.
 *
 * Exported for testing, the way Contour.ts exports its own conversion.
 */
export function commandsToUnitPath(
    commands: PathCommand[],
    box: { minX: number; minY: number; maxX: number; maxY: number },
): string {
    const width = box.maxX - box.minX;
    const height = box.maxY - box.minY;
    if (width <= 0 || height <= 0) return '';
    const x = (value: number) => round((value - box.minX) / width);
    // 1 - t rather than t: the box's top in font space is its bottom in SVG's.
    const y = (value: number) => round(1 - (value - box.minY) / height);

    const parts: string[] = [];
    for (const { command, args } of commands) {
        switch (command) {
            case 'moveTo':
                parts.push(`M ${x(args[0])} ${y(args[1])}`);
                break;
            case 'lineTo':
                parts.push(`L ${x(args[0])} ${y(args[1])}`);
                break;
            case 'quadraticCurveTo':
                parts.push(
                    `Q ${x(args[0])} ${y(args[1])} ${x(args[2])} ${y(args[3])}`,
                );
                break;
            case 'bezierCurveTo':
                parts.push(
                    `C ${x(args[0])} ${y(args[1])} ${x(args[2])} ${y(args[3])} ${x(args[4])} ${y(args[5])}`,
                );
                break;
            case 'closePath':
                parts.push('Z');
                break;
        }
    }
    return parts.join(' ');
}

/** Whether a character can be traced as an outline. Emoji can: 'Noto Emoji' is
 *  monochrome and has real outlines, which is why the editor reaches for it
 *  rather than refusing. */
export function isTraceable(character: string): boolean {
    return new UnicodeString(character).getLength() === 1;
}

/** Whether a character should be traced from the monochrome emoji face rather
 *  than a text face, which has no outline for it. */
export function needsEmojiFace(character: string): boolean {
    return hasEmoji(character);
}

/** Whether a face declares a file covering this codepoint. Only faces that make
 *  a coverage claim can be checked; a face with no declared ranges is one file
 *  for everything and says nothing about what's in it. */
function faceCovers(face: string, codepoint: number): boolean {
    const ranges = Faces[face]?.ranges;
    if (Array.isArray(ranges))
        return ranges.some((range) => rangeContains(range, codepoint));
    if (typeof ranges === 'string') return rangeContains(ranges, codepoint);
    return false;
}

/**
 * A face that can draw this character, when the chosen one can't.
 *
 * The chooser offers every character the app can render, but no single face
 * covers them all — a star or a hiragana lives in the CJK faces, not in Noto
 * Sans — so picking one with the wrong font selected would otherwise be a dead
 * end the creator has no way to get out of.
 */
export function findCoveringFace(
    codepoint: number,
    preferred: string,
): string | undefined {
    if (faceCovers(preferred, codepoint)) return preferred;
    return Object.keys(Faces).find(
        (face) => face !== preferred && faceCovers(face, codepoint),
    );
}

/**
 * Trace a character into an outline in the unit box, plus the aspect ratio of
 * its ink and the face it actually came from.
 *
 * Mirrors computeContour in Contour.ts step for step, so the editor and the
 * runtime resolve the same request to the same font file.
 */
export async function traceGlyph(
    source: GlyphSource,
): Promise<{ d: string; aspect: number; face: string } | GlyphError> {
    const codepoint = source.character.codePointAt(0);
    if (codepoint === undefined) return 'unsupported';

    // Fall back to a face that covers this character when the chosen one
    // doesn't, rather than refusing a character the chooser just offered.
    const chosen = findCoveringFace(codepoint, source.face) ?? source.face;
    const faceData = Faces[chosen];
    if (faceData === undefined) return 'unsupported';

    const weight = resolveWeight(faceData, source.weight);
    const italic = source.italic && faceData.italic;

    // Which file of the face covers this character, when the face is split.
    let range: string | undefined;
    if (Array.isArray(faceData.ranges)) {
        const found = faceData.ranges.find((r) => rangeContains(r, codepoint));
        if (found === undefined) return 'uncovered';
        range = found;
    }

    const font = await getContourFont(chosen, weight, italic, range);
    if (font === undefined) return 'unsupported';
    if (typeof font === 'string') return font;

    try {
        const run = font.layout(source.character);
        const commands: PathCommand[] = [];
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        let pen = 0;
        for (let i = 0; i < run.glyphs.length; i++) {
            const glyph = run.glyphs[i];
            const position = run.positions[i];
            const dx = pen + position.xOffset;
            const dy = position.yOffset;
            // Offset each glyph's commands by where shaping put it, so a
            // character that shapes into a cluster still traces as one outline.
            for (const { command, args } of glyph.path.commands)
                commands.push({
                    command,
                    args: args.map((value, index) =>
                        index % 2 === 0 ? value + dx : value + dy,
                    ),
                });
            const box = glyph.bbox;
            minX = Math.min(minX, box.minX + dx);
            minY = Math.min(minY, box.minY + dy);
            maxX = Math.max(maxX, box.maxX + dx);
            maxY = Math.max(maxY, box.maxY + dy);
            pen += position.xAdvance;
        }

        if (!isFinite(minX) || maxX <= minX || maxY <= minY) return 'empty';

        const d = commandsToUnitPath(commands, { minX, minY, maxX, maxY });
        if (d.length === 0) return 'empty';
        return { d, aspect: (maxX - minX) / (maxY - minY), face: chosen };
    } catch {
        return 'outline';
    }
}
