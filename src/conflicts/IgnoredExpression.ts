import type Expression from '../nodes/Expression';
import Conflict from './Conflict';
import type Translation from '../translations/Translation';

export class IgnoredExpression extends Conflict {
    readonly expr: Expression;

    constructor(expr: Expression) {
        super(true);
        this.expr = expr;
    }

    getConflictingNodes() {
        return { primary: this.expr, secondary: [] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.IgnoredExpression.primary;
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
