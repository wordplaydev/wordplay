import type Context from '@nodes/Context';
import type SetOrMapAccess from '@nodes/SetOrMapAccess';
import type Type from '@nodes/Type';
import NodeLink from '@locale/NodeRef';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';

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
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.SetOrMapAccess.conflict.IncompatibleKey
                            .primary,
                        new NodeLink(this.expected, locale, context)
                    ),
            },
            secondary: {
                node: this.access.setOrMap,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.SetOrMapAccess.conflict.IncompatibleKey
                            .secondary,
                        new NodeLink(this.received, locale, context)
                    ),
            },
        };
    }
}
