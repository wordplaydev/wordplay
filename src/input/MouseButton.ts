import type Evaluator from '@runtime/Evaluator';
import Stream from '@runtime/Stream';
import StreamDefinition from '@nodes/StreamDefinition';
import { getDocTranslations } from '@translation/getDocTranslations';
import { getNameTranslations } from '@translation/getNameTranslations';
import BooleanType from '../nodes/BooleanType';
import Bind from '@nodes/Bind';
import UnionType from '@nodes/UnionType';
import NoneType from '@nodes/NoneType';
import BooleanLiteral from '@nodes/BooleanLiteral';
import NativeExpression from '../native/NativeExpression';
import Bool from '@runtime/Bool';
import StreamType from '@nodes/StreamType';

export default class MouseButton extends Stream<Bool> {
    on: boolean = false;
    down: boolean | undefined;

    constructor(evaluator: Evaluator, down: boolean | undefined) {
        super(
            evaluator,
            MouseButtonDefinition,
            new Bool(evaluator.getMain(), true)
        );

        this.down = down;
    }

    setDown(down: boolean | undefined) {
        this.down = down;
    }

    record(down: boolean) {
        if (this.on && (this.down === undefined || this.down === down))
            this.add(new Bool(this.creator, down));
    }

    start() {
        this.on = true;
    }
    stop() {
        this.on = false;
    }

    getType() {
        return StreamType.make(BooleanType.make());
    }
}

const downBind = Bind.make(
    getDocTranslations((t) => t.input.mousebutton.down.doc),
    getNameTranslations((t) => t.input.mousebutton.down.name),
    UnionType.make(BooleanType.make(), NoneType.make()),
    // Default to true
    BooleanLiteral.make(true)
);

export const MouseButtonDefinition = StreamDefinition.make(
    getDocTranslations((t) => t.input.mousebutton.doc),
    getNameTranslations((t) => t.input.mousebutton.name),
    [downBind],
    new NativeExpression(
        StreamType.make(BooleanType.make()),
        (_, evaluation) => {
            const evaluator = evaluation.getEvaluator();

            // Get the given frequency.
            const downValue = evaluation.resolve(downBind.names);
            const down = downValue instanceof Bool ? downValue.bool : undefined;

            // Get the time stream corresponding to this node, creating one if necessary with the given inputs, or updating it, get it latest value.
            const stream = evaluator.getNativeStreamFor(
                evaluation.getCreator()
            );

            // Update the configuration of the stream with the new frequency.
            if (stream instanceof MouseButton) {
                stream.setDown(down);
                return stream;
            } else {
                const newStream = new MouseButton(evaluator, down);
                evaluator.addNativeStreamFor(
                    evaluation.getCreator(),
                    newStream
                );
                return newStream;
            }
        }
    ),

    BooleanType.make()
);
