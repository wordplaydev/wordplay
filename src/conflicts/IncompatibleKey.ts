import type Context from '@nodes/Context';
import type SetOrMapAccess from '@nodes/SetOrMapAccess';
import type Type from '@nodes/Type';
import NodeLink from '@locale/NodeLink';
import type Locale from '@locale/Locale';
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
                explanation: (translation: Locale, context: Context) =>
                    translation.conflict.IncompatibleKey.primary(
                        new NodeLink(this.expected, translation, context)
                    ),
            },
            secondary: {
                node: this.expected,
                explanation: (translation: Locale, context: Context) =>
                    translation.conflict.IncompatibleKey.secondary(
                        new NodeLink(this.received, translation, context)
                    ),
            },
        };
    }
}
