import Stream from '@runtime/Stream';
import StreamType from '@nodes/StreamType';
import type Evaluator from '@runtime/Evaluator';
import { getDocTranslations } from '@translation/getDocTranslations';
import { getNameTranslations } from '@translation/getNameTranslations';
import Text from '@runtime/Text';
import TextType from '../nodes/TextType';
import KeyboardDefinition from './KeyboardDefinition';

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

    computeDocs() {
        return getDocTranslations((t) => t.input.keyboard.doc);
    }

    computeNames() {
        return getNameTranslations((t) => t.input.keyboard.name);
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
