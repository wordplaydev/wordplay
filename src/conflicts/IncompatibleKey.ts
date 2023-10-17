import type Context from '@nodes/Context';
import type SetOrMapAccess from '@nodes/SetOrMapAccess';
import type Type from '@nodes/Type';
import NodeRef from '@locale/NodeRef';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

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
                node: this.access,
                explanation: (locales: Locales, context: Context) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) =>
                                l.node.SetOrMapAccess.conflict.IncompatibleKey
                                    .primary
                        ),
                        new NodeRef(this.expected, locales, context)
                    ),
            },
            secondary: {
                node: this.access.setOrMap,
                explanation: (locales: Locales, context: Context) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) =>
                                l.node.SetOrMapAccess.conflict.IncompatibleKey
                                    .secondary
                        ),
                        new NodeRef(this.received, locales, context),
                        new NodeRef(this.expected, locales, context)
                    ),
            },
        };
    }
}
