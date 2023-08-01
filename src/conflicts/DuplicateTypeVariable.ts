import Conflict from './Conflict';
import type TypeVariable from '@nodes/TypeVariable';
import type Locale from '@locale/Locale';
import NodeRef from '@locale/NodeRef';
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
                        locale.node.TypeVariable.conflict.DuplicateTypeVariable
                            .primary,
                        new NodeRef(
                            this.duplicate,
                            locale,
                            context,
                            this.duplicate.getPreferredName(locale)
                        )
                    ),
            },
            secondary: {
                node: this.duplicate,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.TypeVariable.conflict.DuplicateTypeVariable
                            .secondary,
                        new NodeRef(
                            this.typeVar,
                            locale,
                            context,
                            this.typeVar.getPreferredName(locale)
                        )
                    ),
            },
        };
    }
}
