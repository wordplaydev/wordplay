import type Context from '@nodes/Context';
import type Convert from '@nodes/Convert';
import type Type from '@nodes/Type';
import NodeRef from '@locale/NodeRef';
import Conflict from './Conflict';
import type Locales from '../locale/Locales';

export class UnknownConversion extends Conflict {
    readonly convert: Convert;
    readonly expectedType: Type;

    constructor(expr: Convert, expectedType: Type) {
        super(false);
        this.convert = expr;
        this.expectedType = expectedType;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.convert,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => l.node.Convert.conflict.UnknownConversion,
                        new NodeRef(this.expectedType, locales, context),
                        new NodeRef(this.convert.type, locales, context),
                    ),
            },
        };
    }
}
