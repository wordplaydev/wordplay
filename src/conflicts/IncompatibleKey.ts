import type Context from '../nodes/Context';
import type SetOrMapAccess from '../nodes/SetOrMapAccess';
import type Type from '../nodes/Type';
import NodeLink from '../translation/NodeLink';
import type Translation from '../translation/Translation';
import Conflict from './Conflict';

export class IncompatibleKey extends Conflict {
    readonly access: SetOrMapAccess;
    readonly expected: Type;
    readonly received: Type;

    constructor(access: SetOrMapAccess, expected: Type, received: Type) {
        super(false);
        this.access = access;
        this.expected = expected;
        this.received = received;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.access.key,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.IncompatibleKey.primary(
                        new NodeLink(this.expected, translation, context)
                    ),
            },
            secondary: {
                node: this.expected,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.IncompatibleKey.secondary(
                        new NodeLink(this.received, translation, context)
                    ),
            },
        };
    }
}
