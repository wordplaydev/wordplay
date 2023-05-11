import type Context from '@nodes/Context';
import type SetOrMapAccess from '@nodes/SetOrMapAccess';
import type Type from '@nodes/Type';
import NodeLink from '@translation/NodeLink';
import type Locale from '@translation/Locale';
import Conflict from './Conflict';

export class NotASetOrMap extends Conflict {
    readonly access: SetOrMapAccess;
    readonly received: Type;

    constructor(access: SetOrMapAccess, received: Type) {
        super(false);

        this.access = access;
        this.received = received;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.access.setOrMap,
                explanation: (translation: Locale, context: Context) =>
                    translation.conflict.NotASetOrMap.primary(
                        new NodeLink(this.received, translation, context)
                    ),
            },
        };
    }
}
