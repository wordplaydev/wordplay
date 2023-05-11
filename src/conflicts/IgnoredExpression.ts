import type Expression from '@nodes/Expression';
import Conflict from './Conflict';
import type Locale from '@translation/Locale';

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
                explanation: (translation: Locale) =>
                    translation.conflict.IgnoredExpression.primary,
            },
        };
    }
}
