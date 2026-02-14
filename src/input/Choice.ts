import type Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import SingletonStreamValue from '@values/SingletonStreamValue';
import { getDocLocales } from '../locale/getDocLocales';
import { getNameLocales } from '../locale/getNameLocales';
import type Locales from '../locale/Locales';
import StreamDefinition from '../nodes/StreamDefinition';
import StreamType from '../nodes/StreamType';
import TextType from '../nodes/TextType';
import TextValue from '../values/TextValue';
import createStreamEvaluator from './createStreamEvaluator';

/** A series of selected output, chosen by mouse or keyboard, allowing for programs that work for both mouse and keyboard. */
export default class Choice extends SingletonStreamValue<TextValue, string> {
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
