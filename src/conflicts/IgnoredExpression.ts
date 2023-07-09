import type Expression from '@nodes/Expression';
import Conflict from './Conflict';
import type Locale from '@locale/Locale';
import type Block from '../nodes/Block';
import concretize from '../locale/concretize';

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
                explanation: (locale: Locale) =>
                    concretize(
                        locale,
                        locale.conflict.IgnoredExpression.primary
                    ),
            },
            secondary: {
                node: this.expr,
                explanation: (locale: Locale) =>
                    concretize(
                        locale,
                        locale.conflict.IgnoredExpression.secondary
                    ),
            },
        };
    }
}
