import type { PathCommand } from 'fontkit';
import {
    Faces,
    getContourFont,
    rangeContains,
    SupportedFontsFamiliesType,
    type ContourFontError,
    type Face,
    type FontWeight,
} from '@basis/Fonts';
import { createInputs } from '@locale/createInputs';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import BooleanLiteral from '@nodes/BooleanLiteral';
import BooleanType from '@nodes/BooleanType';
import ListType from '@nodes/ListType';
import NoneLiteral from '@nodes/NoneLiteral';
import NoneType from '@nodes/NoneType';
import NumberLiteral from '@nodes/NumberLiteral';
import NumberType from '@nodes/NumberType';
import StreamDefinition from '@nodes/StreamDefinition';
import StreamType from '@nodes/StreamType';
import type StructureDefinition from '@nodes/StructureDefinition';
import StructureType from '@nodes/StructureType';
import TextLiteral from '@nodes/TextLiteral';
import TextType from '@nodes/TextType';
import UnionType from '@nodes/UnionType';
import Unit from '@nodes/Unit';
import parseType from '@parser/parseType';
import { toTokens } from '@parser/toTokens';
import Place, { createPlaceStructure, toPlace } from '@output/Place';
import type Evaluation from '@runtime/Evaluation';
import BoolValue from '@values/BoolValue';
import type ExceptionValue from '@values/ExceptionValue';
import ListValue from '@values/ListValue';
import MessageException from '@values/MessageException';
import NumberValue from '@values/NumberValue';
import StreamValue from '@values/StreamValue';
import StructureValue from '@values/StructureValue';
import TextValue from '@values/TextValue';
import createStreamEvaluator from '@input/createStreamEvaluator';

/** A single sampled outline point, in meters, in Wordplay's y-up world space. */
export type ContourPoint = { x: number; y: number };

/** Why tracing failed, reported to the creator as an exception so a broken font
 * isn't a silent empty result. The first three come from font loading; `outline`
 * means the font loaded but its glyphs couldn't be turned into an outline. */
type ContourErrorKind = ContourFontError | 'outline';

/** The raw value a Contour stream emits: either the computed points or an error.
 * Carrying this (rather than the inputs) makes the stream's history replayable
 * without re-fetching fonts. */
type ContourEvent =
    | { points: ContourPoint[] }
    | { error: ContourErrorKind };

/** Localized message for each error kind, mirroring Webpage's error reporting. */
const ContourErrors: Record<ContourErrorKind, (locale: LocaleText) => string> =
    {
        connection: (l) => l.input.Contour.error.connection,
        unavailable: (l) => l.input.Contour.error.unavailable,
        unreadable: (l) => l.input.Contour.error.unreadable,
        outline: (l) => l.input.Contour.error.outline,
    };

const Weights: FontWeight[] = [100, 200, 300, 400, 500, 600, 700, 800, 900];

/** The font face union type, mirroring Phrase's `face` input. */
const FaceType = parseType(toTokens(SupportedFontsFamiliesType));
/** The "forward" | "backward" literal type for the direction input. */
const DirectionType = parseType(toTokens('"forward"|"backward"'));

const FORWARD = 'forward';
const BACKWARD = 'backward';

/** Pick the supported weight nearest the requested one. */
function resolveWeight(face: Face, requested: number): FontWeight {
    const weights = face.weights;
    let candidates: FontWeight[];
    if (Array.isArray(weights)) candidates = weights;
    else {
        const { min, max } = weights;
        candidates = Weights.filter((w) => w >= min && w <= max);
    }
    const choices = candidates.length > 0 ? candidates : Weights;
    let best = choices[0];
    for (const weight of choices)
        if (Math.abs(weight - requested) < Math.abs(best - requested))
            best = weight;
    return best;
}

/** Subdivisions used to estimate a curve's arc length before sampling it. */
const LENGTH_ESTIMATE_STEPS = 16;

/** The smallest allowed spacing between points, in meters. Spacing is clamped to
 * this floor so that zero, negative, or tiny values can't produce a runaway
 * number of points (which would freeze the tab). */
const MINIMUM_SPACING = 0.01;

/**
 * Flatten a glyph's path commands into a flat list of sampled outline points.
 *
 * The input commands are fontkit path commands in font design units, y-up
 * (baseline at 0); the output points are in meters in Wordplay's y-up world
 * space, so the y axis passes through unchanged.
 *
 * Sampling is by ARC LENGTH so spacing is consistent everywhere, independent of
 * the drawing operation: `spacing` is the target distance between points in
 * meters (world space), and each segment (line or curve) gets a sample count
 * proportional to its length. So a long straight crossbar and a short curve are
 * sampled at the same spatial density, giving a continuous trace with no
 * clustering or gaps. `scale` converts font units to meters.
 *
 * Exported for unit testing.
 */
export function glyphPathToPlaces(
    commands: PathCommand[],
    scale: number,
    spacing: number,
    offsetX: number,
    offsetY: number,
): ContourPoint[] {
    // Samples per font unit of length: (meters per font unit) ÷ (meters per
    // point). Spacing is clamped to a floor so zero/negative/tiny values can't
    // blow up the point count and freeze the tab.
    const samplesPerFontUnit = scale / Math.max(MINIMUM_SPACING, spacing);
    const points: ContourPoint[] = [];

    // The current pen position (font units), for segment starts.
    let cx = 0;
    let cy = 0;
    // The start of the current subpath, for closePath.
    let sx = 0;
    let sy = 0;

    const push = (fx: number, fy: number) => {
        points.push({ x: fx * scale + offsetX, y: fy * scale + offsetY });
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

    for (const { command, args } of commands) {
        if (command === 'moveTo') {
            sx = args[0];
            sy = args[1];
            push(args[0], args[1]);
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
    return points;
}

/**
 * Fetch the necessary font file(s), extract glyph outlines for the given text,
 * and return the sampled outline points (meters, y-up). Glyphs the face doesn't
 * cover or that have no outline (e.g. color emoji) simply contribute no points.
 * Returns an error kind instead if a font can't be loaded or read, so the caller
 * can report it rather than silently showing nothing.
 */
async function computeContour(
    glyphs: string,
    face: string,
    sizeMeters: number,
    place: Place | undefined,
    weight: number,
    italics: boolean,
    spacing: number,
    backward: boolean,
): Promise<ContourPoint[] | ContourErrorKind> {
    const faceData = Faces[face];
    if (faceData === undefined) return [];

    const useItalic = italics && faceData.italic;
    const useWeight = resolveWeight(faceData, weight);

    const offsetX = place ? place.x : 0;
    const offsetY = place ? place.y : 0;

    // Group consecutive characters by the range file that covers them, so each
    // run can be shaped (with kerning) by a single font. Characters the face
    // doesn't cover are skipped.
    const runs: { range: string | undefined; text: string }[] = [];
    for (const char of Array.from(glyphs)) {
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

    const points: ContourPoint[] = [];
    // The horizontal pen position, in meters (so glyphs from fonts with
    // different unitsPerEm still align).
    let penX = 0;

    for (const run of runs) {
        const font = await getContourFont(face, useWeight, useItalic, run.range);
        // Nothing to load (no browser / unsupported): contribute no points.
        if (font === undefined) continue;
        // A load failure is reported to the creator as an exception.
        if (typeof font === 'string') return font;

        const scale = sizeMeters / font.unitsPerEm;
        try {
            // Shape the run, applying the font's kerning and positioning.
            // fontkit's layout and glyph path extraction can throw on unusual
            // input; report it so the creator knows the trace failed.
            const shaped = font.layout(run.text);
            for (let i = 0; i < shaped.glyphs.length; i++) {
                const glyph = shaped.glyphs[i];
                const position = shaped.positions[i];
                points.push(
                    ...glyphPathToPlaces(
                        glyph.path.commands,
                        scale,
                        spacing,
                        offsetX + penX + position.xOffset * scale,
                        offsetY + position.yOffset * scale,
                    ),
                );
                penX += position.xAdvance * scale;
            }
        } catch {
            return 'outline';
        }
    }

    if (backward) points.reverse();
    return points;
}

function samePlace(a: Place | undefined, b: Place | undefined): boolean {
    if (a === undefined || b === undefined) return a === b;
    return a.x === b.x && a.y === b.y;
}

/**
 * A stream that traces the outlines of text in a given font face as a flat list
 * of Place values. Fonts are fetched, WOFF2-decoded, and parsed asynchronously;
 * the stream emits an empty list while loading (or on failure) and the computed
 * outline once ready, re-emitting when its inputs change.
 */
export default class Contour extends StreamValue<
    ListValue | ExceptionValue,
    ContourEvent
> {
    glyphs: string;
    face: string;
    size: number;
    place: Place | undefined;
    weight: number;
    italics: boolean;
    spacing: number;
    backward: boolean;

    /** Incremented on each load so stale async results can be discarded. */
    private request = 0;
    private stopped = false;

    constructor(
        evaluation: Evaluation,
        glyphs: string,
        face: string,
        size: number,
        place: Place | undefined,
        weight: number,
        italics: boolean,
        spacing: number,
        backward: boolean,
    ) {
        super(
            evaluation,
            evaluation.getEvaluator().project.shares.input.Contour,
            new ListValue(evaluation.getCreator(), []),
            { points: [] },
        );

        this.glyphs = glyphs;
        this.face = face;
        this.size = size;
        this.place = place;
        this.weight = weight;
        this.italics = italics;
        this.spacing = spacing;
        this.backward = backward;
    }

    react(event: ContourEvent) {
        if ('error' in event) {
            this.add(
                new MessageException(
                    this.creator,
                    this.evaluator,
                    ContourErrors[event.error](this.evaluator.getLocales()[0]),
                ),
                event,
            );
        } else {
            this.add(
                new ListValue(
                    this.creator,
                    event.points.map((point) =>
                        createPlaceStructure(
                            this.evaluator,
                            point.x,
                            point.y,
                            0,
                        ),
                    ),
                ),
                event,
            );
        }
    }

    configure(
        glyphs: string,
        face: string,
        size: number,
        place: Place | undefined,
        weight: number,
        italics: boolean,
        spacing: number,
        backward: boolean,
    ) {
        const changed =
            glyphs !== this.glyphs ||
            face !== this.face ||
            size !== this.size ||
            weight !== this.weight ||
            italics !== this.italics ||
            spacing !== this.spacing ||
            backward !== this.backward ||
            !samePlace(place, this.place);

        this.glyphs = glyphs;
        this.face = face;
        this.size = size;
        this.place = place;
        this.weight = weight;
        this.italics = italics;
        this.spacing = spacing;
        this.backward = backward;

        if (changed) this.load();
    }

    start() {
        this.stopped = false;
        this.load();
    }

    stop() {
        this.stopped = true;
    }

    async load() {
        const request = ++this.request;
        let result: ContourPoint[] | ContourErrorKind;
        try {
            result = await computeContour(
                this.glyphs,
                this.face,
                this.size,
                this.place,
                this.weight,
                this.italics,
                this.spacing,
                this.backward,
            );
        } catch {
            // Never let an unexpected failure become an unhandled promise
            // rejection; report it as an unreadable font.
            result = 'unreadable';
        }
        // Discard if a newer load started or the stream stopped meanwhile.
        if (this.stopped || request !== this.request) return;
        this.react(
            typeof result === 'string'
                ? { error: result }
                : { points: result },
        );
    }

    getType(): StreamType {
        return StreamType.make(
            ListType.make(
                new StructureType(this.evaluator.project.shares.output.Place),
            ),
        );
    }
}

export function createContourDefinition(
    locales: Locales,
    PlaceType: StructureDefinition,
) {
    const inputs = createInputs(locales, (l) => l.input.Contour.inputs, [
        // glyphs (required)
        TextType.make(),
        // face (required)
        FaceType,
        // size
        [NumberType.make(Unit.meters()), NumberLiteral.make(1, Unit.meters())],
        // place
        [
            UnionType.make(new StructureType(PlaceType), NoneType.make()),
            NoneLiteral.make(),
        ],
        // weight
        [NumberType.make(), NumberLiteral.make(400)],
        // italics
        [BooleanType.make(), BooleanLiteral.make(false)],
        // spacing
        [
            NumberType.make(Unit.meters()),
            NumberLiteral.make(0.05, Unit.meters()),
        ],
        // direction
        [DirectionType, TextLiteral.make(FORWARD)],
    ]);

    const valueType = ListType.make(new StructureType(PlaceType));

    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Contour.doc),
        getNameLocales(locales, (locale) => locale.input.Contour.names),
        inputs,
        createStreamEvaluator(
            valueType,
            Contour,
            (evaluation) =>
                new Contour(
                    evaluation,
                    evaluation.get(inputs[0].names, TextValue)?.text ?? '',
                    evaluation.get(inputs[1].names, TextValue)?.text ?? '',
                    evaluation.get(inputs[2].names, NumberValue)?.toNumber() ??
                        1,
                    toPlace(evaluation.get(inputs[3].names, StructureValue)),
                    evaluation.get(inputs[4].names, NumberValue)?.toNumber() ??
                        400,
                    evaluation.get(inputs[5].names, BoolValue)?.bool ?? false,
                    evaluation.get(inputs[6].names, NumberValue)?.toNumber() ??
                        0.05,
                    (evaluation.get(inputs[7].names, TextValue)?.text ??
                        FORWARD) === BACKWARD,
                ),
            (stream, evaluation) =>
                stream.configure(
                    evaluation.get(inputs[0].names, TextValue)?.text ?? '',
                    evaluation.get(inputs[1].names, TextValue)?.text ?? '',
                    evaluation.get(inputs[2].names, NumberValue)?.toNumber() ??
                        1,
                    toPlace(evaluation.get(inputs[3].names, StructureValue)),
                    evaluation.get(inputs[4].names, NumberValue)?.toNumber() ??
                        400,
                    evaluation.get(inputs[5].names, BoolValue)?.bool ?? false,
                    evaluation.get(inputs[6].names, NumberValue)?.toNumber() ??
                        0.05,
                    (evaluation.get(inputs[7].names, TextValue)?.text ??
                        FORWARD) === BACKWARD,
                ),
        ),
        valueType,
    );
}
