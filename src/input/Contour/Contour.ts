import type { PathCommand } from 'fontkit';
import { first, must } from '@util/nullable';
import { SupportedFontsFamiliesType } from '@basis/faces/Fonts';
import {
    flattenGlyphLoops,
    shapeTextGlyphs,
    type OutlinePoint,
    type ShapeTextError,
} from '@basis/faces/shapeText';
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
import Place, { createPlaceStructure, toPlace } from '@output/Place/Place';
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
import type { StreamKind } from '@values/StreamValue';

/** A single sampled outline point, in meters, in Wordplay's y-up world space. */
export type ContourPoint = OutlinePoint;

/** Why tracing failed, reported to the creator as an exception so a broken font
 * isn't a silent empty result. The first three come from font loading; `outline`
 * means the font loaded but its glyphs couldn't be turned into an outline. */
type ContourErrorKind = ShapeTextError;

/** The raw value a Contour stream emits: either the computed points or an error.
 * Carrying this (rather than the inputs) makes the stream's history replayable
 * without re-fetching fonts. */
type ContourEvent = { points: ContourPoint[] } | { error: ContourErrorKind };

/** Localized message for each error kind, mirroring Webpage's error reporting. */
const ContourErrors: Record<ContourErrorKind, (locale: LocaleText) => string> =
    {
        connection: (l) => l.input.Contour.error.connection,
        unavailable: (l) => l.input.Contour.error.unavailable,
        unreadable: (l) => l.input.Contour.error.unreadable,
        outline: (l) => l.input.Contour.error.outline,
    };

/** The font face union type, mirroring Phrase's `face` input. */
const FaceType = parseType(toTokens(SupportedFontsFamiliesType));
/** The "forward" | "backward" literal type for the direction input. */
const DirectionType = parseType(toTokens('"forward"|"backward"'));

const FORWARD = 'forward';
const BACKWARD = 'backward';

/**
 * Flatten a glyph's path commands into a flat list of sampled outline points.
 *
 * The trace is one continuous list rather than one array per contour, because
 * that is what a creator traces with: the comet in `WordplayTrace` walks the
 * whole word. `flattenGlyphLoops` does the sampling and keeps the contours
 * separate for anything that needs them (glyph collision does); concatenating
 * them in order is exactly this.
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
    return flattenGlyphLoops(commands, scale, spacing, offsetX, offsetY).flat();
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
    const offsetX = place ? place.x : 0;
    const offsetY = place ? place.y : 0;

    const shaped = await shapeTextGlyphs(glyphs, face, weight, italics);
    // A load failure is reported to the creator as an exception.
    if (typeof shaped === 'string') return shaped;

    const points: ContourPoint[] = [];
    for (const glyph of shaped) {
        // Em units are what the shaper positions in, so glyphs from fonts with
        // different unitsPerEm still align; meters per em is the size.
        points.push(
            ...flattenGlyphLoops(
                glyph.commands,
                sizeMeters / glyph.unitsPerEm,
                spacing,
                offsetX + glyph.xEm * sizeMeters,
                offsetY + glyph.yEm * sizeMeters,
            ).flat(),
        );
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
    readonly kind: StreamKind = 'contour';

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
                    ContourErrors[event.error](
                        // The evaluator's locale list always ends with the
                        // default locale, so there is always a first one.
                        must(
                            first(this.evaluator.getLocales()),
                            "the evaluator's first locale",
                        ),
                    ),
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
            typeof result === 'string' ? { error: result } : { points: result },
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

    // createInputs returns one bind per type declared above, in that order, so
    // each of these eight is present.
    const names = (index: number) =>
        must(inputs[index], `the Contour input at ${index}`).names;
    const glyphsIn = names(0);
    const faceIn = names(1);
    const sizeIn = names(2);
    const placeIn = names(3);
    const weightIn = names(4);
    const italicsIn = names(5);
    const spacingIn = names(6);
    const directionIn = names(7);

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
                    evaluation.get(glyphsIn, TextValue)?.text ?? '',
                    evaluation.get(faceIn, TextValue)?.text ?? '',
                    evaluation.get(sizeIn, NumberValue)?.toNumber() ?? 1,
                    toPlace(evaluation.get(placeIn, StructureValue)),
                    evaluation.get(weightIn, NumberValue)?.toNumber() ?? 400,
                    evaluation.get(italicsIn, BoolValue)?.bool ?? false,
                    evaluation.get(spacingIn, NumberValue)?.toNumber() ?? 0.05,
                    (evaluation.get(directionIn, TextValue)?.text ??
                        FORWARD) === BACKWARD,
                ),
            (stream, evaluation) =>
                stream.configure(
                    evaluation.get(glyphsIn, TextValue)?.text ?? '',
                    evaluation.get(faceIn, TextValue)?.text ?? '',
                    evaluation.get(sizeIn, NumberValue)?.toNumber() ?? 1,
                    toPlace(evaluation.get(placeIn, StructureValue)),
                    evaluation.get(weightIn, NumberValue)?.toNumber() ?? 400,
                    evaluation.get(italicsIn, BoolValue)?.bool ?? false,
                    evaluation.get(spacingIn, NumberValue)?.toNumber() ?? 0.05,
                    (evaluation.get(directionIn, TextValue)?.text ??
                        FORWARD) === BACKWARD,
                ),
        ),
        valueType,
    );
}
