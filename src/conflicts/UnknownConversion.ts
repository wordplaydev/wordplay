import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Convert from '@nodes/Convert';
import type Type from '@nodes/Type';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export class UnknownConversion extends Conflict {
    readonly convert: Convert;
    readonly expectedType: Type;

    constructor(expr: Convert, expectedType: Type) {
        super(false);
        this.convert = expr;
        this.expectedType = expectedType;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Convert.conflict.UnknownConversion;

    getConflictingNodes() {
        return {
            primary: {
                node: this.convert,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => UnknownConversion.LocalePath(l).primary,
                        new NodeRef(this.expectedType, locales, context),
                        new NodeRef(this.convert.type, locales, context),
                    ),
            },
        };
    }

    getLocalePath() {
        return UnknownConversion.LocalePath;
    }
}
