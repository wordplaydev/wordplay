import type Names from '@nodes/Names';
import StreamType from '@nodes/StreamType';
import StructureDefinitionType from '@nodes/StructureDefinitionType';
import Unit from '@nodes/Unit';
import Measurement from '@runtime/Measurement';
import Stream from '@runtime/Stream';
import Structure, { createStructure } from '@runtime/Structure';
import type Value from '@runtime/Value';
import { PlaceType } from '../output/Place';
import type Evaluator from '@runtime/Evaluator';
import { getDocTranslations } from '@translation/getDocTranslations';
import { getNameTranslations } from '@translation/getNameTranslations';

function position(evaluator: Evaluator, x: number, y: number) {
    const bindings = new Map<Names, Value>();
    bindings.set(
        PlaceType.inputs[0].names,
        new Measurement(evaluator.getMain(), x, Unit.unit(['px']))
    );
    bindings.set(
        PlaceType.inputs[0].names,
        new Measurement(evaluator.getMain(), y, Unit.unit(['px']))
    );
    return createStructure(evaluator, PlaceType, bindings);
}

export default class MousePosition extends Stream<Structure> {
    readonly evaluator: Evaluator;
    on: boolean = false;

    constructor(evaluator: Evaluator) {
        super(evaluator, position(evaluator, 0, 0));

        this.evaluator = evaluator;
    }

    computeDocs() {
        return getDocTranslations((t) => t.input.mouseposition.doc);
    }

    computeNames() {
        return getNameTranslations((t) => t.input.mouseposition.name);
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

    getType() {
        return StreamType.make(new StructureDefinitionType(PlaceType, []));
    }
}
