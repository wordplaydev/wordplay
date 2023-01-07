import Conflict from './Conflict';
import type Name from '../nodes/Name';
import type Translation from '../translations/Translation';
import NodeLink from '../translations/NodeLink';
import type Context from '../nodes/Context';

export default class DuplicateNames extends Conflict {
    readonly duplicates: Name[];

    constructor(duplicates: Name[]) {
        super(true);

        this.duplicates = duplicates;
    }

    getConflictingNodes() {
        return {
            primary: this.duplicates[0],
            secondary: this.duplicates.slice(1),
        };
    }

    getPrimaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.DuplicateNames.primary(
            new NodeLink(
                this.duplicates[0],
                translation,
                context,
                this.duplicates[0].getName()
            )
        );
    }

    getSecondaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.DuplicateNames.secondary(
            new NodeLink(
                this.duplicates[0],
                translation,
                context,
                this.duplicates[0].getName()
            )
        );
    }
}
