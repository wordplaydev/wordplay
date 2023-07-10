import type Block from '@nodes/Block';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';

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
                explanation: (locale: Locale) =>
                    concretize(
                        locale,
                        locale.node.Block.conflict.ExpectedEndingExpression
                    ),
            },
        };
    }
}
