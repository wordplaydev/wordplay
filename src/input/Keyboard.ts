import Stream from '@runtime/Stream';
import type Evaluator from '@runtime/Evaluator';
import StreamDefinition from '../nodes/StreamDefinition';
import { getDocTranslations } from '../translation/getDocTranslations';
import { getNameTranslations } from '../translation/getNameTranslations';
import Bind from '../nodes/Bind';
import UnionType from '../nodes/UnionType';
import NoneType from '../nodes/NoneType';
import NoneLiteral from '../nodes/NoneLiteral';
import TextType from '../nodes/TextType';
import NativeExpression from '../native/NativeExpression';
import BooleanType from '../nodes/BooleanType';
import Text from '../runtime/Text';
import Bool from '../runtime/Bool';
import StreamType from '../nodes/StreamType';

export default class Keyboard extends Stream<Text> {
    readonly evaluator: Evaluator;
    on: boolean = false;

    key: string | undefined;
    down: boolean | undefined;

    constructor(evaluator: Evaluator, key: string | undefined, down: boolean) {
        super(evaluator, KeyboardDefinition, new Text(evaluator.getMain(), ''));

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

const keyBind = Bind.make(
    getDocTranslations((t) => t.input.keyboard.key.doc),
    getNameTranslations((t) => t.input.keyboard.key.name),
    UnionType.make(TextType.make(), NoneType.make()),
    // Default to none, allowing all keys
    NoneLiteral.make()
);

const downBind = Bind.make(
    getDocTranslations((t) => t.input.keyboard.down.doc),
    getNameTranslations((t) => t.input.keyboard.down.name),
    UnionType.make(BooleanType.make(), NoneType.make()),
    // Default to all events
    NoneLiteral.make()
);

export const KeyboardDefinition = StreamDefinition.make(
    getDocTranslations((t) => t.input.keyboard.doc),
    getNameTranslations((t) => t.input.keyboard.name),
    [keyBind, downBind],
    new NativeExpression(StreamType.make(TextType.make()), (_, evaluation) => {
        const evaluator = evaluation.getEvaluator();

        // Get the given key and down.
        const keyValue = evaluation.resolve(keyBind.names);
        const downValue = evaluation.resolve(downBind.names);

        // Convert to native values for the keyboard stream.
        const key = keyValue instanceof Text ? keyValue.text : undefined;
        const down = downValue instanceof Bool ? downValue.bool : true;

        // Get the keyboard stream corresponding to this node, creating one if necessary with the given inputs, or updating it, get it latest value.
        const stream = evaluator.getNativeStreamFor(evaluation.getCreator());

        // If there is one, update the configuration of the stream with the new frequency.
        if (stream instanceof Keyboard) {
            stream.configure(key, down);
            return stream;
        }
        // Otherwise, create one.
        else {
            const newStream = new Keyboard(evaluator, key, down);
            evaluator.addNativeStreamFor(evaluation.getCreator(), newStream);
            return newStream;
        }
    }),
    TextType.make()
);
