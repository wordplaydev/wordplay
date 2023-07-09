import Conflict from './Conflict';
import type TypeVariable from '@nodes/TypeVariable';
import type Locale from '@locale/Locale';
import NodeLink from '@locale/NodeLink';
import type Context from '@nodes/Context';
import concretize from '../locale/concretize';

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
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.conflict.DuplicateTypeVariable.primary,
                        new NodeLink(
                            this.duplicate,
                            locale,
                            context,
                            this.duplicate.getLocale(locale.language)
                        )
                    ),
            },
            secondary: {
                node: this.duplicate,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.conflict.DuplicateTypeVariable.secondary,
                        new NodeLink(
                            this.typeVar,
                            locale,
                            context,
                            this.typeVar.getLocale(locale.language)
                        )
                    ),
            },
        };
    }
}
