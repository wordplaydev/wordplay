import Conflict from './Conflict';
import type Translations from '../nodes/Translations';
import { TRANSLATE } from '../nodes/Translations';
import type Name from '../nodes/Name';

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

    getPrimaryExplanation(): Translations {
        const dupes = this.duplicates
            .map((dupe) => dupe.toWordplay())
            .join(', ');
        return {
            eng: `Duplicate names ${dupes}.`,
            '😀': `${TRANSLATE} ${dupes}`,
        };
    }
}
