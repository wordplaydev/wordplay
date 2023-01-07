import type Context from '../nodes/Context';
import type SetOrMapAccess from '../nodes/SetOrMapAccess';
import type Type from '../nodes/Type';
import NodeLink from '../translations/NodeLink';
import type Translation from '../translations/Translation';
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
        return { primary: this.access.setOrMap };
    }

    getPrimaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.NotASetOrMap.primary(
            new NodeLink(this.received, translation, context)
        );
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
