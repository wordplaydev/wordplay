import type SetOrMapAccess from '../nodes/SetOrMapAccess';
import type Type from '../nodes/Type';
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
        return { primary: this.access.setOrMap, secondary: [] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.NotASetOrMap.primary(this.received);
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
