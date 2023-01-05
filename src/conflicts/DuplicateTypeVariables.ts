import Conflict from './Conflict';
import type TypeVariable from '../nodes/TypeVariable';
import type Translation from '../translations/Translation';

export default class DuplicateTypeVariables extends Conflict {
    readonly duplicates: TypeVariable[];

    constructor(duplicates: TypeVariable[]) {
        super(false);

        this.duplicates = duplicates;
    }

    getConflictingNodes() {
        return {
            primary: this.duplicates[0],
            secondary: this.duplicates.slice(1),
        };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.DuplicateTypeVariables.primary(
            this.duplicates
        );
    }

    getSecondaryExplanation(translation: Translation) {
        return translation.conflict.DuplicateTypeVariables.secondary();
    }
}
