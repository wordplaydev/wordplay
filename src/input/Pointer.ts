import type Names from '@nodes/Names';
import Unit from '@nodes/Unit';
import NumberValue from '@values/NumberValue';
import StreamValue from '@values/StreamValue';
import StructureValue, { createStructure } from '@values/StructureValue';
import type Value from '@values/Value';
import type Evaluator from '@runtime/Evaluator';
import StreamDefinition from '@nodes/StreamDefinition';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import StructureType from '@nodes/StructureType';
import StreamType from '@nodes/StreamType';
import createStreamEvaluator from './createStreamEvaluator';
import type Type from '../nodes/Type';
import type StructureDefinition from '../nodes/StructureDefinition';
import type Locales from '../locale/Locales';

function position(evaluator: Evaluator, x: number, y: number) {
    const PlaceType = evaluator.project.shares.output.Place;
    const bindings = new Map<Names, Value>();
    bindings.set(
        PlaceType.inputs[0].names,
        new NumberValue(evaluator.getMain(), x, Unit.reuse(['m']))
    );
    bindings.set(
        PlaceType.inputs[1].names,
        new NumberValue(evaluator.getMain(), y, Unit.reuse(['m']))
    );
    bindings.set(
        PlaceType.inputs[2].names,
        new NumberValue(evaluator.getMain(), 0, Unit.reuse(['m']))
    );
    return createStructure(evaluator, PlaceType, bindings);
}

export default class Pointer extends StreamValue<
    StructureValue,
    { x: number; y: number }
> {
    readonly evaluator: Evaluator;
    on = false;

    constructor(evaluator: Evaluator) {
        super(
            evaluator,
            evaluator.project.shares.input.Pointer,
            position(evaluator, 0, 0),
            { x: 0, y: 0 }
        );

        this.evaluator = evaluator;
    }

    react(coordinate: { x: number; y: number }) {
        if (this.on)
            this.add(
                position(this.evaluator, coordinate.x, coordinate.y),
                coordinate
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
            new StructureType(this.evaluator.project.shares.output.Place, [])
        );
    }
}

export function createPointerDefinition(
    locales: Locales,
    PlaceType: StructureDefinition
) {
    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Pointer.doc),
        getNameLocales(locales, (locale) => locale.input.Pointer.names),
        [],
        createStreamEvaluator(
            new StructureType(PlaceType),
            Pointer,
            (evaluation) => new Pointer(evaluation.getEvaluator()),
            () => {
                return;
            }
        ),
        new StructureType(PlaceType)
    );
}
