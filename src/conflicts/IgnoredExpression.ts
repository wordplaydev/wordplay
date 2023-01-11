import type Expression from '../nodes/Expression';
import Conflict from './Conflict';
import type Translation from '../translation/Translation';

export class IgnoredExpression extends Conflict {
    readonly expr: Expression;

    constructor(expr: Expression) {
        super(true);
        this.expr = expr;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.expr,
                explanation: (translation: Translation) =>
                    translation.conflict.IgnoredExpression.primary,
            },
        };
    }
}
