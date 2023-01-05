import type ListAccess from '../nodes/ListAccess';
import type Type from '../nodes/Type';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export class NotAListIndex extends Conflict {
    readonly access: ListAccess;
    readonly indexType: Type;

    constructor(access: ListAccess, indexType: Type) {
        super(false);

        this.access = access;
        this.indexType = indexType;
    }

    getConflictingNodes() {
        return { primary: this.access.index, secondary: [] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.NotAListIndex.primary(this.indexType);
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
