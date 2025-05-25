import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import type Type from '@nodes/Type';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export class ImpossibleType extends Conflict {
    readonly expression: Expression;
    readonly givenType: Type;

    constructor(expresion: Expression, givenType: Type) {
        super(true);
        this.expression = expresion;
        this.givenType = givenType;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Is.conflict.ImpossibleType;

    getConflictingNodes() {
        return {
            primary: {
                node: this.expression,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => ImpossibleType.LocalePath(l).primary,
                        new NodeRef(this.givenType, locales, context),
                    ),
            },
        };
    }

    getLocalePath() {
        return ImpossibleType.LocalePath;
    }
}
