import type Evaluation from '#runtime/Evaluation.ts';
import SingletonStreamValue from '#values/SingletonStreamValue.ts';
import { getDocLocales } from '#locale/getDocLocales.ts';
import { getNameLocales } from '#locale/getNameLocales.ts';
import type Locales from '#locale/Locales.ts';
import StreamDefinition from '#nodes/StreamDefinition.ts';
import StreamType from '#nodes/StreamType.ts';
import TextType from '#nodes/TextType.ts';
import TextValue from '#values/TextValue.ts';
import createStreamEvaluator from '#input/createStreamEvaluator.ts';
import type { StreamKind } from '#values/StreamValue.ts';

export default class Chat extends SingletonStreamValue<TextValue, string> {
    readonly kind: StreamKind = 'chat';

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
