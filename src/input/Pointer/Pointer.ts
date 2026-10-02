import { getDocLocales } from '#locale/getDocLocales.ts';
import { getNameLocales } from '#locale/getNameLocales.ts';
import type Names from '#nodes/Names.ts';
import StreamDefinition from '#nodes/StreamDefinition.ts';
import StreamType from '#nodes/StreamType.ts';
import StructureType from '#nodes/StructureType.ts';
import Unit from '#nodes/Unit.ts';
import type Evaluation from '#runtime/Evaluation.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import NumberValue from '#values/NumberValue.ts';
import SingletonStreamValue from '#values/SingletonStreamValue.ts';
import StructureValue, { createStructure } from '#values/StructureValue.ts';
import type Value from '#values/Value.ts';
import type Locales from '#locale/Locales.ts';
import type StructureDefinition from '#nodes/StructureDefinition.ts';
import type Type from '#nodes/Type.ts';
import createStreamEvaluator from '#input/createStreamEvaluator.ts';
import type { StreamKind } from '#values/StreamValue.ts';
import { must } from '#util/nullable.ts';

function position(evaluator: Evaluator, x: number, y: number) {
    const PlaceType = evaluator.project.shares.output.Place;
    // The basis declares Place with exactly these three inputs.
    const [xInput, yInput, zInput] = [
        must(PlaceType.inputs[0], "Place's x input"),
        must(PlaceType.inputs[1], "Place's y input"),
        must(PlaceType.inputs[2], "Place's z input"),
    ];
    const bindings = new Map<Names, Value>();
    bindings.set(
        xInput.names,
        new NumberValue(evaluator.getMain(), x, Unit.reuse(['m'])),
    );
    bindings.set(
        yInput.names,
        new NumberValue(evaluator.getMain(), y, Unit.reuse(['m'])),
    );
    bindings.set(
        zInput.names,
        new NumberValue(evaluator.getMain(), 0, Unit.reuse(['m'])),
    );
    return createStructure(evaluator, PlaceType, bindings);
}

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
            position(evaluation.getEvaluator(), 0, 0),
            { x: 0, y: 0 },
        );

        this.evaluator = evaluation.getEvaluator();
    }

    react(coordinate: { x: number; y: number }) {
        if (this.on)
            this.add(
                position(this.evaluator, coordinate.x, coordinate.y),
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
