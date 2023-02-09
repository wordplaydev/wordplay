import type Names from '@nodes/Names';
import Unit from '@nodes/Unit';
import Measurement from '@runtime/Measurement';
import Stream from '@runtime/Stream';
import Structure, { createStructure } from '@runtime/Structure';
import type Value from '@runtime/Value';
import type Evaluator from '@runtime/Evaluator';
import StreamDefinition from '@nodes/StreamDefinition';
import { getDocTranslations } from '@translation/getDocTranslations';
import { getNameTranslations } from '@translation/getNameTranslations';
import StructureDefinitionType from '@nodes/StructureDefinitionType';
import { PlaceType } from '@output/Place';
import NativeExpression from '../native/NativeExpression';
import StreamType from '@nodes/StreamType';

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
        super(evaluator, MousePositionDefinition, position(evaluator, 0, 0));

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

    getType() {
        return StreamType.make(new StructureDefinitionType(PlaceType, []));
    }
}

export const MousePositionDefinition = StreamDefinition.make(
    getDocTranslations((t) => t.input.mouseposition.doc),
    getNameTranslations((t) => t.input.mouseposition.name),
    [],
    new NativeExpression(
        StreamType.make(new StructureDefinitionType(PlaceType, [])),
        (_, evaluation) => {
            const evaluator = evaluation.getEvaluator();

            // Get the stream corresponding to this node, creating one if necessary with the given inputs, or updating it, get it latest value.
            const stream = evaluator.getNativeStreamFor(
                evaluation.getCreator()
            );

            // If there is one, update the configuration of the stream with the new frequency.
            if (stream instanceof MousePosition) {
                return stream;
            }
            // Otherwise, create one.
            else {
                const newStream = new MousePosition(evaluator);
                evaluator.addNativeStreamFor(
                    evaluation.getCreator(),
                    newStream
                );
                return newStream;
            }
        }
    ),
    new StructureDefinitionType(PlaceType, [])
);
