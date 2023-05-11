import Stream from '@runtime/Stream';
import type Evaluator from '@runtime/Evaluator';
import StreamDefinition from '../nodes/StreamDefinition';
import { getDocLocales } from '../translation/getDocLocales';
import { getNameLocales } from '../translation/getNameLocales';
import TextType from '../nodes/TextType';
import Text from '../runtime/Text';
import StreamType from '../nodes/StreamType';
import createStreamEvaluator from './createStreamEvaluator';

/** A series of selected output, chosen by mouse or keyboard, allowing for programs that work for both mouse and keyboard. */
export default class Choice extends Stream<Text> {
    readonly evaluator: Evaluator;

    on: boolean = true;

    constructor(evaluator: Evaluator) {
        super(evaluator, ChoiceDefinition, new Text(evaluator.getMain(), ''));

        this.evaluator = evaluator;
    }

    configure() {}

    record(name: string) {
        // Only add the event if it mateches the requirements.
        if (this.on) this.add(new Text(this.evaluator.getMain(), name));
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

export const ChoiceDefinition = StreamDefinition.make(
    getDocLocales((t) => t.input.choice.doc),
    getNameLocales((t) => t.input.choice.names),
    [],
    createStreamEvaluator(
        TextType.make(),
        Choice,
        (evaluation) => new Choice(evaluation.getEvaluator()),
        (stream) => stream.configure()
    ),
    TextType.make()
);
