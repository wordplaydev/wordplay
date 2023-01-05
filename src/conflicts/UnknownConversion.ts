import type Convert from '../nodes/Convert';
import type Type from '../nodes/Type';
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

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.UnknownConversion.primary({
            in: this.expectedType,
            out: this.convert.type,
        });
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
