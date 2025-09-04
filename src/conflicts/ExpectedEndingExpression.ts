import type Block from '@nodes/Block';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export class ExpectedEndingExpression extends Conflict {
    readonly block: Block;

    constructor(block: Block) {
        super(false);
        this.block = block;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.block,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => l.node.Block.conflict.ExpectedEndingExpression,
                    ),
            },
        };
    }
}
