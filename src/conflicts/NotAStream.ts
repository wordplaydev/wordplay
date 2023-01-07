import Changed from '../nodes/Changed';
import type Context from '../nodes/Context';
import type Previous from '../nodes/Previous';
import type Type from '../nodes/Type';
import NodeLink from '../translations/NodeLink';
import type Translation from '../translations/Translation';
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
            primary: this.stream.stream,
            secondary:
                this.stream instanceof Changed
                    ? this.stream.change
                    : this.stream.previous,
        };
    }

    getPrimaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.NotAStream.primary(
            new NodeLink(this.received, translation, context)
        );
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
