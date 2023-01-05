import type ListAccess from '../nodes/ListAccess';
import type Type from '../nodes/Type';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export class NotAList extends Conflict {
    readonly access: ListAccess;
    readonly received: Type;

    constructor(access: ListAccess, received: Type) {
        super(false);

        this.access = access;
        this.received = received;
    }

    getConflictingNodes() {
        return { primary: this.access.list, secondary: [] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.NotAList.primary(this.received);
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
