import { getDocLocales } from '#locale/getDocLocales.ts';
import { getNameLocales } from '#locale/getNameLocales.ts';
import Bind from '#nodes/Bind.ts';
import NoneType from '#nodes/NoneType.ts';
import StreamDefinition from '#nodes/StreamDefinition.ts';
import StreamType from '#nodes/StreamType.ts';
import UnionType from '#nodes/UnionType.ts';
import type Evaluation from '#runtime/Evaluation.ts';
import BoolValue from '#values/BoolValue.ts';
import SingletonStreamValue from '#values/SingletonStreamValue.ts';
import type Locales from '#locale/Locales.ts';
import BooleanLiteral from '#nodes/BooleanLiteral.ts';
import BooleanType from '#nodes/BooleanType.ts';
import createStreamEvaluator from '#input/createStreamEvaluator.ts';
import type { StreamKind } from '#values/StreamValue.ts';

export default class Button extends SingletonStreamValue<BoolValue, boolean> {
    readonly kind: StreamKind = 'button';

    on = false;
    down: boolean | undefined;

    constructor(evaluator: Evaluation, down: boolean | undefined) {
        super(
            evaluator,
            evaluator.getEvaluator().project.shares.input.Button,
            new BoolValue(evaluator.getCreator(), false),
            false,
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
        BooleanLiteral.make(true),
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
                    evaluation,
                    evaluation.get(DownBind.names, BoolValue)?.bool,
                ),
            (stream, evaluation) =>
                stream.setDown(evaluation.get(DownBind.names, BoolValue)?.bool),
        ),
        BooleanType.make(),
    );
}
