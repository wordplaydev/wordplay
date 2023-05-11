import type Changed from '@nodes/Changed';
import type Context from '@nodes/Context';
import type Previous from '@nodes/Previous';
import type Type from '@nodes/Type';
import NodeLink from '@translation/NodeLink';
import type Locale from '@translation/Locale';
import Conflict from './Conflict';

export class NotAStream extends Conflict {
    readonly stream: Previous | Changed;
    readonly received: Type;

    constructor(stream: Previous | Changed, received: Type) {
        super(false);

        this.stream = stream;
        this.received = received;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.stream.stream,
                explanation: (translation: Locale, context: Context) =>
                    translation.conflict.NotAStream.primary(
                        new NodeLink(this.received, translation, context)
                    ),
            },
        };
    }
}
