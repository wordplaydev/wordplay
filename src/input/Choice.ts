import StreamValue from '@values/StreamValue';
import StreamDefinition from '../nodes/StreamDefinition';
import { getDocLocales } from '../locale/getDocLocales';
import { getNameLocales } from '../locale/getNameLocales';
import TextType from '../nodes/TextType';
import TextValue from '../values/TextValue';
import StreamType from '../nodes/StreamType';
import createStreamEvaluator from './createStreamEvaluator';
import type Locales from '../locale/Locales';
import type Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';

/** A series of selected output, chosen by mouse or keyboard, allowing for programs that work for both mouse and keyboard. */
export default class Choice extends StreamValue<TextValue, string> {
    readonly evaluator: Evaluator;

    on = true;

    constructor(evaluation: Evaluation) {
        super(
            evaluation,
            evaluation.getEvaluator().project.shares.input.Choice,
            new TextValue(evaluation.getCreator(), ''),
            '',
        );

        this.evaluator = evaluation.getEvaluator();
    }

    configure() {
        return;
    }

    react(name: string) {
        // Only add the event if it mateches the requirements.
        if (this.on)
            this.add(new TextValue(this.evaluator.getMain(), name), name);
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

export function createChoiceDefinition(locales: Locales) {
    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Choice.doc),
        getNameLocales(locales, (locale) => locale.input.Choice.names),
        [],
        createStreamEvaluator(
            TextType.make(),
            Choice,
            (evaluation) => new Choice(evaluation),
            (stream) => stream.configure(),
        ),
        TextType.make(),
    );
}
