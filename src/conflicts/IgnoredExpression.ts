import type Expression from '../nodes/Expression';
import Conflict from './Conflict';
import type Translations from '../nodes/Translations';
import { TRANSLATE } from '../nodes/Translations';

export class IgnoredExpression extends Conflict {
    readonly expr: Expression;

    constructor(expr: Expression) {
        super(true);
        this.expr = expr;
    }

    getConflictingNodes() {
        return { primary: this.expr, secondary: [] };
    }

    getPrimaryExplanation(): Translations {
        return {
            '😀': TRANSLATE,
            eng: `I feel useless. I am useless! Someone use me!`,
        };
    }
}
