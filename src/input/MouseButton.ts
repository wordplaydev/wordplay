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
import Bool from '@runtime/Bool';
import StreamType from '@nodes/StreamType';
import createStreamEvaluator from './createStreamEvaluator';

export default class Button extends Stream<Bool> {
    on: boolean = false;
    down: boolean | undefined;

    constructor(evaluator: Evaluator, down: boolean | undefined) {
        super(evaluator, ButtonDefinition, new Bool(evaluator.getMain(), true));

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

const DownBind = Bind.make(
    getDocTranslations((t) => t.input.mousebutton.down.doc),
    getNameTranslations((t) => t.input.mousebutton.down.name),
    UnionType.make(BooleanType.make(), NoneType.make()),
    // Default to true
    BooleanLiteral.make(true)
);

export const ButtonDefinition = StreamDefinition.make(
    getDocTranslations((t) => t.input.mousebutton.doc),
    getNameTranslations((t) => t.input.mousebutton.name),
    [DownBind],
    createStreamEvaluator(
        BooleanType.make(),
        Button,
        (evaluation) =>
            new Button(
                evaluation.getEvaluator(),
                evaluation.get(DownBind.names, Bool)?.bool
            ),
        (stream, evaluation) =>
            stream.setDown(evaluation.get(DownBind.names, Bool)?.bool)
    ),
    BooleanType.make()
);
