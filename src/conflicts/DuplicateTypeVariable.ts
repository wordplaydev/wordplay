import Conflict from './Conflict';
import type TypeVariable from '@nodes/TypeVariable';
import type Translation from '@translation/Translation';
import NodeLink from '@translation/NodeLink';
import type Context from '@nodes/Context';

export default class DuplicateTypeVariable extends Conflict {
    readonly typeVar: TypeVariable;
    readonly duplicate: TypeVariable;

    constructor(typeVar: TypeVariable, duplicate: TypeVariable) {
        super(false);

        this.typeVar = typeVar;
        this.duplicate = duplicate;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.typeVar,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.DuplicateTypeVariable.primary(
                        new NodeLink(
                            this.duplicate,
                            translation,
                            context,
                            this.duplicate.getTranslation(translation.language)
                        )
                    ),
            },
            secondary: {
                node: this.duplicate,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.DuplicateTypeVariable.secondary(
                        new NodeLink(
                            this.typeVar,
                            translation,
                            context,
                            this.typeVar.getTranslation(translation.language)
                        )
                    ),
            },
        };
    }
}
