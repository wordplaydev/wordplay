import type {
    Category,
    Detection,
    ObjectDetectorResult,
} from '@mediapipe/tasks-vision';
import CameraLandmarkStream, {
    DEFAULT_FREQUENCY,
} from '@input/CameraLandmarkStream';
import {
    buildCategoryTypeUnion,
    canonicalizeCategory,
    localizeCategory,
} from '@input/ObjectCategories';
import objectDetector from '@input/ObjectDetector';
import createStreamEvaluator from '@input/createStreamEvaluator';
import { createInputs } from '@locale/createInputs';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Locales from '@locale/Locales';
import ListType from '@nodes/ListType';
import NoneLiteral from '@nodes/NoneLiteral';
import NoneType from '@nodes/NoneType';
import NumberLiteral from '@nodes/NumberLiteral';
import NumberType from '@nodes/NumberType';
import StreamDefinition from '@nodes/StreamDefinition';
import StreamType from '@nodes/StreamType';
import type StructureDefinition from '@nodes/StructureDefinition';
import StructureType from '@nodes/StructureType';
import UnionType from '@nodes/UnionType';
import Unit from '@nodes/Unit';
import { createPlaceStructure } from '@output/Place';
import { createThingStructure, type ThingState } from '@output/Thing';
import type Evaluation from '@runtime/Evaluation';
import ListValue from '@values/ListValue';
import NumberValue from '@values/NumberValue';
import TextValue from '@values/TextValue';

/**
 * EfficientDet-Lite0 takes a 320×320 input, so sampling the camera at that size
 * gives the model everything it can use and nothing it can't. (The landmarker
 * streams use 192 because their models are smaller.)
 */
const DEFAULT_RESOLUTION = 320;

/** Minimum score a detection needs before it's reported, unless overridden. */
const DEFAULT_CONFIDENCE = 0.5;

/** How many things to report at once, unless overridden. */
const DEFAULT_COUNT = 5;

/**
 * Quantization for the dedup key, in normalized (0..1) units. Coarse enough
 * that a still scene's jittering boxes don't count as a change, fine enough
 * that real motion does.
 */
const KEY_QUANTIZATION = 0.01;

/**
 * A stream of things the camera sees, backed by MediaPipe's object detector.
 * Each frame produces zero or more detections, which we filter by the creator's
 * `confidence` and `category`, sort by score, cap at `count`, and emit as a list
 * of `Thing` structures. All camera plumbing and the emit-dedup live in
 * CameraLandmarkStream; only the detection → Thing mapping is here.
 *
 * Unlike Hand and Face, there's no EMA smoothing: the base class smooths a
 * single tracked point, and detections have no stable identity from frame to
 * frame to smooth against. The dedup key alone decides when to re-emit.
 */
export default class Objects extends CameraLandmarkStream<
    ObjectDetectorResult,
    ListValue
> {
    private category: string | undefined;
    private confidence: number;
    private count: number;

    constructor(
        evaluation: Evaluation,
        frequency: number,
        resolution: number,
        category: string | undefined,
        confidence: number,
        count: number,
    ) {
        const evaluator = evaluation.getEvaluator();

        super(
            evaluation,
            evaluator.project.shares.input.Objects,
            new ListValue(evaluator.getMain(), []),
            { detections: [] },
            objectDetector,
            frequency,
            resolution,
        );

        this.category = category;
        this.confidence = confidence;
        this.count = count;
    }

    configure(
        frequency: number,
        resolution: number,
        category?: string | undefined,
        confidence?: number,
        count?: number,
    ) {
        super.configure(frequency, resolution);
        this.category = category;
        this.confidence = confidence ?? DEFAULT_CONFIDENCE;
        this.count = count ?? DEFAULT_COUNT;
    }

    /** The canonical English label the creator's `category` filter names, if any. */
    private getCanonicalCategory(): string | undefined {
        return this.category === undefined
            ? undefined
            : canonicalizeCategory(
                  this.category,
                  this.evaluator.project.basis.locales,
              );
    }

    /** Turn a MediaPipe result into a list of Thing structures and emit it. */
    react(result: ObjectDetectorResult) {
        const matches = selectDetections(
            result.detections,
            this.confidence,
            this.getCanonicalCategory(),
            this.count,
        );

        const states = matches.map(({ detection, label }) =>
            this.toThingState(detection, label.categoryName, label.score),
        );

        const key = matches
            .map(({ detection, label }) => {
                const box = normalizeBox(detection, this.resolution);
                return `${label.categoryName}:${quantize(box.x)}:${quantize(
                    box.y,
                )}:${quantize(box.width)}`;
            })
            .join('|');

        this.emitIfChanged(
            undefined,
            undefined,
            key,
            result,
            () =>
                new ListValue(
                    this.creator,
                    states.map((state) =>
                        createThingStructure(this.evaluator, state),
                    ),
                ),
        );
    }

    private toThingState(
        detection: Detection,
        canonicalEnglish: string,
        score: number,
    ): ThingState {
        const box = normalizeBox(detection, this.resolution);
        return {
            name: localizeCategory(
                canonicalEnglish,
                this.evaluator.project.basis.locales,
            ),
            confidence: score,
            place: createPlaceStructure(
                this.evaluator,
                this.toStageMeters(box.x),
                this.toStageMeters(box.y),
                0,
            ),
            width: this.toStageSize(box.width),
            height: this.toStageSize(box.height),
        };
    }

    /** The side length of the square frame detections are reported in pixels of,
     *  so the sensor panel's overlay can normalize boxes the way we do. */
    getDetectionSize(): number {
        return this.resolution;
    }

    /** This stream's localized name for a canonical English label, for the
     *  sensor panel's overlay labels. */
    localize(canonicalEnglish: string): string {
        return localizeCategory(
            canonicalEnglish,
            this.evaluator.project.basis.locales,
        );
    }

    getType(): StreamType {
        return StreamType.make(
            ListType.make(
                new StructureType(this.evaluator.project.shares.output.Thing),
            ),
        );
    }
}

/**
 * The detections worth reporting: those the model is sure enough about, of the
 * kind asked for (if any), best first, capped at `count`. Each keeps the
 * detection's best-guess label alongside it.
 */
export function selectDetections(
    detections: Detection[],
    confidence: number,
    category: string | undefined,
    count: number,
): { detection: Detection; label: Category }[] {
    return (
        detections
            // Detections carry a ranked category list; the first is the model's
            // best guess for that box. flatMap (rather than map + filter) so the
            // empty-category case is dropped with its type narrowed.
            .flatMap((detection) => {
                const label = detection.categories[0];
                return label === undefined ? [] : [{ detection, label }];
            })
            .filter(
                ({ label }) =>
                    label.score >= confidence &&
                    (category === undefined || label.categoryName === category),
            )
            .sort((a, b) => b.label.score - a.label.score)
            .slice(0, Math.max(0, Math.floor(count)))
    );
}

/**
 * A detection's bounding box in normalized (0..1) coordinates of the square
 * frame we fed the detector, which is what the stage mapping expects. MediaPipe
 * reports it in pixels of that same frame.
 */
export function normalizeBox(detection: Detection, size: number) {
    const box = detection.boundingBox;
    if (box === undefined) return { x: 0.5, y: 0.5, width: 0, height: 0 };
    return {
        x: (box.originX + box.width / 2) / size,
        y: (box.originY + box.height / 2) / size,
        width: box.width / size,
        height: box.height / size,
    };
}

/** Bucket a normalized coordinate for the dedup key. */
function quantize(normalized: number): number {
    return Math.round(normalized / KEY_QUANTIZATION);
}

export function createObjectsDefinition(
    locales: Locales,
    ThingType: StructureDefinition,
) {
    const inputs = createInputs(locales, (l) => l.input.Objects.inputs, [
        // frequency
        [
            UnionType.make(
                NumberType.make(Unit.reuse(['ms'])),
                NoneType.make(),
            ),
            NumberLiteral.make(DEFAULT_FREQUENCY, Unit.reuse(['ms'])),
        ],
        // resolution
        [
            UnionType.make(
                NumberType.make(Unit.reuse(['px'])),
                NoneType.make(),
            ),
            NumberLiteral.make(DEFAULT_RESOLUTION, Unit.reuse(['px'])),
        ],
        // category
        [
            UnionType.make(buildCategoryTypeUnion(locales), NoneType.make()),
            NoneLiteral.make(),
        ],
        // confidence
        [NumberType.make(), NumberLiteral.make(DEFAULT_CONFIDENCE)],
        // count
        [NumberType.make(), NumberLiteral.make(DEFAULT_COUNT)],
    ]);

    const valueType = ListType.make(new StructureType(ThingType));

    const frequencyOf = (evaluation: Evaluation) =>
        evaluation.get(inputs[0].names, NumberValue)?.toNumber() ??
        DEFAULT_FREQUENCY;
    const resolutionOf = (evaluation: Evaluation) =>
        evaluation.get(inputs[1].names, NumberValue)?.toNumber() ??
        DEFAULT_RESOLUTION;
    const categoryOf = (evaluation: Evaluation) =>
        evaluation.get(inputs[2].names, TextValue)?.text;
    const confidenceOf = (evaluation: Evaluation) =>
        evaluation.get(inputs[3].names, NumberValue)?.toNumber() ??
        DEFAULT_CONFIDENCE;
    const countOf = (evaluation: Evaluation) =>
        evaluation.get(inputs[4].names, NumberValue)?.toNumber() ??
        DEFAULT_COUNT;

    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Objects.doc),
        getNameLocales(locales, (locale) => locale.input.Objects.names),
        inputs,
        createStreamEvaluator(
            valueType,
            Objects,
            (evaluation) =>
                new Objects(
                    evaluation,
                    frequencyOf(evaluation),
                    resolutionOf(evaluation),
                    categoryOf(evaluation),
                    confidenceOf(evaluation),
                    countOf(evaluation),
                ),
            (stream, evaluation) =>
                stream.configure(
                    frequencyOf(evaluation),
                    resolutionOf(evaluation),
                    categoryOf(evaluation),
                    confidenceOf(evaluation),
                    countOf(evaluation),
                ),
        ),
        valueType,
    );
}
