import type { PathCommand } from 'fontkit';
import { asPathOp } from '#input/pathCommands.ts';
import { hasColorCombo, hasEmoji } from '#unicode/emoji.ts';
import {
    Faces,
    getContourFont,
    rangeContains,
    resolveWeight,
    type ContourFontError,
} from './Fonts';

/** Why shaping failed: the three font-loading failures, plus `outline` for a
 * font that loaded but whose glyphs couldn't be turned into an outline. */
export type ShapeTextError = ContourFontError | 'outline';

/** A single sampled outline point, in the caller's units. */
export type OutlinePoint = { x: number; y: number };

/** One glyph of a shaped run: its outline commands in font design units, the
 * font's em size, and where the shaper put it — all offsets in **em units**, so
 * a string spanning several range files with different `unitsPerEm` still
 * aligns. (Font design units would not: they mean a different distance in each
 * file.) */
export type ShapedGlyph = {
    commands: PathCommand[];
    unitsPerEm: number;
    /** Horizontal position of this glyph's origin, in em. */
    xEm: number;
    /** Vertical position of this glyph's origin, in em, y-up from the baseline. */
    yEm: number;
    /** Whether this came from the emoji face, whose outline is a line drawing
     *  of a picture the stage paints solid. */
    emoji: boolean;
};

/** The face emoji outlines come from. It is monochrome with real `glyf`
 *  outlines, and its `ccmp` ligates ZWJ, flag and keycap sequences into single
 *  glyphs; the color faces have no outlines fontkit can read (COLRv1 and OT-SVG
 *  both draw their pictures outside `glyf`). */
const OutlineEmojiFace = 'Noto Emoji';

/** A run of text that one font file shapes. */
export type ShapeRun = {
    face: string;
    range: string | undefined;
    text: string;
};

/** The range file of `face` covering this codepoint: the range string for a
 *  face split across several files, `undefined` for a face that is one file,
 *  and `false` when the face doesn't cover it. */
function rangeFor(face: string, codepoint: number): string | undefined | false {
    const ranges = Faces[face]?.ranges;
    if (Array.isArray(ranges))
        return ranges.find((r) => rangeContains(r, codepoint)) ?? false;
    if (typeof ranges === 'string')
        return rangeContains(ranges, codepoint) ? undefined : false;
    return undefined;
}

/**
 * Group text into runs that one font file can shape (with kerning), mirroring
 * the browser's fallback closely enough that the outline sits where the text
 * is drawn. An emoji the face doesn't draw falls to the monochrome emoji face,
 * a whole grapheme at a time so a sequence stays one ligature; a keycap or
 * text-presentation emoji always does, since the stage draws both from that
 * face's stacks. Anything else the face doesn't cover is skipped.
 */
export function planShapeRuns(text: string, face: string): ShapeRun[] {
    // The color face's files have no outlines, and it has no single file at
    // the path its string range implies, so trace its silhouettes instead.
    if (face === 'Noto Color Emoji') face = OutlineEmojiFace;

    const runs: ShapeRun[] = [];
    const add = (runFace: string, range: string | undefined, part: string) => {
        const last = runs.at(-1);
        if (last !== undefined && last.face === runFace && last.range === range)
            last.text += part;
        else runs.push({ face: runFace, range, text: part });
    };

    const segmenter = new Intl.Segmenter(undefined, {
        granularity: 'grapheme',
    });
    for (const { segment } of segmenter.segment(text)) {
        const first = segment.codePointAt(0);
        if (first === undefined) continue;
        const forced =
            hasColorCombo(segment) ||
            (segment.includes('︎') && hasEmoji(segment));
        const covered = rangeFor(face, first) !== false;
        const emoji =
            forced ||
            (face === OutlineEmojiFace
                ? covered
                : !covered && rangeFor(OutlineEmojiFace, first) !== false);
        if (emoji) {
            add(OutlineEmojiFace, undefined, segment);
            continue;
        }
        // Per codepoint, as before: a grapheme's marks may live in another of
        // the face's range files.
        for (const char of Array.from(segment)) {
            const codepoint = char.codePointAt(0);
            if (codepoint === undefined) continue;
            const range = rangeFor(face, codepoint);
            if (range === false) continue;
            add(face, range, char);
        }
    }
    return runs;
}

/**
 * Shape text into positioned glyph outlines, applying each font's own kerning.
 *
 * Shared by the `Contour` stream and glyph collision. The character editor's
 * `traceGlyph` deliberately keeps its own copy: it falls back across faces to
 * whatever covers the character, reads each glyph's bbox to fit a unit box, and
 * reports `unsupported`/`uncovered` — three things only it wants, and folding
 * them in here would make one function answer two contracts.
 *
 * Runs come from {@link planShapeRuns}; runs whose font isn't loadable here (no
 * browser) contribute nothing. A load *failure* is returned so a caller that
 * reports font errors can, and a caller that would rather degrade silently can
 * ignore it.
 */
export async function shapeTextGlyphs(
    text: string,
    face: string,
    weight: number,
    italics: boolean,
): Promise<ShapedGlyph[] | ShapeTextError> {
    if (Faces[face] === undefined) return [];

    const glyphs: ShapedGlyph[] = [];
    let penEm = 0;

    for (const run of planShapeRuns(text, face)) {
        const faceData = Faces[run.face];
        if (faceData === undefined) continue;
        const font = await getContourFont(
            run.face,
            resolveWeight(faceData, weight),
            italics && faceData.italic,
            run.range,
        );
        // Nothing to load (no browser / unsupported): contribute no glyphs.
        if (font === undefined) continue;
        // A load failure is the caller's to report or ignore.
        if (typeof font === 'string') return font;

        const unitsPerEm = font.unitsPerEm;
        // Shape the run, applying the font's kerning and positioning. fontkit's
        // layout and glyph path extraction can throw on unusual input; report
        // it so the caller knows the shaping, not the download, is what failed.
        let shaped;
        try {
            shaped = font.layout(run.text);
        } catch {
            return 'outline';
        }
        for (const [index, glyph] of shaped.glyphs.entries()) {
            const position = shaped.positions[index];
            // fontkit gives one position per glyph; without one there is
            // nowhere to put this glyph, so skip it.
            if (position === undefined) continue;
            let commands: PathCommand[];
            try {
                commands = glyph.path.commands;
            } catch {
                return 'outline';
            }
            glyphs.push({
                commands,
                unitsPerEm,
                xEm: penEm + position.xOffset / unitsPerEm,
                yEm: position.yOffset / unitsPerEm,
                emoji: run.face === OutlineEmojiFace,
            });
            penEm += position.xAdvance / unitsPerEm;
        }
    }

    return glyphs;
}

/** Subdivisions used to estimate a curve's arc length before sampling it. */
const LENGTH_ESTIMATE_STEPS = 16;

/** The smallest allowed spacing between points, in the output's units. Spacing
 * is clamped to this floor so that zero, negative, or tiny values can't produce
 * a runaway number of points (which would freeze the tab). */
export const MINIMUM_SPACING = 0.01;

/**
 * Flatten a glyph's path commands into one array of sampled points per closed
 * subpath — the outer contour of an `o` and its counter are two loops.
 *
 * The input commands are fontkit path commands in font design units, y-up
 * (baseline at 0); the output points are y-up in the caller's units, so the y
 * axis passes through unchanged. `scale` converts font units to those units.
 *
 * Sampling is by ARC LENGTH so spacing is consistent everywhere, independent of
 * the drawing operation: `spacing` is the target distance between points, and
 * each segment (line or curve) gets a sample count proportional to its length.
 * So a long straight crossbar and a short curve are sampled at the same spatial
 * density, giving a continuous trace with no clustering or gaps.
 */
export function flattenGlyphLoops(
    commands: PathCommand[],
    scale: number,
    spacing: number,
    offsetX: number,
    offsetY: number,
): OutlinePoint[][] {
    // Samples per font unit of length: (units per font unit) ÷ (units per
    // point). Spacing is clamped to a floor so zero/negative/tiny values can't
    // blow up the point count and freeze the tab.
    const samplesPerFontUnit = scale / Math.max(MINIMUM_SPACING, spacing);
    const loops: OutlinePoint[][] = [];
    let loop: OutlinePoint[] | undefined = undefined;

    // The current pen position (font units), for segment starts.
    let cx = 0;
    let cy = 0;
    // The start of the current subpath, for closePath.
    let sx = 0;
    let sy = 0;

    const push = (fx: number, fy: number) => {
        // A drawing command before any moveTo isn't something fontkit produces,
        // but a loop has to exist to push into; start one at the origin.
        if (loop === undefined) {
            loop = [];
            loops.push(loop);
        }
        loop.push({ x: fx * scale + offsetX, y: fy * scale + offsetY });
        cx = fx;
        cy = fy;
    };

    // Estimate a parametric segment's length by coarse flattening.
    const estimateLength = (at: (t: number) => [number, number]) => {
        let length = 0;
        let [px, py] = at(0);
        for (let i = 1; i <= LENGTH_ESTIMATE_STEPS; i++) {
            const [x, y] = at(i / LENGTH_ESTIMATE_STEPS);
            length += Math.hypot(x - px, y - py);
            px = x;
            py = y;
        }
        return length;
    };

    // Sample a parametric segment into points at the target density, based on
    // its length (font units). Always emits at least the segment's end point.
    const sampleSegment = (
        length: number,
        at: (t: number) => [number, number],
    ) => {
        const count = Math.max(1, Math.round(length * samplesPerFontUnit));
        for (let i = 1; i <= count; i++) {
            const [x, y] = at(i / count);
            push(x, y);
        }
    };

    for (const step of commands) {
        // A command whose args don't match its arity isn't something fontkit
        // produces; skip it rather than reading past the end of its args.
        const op = asPathOp(step);
        if (op === undefined) continue;
        const { command, args } = op;
        if (command === 'moveTo') {
            const [x, y] = args;
            loop = [];
            loops.push(loop);
            sx = x;
            sy = y;
            push(x, y);
        } else if (command === 'lineTo') {
            const x0 = cx;
            const y0 = cy;
            const [x, y] = args;
            const at = (t: number): [number, number] => [
                x0 + (x - x0) * t,
                y0 + (y - y0) * t,
            ];
            sampleSegment(Math.hypot(x - x0, y - y0), at);
        } else if (command === 'quadraticCurveTo') {
            const x0 = cx;
            const y0 = cy;
            const [cpx, cpy, x, y] = args;
            const at = (t: number): [number, number] => {
                const mt = 1 - t;
                return [
                    mt * mt * x0 + 2 * mt * t * cpx + t * t * x,
                    mt * mt * y0 + 2 * mt * t * cpy + t * t * y,
                ];
            };
            sampleSegment(estimateLength(at), at);
        } else if (command === 'bezierCurveTo') {
            const x0 = cx;
            const y0 = cy;
            const [c1x, c1y, c2x, c2y, x, y] = args;
            const at = (t: number): [number, number] => {
                const mt = 1 - t;
                return [
                    mt * mt * mt * x0 +
                        3 * mt * mt * t * c1x +
                        3 * mt * t * t * c2x +
                        t * t * t * x,
                    mt * mt * mt * y0 +
                        3 * mt * mt * t * c1y +
                        3 * mt * t * t * c2y +
                        t * t * t * y,
                ];
            };
            sampleSegment(estimateLength(at), at);
        } else if (command === 'closePath') {
            // Trace the closing edge back to the subpath start so the loop is
            // continuous, then return the pen there.
            if (cx !== sx || cy !== sy) {
                const x0 = cx;
                const y0 = cy;
                const at = (t: number): [number, number] => [
                    x0 + (sx - x0) * t,
                    y0 + (sy - y0) * t,
                ];
                sampleSegment(Math.hypot(sx - x0, sy - y0), at);
            }
            cx = sx;
            cy = sy;
        }
    }
    return loops;
}
