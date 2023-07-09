import Stream from '@runtime/Stream';
import type Evaluator from '@runtime/Evaluator';
import StreamDefinition from '../nodes/StreamDefinition';
import { getDocLocales } from '../locale/getDocLocales';
import { getNameLocales } from '../locale/getNameLocales';
import Bind from '../nodes/Bind';
import UnionType from '../nodes/UnionType';
import NoneType from '../nodes/NoneType';
import NoneLiteral from '../nodes/NoneLiteral';
import TextType from '../nodes/TextType';
import BooleanType from '../nodes/BooleanType';
import Text from '../runtime/Text';
import Bool from '../runtime/Bool';
import StreamType from '../nodes/StreamType';
import createStreamEvaluator from './createStreamEvaluator';
import type Locale from '../locale/Locale';

export default class Key extends Stream<Text> {
    readonly evaluator: Evaluator;
    on: boolean = false;

    key: string | undefined;
    down: boolean | undefined;

    constructor(evaluator: Evaluator, key: string | undefined, down: boolean) {
        super(
            evaluator,
            evaluator.project.shares.input.key,
            new Text(evaluator.getMain(), '')
        );

        this.evaluator = evaluator;
        this.key = key;
        this.down = down;
    }

    configure(key: string | undefined, down: boolean | undefined) {
        this.key = key;
        this.down = down;
    }

    record(key: string, down: boolean) {
        // Only add the event if it mateches the requirements.
        if (
            this.on &&
            (this.key === undefined || this.key === key) &&
            (this.down === undefined || this.down === down)
        )
            this.add(new Text(this.evaluator.getMain(), key));
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

export function createKeyDefinition(locales: Locale[]) {
    const keyBind = Bind.make(
        getDocLocales(locales, (t) => t.input.Key.key.doc),
        getNameLocales(locales, (t) => t.input.Key.key.names),
        UnionType.make(TextType.make(), NoneType.make()),
        // Default to none, allowing all keys
        NoneLiteral.make()
    );

    const downBind = Bind.make(
        getDocLocales(locales, (t) => t.input.Key.down.doc),
        getNameLocales(locales, (t) => t.input.Key.down.names),
        UnionType.make(BooleanType.make(), NoneType.make()),
        // Default to all events
        NoneLiteral.make()
    );

    return StreamDefinition.make(
        getDocLocales(locales, (t) => t.input.Key.doc),
        getNameLocales(locales, (t) => t.input.Key.names),
        [keyBind, downBind],
        createStreamEvaluator(
            TextType.make(),
            Key,
            (evaluation) =>
                new Key(
                    evaluation.getEvaluator(),
                    evaluation.get(keyBind.names, Text)?.text,
                    evaluation.get(downBind.names, Bool)?.bool ?? true
                ),
            (stream, evaluation) =>
                stream.configure(
                    evaluation.get(keyBind.names, Text)?.text,
                    evaluation.get(downBind.names, Bool)?.bool ?? true
                )
        ),
        TextType.make()
    );
}
