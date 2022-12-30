import type Block from '../nodes/Block';
import type Translations from '../nodes/Translations';
import { TRANSLATE } from '../nodes/Translations';
import Conflict from './Conflict';

export class ExpectedEndingExpression extends Conflict {
    readonly block: Block;

    constructor(block: Block) {
        super(false);
        this.block = block;
    }

    getConflictingNodes() {
        return { primary: this.block, secondary: [] };
    }

    getPrimaryExplanation(): Translations {
        return {
            eng: `Every block must end with an expression.`,
            '😀': `${TRANSLATE} …?`,
        };
    }
}
