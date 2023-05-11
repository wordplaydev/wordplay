import type Block from '@nodes/Block';
import type Locale from '@translation/Locale';
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
                explanation: (translation: Locale) =>
                    translation.conflict.ExpectedEndingExpression.primary,
            },
        };
    }
}
