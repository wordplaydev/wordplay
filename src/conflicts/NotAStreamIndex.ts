import type Previous from '../nodes/Previous';
import type Type from '../nodes/Type';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export class NotAStreamIndex extends Conflict {
    readonly previous: Previous;
    readonly indexType: Type;

    constructor(access: Previous, indexType: Type) {
        super(false);

        this.previous = access;
        this.indexType = indexType;
    }

    getConflictingNodes() {
        return { primary: this.previous.index, secondary: [] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.NotAStreamIndex.primary(this.indexType);
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
