import type { PathCommand } from 'fontkit';
import { asPathOp } from '@input/pathCommands';
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
};

/**
 * Shape text into positioned glyph outlines, applying each font's own kerning.
 *
 * Shared by the `Contour` stream and glyph collision. The character editor's
 * `traceGlyph` deliberately keeps its own copy: it falls back across faces to
 * whatever covers the character, reads each glyph's bbox to fit a unit box, and
 * reports `unsupported`/`uncovered` — three things only it wants, and folding
 * them in here would make one function answer two contracts.
 *
 * Characters are grouped into runs by the range file that covers them, so each
 * run is shaped by a single font; characters the face doesn't cover are
 * skipped, as are runs whose font isn't loadable here (no browser). A load
 * *failure* is returned so a caller that reports font errors can, and a caller
 * that would rather degrade silently can ignore it.
 */
export async function shapeTextGlyphs(
    text: string,
    face: string,
    weight: number,
    italics: boolean,
): Promise<ShapedGlyph[] | ShapeTextError> {
    const faceData = Faces[face];
    if (faceData === undefined) return [];

    const useItalic = italics && faceData.italic;
    const useWeight = resolveWeight(faceData, weight);

    // Group consecutive characters by the range file that covers them, so each
    // run can be shaped (with kerning) by a single font. Characters the face
    // doesn't cover are skipped.
    const runs: { range: string | undefined; text: string }[] = [];
    for (const char of Array.from(text)) {
        const codepoint = char.codePointAt(0);
        if (codepoint === undefined) continue;

        let range: string | undefined;
        if (Array.isArray(faceData.ranges)) {
            const found = faceData.ranges.find((r) =>
                rangeContains(r, codepoint),
            );
            if (found === undefined) continue;
            range = found;
        }

        const last = runs.at(-1);
        if (last !== undefined && last.range === range) last.text += char;
        else runs.push({ range, text: char });
    }

    const glyphs: ShapedGlyph[] = [];
    let penEm = 0;

    for (const run of runs) {
        const font = await getContourFont(
            face,
            useWeight,
            useItalic,
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
