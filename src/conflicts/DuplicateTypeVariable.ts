import Conflict from './Conflict';
import type TypeVariable from '@nodes/TypeVariable';
import type Locale from '@translation/Locale';
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
                explanation: (translation: Locale, context: Context) =>
                    translation.conflict.DuplicateTypeVariable.primary(
                        new NodeLink(
                            this.duplicate,
                            translation,
                            context,
                            this.duplicate.getLocale(translation.language)
                        )
                    ),
            },
            secondary: {
                node: this.duplicate,
                explanation: (translation: Locale, context: Context) =>
                    translation.conflict.DuplicateTypeVariable.secondary(
                        new NodeLink(
                            this.typeVar,
                            translation,
                            context,
                            this.typeVar.getLocale(translation.language)
                        )
                    ),
            },
        };
    }
}
