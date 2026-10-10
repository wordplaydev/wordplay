import { getDocLocales } from '#locale/getDocLocales.ts';
import { getNameLocales } from '#locale/getNameLocales.ts';
import StreamDefinition from '#nodes/StreamDefinition.ts';
import StreamType from '#nodes/StreamType.ts';
import StructureType from '#nodes/StructureType.ts';
import type Evaluation from '#runtime/Evaluation.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import SingletonStreamValue from '#values/SingletonStreamValue.ts';
import type StructureValue from '#values/StructureValue.ts';
import { createPlaceStructure } from '#output/Place/Place.ts';
import type Locales from '#locale/Locales.ts';
import type StructureDefinition from '#nodes/StructureDefinition.ts';
import type Type from '#nodes/Type.ts';
import createStreamEvaluator from '#input/createStreamEvaluator.ts';
import type { StreamKind } from '#values/StreamValue.ts';

export default class Pointer extends SingletonStreamValue<
    StructureValue,
    { x: number; y: number }
> {
    readonly kind: StreamKind = 'pointer';

    readonly evaluator: Evaluator;
    on = false;

    constructor(evaluation: Evaluation) {
        super(
            evaluation,
            evaluation.getEvaluator().project.shares.input.Pointer,
            // A shared Place, so its rotation is bound like any other; Pointer built its own without one,
            // which made `Pointer().rotation` an unknown name.
            createPlaceStructure(evaluation.getEvaluator(), 0, 0, 0),
            { x: 0, y: 0 },
        );

        this.evaluator = evaluation.getEvaluator();
    }

    react(coordinate: { x: number; y: number }) {
        if (this.on)
            this.add(
                createPlaceStructure(
                    this.evaluator,
                    coordinate.x,
                    coordinate.y,
                    0,
                ),
                coordinate,
            );
    }

    start() {
        this.on = true;
    }
    stop() {
        this.on = false;
    }

    getType(): Type {
        return StreamType.make(
            new StructureType(this.evaluator.project.shares.output.Place, []),
        );
    }
}

export function createPointerDefinition(
    locales: Locales,
    PlaceType: StructureDefinition,
) {
    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Pointer.doc),
        getNameLocales(locales, (locale) => locale.input.Pointer.names),
        [],
        createStreamEvaluator(
            new StructureType(PlaceType),
            Pointer,
            (evaluation) => new Pointer(evaluation),
            () => {
                return;
            },
        ),
        new StructureType(PlaceType),
    );
}
