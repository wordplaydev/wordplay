import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type TypeVariable from '@nodes/TypeVariable';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export default class DuplicateTypeVariable extends Conflict {
    readonly typeVar: TypeVariable;
    readonly duplicate: TypeVariable;

    constructor(typeVar: TypeVariable, duplicate: TypeVariable) {
        super(false);

        this.typeVar = typeVar;
        this.duplicate = duplicate;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.TypeVariable.conflict.DuplicateTypeVariable;

    getConflictingNodes() {
        return {
            primary: {
                node: this.typeVar,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => DuplicateTypeVariable.LocalePath(l).primary,
                        new NodeRef(
                            this.duplicate,
                            locales,
                            context,
                            locales.getName(this.duplicate.names),
                        ),
                    ),
            },
            secondary: {
                node: this.duplicate,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => DuplicateTypeVariable.LocalePath(l).secondary,
                        new NodeRef(
                            this.typeVar,
                            locales,
                            context,
                            locales.getName(this.typeVar.names),
                        ),
                    ),
            },
        };
    }

    getLocalePath() {
        return DuplicateTypeVariable.LocalePath;
    }
}
