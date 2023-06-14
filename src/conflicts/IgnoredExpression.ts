import type Expression from '@nodes/Expression';
import Conflict from './Conflict';
import type Locale from '@locale/Locale';
import type Block from '../nodes/Block';

export class IgnoredExpression extends Conflict {
    readonly block: Block;
    readonly expr: Expression;

    constructor(block: Block, expr: Expression) {
        super(true);
        this.block = block;
        this.expr = expr;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.block,
                explanation: (translation: Locale) =>
                    translation.conflict.IgnoredExpression.primary,
            },
            secondary: {
                node: this.expr,
                explanation: (translation: Locale) =>
                    translation.conflict.IgnoredExpression.secondary,
            },
        };
    }
}
