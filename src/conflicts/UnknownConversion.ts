import type Context from '../nodes/Context';
import type Convert from '../nodes/Convert';
import type Type from '../nodes/Type';
import NodeLink from '../translation/NodeLink';
import type Translation from '../translation/Translation';
import Conflict from './Conflict';

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
                node: this.convert.type,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.UnknownConversion.primary(
                        new NodeLink(this.expectedType, translation, context),
                        new NodeLink(this.convert.type, translation, context)
                    ),
            },
        };
    }
}
