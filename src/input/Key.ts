import type Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import BoolValue from '@values/BoolValue';
import SingletonStreamValue from '@values/SingletonStreamValue';
import { getDocLocales } from '../locale/getDocLocales';
import { getNameLocales } from '../locale/getNameLocales';
import type Locales from '../locale/Locales';
import Bind from '../nodes/Bind';
import BooleanType from '../nodes/BooleanType';
import NoneLiteral from '../nodes/NoneLiteral';
import NoneType from '../nodes/NoneType';
import StreamDefinition from '../nodes/StreamDefinition';
import StreamType from '../nodes/StreamType';
import TextType from '../nodes/TextType';
import UnionType from '../nodes/UnionType';
import TextValue from '../values/TextValue';
import createStreamEvaluator from './createStreamEvaluator';

export default class Key extends SingletonStreamValue<
    TextValue,
    { key: string; down: boolean }
> {
    readonly evaluator: Evaluator;
    on = false;

    key: string | undefined;
    down: boolean | undefined;

    constructor(
        evaluation: Evaluation,
        key: string | undefined,
        down: boolean,
    ) {
        super(
            evaluation,
            evaluation.getEvaluator().project.shares.input.Key,
            new TextValue(evaluation.getCreator(), ''),
            { key: '', down: false },
        );

        this.evaluator = evaluation.getEvaluator();
        this.key = key;
        this.down = down;
    }

    configure(key: string | undefined, down: boolean | undefined) {
        this.key = key;
        this.down = down;
    }

    react(event: { key: string; down: boolean }) {
        // Only add the event if it matches the requirements.
        if (
            this.on &&
            (this.key === undefined || this.key === event.key) &&
            (this.down === undefined || this.down === event.down)
        )
            this.add(new TextValue(this.creator, event.key), event);
    }

    start() {
        this.on = true;
    }
    stop() {
        this.on = false;
    }

    getType() {
        return StreamType.make(TextType.make());
    }
}

export function createKeyDefinition(locales: Locales) {
    const keyBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Key.key.doc),
        getNameLocales(locales, (locale) => locale.input.Key.key.names),
        UnionType.make(TextType.make(), NoneType.make()),
        // Default to none, allowing all keys
        NoneLiteral.make(),
    );

    const downBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Key.down.doc),
        getNameLocales(locales, (locale) => locale.input.Key.down.names),
        UnionType.make(BooleanType.make(), NoneType.make()),
        // Default to all events
        NoneLiteral.make(),
    );

    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Key.doc),
        getNameLocales(locales, (locale) => locale.input.Key.names),
        [keyBind, downBind],
        createStreamEvaluator(
            TextType.make(),
            Key,
            (evaluation) =>
                new Key(
                    evaluation,
                    evaluation.get(keyBind.names, TextValue)?.text,
                    evaluation.get(downBind.names, BoolValue)?.bool ?? true,
                ),
            (stream, evaluation) =>
                stream.configure(
                    evaluation.get(keyBind.names, TextValue)?.text,
                    evaluation.get(downBind.names, BoolValue)?.bool ?? true,
                ),
        ),
        TextType.make(),
    );
}
