import type Evaluation from '@runtime/Evaluation';
import StreamValue from '@values/StreamValue';
import { getDocLocales } from '../locale/getDocLocales';
import { getNameLocales } from '../locale/getNameLocales';
import type Locales from '../locale/Locales';
import StreamDefinition from '../nodes/StreamDefinition';
import StreamType from '../nodes/StreamType';
import TextType from '../nodes/TextType';
import TextValue from '../values/TextValue';
import createStreamEvaluator from './createStreamEvaluator';

export default class Chat extends StreamValue<TextValue, string> {
    constructor(evaluation: Evaluation) {
        super(
            evaluation,
            evaluation.getEvaluator().project.shares.input.Chat,
            new TextValue(evaluation.getCreator(), ''),
            '',
        );
    }

    configure() {
        return;
    }

    react(event: string) {
        // Only add the event if it mateches the requirements.
        this.add(new TextValue(this.creator, event), event);
    }

    start() {
        return;
    }
    stop() {
        return;
    }

    getType() {
        return StreamType.make(TextType.make());
    }
}

export function createChatDefinition(locales: Locales) {
    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Chat.doc),
        getNameLocales(locales, (locale) => locale.input.Chat.names),
        [],
        createStreamEvaluator(
            TextType.make(),
            Chat,
            (evaluation) => new Chat(evaluation),
            (stream) => stream.configure(),
        ),
        TextType.make(),
    );
}
