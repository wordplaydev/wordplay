import Conflict from './Conflict';
import type TypeVariable from '../nodes/TypeVariable';
import type Translation from '../translations/Translation';
import NodeLink from '../translations/NodeLink';
import type Context from '../nodes/Context';

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

    getPrimaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.DuplicateTypeVariables.primary(
            this.duplicates
                .slice(1)
                .map(
                    (dupe) =>
                        new NodeLink(
                            dupe,
                            translation,
                            context,
                            dupe.getTranslation(translation.language)
                        )
                )
        );
    }

    getSecondaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.DuplicateTypeVariables.secondary(
            new NodeLink(
                this.duplicates[0],
                translation,
                context,
                this.duplicates[0].getTranslation(translation.language)
            )
        );
    }
}
