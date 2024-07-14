import type Expression from '@nodes/Expression';
import Conflict from './Conflict';
import type Block from '../nodes/Block';
import type Locales from '../locale/Locales';

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
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => l.node.Block.conflict.IgnoredExpression.primary,
                    ),
            },
            secondary: {
                node: this.expr,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) =>
                            l.node.Block.conflict.IgnoredExpression.secondary,
                    ),
            },
        };
    }
}
