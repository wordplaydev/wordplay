import type Evaluator from '@runtime/Evaluator';
import StreamValue from '@values/StreamValue';
import StreamDefinition from '@nodes/StreamDefinition';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import BooleanType from '../nodes/BooleanType';
import Bind from '@nodes/Bind';
import UnionType from '@nodes/UnionType';
import NoneType from '@nodes/NoneType';
import BoolValue from '@values/BoolValue';
import StreamType from '@nodes/StreamType';
import createStreamEvaluator from './createStreamEvaluator';
import type Locales from '../locale/Locales';
import BooleanLiteral from '../nodes/BooleanLiteral';

export default class Button extends StreamValue<BoolValue, boolean> {
    on = false;
    down: boolean | undefined;

    constructor(evaluator: Evaluator, down: boolean | undefined) {
        super(
            evaluator,
            evaluator.project.shares.input.Button,
            new BoolValue(evaluator.getMain(), false),
            false
        );

        this.down = down;
    }

    setDown(down: boolean | undefined) {
        this.down = down;
    }

    react(down: boolean) {
        if (this.on && (this.down === undefined || this.down === down))
            this.add(new BoolValue(this.creator, down), down);
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

export function createButtonDefinition(locales: Locales) {
    const DownBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Button.down.doc),
        getNameLocales(locales, (locale) => locale.input.Button.down.names),
        UnionType.make(BooleanType.make(), NoneType.make()),
        // Default to true, because down is the most likely useful default.
        BooleanLiteral.make(true)
    );
    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Button.doc),
        getNameLocales(locales, (locale) => locale.input.Button.names),
        [DownBind],
        createStreamEvaluator(
            BooleanType.make(),
            Button,
            (evaluation) =>
                new Button(
                    evaluation.getEvaluator(),
                    evaluation.get(DownBind.names, BoolValue)?.bool
                ),
            (stream, evaluation) =>
                stream.setDown(evaluation.get(DownBind.names, BoolValue)?.bool)
        ),
        BooleanType.make()
    );
}
