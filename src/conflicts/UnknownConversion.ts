import type Context from '../nodes/Context';
import type Convert from '../nodes/Convert';
import type Type from '../nodes/Type';
import NodeLink from '../translations/NodeLink';
import type Translation from '../translations/Translation';
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
        return { primary: this.convert.type, secondary: [] };
    }

    getPrimaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.UnknownConversion.primary(
            new NodeLink(this.expectedType, translation, context),
            new NodeLink(this.convert.type, translation, context)
        );
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
