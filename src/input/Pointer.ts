import type Names from '@nodes/Names';
import Unit from '@nodes/Unit';
import Number from '@runtime/Number';
import Stream from '@runtime/Stream';
import Structure, { createStructure } from '@runtime/Structure';
import type Value from '@runtime/Value';
import type Evaluator from '@runtime/Evaluator';
import StreamDefinition from '@nodes/StreamDefinition';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import StructureType from '@nodes/StructureType';
import StreamType from '@nodes/StreamType';
import createStreamEvaluator from './createStreamEvaluator';
import type Locale from '../locale/Locale';
import type Type from '../nodes/Type';
import type StructureDefinition from '../nodes/StructureDefinition';

function position(evaluator: Evaluator, x: number, y: number) {
    const PlaceType = evaluator.project.shares.output.Place;
    const bindings = new Map<Names, Value>();
    bindings.set(
        PlaceType.inputs[0].names,
        new Number(evaluator.getMain(), x, Unit.reuse(['m']))
    );
    bindings.set(
        PlaceType.inputs[1].names,
        new Number(evaluator.getMain(), y, Unit.reuse(['m']))
    );
    bindings.set(
        PlaceType.inputs[2].names,
        new Number(evaluator.getMain(), 0, Unit.reuse(['m']))
    );
    return createStructure(evaluator, PlaceType, bindings);
}

export default class Pointer extends Stream<Structure> {
    readonly evaluator: Evaluator;
    on: boolean = false;

    constructor(evaluator: Evaluator) {
        super(
            evaluator,
            evaluator.project.shares.input.Pointer,
            position(evaluator, 0, 0)
        );

        this.evaluator = evaluator;
    }

    record(x: number, y: number) {
        if (this.on) this.add(position(this.evaluator, x, y));
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
    locales: Locale[],
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
            () => {}
        ),
        new StructureType(PlaceType)
    );
}
