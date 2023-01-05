import Conflict from './Conflict';
import type Name from '../nodes/Name';
import type Translation from '../translations/Translation';

export default class DuplicateNames extends Conflict {
    readonly duplicates: Name[];

    constructor(duplicates: Name[]) {
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
        return translation.conflict.DuplicateNames.primary(this.duplicates);
    }

    getSecondaryExplanation(translation: Translation) {
        return translation.conflict.DuplicateNames.secondary();
    }
}
